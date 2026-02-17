$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== STOPPING ===" -ForegroundColor Yellow
& "$ROOT\stop.ps1"

Write-Host ""
Write-Host "=== STARTING ===" -ForegroundColor Green
& "$ROOT\start.ps1"
