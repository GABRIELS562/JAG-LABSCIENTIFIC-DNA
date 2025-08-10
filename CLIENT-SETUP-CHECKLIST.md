# Client Setup Checklist

## Pre-Installation Requirements

### Hardware Specifications:
- [ ] Minimum 8GB RAM (16GB recommended)
- [ ] 50GB free disk space
- [ ] Intel i5 or AMD Ryzen 5 processor (or equivalent)
- [ ] Stable internet connection (for initial setup and updates)

### Operating System:
- [ ] Windows 10/11 Pro (for Docker option)
- [ ] macOS 10.15+ (for Docker option)
- [ ] OR any Windows 7+/macOS 10.10+/Linux (for Electron option)

## Installation Steps

### Option A: Docker Installation (Recommended)

#### Step 1: Install Docker Desktop
- [ ] Download Docker Desktop from https://www.docker.com/products/docker-desktop
- [ ] Install and restart computer
- [ ] Launch Docker Desktop and complete setup
- [ ] Verify installation: Open terminal/command prompt and run `docker --version`

#### Step 2: Deploy Application
- [ ] Copy LabScientific LIMS folder to client PC
- [ ] Open terminal/command prompt in the application folder
- [ ] Run deployment script:
  - **Windows:** Double-click `deploy-client.bat` OR run `deploy-client.bat` in command prompt
  - **Mac/Linux:** Run `./deploy-client.sh` in terminal
- [ ] Wait for deployment to complete (5-10 minutes)
- [ ] Open browser to http://localhost

### Option B: Electron Desktop App

#### Step 1: Build Application (Do this on your dev machine)
- [ ] Run `./build-desktop.sh` on development machine
- [ ] Copy the installer file from `dist/` folder to USB drive

#### Step 2: Install on Client PC
- [ ] Copy installer file to client PC
- [ ] Double-click installer file
- [ ] Follow installation wizard
- [ ] Launch from desktop shortcut or start menu

## Post-Installation Setup

### Application Configuration:
- [ ] Test all main features (sample registration, form submission, reports)
- [ ] Configure user accounts (if multi-user)
- [ ] Set up backup procedures
- [ ] Configure printer settings
- [ ] Test signature pad functionality
- [ ] Verify database is working

### Security Setup:
- [ ] Change default passwords
- [ ] Configure Windows Firewall (if needed)
- [ ] Set up user permissions
- [ ] Enable automatic Windows updates
- [ ] Install antivirus software

### Backup Configuration:
- [ ] Create backup folder: `C:\LabScientific-Backups\`
- [ ] Set up automated daily backups
- [ ] Test backup and restore procedures
- [ ] Document backup location for client

## Client Training

### Basic Operations:
- [ ] How to start/stop the application
- [ ] Patient registration process
- [ ] Form completion workflow
- [ ] Printing reports
- [ ] Basic troubleshooting

### Maintenance Tasks:
- [ ] How to restart the application
- [ ] How to check if services are running
- [ ] How to perform backups
- [ ] When to call for support

### Emergency Procedures:
- [ ] What to do if application won't start
- [ ] How to contact support
- [ ] How to restore from backup
- [ ] Alternative workflows if system is down

## Support Information

### Contact Details:
- [ ] Primary support contact: _______________
- [ ] Emergency contact: ___________________
- [ ] Email support: ______________________

### Remote Access Setup (Optional):
- [ ] Install TeamViewer or similar for remote support
- [ ] Configure remote access permissions
- [ ] Test remote connection

### Documentation:
- [ ] Provide user manual
- [ ] Leave deployment documentation
- [ ] Document any custom configurations
- [ ] Provide troubleshooting guide

## Final Verification

### Functionality Tests:
- [ ] Register new patient
- [ ] Complete paternity test form
- [ ] Submit form successfully
- [ ] View submitted data
- [ ] Print test results
- [ ] Backup and restore test

### Performance Tests:
- [ ] Application starts within 30 seconds
- [ ] Forms load quickly
- [ ] No error messages during normal use
- [ ] System remains stable during extended use

### Sign-off:
- [ ] Client confirms all features work as expected
- [ ] Client comfortable with basic operations
- [ ] Support contact information provided
- [ ] Installation documentation left with client
- [ ] Training completed and signed off

**Installation Date:** _______________  
**Installed By:** ___________________  
**Client Signature:** _______________  
**Support Valid Until:** ____________