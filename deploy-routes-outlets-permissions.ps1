# ========================================
# Routes & Outlets Permissions - Production Deployment Script (Windows)
# ========================================
# This script deploys Routes & Outlets API permissions to production MongoDB
# 
# Usage on production server:
#   .\deploy-routes-outlets-permissions.ps1
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Routes & Outlets - Production Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# MongoDB connection details (update these for your production setup)
$MONGO_HOST = if ($env:MONGO_HOST) { $env:MONGO_HOST } else { "localhost" }
$MONGO_PORT = if ($env:MONGO_PORT) { $env:MONGO_PORT } else { "27017" }
$MONGO_DB = if ($env:MONGO_DB) { $env:MONGO_DB } else { "pusti_happy_times" }
$MONGO_USER = if ($env:MONGO_USER) { $env:MONGO_USER } else { "admin" }
$MONGO_PASS = if ($env:MONGO_PASS) { $env:MONGO_PASS } else { Read-Host "Enter MongoDB password" -AsSecureString }

# Convert SecureString to plain text for connection string
if ($MONGO_PASS -is [System.Security.SecureString]) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($MONGO_PASS)
    $MONGO_PASS_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
} else {
    $MONGO_PASS_PLAIN = $MONGO_PASS
}

# Script location
$SCRIPT_PATH = "backend/scripts/add-routes-outlets-permissions.js"

Write-Host "📋 Deployment Details:"
Write-Host "  Database: $MONGO_DB"
Write-Host "  Host: ${MONGO_HOST}:${MONGO_PORT}"
Write-Host "  User: $MONGO_USER"
Write-Host ""

$CONFIRM = Read-Host "Continue with deployment? (yes/no)"

if ($CONFIRM -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Deploying permissions..." -ForegroundColor Yellow
Write-Host ""

# Run the permissions script
$connectionString = "mongodb://${MONGO_USER}:${MONGO_PASS_PLAIN}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"

Get-Content $SCRIPT_PATH | mongosh $connectionString

$EXIT_CODE = $LASTEXITCODE

Write-Host ""
if ($EXIT_CODE -eq 0) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Test the Routes & Outlets modules"
    Write-Host "  2. Verify permissions for all roles"
    Write-Host ""
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Deployment failed with exit code: $EXIT_CODE" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit $EXIT_CODE
}
