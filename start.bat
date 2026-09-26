@echo off
rem Double-click to run Shopee Stock Watch locally at http://localhost:5062
setlocal
cd /d "%~dp0"
title Shopee Stock Watch - http://localhost:5062

where dotnet >nul 2>nul
if errorlevel 1 (
    echo [!] .NET SDK is not installed. Install .NET 10 SDK from https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

rem The app stores data in MongoDB on localhost:27017.
sc query MongoDB 2>nul | find "RUNNING" >nul
if errorlevel 1 (
    echo [!] The MongoDB service is not running.
    echo     Start it from Services ^(services.msc^) or run "net start MongoDB" as Administrator,
    echo     or install MongoDB Community Server from https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)

start "" cmd /c "timeout /t 8 >nul & start http://localhost:5062"
echo.
echo Shopee Stock Watch is starting at http://localhost:5062
echo Close this window to stop it.
echo.
dotnet run --launch-profile http
if errorlevel 1 (
    echo.
    echo [!] Something went wrong. Read the messages above.
    pause
    exit /b 1
)
