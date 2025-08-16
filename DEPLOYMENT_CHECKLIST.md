# LabScientific LIMS - Client Deployment Checklist

## 🚀 Pre-Deployment Requirements

### System Requirements
- [ ] **Operating System**: Windows 10/11 Pro, macOS 10.15+, or Ubuntu 20.04+
- [ ] **RAM**: Minimum 8GB (16GB recommended)
- [ ] **Storage**: 50GB free disk space
- [ ] **Processor**: 4-core CPU minimum
- [ ] **Network**: Stable internet for initial setup

### Software Dependencies
- [ ] **Docker Desktop** installed and running
- [ ] **Git** (optional, for updates)
- [ ] **Chrome/Firefox** (latest version)

## 📦 Missing Components to Address

### 1. **Environment Configuration** ✅
- [x] Created `.env.production` with all necessary variables
- [ ] Need to generate secure JWT_SECRET and SESSION_SECRET
- [ ] Configure client-specific settings

### 2. **Nginx Configuration** ✅
- [x] Created `nginx/nginx.client.conf`
- [ ] Test reverse proxy setup
- [ ] Configure SSL if needed

### 3. **Database Initialization**
- [x] Database schema exists (`init-database.js`)
- [x] Default users created (`setup-production-users.js`)
- [ ] Need production data migration scripts
- [ ] Backup/restore procedures documented

### 4. **Missing Critical Files**
- [ ] **PM2 ecosystem config** (for non-Docker deployment)
- [ ] **SSL certificates** (if HTTPS required)
- [ ] **Windows service installer** (for Windows deployment)
- [ ] **Systemd service file** (for Linux deployment)
- [ ] **Health check script**

### 5. **Documentation Gaps**
- [ ] **User Manual** (for end users)
- [ ] **Administrator Guide**
- [ ] **Troubleshooting Guide**
- [ ] **API Documentation**
- [ ] **Backup/Restore Procedures**

### 6. **Security Requirements**
- [ ] Change all default passwords
- [ ] Generate secure secrets for JWT and sessions
- [ ] Configure firewall rules
- [ ] Set up SSL/TLS certificates
- [ ] Enable audit logging
- [ ] Configure rate limiting

### 7. **Production Build**
- [ ] Build frontend with production optimizations
- [ ] Minify and bundle assets
- [ ] Remove development dependencies
- [ ] Clear console.log statements
- [ ] Test production build locally

### 8. **External Dependencies**
- [ ] **Osiris Software**: Verify installation path
- [ ] **Google Sheets API**: Configure credentials if needed
- [ ] **Email Service**: Set up SMTP if required

## 🔧 Deployment Steps

### Option A: Docker Deployment (Recommended)

1. **Prepare Environment**
   ```bash
   # Copy files to client machine
   # Update .env.production with client-specific values
   cp .env.production .env
   ```

2. **Build and Start**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Initialize Database**
   ```bash
   docker-compose exec app node backend/scripts/init-database.js
   docker-compose exec app node backend/scripts/setup-production-users.js
   ```

4. **Verify Installation**
   ```bash
   docker-compose ps
   curl http://localhost/health
   ```

### Option B: Direct Node.js Installation

1. **Install Dependencies**
   ```bash
   npm install --production
   cd backend && npm install --production
   ```

2. **Build Frontend**
   ```bash
   npm run build:prod
   ```

3. **Initialize Database**
   ```bash
   node backend/scripts/init-database.js
   node backend/scripts/setup-production-users.js
   ```

4. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## 📋 Post-Deployment Tasks

### Immediate Tasks
- [ ] Test all core functionality
- [ ] Verify user authentication
- [ ] Check database connectivity
- [ ] Test file uploads
- [ ] Verify report generation
- [ ] Test Osiris integration

### Configuration Tasks
- [ ] Configure automatic backups
- [ ] Set up monitoring/alerts
- [ ] Configure email notifications
- [ ] Set client branding
- [ ] Configure user permissions

### Training & Documentation
- [ ] Train administrators
- [ ] Train end users
- [ ] Provide documentation
- [ ] Set up support channels

## 🔐 Default Credentials

**IMPORTANT**: Change these immediately after deployment!

| Username | Password | Role |
|----------|----------|------|
| admin | LabDNA2025!Admin | Administrator |
| supervisor | LabDNA2025!Super | Supervisor |
| analyst1 | LabDNA2025!Analyst | Staff |
| technician1 | LabDNA2025!Tech | Staff |
| client_portal | LabDNA2025!Client | Client |

## 🛠️ Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check DATABASE_PATH in .env
   - Ensure database file has proper permissions
   - Run init-database.js if database doesn't exist

2. **Cannot Access Application**
   - Check if Docker containers are running
   - Verify ports 80 and 3001 are not blocked
   - Check firewall settings

3. **Osiris Integration Not Working**
   - Verify Osiris is installed at specified path
   - Check file permissions
   - Test Osiris directly from command line

## 📞 Support Information

- **Technical Support**: [Your contact]
- **Documentation**: /docs folder
- **Logs Location**: backend/logs/
- **Backup Location**: /backups/

## ✅ Final Verification

Before declaring deployment complete:
- [ ] All features tested and working
- [ ] Backup system configured and tested
- [ ] Security measures in place
- [ ] Users trained
- [ ] Documentation provided
- [ ] Support channels established
- [ ] Client sign-off obtained

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Client Sign-off**: _______________