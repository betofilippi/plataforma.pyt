#!/bin/bash
# ==============================================================================
# Restore Script for Plataforma FastAPI Backend
# ==============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-staging}"
BACKUP_FILE="${2:-}"
RESTORE_TYPE="${3:-auto}"
NAMESPACE="plataforma-fastapi"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
FORCE_RESTORE="${FORCE_RESTORE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [environment] [backup_file] [restore_type]

Restore Plataforma FastAPI Backend data from backup

Arguments:
  environment    Target environment (staging, production) [default: staging]
  backup_file    Path to backup file (required)
  restore_type   Type of restore (database, redis, storage, kubernetes, auto) [default: auto]

Environment Variables:
  BACKUP_DIR=/path/to/backups    Directory containing backups
  FORCE_RESTORE=true             Skip confirmation prompts

Examples:
  $0 staging /path/to/backup.sql.gz                    # Auto-detect and restore
  $0 production /backups/postgres_prod_20231201.sql.gz database
  $0 staging /backups/redis_staging_20231201.rdb.gz redis

WARNING: Restore operations will overwrite existing data!
         Always test in a staging environment first.

EOF
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl context
    local current_context
    current_context=$(kubectl config current-context 2>/dev/null || echo "none")
    log_info "Current kubectl context: $current_context"
    
    if [[ "$current_context" == "none" ]]; then
        log_error "No kubectl context configured"
        exit 1
    fi
    
    # Verify cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Check if backup file exists
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file not specified"
        show_usage
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        # Try to find in backup directory
        if [[ -f "$BACKUP_DIR/$BACKUP_FILE" ]]; then
            BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
        else
            log_error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
    fi
    
    log_info "Using backup file: $BACKUP_FILE"
    
    log_success "Prerequisites check passed"
}

# Function to detect backup type
detect_backup_type() {
    local filename
    filename=$(basename "$BACKUP_FILE")
    
    if [[ "$filename" == *postgres* || "$filename" == *database* || "$filename" == *.sql* ]]; then
        echo "database"
    elif [[ "$filename" == *redis* || "$filename" == *.rdb* ]]; then
        echo "redis"
    elif [[ "$filename" == *storage* ]]; then
        echo "storage"
    elif [[ "$filename" == *k8s* || "$filename" == *kubernetes* ]]; then
        echo "kubernetes"
    else
        log_warning "Could not auto-detect backup type from filename: $filename"
        echo "unknown"
    fi
}

# Function to confirm restore operation
confirm_restore() {
    if [[ "$FORCE_RESTORE" == "true" ]]; then
        log_warning "FORCE_RESTORE=true - skipping confirmation"
        return 0
    fi
    
    log_warning "⚠️  WARNING: This operation will overwrite existing data!"
    log_warning "Environment: $ENVIRONMENT"
    log_warning "Backup file: $BACKUP_FILE"
    log_warning "Restore type: $RESTORE_TYPE"
    echo ""
    
    read -p "Are you sure you want to proceed? Type 'yes' to confirm: " -r
    if [[ $REPLY != "yes" ]]; then
        log_info "Restore operation cancelled by user"
        exit 0
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_error "⚠️  PRODUCTION RESTORE DETECTED!"
        read -p "This is a PRODUCTION restore. Type 'RESTORE_PRODUCTION' to confirm: " -r
        if [[ $REPLY != "RESTORE_PRODUCTION" ]]; then
            log_info "Production restore cancelled"
            exit 0
        fi
    fi
}

# Function to create pre-restore backup
create_pre_restore_backup() {
    log_info "Creating pre-restore backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_restore_dir="$BACKUP_DIR/pre-restore-$timestamp"
    
    mkdir -p "$pre_restore_dir"
    
    # Run the backup script
    if "$SCRIPT_DIR/backup.sh" "$ENVIRONMENT" "all" 2>&1 | tee "$pre_restore_dir/backup.log"; then
        log_success "Pre-restore backup created in: $pre_restore_dir"
        echo "$pre_restore_dir" > /tmp/plataforma_pre_restore_backup_dir
    else
        log_error "Failed to create pre-restore backup"
        exit 1
    fi
}

