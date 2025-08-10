@echo off
REM LabScientific LIMS - Client Deployment Script (Windows)
REM This script deploys the LIMS application for client use on Windows

echo.
echo LabScientific LIMS - Client Deployment Script
echo ==============================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed. Please install Docker Desktop first.
    echo        Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Docker is installed and ready

REM Stop any existing containers
echo.
echo Stopping existing containers...
docker-compose down 2>nul

REM Build the application
echo.
echo Building application...
docker-compose build --no-cache

REM Start the services
echo.
echo Starting services...
docker-compose up -d

REM Wait for services to be ready
echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo Checking service health...
curl -f http://localhost/health >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Application is running successfully!
    echo.
    echo Access your LIMS application at:
    echo    http://localhost
    echo.
    echo To view application status:
    echo    docker-compose ps
    echo.
    echo To view logs:
    echo    docker-compose logs -f
    echo.
    echo To stop the application:
    echo    docker-compose down
    echo.
    echo To restart the application:
    echo    docker-compose restart
    echo.
) else (
    echo.
    echo ERROR: Application health check failed. Checking logs...
    docker-compose logs --tail=20
    echo.
    echo Please check the logs above for errors.
)

echo.
echo ==============================================
echo Deployment script completed!
echo.
pause