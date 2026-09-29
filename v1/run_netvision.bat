@echo off
title NetVision V1
color 0b

cd /d "%~dp0"

:: Ensure Node.js is accessible in PATH if located in C:\devtools\node
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\devtools\node\node.exe" (
        set "PATH=C:\devtools\node;%PATH%"
    ) else (
        echo [ERROR] Node.js was not found in PATH or C:\devtools\node.
        echo Please ensure Node.js is installed.
        pause
        exit /b 1
    )
)

:: Ensure Wireshark / TShark is accessible in PATH
where tshark >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\externaltools\Wireshark\tshark.exe" set "PATH=C:\externaltools\Wireshark;%PATH%"
    if exist "C:\Program Files\Wireshark\tshark.exe" set "PATH=C:\Program Files\Wireshark;%PATH%"
)

echo [1/3] Starting NetVision Backend (Port 3001)...
start "NetVision Backend" cmd /k "cd /d ""%~dp0backend"" && set ""PATH=C:\externaltools\Wireshark;C:\Program Files\Wireshark;C:\devtools\node;%%PATH%%"" && node wi_server.js"

timeout /t 3 /nobreak >nul

echo [2/3] Starting NetVision Frontend (Port 5173)...
start "NetVision Frontend" cmd /k "cd /d ""%~dp0frontend"" && set ""PATH=C:\devtools\node;%%PATH%%"" && (if exist ""node_modules\vite\bin\vite.js"" (node node_modules\vite\bin\vite.js) else (npm run dev))"

timeout /t 3 /nobreak >nul

echo [3/3] Starting NetVision Devices Monitor...
start "NetVision Devices" powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "while ($true) { Clear-Host; Write-Host '============================================='; Write-Host '       NETVISION - CONNECTED DEVICES'; Write-Host '============================================='; Write-Host ''; Write-Host ('{0,-35} {1}' -f 'DEVICE NAME','IP ADDRESS'); Write-Host '---------------------------------------------'; Get-NetNeighbor -AddressFamily IPv4 | Where-Object {$_.IPAddress -like '192.168.137.*' -and $_.IPAddress -ne '192.168.137.255'} | Sort-Object IPAddress | ForEach-Object { $ip=$_.IPAddress; $name='Unknown'; try { $r=Resolve-DnsName $ip -Type PTR -ErrorAction Stop; if($r.NameHost){$name=$r.NameHost} } catch { try { $ping=ping -a -n 1 -w 300 $ip 2>$null; $m=$ping | Select-String 'Pinging'; if($m){$name=($m.ToString() -replace '^.*Pinging\s+','' -replace '\s+\[.*$','')} } catch {} }; Write-Host ('{0,-35} {1}' -f $name,$ip) }; Write-Host ''; Write-Host ('Last refresh: ' + (Get-Date)); Start-Sleep 5 }"

timeout /t 2 /nobreak >nul

:: Automatically open browser
start http://localhost:5173

exit
