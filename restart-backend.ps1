# Restart Backend Server Script

Write-Host "🔄 Stopping backend server..." -ForegroundColor Yellow

# Kill all node processes (be careful if you have other node apps running)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ Backend server stopped" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow

# Navigate to backend directory and start server
Set-Location C:\tkg\pusti-ht-mern\backend
npm run dev

Write-Host "✅ Backend server started" -ForegroundColor Green
