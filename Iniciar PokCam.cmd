@echo off
rem Doble clic: levanta PokCam en http://localhost:5175 y lo abre en el navegador.
rem Si ya esta corriendo, solo abre el navegador. Cerrar esta ventana lo apaga.
title PokCam - servidor local
cd /d "%~dp0"

netstat -ano | findstr /r /c:":5175 .*LISTENING" >nul
if not errorlevel 1 (
  start "" http://localhost:5175
  exit /b
)

if not exist node_modules call npm install
call npm run dev -- --open
pause
