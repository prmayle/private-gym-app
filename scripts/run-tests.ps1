# PowerShell script for Windows users
# Pre-push testing script for the gym management system

param(
    [switch]$SkipE2E,
    [switch]$SkipBuild,
    [switch]$Quick
)

Write-Host "🚀 Starting pre-push testing sequence..." -ForegroundColor Green

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Error "node_modules directory not found. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed"
        exit 1
    }
}

# 1. Lint check
Write-Host "📝 Running ESLint..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -eq 0) {
    Write-Success "ESLint passed"
} else {
    Write-Error "ESLint failed. Please fix linting errors before pushing."
    exit 1
}

# 2. Type checking
Write-Host "🔍 Running TypeScript type check..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Success "TypeScript check passed"
} else {
    Write-Error "TypeScript check failed. Please fix type errors before pushing."
    exit 1
}

# 3. Unit and integration tests
Write-Host "🧪 Running unit and integration tests..." -ForegroundColor Cyan
npm run test -- --passWithNoTests --coverage --watchAll=false
if ($LASTEXITCODE -eq 0) {
    Write-Success "Unit tests passed"
} else {
    Write-Error "Unit tests failed. Please fix failing tests before pushing."
    exit 1
}

# 4. Build check (skip if requested)
if (!$SkipBuild -and !$Quick) {
    Write-Host "🏗️  Running build check..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build successful"
    } else {
        Write-Error "Build failed. Please fix build errors before pushing."
        exit 1
    }
} else {
    Write-Warning "Build check skipped"
}

# 5. E2E tests (skip if requested or in quick mode)
if (!$SkipE2E -and !$Quick) {
    Write-Host "🎭 Running E2E tests..." -ForegroundColor Cyan
    npm run test:e2e
    if ($LASTEXITCODE -eq 0) {
        Write-Success "E2E tests passed"
    } else {
        Write-Warning "E2E tests failed. You can skip with -SkipE2E if needed."
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            exit 1
        }
    }
} else {
    Write-Warning "E2E tests skipped"
}

# 6. Security audit (optional)
if (!$Quick) {
    Write-Host "🔒 Running security audit..." -ForegroundColor Cyan
    npm audit --audit-level moderate
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Security audit passed"
    } else {
        Write-Warning "Security vulnerabilities found. Review and fix if critical."
    }
}

Write-Host "🎉 All checks passed! Ready to push." -ForegroundColor Green
Write-Success "Pre-push testing completed successfully"

# Show test coverage if available
if (Test-Path "coverage/lcov-report/index.html") {
    Write-Host "📊 Test coverage report available at: coverage/lcov-report/index.html" -ForegroundColor Cyan
}