$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

function Wait-PortReady {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            Write-Host "    ERROR: $Name process exited early (exit code $($Process.ExitCode))." -ForegroundColor Red
            return $false
        }

        $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($listener) { return $true }

        Start-Sleep -Milliseconds 500
    }

    Write-Host "    ERROR: $Name did not listen on port $Port within $TimeoutSeconds seconds." -ForegroundColor Red
    return $false
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][System.Diagnostics.Process]$Process,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            Write-Host "    ERROR: $Name process exited early (exit code $($Process.ExitCode))." -ForegroundColor Red
            return $false
        }

        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                return $true
            }
        } catch {
            # Backend is still starting up.
        }

        Start-Sleep -Milliseconds 500
    }

    Write-Host "    ERROR: $Name did not become healthy at $Url within $TimeoutSeconds seconds." -ForegroundColor Red
    return $false
}

# --- 0) Docker Desktop pruefen ---
Write-Host "==> Checking Docker..."
& docker info *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    ERROR: Docker is not running." -ForegroundColor Red
    Write-Host "    Please start Docker Desktop first, then re-run this script."
    exit 1
}
Write-Host "    Docker is running."

# --- 1) Docker services (PostGIS + MLflow) ---
Write-Host "==> Starting Docker services (PostGIS, MLflow)..."
& docker compose -f "$ROOT\docker-compose.yml" up -d

Write-Host "==> Waiting for PostGIS to accept connections..."
$retries = 0
do {
    & docker compose -f "$ROOT\docker-compose.yml" exec -T db pg_isready -U insar -d insar *>$null
    if ($LASTEXITCODE -eq 0) { break }
    $retries++
    if ($retries -ge 30) {
        Write-Host "    ERROR: PostGIS did not become ready within 30s." -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
} while ($true)
Write-Host "    PostGIS is ready."

# --- 2) Backend ---
$venv = "$ROOT\backend\.venv-win"
$venvPython = "$venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "==> Creating backend venv..."
    & python -m venv $venv
    & $venvPython -m pip install -q -r "$ROOT\backend\requirements.txt"
} else {
    & $venvPython -c "import uvicorn" *>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "==> Installing backend dependencies..."
        & $venvPython -m pip install -q -r "$ROOT\backend\requirements.txt"
    }
}

Write-Host "==> Starting backend (uvicorn :8000)..."
$backendProc = Start-Process -NoNewWindow -PassThru -FilePath $venvPython -WorkingDirectory "$ROOT\backend" -ArgumentList `
    "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"

# --- 3) Frontend ---
$viteCmd = "$ROOT\frontend\node_modules\.bin\vite.cmd"
if ((-not (Test-Path "$ROOT\frontend\node_modules")) -or (-not (Test-Path $viteCmd))) {
    Write-Host "==> Installing frontend dependencies..."
    & npm.cmd install --prefix "$ROOT\frontend" --include=dev --production=false
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Falling back to npm install --production=false..."
        & npm.cmd install --prefix "$ROOT\frontend" --production=false
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    Falling back to plain npm install..."
        & npm.cmd install --prefix "$ROOT\frontend"
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ERROR: npm install failed." -ForegroundColor Red
        exit 1
    }
    if (-not (Test-Path $viteCmd)) {
        Write-Host "    ERROR: vite.cmd is still missing after npm install (frontend\\node_modules\\.bin\\vite.cmd)." -ForegroundColor Red
        Write-Host "    Run npm.cmd install from Windows in the frontend folder and rerun."
        exit 1
    }
}

Write-Host "==> Starting frontend (vite :3000)..."
$frontendProc = Start-Process -NoNewWindow -PassThru -FilePath "npm.cmd" -WorkingDirectory "$ROOT\frontend" -ArgumentList `
    "run", "dev", "--", "--host", "--port", "3000", "--strictPort"

$procs = @($backendProc, $frontendProc) | Where-Object { $_ -ne $null }
if ($procs.Count -eq 0) {
    Write-Host "  ERROR: No services started." -ForegroundColor Red
    exit 1
}

try {
    Write-Host "==> Waiting for backend health on :8000..."
    if (-not (Wait-HttpReady -Url "http://127.0.0.1:8000/api/health" -Name "Backend" -Process $backendProc -TimeoutSeconds 120)) {
        throw "Backend startup failed"
    }

    Write-Host "==> Waiting for frontend on :3000..."
    if (-not (Wait-PortReady -Port 3000 -Name "Frontend" -Process $frontendProc)) { throw "Frontend startup failed" }

    Write-Host ""
    Write-Host "========================================"
    Write-Host "  Frontend:  http://localhost:3000"
    Write-Host "  Backend:   http://localhost:8000"
    Write-Host "  MLflow:    http://localhost:5001"
    Write-Host "========================================"
    Write-Host "  Press Ctrl+C to stop all services"
    Write-Host "========================================"

    Wait-Process -Id ($procs | ForEach-Object { $_.Id })
} finally {
    Write-Host ""
    Write-Host "Stopping services..."
    $procs | ForEach-Object {
        if (-not $_.HasExited) { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    }
    Write-Host "Done. (Docker services still running - use .\stop.ps1 to stop everything)"
}
