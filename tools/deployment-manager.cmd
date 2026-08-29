@echo off
rem ------------------------------------------------------------
rem deployment-manager.cmd
rem Wrapper para Windows que ejecuta el script TypeScript de gestión
rem (deployment-manager.ts) usando npx ts-node
rem ------------------------------------------------------------

set "SCRIPT_DIR=%~dp0"
set "TS_SCRIPT=%SCRIPT_DIR%deployment-manager.ts"

if not exist "%TS_SCRIPT%" (
  echo Error: No se encontró %TS_SCRIPT%
  exit /b 1
)

rem Ejecutar con npx ts-node (instala temporalmente si es necesario)
echo Ejecutando deployment-manager...
npx ts-node "%TS_SCRIPT%"

exit /b %ERRORLEVEL%
