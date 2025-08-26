#!/bin/bash

# Deploy Script
# Handles deployment to various environments

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-$(date +"%Y%m%d.%H%M%S")}
DRY_RUN=${DRY_RUN:-false}
SKIP_TESTS=${SKIP_TESTS:-false}

echo -e "${BLUE}Deployment Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Version: $VERSION"
echo "  Dry Run: $DRY_RUN"
echo "  Skip Tests: $SKIP_TESTS"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local desc="$2"
    local optional="${3:-false}"
    
    log "${YELLOW}Running: $desc${NC}"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "${BLUE}[DRY RUN] Would execute: $cmd${NC}"
        return 0
    fi
    
    if ! eval "$cmd"; then
        if [ "$optional" = "true" ]; then
            log "${YELLOW}⚠️  Optional step failed: $desc${NC}"
            return 0
        else
            log "${RED}❌ Failed: $desc${NC}"
            exit 1
        fi
    fi
    
    log "${GREEN}✅ Completed: $desc${NC}"
}

# Validate environment
log "${BLUE}🔍 Validating deployment environment...${NC}"

case $ENVIRONMENT in
    staging|production|development)
        log "${GREEN}✅ Valid environment: $ENVIRONMENT${NC}"
        ;;
    *)
        log "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        log "Valid environments: staging, production, development"
        exit 1
        ;;
esac

# Check required environment variables based on deployment target
check_env_vars() {
    local required_vars=()
    
    case $ENVIRONMENT in
        staging)
            required_vars=("NETLIFY_AUTH_TOKEN" "NETLIFY_STAGING_SITE_ID" "RAILWAY_STAGING_WEBHOOK")
            ;;
        production)
            required_vars=("NETLIFY_AUTH_TOKEN" "NETLIFY_PRODUCTION_SITE_ID" "RAILWAY_PRODUCTION_WEBHOOK")
            ;;
    esac
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log "${RED}❌ Missing required environment variable: $var${NC}"
            exit 1
        fi
    done
    
    if [ ${#required_vars[@]} -gt 0 ]; then
        log "${GREEN}✅ All required environment variables are set${NC}"
    fi
}

check_env_vars

# Pre-deployment checks
log "${BLUE}🔍 Running pre-deployment checks...${NC}"

if [ "$SKIP_TESTS" != "true" ]; then
    run_command "./.github/scripts/test-all.sh unit" "Pre-deployment tests"
fi

# Check git status
if [ "$DRY_RUN" != "true" ]; then
    if ! git diff-index --quiet HEAD --; then
        log "${YELLOW}⚠️  Working directory has uncommitted changes${NC}"
        if [ "$ENVIRONMENT" = "production" ]; then
            log "${RED}❌ Production deployments require clean working directory${NC}"
            exit 1
        fi
    fi
fi

# Build application
log "${BLUE}🏗️  Building application for $ENVIRONMENT...${NC}"

# Set environment-specific variables
case $ENVIRONMENT in
    staging)
        export NODE_ENV=staging
        export VITE_ENVIRONMENT=staging
        export VITE_API_URL=https://api-staging.plataforma.app
        export VITE_DEMO_MODE=true
        ;;
    production)
        export NODE_ENV=production
        export VITE_ENVIRONMENT=production
        export VITE_API_URL=https://api.plataforma.app
        export VITE_DEMO_MODE=false
        ;;
    development)
        export NODE_ENV=development
        export VITE_ENVIRONMENT=development
        export VITE_API_URL=http://localhost:4000
        export VITE_DEMO_MODE=true
        ;;
esac

export VITE_VERSION=$VERSION
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

run_command "./.github/scripts/build-all.sh" "Building application"

# Create deployment package
log "${BLUE}📦 Creating deployment package...${NC}"

DEPLOY_DIR="deploy-$VERSION"
mkdir -p "$DEPLOY_DIR"

# Copy build artifacts
cp -r dist "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"

# Copy deployment configuration
if [ -f "netlify.toml" ]; then
    cp netlify.toml "$DEPLOY_DIR/"
fi

if [ -f "Dockerfile" ]; then
    cp Dockerfile "$DEPLOY_DIR/"
fi

# Create deployment manifest
cat > "$DEPLOY_DIR/deployment-manifest.json" << EOF
{
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$VITE_COMMIT_HASH",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "build_artifacts": {
    "client": "dist/client/",
    "server": "dist/server/",
    "packages": "packages/*/dist/"
  }
}
EOF

log "${GREEN}✅ Deployment package created: $DEPLOY_DIR${NC}"

# Deploy frontend (Netlify)
deploy_frontend() {
    log "${BLUE}🌐 Deploying frontend to Netlify...${NC}"
    
    local site_id=""
    case $ENVIRONMENT in
        staging)
            site_id="$NETLIFY_STAGING_SITE_ID"
            ;;
        production)
            site_id="$NETLIFY_PRODUCTION_SITE_ID"
            ;;
    esac
    
    if [ -n "$site_id" ]; then
        run_command "npx netlify deploy --prod --dir=$DEPLOY_DIR/dist/client --site=$site_id --message='Deploy v$VERSION'" "Netlify deployment"
    else
        log "${YELLOW}⚠️  Skipping Netlify deployment (no site ID configured)${NC}"
    fi
}

