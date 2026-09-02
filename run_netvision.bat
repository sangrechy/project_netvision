@echo off
title NetVision V1

cd /d "%~dp0"

start "NetVision Backend" cmd /k "cd /d backend && node wi_server.js"

timeout /t 3 /nobreak >nul

start "NetVision Frontend" cmd /k "cd /d frontend && npm run dev"

timeout /t 3 /nobreak >nul

start "NetVision Devices" powershell -NoExit -Command "while (True) { Clear-Host; Write-Host '============================================='; Write-Host '       NETVISION - CONNECTED DEVICES'; Write-Host '============================================='; Write-Host ''; Write-Host ('{0,-35} {1}' -f 'DEVICE NAME','IP ADDRESS'); Write-Host '---------------------------------------------'; Get-NetNeighbor -AddressFamily IPv4 | Where-Object {$_.IPAddress -like '192.168.137.*' -and $_.IPAddress -ne '192.168.137.255'} | Sort-Object IPAddress | ForEach-Object { $ip=$_.IPAddress; $name='Unknown'; try { $r=Resolve-DnsName $ip -Type PTR -ErrorAction Stop; if($r.NameHost){$name=$r.NameHost} } catch { try { $ping=ping -a -n 1 -w 300 $ip 2>$null; $m=$ping | Select-String 'Pinging'; if($m){$name=($m.ToString() -replace '^.*Pinging\s+','' -replace '\s+\[.*$','')} } catch {} }; Write-Host ('{0,-35} {1}' -f $name,$ip) }; Write-Host ''; Write-Host ('Last refresh: ' + (Get-Date)); Start-Sleep 5 }"

exit