# Function to restore PostgreSQL database
restore_database() {
    log_info "Starting PostgreSQL database restore..."
    
    # Get database pod
    local db_pod
    db_pod=$(kubectl get pods -n "$NAMESPACE" -l component=database -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$db_pod" ]]; then
        log_error "PostgreSQL pod not found"
        exit 1
    fi
    
    log_info "Found database pod: $db_pod"
    
    # Check if backup file is compressed
    local restore_file="$BACKUP_FILE"
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log_info "Decompressing backup file..."
        local temp_file
        temp_file=$(mktemp)
        gunzip -c "$BACKUP_FILE" > "$temp_file"
        restore_file="$temp_file"
    fi
    
    # Stop application pods to prevent connections during restore
    log_info "Scaling down application pods..."
    kubectl scale deployment fastapi-deployment --replicas=0 -n "$NAMESPACE"
    
    # Wait for pods to be terminated
    kubectl wait --for=delete pods -l component=api -n "$NAMESPACE" --timeout=60s || true
    
    # Drop existing connections and recreate database
    log_info "Preparing database for restore..."
    kubectl exec -n "$NAMESPACE" "$db_pod" -c postgres -- \
        psql -U plataforma -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'plataforma_nxt' AND pid <> pg_backend_pid();"
    
    kubectl exec -n "$NAMESPACE" "$db_pod" -c postgres -- \
        psql -U plataforma -d postgres -c "DROP DATABASE IF EXISTS plataforma_nxt;"
    
    kubectl exec -n "$NAMESPACE" "$db_pod" -c postgres -- \
        psql -U plataforma -d postgres -c "CREATE DATABASE plataforma_nxt OWNER plataforma;"
    
    # Restore database
    log_info "Restoring database from backup..."
    kubectl exec -i -n "$NAMESPACE" "$db_pod" -c postgres -- \
        psql -U plataforma -d plataforma_nxt --no-password < "$restore_file"
    
    # Cleanup temporary file
    if [[ "$restore_file" != "$BACKUP_FILE" ]]; then
        rm -f "$restore_file"
    fi
    
    # Scale application pods back up
    log_info "Scaling up application pods..."
    kubectl scale deployment fastapi-deployment --replicas=3 -n "$NAMESPACE"
    
    # Wait for pods to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/fastapi-deployment -n "$NAMESPACE"
    
    log_success "Database restore completed successfully"
}

# Function to restore Redis data
restore_redis() {
    log_info "Starting Redis data restore..."
    
    # Get Redis pod
    local redis_pod
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l component=cache -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$redis_pod" ]]; then
        log_error "Redis pod not found"
        exit 1
    fi
    
    log_info "Found Redis pod: $redis_pod"
    
    # Check if backup file is compressed
    local restore_file="$BACKUP_FILE"
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log_info "Decompressing backup file..."
        local temp_file
        temp_file=$(mktemp)
        gunzip -c "$BACKUP_FILE" > "$temp_file"
        restore_file="$temp_file"
    fi
    
    # Stop Redis to ensure clean restore
    log_info "Stopping Redis service..."
    kubectl exec -n "$NAMESPACE" "$redis_pod" -c redis -- redis-cli SHUTDOWN NOSAVE || true
    
    # Wait a moment for shutdown
    sleep 5
    
    # Copy backup file to pod
    kubectl cp "$restore_file" -n "$NAMESPACE" "$redis_pod:/data/dump.rdb" -c redis
    
    # Restart Redis pod to load the restored data
    log_info "Restarting Redis pod..."
    kubectl delete pod "$redis_pod" -n "$NAMESPACE"
    
    # Wait for new pod to be ready
    kubectl wait --for=condition=ready pods -l component=cache -n "$NAMESPACE" --timeout=120s
    
    # Cleanup temporary file
    if [[ "$restore_file" != "$BACKUP_FILE" ]]; then
        rm -f "$restore_file"
    fi
    
    log_success "Redis restore completed successfully"
}

# Function to restore storage data
restore_storage() {
    log_info "Starting storage data restore..."
    
    # Get API pod (any one will do for storage)
    local api_pod
    api_pod=$(kubectl get pods -n "$NAMESPACE" -l component=api -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$api_pod" ]]; then
        log_error "API pod not found"
        exit 1
    fi
    
    log_info "Found API pod: $api_pod"
    
    # Create temporary directory in pod
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- mkdir -p /tmp/restore
    
    # Copy backup file to pod
    kubectl cp "$BACKUP_FILE" -n "$NAMESPACE" "$api_pod:/tmp/restore/storage.tar.gz" -c fastapi
    
    # Backup existing storage (just in case)
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- \
        mv /app/storage /app/storage.backup.$(date +%s) 2>/dev/null || true
    
    # Create new storage directory
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- mkdir -p /app/storage
    
    # Extract backup
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- \
        tar -xzf /tmp/restore/storage.tar.gz -C /app/storage
    
    # Set proper permissions
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- \
        chown -R appuser:appuser /app/storage
    
    # Cleanup temporary files in pod
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- rm -rf /tmp/restore
    
    log_success "Storage restore completed successfully"
}

# Function to restore Kubernetes configurations
restore_kubernetes() {
    log_info "Starting Kubernetes configurations restore..."
    
    # Create temporary directory
    local temp_dir
    temp_dir=$(mktemp -d)
    
    # Extract backup
    tar -xzf "$BACKUP_FILE" -C "$temp_dir"
    
    # Find the extracted directory
    local config_dir
    config_dir=$(find "$temp_dir" -name "k8s_*" -type d | head -1)
    
    if [[ -z "$config_dir" ]]; then
        log_error "Could not find Kubernetes configurations in backup"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    log_warning "⚠️  Kubernetes restore will update ConfigMaps, Services, and other resources"
    log_warning "Secrets will NOT be restored for security reasons"
    
    # Apply configurations (skip secrets for security)
    for config_file in "$config_dir"/*.yaml; do
        if [[ "$(basename "$config_file")" == "secrets-structure.yaml" ]]; then
            log_info "Skipping secrets restore for security"
            continue
        fi
        
        log_info "Applying: $(basename "$config_file")"
        kubectl apply -f "$config_file" -n "$NAMESPACE"
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "Kubernetes configurations restore completed successfully"
}

# Function to run post-restore checks
run_post_restore_checks() {
    log_info "Running post-restore checks..."
    
    # Wait for all deployments to be ready
    local deployments=(
        "postgres-deployment"
        "redis-deployment"
        "fastapi-deployment"
    )
    
    for deployment in "${deployments[@]}"; do
        log_info "Checking deployment: $deployment"
        
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &>/dev/null; then
            kubectl wait --for=condition=available \
                --timeout=300s \
                "deployment/$deployment" \
                -n "$NAMESPACE" || log_warning "Deployment $deployment not ready within timeout"
        else
            log_warning "Deployment $deployment not found"
        fi
    done
    
    # Health check
    log_info "Running health check..."
    
    local service_port
    service_port=$(kubectl get svc fastapi-service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "8000")
    
    # Port forward for testing
    kubectl port-forward svc/fastapi-service "$service_port:$service_port" -n "$NAMESPACE" &
    local port_forward_pid=$!
    
    # Wait for port forward to be ready
    sleep 10
    
    # Health check with retries
    local max_retries=10
    local retry_count=0
    local health_check_passed=false
    
    while [[ $retry_count -lt $max_retries ]]; do
        log_info "Health check attempt $((retry_count + 1))/$max_retries..."
        
        if curl -sf "http://localhost:$service_port/health" > /dev/null 2>&1; then
            health_check_passed=true
            break
        fi
        
        ((retry_count++))
        sleep 10
    done
    
    # Cleanup port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [[ "$health_check_passed" == "true" ]]; then
        log_success "Post-restore health checks passed"
    else
        log_error "Post-restore health checks failed"
        log_warning "Please check application logs and configuration"
    fi
}

# Function to rollback restore (if pre-restore backup was created)
rollback_restore() {
    log_warning "Rolling back restore operation..."
    
    if [[ -f /tmp/plataforma_pre_restore_backup_dir ]]; then
        local pre_restore_dir
        pre_restore_dir=$(cat /tmp/plataforma_pre_restore_backup_dir)
        
        if [[ -d "$pre_restore_dir" ]]; then
            log_info "Found pre-restore backup in: $pre_restore_dir"
            
            # Find the most recent database backup in the pre-restore directory
            local db_backup
            db_backup=$(find "$pre_restore_dir" -name "*postgres*" -type f | head -1)
            
            if [[ -n "$db_backup" ]]; then
                log_info "Restoring from pre-restore backup: $db_backup"
                FORCE_RESTORE=true restore_database "$db_backup"
                log_success "Rollback completed"
            else
                log_error "No database backup found in pre-restore directory"
            fi
        else
            log_error "Pre-restore backup directory not found"
        fi
        
        rm -f /tmp/plataforma_pre_restore_backup_dir
    else
        log_error "No pre-restore backup information found"
    fi
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Restore failed with exit code: $exit_code"
        
        if [[ "$FORCE_RESTORE" != "true" ]]; then
            read -p "Do you want to rollback the restore? (y/n): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback_restore
            fi
        fi
    fi
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Main restore function
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    log_info "Starting restore process..."
    
    # Show usage if help requested
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Auto-detect backup type if not specified
    if [[ "$RESTORE_TYPE" == "auto" ]]; then
        RESTORE_TYPE=$(detect_backup_type)
        if [[ "$RESTORE_TYPE" == "unknown" ]]; then
            log_error "Could not auto-detect restore type. Please specify manually."
            exit 1
        fi
        log_info "Auto-detected restore type: $RESTORE_TYPE"
    fi
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Backup file: $BACKUP_FILE"
    log_info "Restore type: $RESTORE_TYPE"
    
    # Confirm restore operation
    confirm_restore
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Perform restore based on type
    case "$RESTORE_TYPE" in
        database)
            restore_database
            ;;
        redis)
            restore_redis
            ;;
        storage)
            restore_storage
            ;;
        kubernetes|k8s)
            restore_kubernetes
            ;;
        *)
            log_error "Unknown restore type: $RESTORE_TYPE"
            log_error "Supported types: database, redis, storage, kubernetes"
            exit 1
            ;;
    esac
    
    # Run post-restore checks
    run_post_restore_checks
    
    log_success "Restore process completed successfully! 🎉"
    
    # Cleanup pre-restore backup reference
    rm -f /tmp/plataforma_pre_restore_backup_dir
}

# Run main function
main "$@"