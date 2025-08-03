#!/bin/bash

# Pre-push testing script for the gym management system
# This script runs all necessary tests before allowing a push

set -e  # Exit on any error

echo "🚀 Starting pre-push testing sequence..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_error "node_modules directory not found. Running npm install..."
    npm install
fi

# 1. Lint check
echo "📝 Running ESLint..."
if npm run lint; then
    print_status "ESLint passed"
else
    print_error "ESLint failed. Please fix linting errors before pushing."
    exit 1
fi

# 2. Type checking (if TypeScript)
echo "🔍 Running TypeScript type check..."
if npx tsc --noEmit; then
    print_status "TypeScript check passed"
else
    print_error "TypeScript check failed. Please fix type errors before pushing."
    exit 1
fi

# 3. Unit and integration tests
echo "🧪 Running unit and integration tests..."
if npm run test -- --passWithNoTests --coverage --watchAll=false; then
    print_status "Unit tests passed"
else
    print_error "Unit tests failed. Please fix failing tests before pushing."
    exit 1
fi

# 4. Build check
echo "🏗️  Running build check..."
if npm run build; then
    print_status "Build successful"
else
    print_error "Build failed. Please fix build errors before pushing."
    exit 1
fi

# 5. E2E tests (optional - can be skipped in development)
if [ "$SKIP_E2E" != "true" ]; then
    echo "🎭 Running E2E tests..."
    if npm run test:e2e; then
        print_status "E2E tests passed"
    else
        print_warning "E2E tests failed. You can skip with SKIP_E2E=true if needed."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "E2E tests skipped (SKIP_E2E=true)"
fi

# 6. Security audit (optional)
echo "🔒 Running security audit..."
if npm audit --audit-level moderate; then
    print_status "Security audit passed"
else
    print_warning "Security vulnerabilities found. Review and fix if critical."
fi

# 7. Check for sensitive data
echo "🔍 Checking for sensitive data..."
if grep -r --exclude-dir=node_modules --exclude-dir=.git -i "password\|secret\|key\|token" . | grep -v "test" | grep -v "README" | grep -v "\.md"; then
    print_warning "Potential sensitive data found. Please review."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🎉 All checks passed! Ready to push."
print_status "Pre-push testing completed successfully"

# Optional: Show test coverage summary
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "📊 Test coverage report available at: coverage/lcov-report/index.html"
fi