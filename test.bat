@echo off
rem Double-click to check that Shopee Stock Watch builds (the project has no automated tests yet)
setlocal
cd /d "%~dp0"
title Shopee Stock Watch - build check

where dotnet >nul 2>nul
if errorlevel 1 (
    echo [!] .NET SDK is not installed. Install .NET 10 SDK from https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo Building...
dotnet build shopee-stock-watch.sln -c Release
if errorlevel 1 goto :fail

echo.
echo Build succeeded.
pause
goto :eof

:fail
echo.
echo [!] The build failed. Read the messages above.
pause
exit /b 1
