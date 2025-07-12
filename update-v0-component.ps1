# V0 Component Update Script
# Usage: .\update-v0-component.ps1 -ComponentName "status-badge" -NewFilePath "temp-v0-updates\status-badge.tsx"

param(
    [Parameter(Mandatory=$true)]
    [string]$ComponentName,
    
    [Parameter(Mandatory=$true)]
    [string]$NewFilePath
)

$CurrentFile = "components\ui\$ComponentName.tsx"
$BackupFile = "components\ui\$ComponentName.backup.tsx"

# Check if files exist
if (-not (Test-Path $CurrentFile)) {
    Write-Error "Current component file not found: $CurrentFile"
    exit 1
}

if (-not (Test-Path $NewFilePath)) {
    Write-Error "New component file not found: $NewFilePath"
    exit 1
}

Write-Host "=== V0 Component Update Tool ===" -ForegroundColor Green
Write-Host "Component: $ComponentName" -ForegroundColor Yellow
Write-Host "Current:   $CurrentFile" -ForegroundColor Cyan
Write-Host "New:       $NewFilePath" -ForegroundColor Cyan

# Create backup
Write-Host "`nCreating backup..." -ForegroundColor Yellow
Copy-Item $CurrentFile $BackupFile
Write-Host "Backup created: $BackupFile" -ForegroundColor Green

# Show diff (if git is available)
Write-Host "`nShowing differences:" -ForegroundColor Yellow
try {
    git diff --no-index $CurrentFile $NewFilePath
} catch {
    Write-Host "Git not available. Please compare files manually." -ForegroundColor Yellow
}

# Ask for confirmation
$response = Read-Host "`nDo you want to update the component? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Copy-Item $NewFilePath $CurrentFile
    Write-Host "Component updated successfully!" -ForegroundColor Green
    Write-Host "Don't forget to:" -ForegroundColor Yellow
    Write-Host "  1. Test the updated component" -ForegroundColor White
    Write-Host "  2. Update imports if needed" -ForegroundColor White
    Write-Host "  3. Remove backup file if everything works" -ForegroundColor White
} else {
    Write-Host "Update cancelled. Backup file preserved." -ForegroundColor Yellow
} 