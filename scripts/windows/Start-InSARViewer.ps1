param([switch]$Fresh)

$ErrorActionPreference = "Stop"

$Distro = "Ubuntu"
$Repo = "/home/wsl_user/repos/Co-Inno/Stadt_Salzburg/insar_viewer_app"
$Script = "./start.sh"

# Default: INSAR_REUSE=1 - ein bereits laufendes, gesundes Backend/Frontend
# wird weiterverwendet (Start in Sekunden). Mit -Fresh wird wie frueher
# alles beendet und kalt neu gestartet.
$Reuse = if ($Fresh) { "0" } else { "1" }

$host.UI.RawUI.WindowTitle = "Salzburg InSAR Viewer starten"

Write-Host ""
Write-Host "Starting Salzburg InSAR Viewer..."
Write-Host "WSL distro: $Distro"
Write-Host "Repo: $Repo"
Write-Host "Reuse running services: $(if ($Fresh) { 'no (-Fresh)' } else { 'yes (default)' })"
Write-Host ""
Write-Host "This window owns any backend and frontend it starts. Close it or press Ctrl+C to stop them." -ForegroundColor DarkGray
Write-Host ""

try {
    & wsl.exe -d $Distro --cd $Repo -- bash -lc "test -x $Script && INSAR_REUSE=$Reuse exec $Script"
    $exitCode = $LASTEXITCODE
} catch {
    Write-Host ""
    Write-Host "Start failed before WSL could run the viewer." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to close"
    exit 1
}

if ($exitCode -ne 0 -and $exitCode -ne 130) {
    Write-Host ""
    Write-Host "Start failed with exit code $exitCode." -ForegroundColor Red
    Write-Host "The messages above should show why the viewer did not start."
    Read-Host "Press Enter to close"
    exit $exitCode
}
