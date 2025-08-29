#!/bin/bash
# ==============================================================================
# Deployment Script for Plataforma FastAPI Backend
# ==============================================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_CONFIG_FILE="$SCRIPT_DIR/deploy-config.env"

# Default values
ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
NAMESPACE="plataforma-fastapi"
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

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
Usage: $0 [environment] [image_tag]

Deploy Plataforma FastAPI Backend to Kubernetes

Arguments:
  environment    Target environment (staging, production) [default: staging]
  image_tag      Docker image tag to deploy [default: latest]

Environment Variables:
  DRY_RUN=true        Perform a dry run without actual deployment
  SKIP_TESTS=true     Skip pre-deployment tests
  FORCE_DEPLOY=true   Force deployment even if health checks fail

Examples:
  $0                                    # Deploy to staging with latest tag
  $0 production v1.2.0                 # Deploy version v1.2.0 to production
  DRY_RUN=true $0 production v1.2.0    # Dry run for production deployment

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
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is installed (optional)
    if ! command -v helm &> /dev/null; then
        log_warning "helm is not installed - some features may be unavailable"
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
    
    log_success "Prerequisites check passed"
}

# Function to load configuration
load_config() {
    log_info "Loading deployment configuration..."
    
    if [[ -f "$DEPLOY_CONFIG_FILE" ]]; then
        # shellcheck source=./deploy-config.env
        source "$DEPLOY_CONFIG_FILE"
        log_info "Loaded configuration from $DEPLOY_CONFIG_FILE"
    else
        log_warning "Configuration file $DEPLOY_CONFIG_FILE not found, using defaults"
    fi
    
    # Environment-specific configurations
    case "$ENVIRONMENT" in
        staging)
            REGISTRY="${REGISTRY:-ghcr.io}"
            IMAGE_NAME="${IMAGE_NAME:-plataforma-fastapi}"
            REPLICAS="${REPLICAS:-2}"
            RESOURCE_LIMITS_CPU="${RESOURCE_LIMITS_CPU:-1000m}"
            RESOURCE_LIMITS_MEMORY="${RESOURCE_LIMITS_MEMORY:-2Gi}"
            ;;
        production)
            REGISTRY="${REGISTRY:-ghcr.io}"
            IMAGE_NAME="${IMAGE_NAME:-plataforma-fastapi}"
            REPLICAS="${REPLICAS:-3}"
            RESOURCE_LIMITS_CPU="${RESOURCE_LIMITS_CPU:-2000m}"
            RESOURCE_LIMITS_MEMORY="${RESOURCE_LIMITS_MEMORY:-4Gi}"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_error "Supported environments: staging, production"
            exit 1
            ;;
    esac
    
    # Construct full image name
    FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Full image name: $FULL_IMAGE_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "Replicas: $REPLICAS"
}

# Function to validate image existence
validate_image() {
    log_info "Validating Docker image: $FULL_IMAGE_NAME"
    
    if ! docker manifest inspect "$FULL_IMAGE_NAME" &> /dev/null; then
        log_error "Docker image $FULL_IMAGE_NAME does not exist or is not accessible"
        log_error "Please build and push the image first, or check your credentials"
        exit 1
    fi
    
    log_success "Docker image validated successfully"
}

# Function to run pre-deployment tests
run_pre_deployment_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping pre-deployment tests"
        return 0
    fi
    
    log_info "Running pre-deployment tests..."
    
    # Run a quick container test
    local test_container_id
    test_container_id=$(docker run -d \
        -e ENVIRONMENT=testing \
        -e DATABASE_URL=sqlite:///tmp/test.db \
        -e REDIS_URL=redis://localhost:6379/0 \
        -e SECRET_KEY=test-secret-key \
        -e JWT_SECRET_KEY=test-jwt-secret-key \
        "$FULL_IMAGE_NAME" \
        python -c "
import asyncio
from app.main import create_app

async def test_app():
    app = create_app()
    print('App creation test passed')

asyncio.run(test_app())
" || echo "failed")
    
    if [[ "$test_container_id" == "failed" ]]; then
        log_error "Pre-deployment image test failed"
        exit 1
    fi
    
    # Wait a moment then cleanup
    sleep 2
    docker stop "$test_container_id" &> /dev/null || true
    docker rm "$test_container_id" &> /dev/null || true
    
    log_success "Pre-deployment tests passed"
}

# Function to create or update namespace
ensure_namespace() {
    log_info "Ensuring namespace $NAMESPACE exists..."
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would create namespace: $NAMESPACE"
        else
            kubectl create namespace "$NAMESPACE"
            kubectl label namespace "$NAMESPACE" name="$NAMESPACE" --overwrite
            log_success "Created namespace: $NAMESPACE"
        fi
    else
        log_info "Namespace $NAMESPACE already exists"
    fi
}

