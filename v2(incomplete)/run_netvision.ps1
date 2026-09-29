# NetVision V2 — PowerShell Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          NETVISION V2 — POWERSHELL LAUNCHER               " -ForegroundColor Cyan
Write-Host "     Neumorphic Cross-Platform Hotspot Intelligence        " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Ensure Node is found
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\devtools\node\node.exe") {
        $env:PATH = "C:\devtools\node;" + $env:PATH
    }
}

Write-Host "[1/2] Launching NetVision V2 Backend on port 3001..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$baseDir\backend`" && set `"PATH=C:\devtools\node;%PATH%`" && node server.js"

Start-Sleep -Seconds 3

Write-Host "[2/2] Launching NetVision V2 Frontend on port 5173..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$baseDir\frontend`" && set `"PATH=C:\devtools\node;%PATH%`" && node node_modules\vite\bin\vite.js --host"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✔ NetVision V2 is active!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend : http://localhost:3001" -ForegroundColor White

Start-Process "http://localhost:5173"
