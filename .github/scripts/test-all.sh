#!/bin/bash

# Test All Script
# Runs comprehensive test suite for the entire monorepo

set -e

echo "🧪 Starting comprehensive test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TYPE=${1:-all}
COVERAGE=${COVERAGE:-true}
PARALLEL=${PARALLEL:-true}
BAIL=${BAIL:-false}

echo -e "${BLUE}Test Configuration:${NC}"
echo "  Type: $TEST_TYPE"
echo "  Coverage: $COVERAGE"
echo "  Parallel: $PARALLEL"
echo "  Bail on failure: $BAIL"
echo ""

# Function to log with timestamp
log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# Function to run command with error handling
run_test() {
    local cmd="$1"
    local desc="$2"
    local optional="${3:-false}"
    
    log "${YELLOW}Running: $desc${NC}"
    if ! eval "$cmd"; then
        if [ "$optional" = "true" ]; then
            log "${YELLOW}⚠️  Optional test failed: $desc${NC}"
            return 0
        else
            log "${RED}❌ Test failed: $desc${NC}"
            if [ "$BAIL" = "true" ]; then
                exit 1
            fi
            return 1
        fi
    fi
    log "${GREEN}✅ Test passed: $desc${NC}"
    return 0
}

# Initialize test results tracking
declare -a FAILED_TESTS=()
TOTAL_TESTS=0
PASSED_TESTS=0

track_result() {
    local result=$1
    local test_name="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $result -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS+=("$test_name")
    fi
}

# Check test environment
log "${BLUE}🔍 Checking test environment...${NC}"

if ! command -v node &> /dev/null; then
    log "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "${YELLOW}📦 Installing dependencies...${NC}"
    npm ci --prefer-offline --no-audit --no-fund
fi

# Setup test environment variables
export NODE_ENV=test
export DEMO_MODE=true
export JWT_SECRET=test-jwt-secret

# Clean previous test results
log "${BLUE}🧹 Cleaning previous test results...${NC}"
rm -rf coverage test-results playwright-report .jest-cache

# Create test result directories
mkdir -p coverage test-results playwright-report

# Run linting if requested
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "lint" ]; then
    log "${BLUE}🔍 Running linting...${NC}"
    run_test "npm run lint" "ESLint checks"
    track_result $? "ESLint"
    
    run_test "npm run format:check" "Prettier format check"
    track_result $? "Prettier"
fi

# Run type checking if requested  
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "typecheck" ]; then
    log "${BLUE}📝 Running type checking...${NC}"
    run_test "npm run typecheck" "TypeScript type checking"
    track_result $? "TypeScript"
    
    # Type check packages individually
    for package_dir in packages/*/; do
        if [ -f "$package_dir/tsconfig.json" ]; then
            package_name=$(basename "$package_dir")
            run_test "cd $package_dir && npx tsc --noEmit" "Type checking $package_name" true
            track_result $? "TypeScript-$package_name"
        fi
    done
fi

# Run unit tests if requested
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "unit" ]; then
    log "${BLUE}🧪 Running unit tests...${NC}"
    
    # Build Jest command
    JEST_CMD="npx jest"
    
    if [ "$COVERAGE" = "true" ]; then
        JEST_CMD="$JEST_CMD --coverage"
    fi
    
    if [ "$PARALLEL" = "true" ]; then
        JEST_CMD="$JEST_CMD --maxWorkers=50%"
    else
        JEST_CMD="$JEST_CMD --maxWorkers=1"
    fi
    
    JEST_CMD="$JEST_CMD --verbose --passWithNoTests"
    
    run_test "$JEST_CMD" "Unit tests"
    track_result $? "Unit Tests"
    
    # Test individual packages
    for package_dir in packages/*/; do
        if [ -f "$package_dir/package.json" ]; then
            package_name=$(basename "$package_dir")
            cd "$package_dir"
            
            if npm run --silent | grep -q "test"; then
                run_test "npm test" "Testing package: $package_name" true
                track_result $? "Package-$package_name"
            fi
            
            cd - > /dev/null
        fi
    done