# Deploy backend (Railway/Docker)
deploy_backend() {
    log "${BLUE}🖥️  Deploying backend...${NC}"
    
    local webhook_url=""
    case $ENVIRONMENT in
        staging)
            webhook_url="$RAILWAY_STAGING_WEBHOOK"
            ;;
        production)
            webhook_url="$RAILWAY_PRODUCTION_WEBHOOK"
            ;;
    esac
    
    if [ -n "$webhook_url" ]; then
        # Trigger Railway deployment
        run_command "curl -X POST '$webhook_url' -H 'Content-Type: application/json' -d '{\"version\": \"$VERSION\"}'" "Railway deployment trigger"
    else
        log "${YELLOW}⚠️  Skipping backend deployment (no webhook configured)${NC}"
    fi
}

# Database migrations (if needed)
deploy_database() {
    log "${BLUE}🗄️  Running database migrations...${NC}"
    
    if [ -f "database/migrate.cjs" ]; then
        # Set database URL for environment
        case $ENVIRONMENT in
            staging)
                export DATABASE_URL="$STAGING_DATABASE_URL"
                ;;
            production)
                export DATABASE_URL="$PRODUCTION_DATABASE_URL"
                ;;
        esac
        
        if [ -n "$DATABASE_URL" ]; then
            run_command "npm run db:migrate" "Database migrations" true
        else
            log "${YELLOW}⚠️  Skipping database migrations (no DATABASE_URL)${NC}"
        fi
    else
        log "${YELLOW}⚠️  No database migration script found${NC}"
    fi
}

# Execute deployment based on environment
case $ENVIRONMENT in
    staging)
        deploy_frontend
        deploy_backend
        deploy_database
        ;;
    production)
        # Production requires additional confirmations
        if [ "$DRY_RUN" != "true" ]; then
            echo -n "⚠️  Are you sure you want to deploy to PRODUCTION? [y/N] "
            read -r confirmation
            if [[ ! $confirmation =~ ^[Yy]$ ]]; then
                log "${YELLOW}Deployment cancelled by user${NC}"
                exit 0
            fi
        fi
        
        deploy_frontend
        deploy_backend
        deploy_database
        ;;
    development)
        log "${BLUE}Development deployment (local only)${NC}"
        run_command "npm start" "Starting development server"
        ;;
esac

# Post-deployment verification
post_deployment_checks() {
    log "${BLUE}🔍 Running post-deployment checks...${NC}"
    
    local app_url=""
    case $ENVIRONMENT in
        staging)
            app_url="https://staging.plataforma.app"
            ;;
        production)
            app_url="https://plataforma.app"
            ;;
        development)
            app_url="http://localhost:3030"
            ;;
    esac
    
    if [ -n "$app_url" ] && [ "$DRY_RUN" != "true" ]; then
        # Wait for deployment to propagate
        sleep 30
        
        # Basic health check
        if curl -f "$app_url" > /dev/null 2>&1; then
            log "${GREEN}✅ Application is responding at $app_url${NC}"
        else
            log "${RED}❌ Application health check failed${NC}"
            return 1
        fi
        
        # Run smoke tests if available
        if [ -f "e2e/smoke.spec.ts" ]; then
            run_command "npx playwright test e2e/smoke.spec.ts" "Smoke tests" true
        fi
    fi
}

if [ "$ENVIRONMENT" != "development" ]; then
    post_deployment_checks
fi

# Create deployment record
log "${BLUE}📋 Recording deployment...${NC}"

DEPLOYMENT_RECORD="deployments/deployment-$VERSION-$ENVIRONMENT.json"
mkdir -p deployments

cat > "$DEPLOYMENT_RECORD" << EOF
{
  "id": "$VERSION-$ENVIRONMENT",
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$VITE_COMMIT_HASH",
  "deployed_by": "${GITHUB_ACTOR:-$(whoami)}",
  "status": "completed",
  "artifacts": {
    "package": "$DEPLOY_DIR",
    "manifest": "$DEPLOY_DIR/deployment-manifest.json"
  }
}
EOF

log "${GREEN}✅ Deployment record created: $DEPLOYMENT_RECORD${NC}"

# Cleanup
log "${BLUE}🧹 Cleaning up deployment artifacts...${NC}"
if [ "$DRY_RUN" != "true" ]; then
    # Keep deployment package for rollback capability
    if [ -d "$DEPLOY_DIR" ]; then
        tar -czf "deployments/deploy-$VERSION-$ENVIRONMENT.tar.gz" "$DEPLOY_DIR"
        rm -rf "$DEPLOY_DIR"
        log "${GREEN}✅ Deployment package archived${NC}"
    fi
fi

# Success message
log "${GREEN}🎉 Deployment completed successfully!${NC}"
log "${BLUE}Deployment Summary:${NC}"
log "  Environment: $ENVIRONMENT"
log "  Version: $VERSION"
log "  Commit: $VITE_COMMIT_HASH"
log "  Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ "$ENVIRONMENT" != "development" ]; then
    case $ENVIRONMENT in
        staging)
            log "  URL: https://staging.plataforma.app"
            ;;
        production)
            log "  URL: https://plataforma.app"
            ;;
    esac
fi