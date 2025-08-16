@echo off
REM LabScientific LIMS - Windows Installation Script
REM For client deployment on Windows machines

echo.
echo ========================================
echo   LabScientific LIMS Windows Installer
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Checking system requirements...
echo.

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Node.js...
    echo Please download and install Node.js from https://nodejs.org/
    echo After installation, run this script again.
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
)

REM Check Python (required for some npm packages)
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python is not installed (optional but recommended)
) else (
    echo [OK] Python is installed
)

echo.
echo Installing PM2 process manager globally...
call npm install -g pm2 pm2-windows-startup

echo.
echo Installing application dependencies...
call npm install --production

echo.
echo Installing backend dependencies...
cd backend
call npm install --production
cd ..

echo.
echo Building frontend...
call npm run build

echo.
echo Initializing database...
node backend\scripts\init-database.js
node backend\scripts\setup-production-users.js

echo.
echo Setting up PM2 for Windows startup...
pm2 start ecosystem.config.js
pm2 save
pm2-startup install

echo.
echo Creating desktop shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\LabScientific LIMS.lnk'); $Shortcut.TargetPath = 'http://localhost'; $Shortcut.IconLocation = '%CD%\public\favicon.ico'; $Shortcut.Save()"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo The LIMS application has been installed and will start automatically
echo when Windows starts.
echo.
echo Access the application at: http://localhost
echo.
echo Default login credentials:
echo Username: admin
echo Password: LabDNA2025!Admin
echo.
echo IMPORTANT: Change the default password after first login!
echo.
echo To manage the application:
echo - Start: pm2 start all
echo - Stop: pm2 stop all
echo - Restart: pm2 restart all
echo - View logs: pm2 logs
echo.
pause