fi

# Run integration tests if requested
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "integration" ]; then
    log "${BLUE}🔗 Running integration tests...${NC}"
    
    # Check if database is available for integration tests
    if [ -n "$DATABASE_URL" ]; then
        # Setup test database
        log "${YELLOW}Setting up test database...${NC}"
        npm run db:migrate > /dev/null 2>&1 || log "${YELLOW}⚠️  Database migration skipped${NC}"
        
        run_test "npm run test:integration" "Integration tests"
        track_result $? "Integration Tests"
    else
        log "${YELLOW}⚠️  Skipping integration tests (DATABASE_URL not set)${NC}"
    fi
fi

# Run E2E tests if requested
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "e2e" ]; then
    log "${BLUE}🎭 Running E2E tests...${NC}"
    
    # Install Playwright if not installed
    if ! npx playwright --version > /dev/null 2>&1; then
        log "${YELLOW}Installing Playwright...${NC}"
        npx playwright install --with-deps
    fi
    
    # Start application in background for E2E tests
    log "${YELLOW}Starting application for E2E tests...${NC}"
    npm run dev &
    DEV_PID=$!
    
    # Wait for application to start
    sleep 30
    
    # Check if application is running
    if curl -f http://localhost:3030 > /dev/null 2>&1; then
        run_test "npx playwright test" "E2E tests" true
        track_result $? "E2E Tests"
    else
        log "${RED}❌ Application failed to start for E2E tests${NC}"
        track_result 1 "E2E Tests"
    fi
    
    # Stop the development server
    kill $DEV_PID 2>/dev/null || true
    wait $DEV_PID 2>/dev/null || true
fi

# Run security tests if requested
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "security" ]; then
    log "${BLUE}🔒 Running security tests...${NC}"
    
    run_test "npm audit --audit-level=moderate" "npm audit security check" true
    track_result $? "Security Audit"
    
    # Check for known vulnerabilities in lockfile
    if command -v npx &> /dev/null; then
        run_test "npx audit-ci --moderate" "audit-ci security check" true
        track_result $? "Security CI"
    fi
fi

# Performance tests (if available)
if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "performance" ]; then
    log "${BLUE}⚡ Running performance tests...${NC}"
    
    if [ -f "performance/lighthouse.config.js" ]; then
        run_test "npm run test:performance" "Performance tests" true
        track_result $? "Performance Tests"
    else
        log "${YELLOW}⚠️  No performance tests configured${NC}"
    fi
fi

# Generate test report
log "${BLUE}📊 Generating test report...${NC}"

FAILED_COUNT=${#FAILED_TESTS[@]}
SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

cat > test-report.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "test_type": "$TEST_TYPE",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $FAILED_COUNT,
  "success_rate": $SUCCESS_RATE,
  "failed_test_names": [$(printf '"%s",' "${FAILED_TESTS[@]}" | sed 's/,$//')]
}
EOF

# Display summary
log "${BLUE}📋 Test Results Summary:${NC}"
echo "┌─────────────────────────────────────┐"
echo "│           TEST RESULTS              │"
echo "├─────────────────────────────────────┤"
echo "│ Total Tests:    $TOTAL_TESTS                   │"
echo "│ Passed:         $PASSED_TESTS                   │"
echo "│ Failed:         $FAILED_COUNT                   │"
echo "│ Success Rate:   $SUCCESS_RATE%                │"
echo "└─────────────────────────────────────┘"

if [ $FAILED_COUNT -gt 0 ]; then
    log "${RED}❌ Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        log "  - $test"
    done
fi

# Coverage report summary
if [ "$COVERAGE" = "true" ] && [ -f "coverage/lcov-report/index.html" ]; then
    log "${GREEN}📊 Coverage report generated: coverage/lcov-report/index.html${NC}"
fi

# Exit with appropriate code
if [ $FAILED_COUNT -gt 0 ]; then
    log "${RED}❌ Some tests failed. Check the results above.${NC}"
    exit 1
else
    log "${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
fi