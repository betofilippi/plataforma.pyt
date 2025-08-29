#!/bin/bash

# Build All Script
# Orchestrates the build process for the entire monorepo

set -e

echo "🏗️  Starting monorepo build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_MODE=${1:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
PARALLEL=${PARALLEL:-true}

echo -e "${BLUE}Build Configuration:${NC}"
echo "  Mode: $BUILD_MODE"
echo "  Skip Tests: $SKIP_TESTS"
echo "  Parallel: $PARALLEL"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local desc="$2"
    
    log "${YELLOW}Running: $desc${NC}"
    if ! eval "$cmd"; then
        log "${RED}❌ Failed: $desc${NC}"
        exit 1
    fi
    log "${GREEN}✅ Completed: $desc${NC}"
}

# Check dependencies
log "${BLUE}📋 Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    log "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log "${RED}❌ npm is not installed${NC}"
    exit 1
fi

node_version=$(node --version)
log "${GREEN}✅ Node.js version: $node_version${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    run_command "npm ci --prefer-offline --no-audit --no-fund" "Installing dependencies"
fi

# Clean previous builds
log "${BLUE}🧹 Cleaning previous builds...${NC}"
run_command "rm -rf dist coverage .vite" "Cleaning dist and cache directories"

# No packages to build anymore
log "${GREEN}✅ No packages to build (100% Python backend)${NC}"

# Type checking
if [ "$SKIP_TESTS" != "true" ]; then
    run_command "npm run typecheck" "Type checking"
fi

# Build main application
log "${BLUE}🏗️  Building main application...${NC}"

# Set build environment
export NODE_ENV="$BUILD_MODE"
export VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VITE_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export VITE_VERSION=$(node -p "require('./package.json').version")

if [ "$BUILD_MODE" = "production" ]; then
    export VITE_DEMO_MODE=false
else
    export VITE_DEMO_MODE=true
fi

# Build client (frontend)
run_command "npm run build:client" "Building client application"

# Python backend doesn't need building
log "${GREEN}✅ Python backend ready (no build required)${NC}"

# Run tests if not skipped
if [ "$SKIP_TESTS" != "true" ]; then
    log "${BLUE}🧪 Running tests...${NC}"
    run_command "npm test -- --coverage --watchAll=false" "Running unit tests"
    
    # Integration tests (if database is available)
    if [ -n "$DATABASE_URL" ]; then
        run_command "npm run test:integration" "Running integration tests"
    else
        log "${YELLOW}⚠️  Skipping integration tests (no DATABASE_URL)${NC}"
    fi
fi

# Generate build report
log "${BLUE}📊 Generating build report...${NC}"

cat > build-report.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "mode": "$BUILD_MODE",
  "version": "$VITE_VERSION",
  "commit": "$VITE_COMMIT_HASH",
  "node_version": "$node_version",
  "backend": "python"
}
EOF

# Build size analysis
if [ -f "dist/client/index.html" ]; then
    client_size=$(du -sh dist/client | cut -f1)
    log "${GREEN}📏 Client build size: $client_size${NC}"
fi

# Python backend size
if [ -d "python-backend" ]; then
    backend_size=$(du -sh python-backend | cut -f1)
    log "${GREEN}📏 Python backend size: $backend_size${NC}"
fi

# Bundle analysis (if analyzer is available)
if command -v npx &> /dev/null; then
    log "${BLUE}📈 Analyzing bundle...${NC}"
    npx vite-bundle-analyzer dist/client --static --report > bundle-report.html 2>/dev/null || true
fi

log "${GREEN}🎉 Build completed successfully!${NC}"
log "${BLUE}Build artifacts:${NC}"
log "  📂 Client: dist/client/"
log "  📂 Backend: python-backend/" 
log "  📂 Packages: packages/*/dist/"
log "  📊 Report: build-report.json"

if [ -f "bundle-report.html" ]; then
    log "  📈 Bundle Analysis: bundle-report.html"
fi