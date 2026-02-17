$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Stopping frontend (port 3000)..."
$frontendPids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($frontendPids) {
    $frontendPids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
$frontendPathPattern = [Regex]::Escape("$ROOT\frontend")
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -in @("node.exe", "cmd.exe", "npm.cmd") -and
        $_.CommandLine -match $frontendPathPattern -and
        ($_.CommandLine -match "vite" -or $_.CommandLine -match "npm")
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host "==> Stopping backend (port 8000)..."
$backendPids = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($backendPids) {
    $backendPids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
$backendPathPattern = [Regex]::Escape("$ROOT\backend")
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -eq "python.exe" -and
        $_.CommandLine -match $backendPathPattern -and
        $_.CommandLine -match "uvicorn"
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# Also kill any WSL processes on those ports
& wsl.exe -e bash -c "fuser -k 3000/tcp 8000/tcp 2>/dev/null" *>$null

Write-Host "==> Stopping Docker services..."
& docker compose -f "$ROOT\docker-compose.yml" down *>$null

Start-Sleep -Seconds 1
Write-Host "All services stopped."