# Function to apply Kubernetes manifests
apply_manifests() {
    log_info "Applying Kubernetes manifests..."
    
    local k8s_dir="$PROJECT_ROOT/k8s"
    local temp_dir
    temp_dir=$(mktemp -d)
    
    # Copy manifests to temp directory for modification
    cp -r "$k8s_dir"/* "$temp_dir"/
    
    # Update image references in manifests
    log_info "Updating image references to: $FULL_IMAGE_NAME"
    find "$temp_dir" -name "*.yaml" -type f -exec sed -i.bak "s|plataforma-fastapi:latest|$FULL_IMAGE_NAME|g" {} \;
    
    # Update resource limits if specified
    if [[ -n "${RESOURCE_LIMITS_CPU:-}" ]] && [[ -n "${RESOURCE_LIMITS_MEMORY:-}" ]]; then
        log_info "Updating resource limits: CPU=$RESOURCE_LIMITS_CPU, Memory=$RESOURCE_LIMITS_MEMORY"
        find "$temp_dir" -name "*.yaml" -type f -exec sed -i.bak "s|cpu: \"1000m\"|cpu: \"$RESOURCE_LIMITS_CPU\"|g" {} \;
        find "$temp_dir" -name "*.yaml" -type f -exec sed -i.bak "s|memory: \"2Gi\"|memory: \"$RESOURCE_LIMITS_MEMORY\"|g" {} \;
    fi
    
    # Update replica count
    if [[ -n "${REPLICAS:-}" ]]; then
        log_info "Setting replica count to: $REPLICAS"
        find "$temp_dir" -name "fastapi.yaml" -type f -exec sed -i.bak "s|replicas: .*|replicas: $REPLICAS|g" {} \;
    fi
    
    # Apply manifests in order
    local manifests=(
        "namespace.yaml"
        "configmap.yaml"
        "secrets.yaml"
        "postgres.yaml"
        "redis.yaml"
        "fastapi.yaml"
        "ingress.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local manifest_path="$temp_dir/$manifest"
        
        if [[ -f "$manifest_path" ]]; then
            log_info "Applying manifest: $manifest"
            
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY RUN] Would apply: $manifest"
                kubectl apply -f "$manifest_path" --dry-run=client
            else
                kubectl apply -f "$manifest_path"
            fi
        else
            log_warning "Manifest not found: $manifest"
        fi
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "Kubernetes manifests applied successfully"
}

# Function to wait for deployment readiness
wait_for_deployment() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would wait for deployment readiness"
        return 0
    fi
    
    log_info "Waiting for deployment to be ready..."
    
    local deployments=(
        "postgres-deployment"
        "redis-deployment"
        "fastapi-deployment"
    )
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for deployment: $deployment"
        
        if ! kubectl wait --for=condition=available \
            --timeout=600s \
            "deployment/$deployment" \
            -n "$NAMESPACE"; then
            log_error "Deployment $deployment failed to become ready within timeout"
            
            # Show logs for debugging
            log_info "Recent logs for $deployment:"
            kubectl logs -l app=plataforma-fastapi -n "$NAMESPACE" --tail=50 || true
            
            if [[ "$FORCE_DEPLOY" != "true" ]]; then
                exit 1
            else
                log_warning "Continuing deployment despite failed readiness check (FORCE_DEPLOY=true)"
            fi
        fi
    done
    
    log_success "All deployments are ready"
}

# Function to run health checks
run_health_checks() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would run health checks"
        return 0
    fi
    
    log_info "Running health checks..."
    
    # Get service endpoint
    local service_port
    service_port=$(kubectl get svc fastapi-service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "8000")
    
    # Port forward for testing
    log_info "Setting up port forward for health check..."
    kubectl port-forward svc/fastapi-service "$service_port:$service_port" -n "$NAMESPACE" &
    local port_forward_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
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
        log_success "Health checks passed"
    else
        log_error "Health checks failed after $max_retries attempts"
        
        if [[ "$FORCE_DEPLOY" != "true" ]]; then
            exit 1
        else
            log_warning "Continuing despite failed health checks (FORCE_DEPLOY=true)"
        fi
    fi
}

# Function to show deployment summary
show_deployment_summary() {
    log_info "Deployment Summary:"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Image: $FULL_IMAGE_NAME"
    echo "Namespace: $NAMESPACE"
    echo "Replicas: ${REPLICAS:-unknown}"
    echo ""
    
    if [[ "$DRY_RUN" != "true" ]]; then
        echo "Kubernetes Resources:"
        kubectl get all -n "$NAMESPACE" 2>/dev/null || log_warning "Could not retrieve resource information"
        echo ""
        
        echo "Service Endpoints:"
        kubectl get ingress -n "$NAMESPACE" 2>/dev/null || log_warning "Could not retrieve ingress information"
    fi
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    kubectl rollout undo deployment/fastapi-deployment -n "$NAMESPACE"
    kubectl rollout status deployment/fastapi-deployment -n "$NAMESPACE"
    
    log_info "Deployment rolled back successfully"
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code: $exit_code"
        
        if [[ "$DRY_RUN" != "true" ]] && [[ "$FORCE_DEPLOY" != "true" ]]; then
            read -p "Do you want to rollback the deployment? (y/n): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback_deployment
            fi
        fi
    fi
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Main deployment function
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    log_info "Starting deployment process..."
    
    # Show usage if help requested
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Load configuration
    load_config
    
    # Validate image
    validate_image
    
    # Run pre-deployment tests
    run_pre_deployment_tests
    
    # Ensure namespace exists
    ensure_namespace
    
    # Apply Kubernetes manifests
    apply_manifests
    
    # Wait for deployment readiness
    wait_for_deployment
    
    # Run health checks
    run_health_checks
    
    # Show deployment summary
    show_deployment_summary
    
    log_success "Deployment completed successfully! 🎉"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "This was a dry run - no actual changes were made"
    fi
}

# Run main function
main "$@"