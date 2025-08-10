# LabScientific LIMS - Client Deployment Guide

## Overview
This guide covers deploying LabScientific LIMS at client premises for on-site use.

## Deployment Options

### Option 1: Docker Desktop (Recommended)
**Best for:** Windows 10/11 Pro, macOS, or Linux with Docker support
**Pros:** Easy management, consistent environment, easy updates, production-ready
**Cons:** Requires Docker Desktop license for business use

#### Requirements:
- Docker Desktop installed
- 8GB RAM minimum (16GB recommended)
- 50GB free disk space
- Windows 10/11 Pro or macOS 10.15+

#### Steps:
1. Install Docker Desktop on client PC
2. Copy project folder to client PC
3. Run deployment script

```bash
# On client PC
git clone <your-repo> labscientific-lims
cd labscientific-lims
docker-compose up -d
```

Access at: `http://localhost` (port 80)

### Option 2: Electron Desktop App (Simplest)
**Best for:** Non-technical users, any Windows/macOS/Linux
**Pros:** Native desktop experience, no server setup needed, works offline
**Cons:** Each user needs their own installation

#### Requirements:
- Any modern PC (Windows 7+, macOS 10.10+, Linux)
- 4GB RAM minimum
- 2GB free disk space

#### Steps:
1. Build the Electron app
2. Install on client PC
3. Double-click to run

```bash
# Build executable (run this on your development machine)
npm run build:electron:prod
```

### Option 3: Node.js Direct Installation
**Best for:** Tech-savvy clients, custom setups
**Pros:** Direct control, lightweight, customizable
**Cons:** Requires Node.js knowledge, manual updates

#### Requirements:
- Node.js 18+ installed
- 4GB RAM minimum
- 20GB free disk space

#### Steps:
1. Install Node.js on client PC
2. Copy project and install dependencies
3. Run production build

```bash
# On client PC
npm install
cd backend && npm install
cd ..
npm run build
npm start
```

Access at: `http://localhost:3000`

## Recommended Deployment: Docker

### Pre-deployment Checklist:
- [ ] All bugs fixed and tested
- [ ] Database migrations completed
- [ ] Production environment variables set
- [ ] SSL certificates (if needed)
- [ ] Backup procedures documented

### Production Environment Setup:

1. **Install Docker Desktop**
   - Download from docker.com
   - Enable Windows Subsystem for Linux (WSL2) if on Windows

2. **Prepare Project**
   ```bash
   # Build production images
   docker-compose build
   
   # Start services
   docker-compose up -d
   
   # Check status
   docker-compose ps
   ```

3. **Access Application**
   - Open browser to `http://localhost`
   - Default admin login (if configured)
   - Test all functionality

### Data Management:

#### Backup:
```bash
# Backup database
docker-compose exec app sqlite3 /app/data/ashley_lims.db ".backup /app/data/backup_$(date +%Y%m%d).db"

# Copy backup to host
docker cp labscientific-lims-app:/app/data/backup_20250131.db ./backups/
```

#### Restore:
```bash
# Stop application
docker-compose down

# Restore database
docker-compose run --rm app sqlite3 /app/data/ashley_lims.db ".restore /app/data/backup_20250131.db"

# Restart application
docker-compose up -d
```

### Updates:

```bash
# Pull latest changes
git pull origin client-specific

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Monitoring:

```bash
# View logs
docker-compose logs -f app

# Check health
curl http://localhost/health

# Resource usage
docker stats
```

### Firewall Configuration:
- Port 80 (HTTP) - for web access
- Port 3001 (API) - for API access (optional, reverse proxied through port 80)

### Security Considerations:
- Change default passwords
- Enable HTTPS if accessing from network
- Regular backups to external storage
- Keep Docker Desktop updated

## Support:
- Check logs: `docker-compose logs`
- Restart services: `docker-compose restart`
- Full reset: `docker-compose down && docker-compose up -d`

## Client Training Checklist:
- [ ] Basic application usage
- [ ] How to restart services
- [ ] Backup procedures
- [ ] Who to contact for support
- [ ] Update procedures