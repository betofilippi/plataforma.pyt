#!/bin/bash
# ==============================================================================
# Backup Script for Plataforma FastAPI Backend
# ==============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-production}"
BACKUP_TYPE="${2:-database}"
NAMESPACE="plataforma-fastapi"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

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
Usage: $0 [environment] [backup_type]

Backup Plataforma FastAPI Backend data

Arguments:
  environment    Target environment (staging, production) [default: production]
  backup_type    Type of backup (database, redis, storage, all) [default: database]

Environment Variables:
  BACKUP_DIR=/path/to/backups    Directory to store backups
  RETENTION_DAYS=7               Number of days to retain backups

Examples:
  $0                             # Backup production database
  $0 staging all                 # Backup all data from staging
  $0 production storage          # Backup only storage data from production

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
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log_success "Prerequisites check passed"
}

# Function to backup PostgreSQL database
backup_database() {
    log_info "Starting PostgreSQL database backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/postgres_${ENVIRONMENT}_${timestamp}.sql"
    
    # Get database pod
    local db_pod
    db_pod=$(kubectl get pods -n "$NAMESPACE" -l component=database -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$db_pod" ]]; then
        log_error "PostgreSQL pod not found"
        exit 1
    fi
    
    log_info "Found database pod: $db_pod"
    
    # Perform backup
    log_info "Creating database backup: $backup_file"
    
    kubectl exec -n "$NAMESPACE" "$db_pod" -c postgres -- \
        pg_dump -U plataforma -d plataforma_nxt --no-password > "$backup_file"
    
    if [[ -s "$backup_file" ]]; then
        # Compress backup
        gzip "$backup_file"
        backup_file="$backup_file.gz"
        
        local file_size
        file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "Database backup completed: $backup_file ($file_size)"
    else
        log_error "Database backup failed - empty file created"
        rm -f "$backup_file"
        exit 1
    fi
}

# Function to backup Redis data
backup_redis() {
    log_info "Starting Redis data backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/redis_${ENVIRONMENT}_${timestamp}.rdb"
    
    # Get Redis pod
    local redis_pod
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l component=cache -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$redis_pod" ]]; then
        log_error "Redis pod not found"
        exit 1
    fi
    
    log_info "Found Redis pod: $redis_pod"
    
    # Trigger Redis save
    kubectl exec -n "$NAMESPACE" "$redis_pod" -c redis -- redis-cli BGSAVE
    
    # Wait for background save to complete
    local save_completed=false
    local max_wait=300  # 5 minutes
    local wait_time=0
    
    while [[ $wait_time -lt $max_wait ]]; do
        local last_save
        last_save=$(kubectl exec -n "$NAMESPACE" "$redis_pod" -c redis -- redis-cli LASTSAVE)
        
        sleep 5
        wait_time=$((wait_time + 5))
        
        local current_save
        current_save=$(kubectl exec -n "$NAMESPACE" "$redis_pod" -c redis -- redis-cli LASTSAVE)
        
        if [[ "$current_save" != "$last_save" ]]; then
            save_completed=true
            break
        fi
    done
    
    if [[ "$save_completed" != "true" ]]; then
        log_error "Redis background save did not complete within timeout"
        exit 1
    fi
    
    # Copy the RDB file
    kubectl cp -n "$NAMESPACE" "$redis_pod:/data/dump.rdb" "$backup_file" -c redis
    
    if [[ -s "$backup_file" ]]; then
        # Compress backup
        gzip "$backup_file"
        backup_file="$backup_file.gz"
        
        local file_size
        file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "Redis backup completed: $backup_file ($file_size)"
    else
        log_error "Redis backup failed - empty file created"
        rm -f "$backup_file"
        exit 1
    fi
}

# Function to backup storage data
backup_storage() {
    log_info "Starting storage data backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/storage_${ENVIRONMENT}_${timestamp}.tar.gz"
    
    # Get API pod (any one will do for storage)
    local api_pod
    api_pod=$(kubectl get pods -n "$NAMESPACE" -l component=api -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$api_pod" ]]; then
        log_error "API pod not found"
        exit 1
    fi
    
    log_info "Found API pod: $api_pod"
    
    # Create temporary directory in pod
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- mkdir -p /tmp/backup
    
    # Create tar archive of storage directory
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- \
        tar -czf /tmp/backup/storage.tar.gz -C /app/storage .
    
    # Copy backup file from pod
    kubectl cp -n "$NAMESPACE" "$api_pod:/tmp/backup/storage.tar.gz" "$backup_file" -c fastapi
    
    # Cleanup temporary files in pod
    kubectl exec -n "$NAMESPACE" "$api_pod" -c fastapi -- rm -rf /tmp/backup
    
    if [[ -s "$backup_file" ]]; then
        local file_size
        file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "Storage backup completed: $backup_file ($file_size)"
    else
        log_error "Storage backup failed - empty file created"
        rm -f "$backup_file"
        exit 1
    fi
}

# Function to backup Kubernetes configurations
backup_kubernetes_configs() {
    log_info "Starting Kubernetes configurations backup..."
    
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$BACKUP_DIR/k8s_${ENVIRONMENT}_${timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Backup ConfigMaps
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml"
    
    # Backup Secrets (without actual secret data for security)
    kubectl get secrets -n "$NAMESPACE" -o yaml | \
        sed 's/data:/data: {}/g' > "$backup_dir/secrets-structure.yaml"
    
    # Backup Deployments
    kubectl get deployments -n "$NAMESPACE" -o yaml > "$backup_dir/deployments.yaml"
    
    # Backup Services
    kubectl get services -n "$NAMESPACE" -o yaml > "$backup_dir/services.yaml"
    
    # Backup Ingress
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$backup_dir/ingress.yaml"
    
    # Backup PersistentVolumeClaims
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$backup_dir/pvc.yaml"
    
    # Create archive
    local backup_file="$backup_dir.tar.gz"
    tar -czf "$backup_file" -C "$BACKUP_DIR" "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    local file_size
    file_size=$(du -h "$backup_file" | cut -f1)
    
    log_success "Kubernetes configurations backup completed: $backup_file ($file_size)"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "*_${ENVIRONMENT}_*" -type f -mtime +$RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Cleaned up $deleted_count old backup files"
    else
        log_info "No old backup files to clean up"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity: $(basename "$backup_file")"
    
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            log_success "Backup integrity verified: $(basename "$backup_file")"
            return 0
        else
            log_error "Backup integrity check failed: $(basename "$backup_file")"
            return 1
        fi
    elif [[ "$backup_file" == *.tar.gz ]]; then
        if tar -tzf "$backup_file" >/dev/null 2>&1; then
            log_success "Backup integrity verified: $(basename "$backup_file")"
            return 0
        else
            log_error "Backup integrity check failed: $(basename "$backup_file")"
            return 1
        fi
    else
        # For uncompressed files, just check if they exist and are not empty
        if [[ -s "$backup_file" ]]; then
            log_success "Backup file exists and is not empty: $(basename "$backup_file")"
            return 0
        else
            log_error "Backup file is empty or does not exist: $(basename "$backup_file")"
            return 1
        fi
    fi
}

# Function to send notification (if configured)
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification (if webhook is configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        if [[ "$status" == "success" ]]; then
            color="good"
        else
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Discord notification (if webhook is configured)
    if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$message\"}" \
            "$DISCORD_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Main backup function
main() {
    log_info "Starting backup process..."
    
    # Show usage if help requested
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Retention days: $RETENTION_DAYS"
    
    # Perform backups based on type
    case "$BACKUP_TYPE" in
        database)
            backup_database
            ;;
        redis)
            backup_redis
            ;;
        storage)
            backup_storage
            ;;
        kubernetes|k8s)
            backup_kubernetes_configs
            ;;
        all)
            backup_database
            backup_redis
            backup_storage
            backup_kubernetes_configs
            ;;
        *)
            log_error "Unknown backup type: $BACKUP_TYPE"
            log_error "Supported types: database, redis, storage, kubernetes, all"
            exit 1
            ;;
    esac
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Show backup summary
    log_info "Backup Summary:"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Backup type: $BACKUP_TYPE"
    echo "Backup directory: $BACKUP_DIR"
    echo ""
    echo "Recent backups:"
    ls -lah "$BACKUP_DIR" | grep "$ENVIRONMENT" | tail -10 || log_warning "No backups found"
    
    log_success "Backup process completed successfully! 🎉"
    
    # Send success notification
    send_notification "success" "✅ Backup completed successfully for $ENVIRONMENT ($BACKUP_TYPE)"
}

# Error handling
handle_error() {
    log_error "Backup failed with exit code: $?"
    send_notification "error" "❌ Backup failed for $ENVIRONMENT ($BACKUP_TYPE)"
}

trap handle_error ERR

# Run main function
main "$@"