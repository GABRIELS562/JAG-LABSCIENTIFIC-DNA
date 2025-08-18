# 📘 Complete Step-by-Step Deployment Guide
## From Blank PC to Running LIMS

---

# PART 1: PREPARING THE MINI PC

## Step 1: Download Ubuntu Server
1. On any computer, go to: https://ubuntu.com/download/server
2. Download **Ubuntu Server 22.04.4 LTS** (about 2GB)
3. Create a bootable USB drive:
   
   **On Windows:**
   - Download Rufus: https://rufus.ie/
   - Insert 8GB+ USB drive
   - Open Rufus
   - Select your USB drive
   - Select the Ubuntu ISO file
   - Click START
   
   **On Mac:**
   - Insert USB drive
   - Open Terminal
   ```bash
   # Find your USB drive
   diskutil list
   # Unmount it (replace diskX with your disk)
   diskutil unmountDisk /dev/diskX
   # Write ISO (replace ubuntu.iso with actual filename)
   sudo dd if=~/Downloads/ubuntu-22.04.4-live-server-amd64.iso of=/dev/rdiskX bs=1m
   ```

## Step 2: Install Ubuntu on Mini PC

### Boot from USB
1. Insert USB into mini PC
2. Power on and press **F12** (or F2, DEL, ESC - depends on PC) for boot menu
3. Select USB drive to boot

### Installation Process
1. **Language**: English
2. **Keyboard**: Select your layout
3. **Network**: 
   - It should auto-detect ethernet
   - Note the IP address shown (you'll need this)
4. **Storage**:
   - Use entire disk
   - Confirm destructive action
5. **Profile Setup**:
   ```
   Your name: Admin
   Server name: lims-server
   Username: limsadmin
   Password: [Choose strong password]
   ```
6. **SSH**: 
   - ✅ Install OpenSSH server
   - Import SSH keys: Skip for now
7. **Featured Snaps**: Skip all
8. **Installation**: Wait 10-15 minutes
9. **Reboot**: Remove USB when prompted

## Step 3: First Login
1. Login with:
   ```
   Username: limsadmin
   Password: [your password]
   ```

2. Update system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. Note your IP address:
   ```bash
   ip addr show
   # Look for something like: 192.168.1.100
   ```

---

# PART 2: REMOTE ACCESS SETUP

## Step 4: Enable SSH Access (From Your Computer)

1. From your Windows/Mac, test SSH:
   ```bash
   ssh limsadmin@192.168.1.100
   # Replace with actual IP
   ```

2. If it works, continue from your computer (more comfortable than mini PC)

## Step 5: Secure SSH (Optional but Recommended)

On your computer, generate SSH key:
```bash
# Generate key
ssh-keygen -t ed25519 -C "lims-admin"

# Copy to server
ssh-copy-id limsadmin@192.168.1.100

# Now you can login without password
ssh limsadmin@192.168.1.100
```

---

# PART 3: INSTALL DOCKER

## Step 6: Install Docker and Dependencies

SSH into your server and run:

```bash
# Install required packages
sudo apt update
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    htop \
    ufw

# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Activate changes
newgrp docker

# Verify installation
docker --version
docker compose version
```

## Step 7: Configure Firewall

```bash
# Enable firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Check status
sudo ufw status
```

---

# PART 4: DEPLOY THE LIMS APPLICATION

## Step 8: Clone the Repository

```bash
# Create application directory
sudo mkdir -p /opt/lims
sudo chown $USER:$USER /opt/lims
cd /opt/lims

# Clone repository
git clone -b client-specific https://github.com/GABRIELS562/LABSCIENTIFIC-LIMS.git .

# If private repository, you'll need to enter GitHub credentials
```

## Step 9: Configure Environment

```bash
# Copy example environment file
cp .env.example .env.production

# Edit configuration
nano .env.production
```

Update these values:
```env
NODE_ENV=production

# Generate secure secrets (run these commands to generate)
# openssl rand -base64 32
JWT_SECRET=PUT_GENERATED_VALUE_HERE
SESSION_SECRET=PUT_GENERATED_VALUE_HERE

# Database
DATABASE_PATH=/app/data/lims.db
DATABASE_BACKUP_DAYS=30

# Application
PORT=3001
CORS_ORIGIN=http://localhost:3001

# Leave these for now (will setup later)
CLOUDFLARE_TUNNEL_TOKEN=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 10: Create Required Directories

```bash
# Create data directories
mkdir -p data uploads backups logs reports

# Set permissions
chmod 755 data uploads backups logs reports
```

## Step 11: Build and Deploy

```bash
# Build the application
docker compose -f docker-compose.simple.yml build

# Start the application
docker compose -f docker-compose.simple.yml up -d

# Check if running
docker ps

# View logs
docker compose -f docker-compose.simple.yml logs -f
```

## Step 12: Verify Installation

```bash
# Check health endpoint
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

---

# PART 5: ACCESS THE APPLICATION

## Step 13: Local Network Access

1. From any computer on the same network, open browser
2. Navigate to: `http://192.168.1.100:3001`
   (Replace with your server's actual IP)
3. You should see the LIMS login page

## Step 14: Create Admin User

```bash
# Access the container
docker exec -it labscientific-lims sh

# Create admin user (inside container)
node backend/scripts/setup-production-users.js

# Exit container
exit
```

Default admin credentials created:
- Username: `admin`
- Password: `Admin@123`

**IMPORTANT**: Change this password immediately after first login!

---

# PART 6: CONFIGURE BACKUPS

## Step 15: Setup Automated Backups

```bash
# Create backup script
cat > /opt/lims/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/lims/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/opt/lims/data/lims.db"

# Create backup
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/lims_$DATE.db"
    echo "Backup created: lims_$DATE.db"
    
    # Keep only last 30 days
    find "$BACKUP_DIR" -name "lims_*.db" -mtime +30 -delete
    echo "Old backups cleaned"
else
    echo "Database file not found!"
fi
EOF

# Make executable
chmod +x /opt/lims/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/lims/backup.sh >> /opt/lims/logs/backup.log 2>&1") | crontab -

# Test backup
./backup.sh
```

---

# PART 7: MONITORING & MAINTENANCE

## Step 16: Setup Monitoring

```bash
# Create monitoring script
cat > /opt/lims/monitor.sh << 'EOF'
#!/bin/bash

echo "=== LIMS System Status ==="
echo "Date: $(date)"
echo ""

# Check Docker containers
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check disk usage
echo "Disk Usage:"
df -h | grep -E '^/dev/|Filesystem'
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check database size
if [ -f /opt/lims/data/lims.db ]; then
    echo "Database Size:"
    ls -lh /opt/lims/data/lims.db
fi
echo ""

# Check last backup
echo "Last Backup:"
ls -lt /opt/lims/backups/*.db 2>/dev/null | head -1
echo ""

# Check application health
echo "Application Health:"
curl -s http://localhost:3001/health | python3 -m json.tool
EOF

chmod +x /opt/lims/monitor.sh

# Run monitoring
./monitor.sh
```

## Step 17: Common Management Commands

Save these commands for daily use:

```bash
# Start application
cd /opt/lims
docker compose -f docker-compose.simple.yml up -d

# Stop application
docker compose -f docker-compose.simple.yml down

# Restart application
docker compose -f docker-compose.simple.yml restart

# View logs
docker compose -f docker-compose.simple.yml logs -f

# View last 100 lines of logs
docker compose -f docker-compose.simple.yml logs --tail=100

# Enter container for debugging
docker exec -it labscientific-lims sh

# Update application
cd /opt/lims
git pull
docker compose -f docker-compose.simple.yml build
docker compose -f docker-compose.simple.yml up -d

# Manual backup
/opt/lims/backup.sh

# Check system status
/opt/lims/monitor.sh
```

---

# PART 8: REMOTE ACCESS (OPTIONAL)

## Step 18: Setup Cloudflare Tunnel (For Internet Access)

Only do this if you need access from outside the local network.

### A. Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Create free account
3. Add your domain (or use Cloudflare Pages domain)

### B. Install Cloudflared
```bash
# Download cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login
# This will open a browser - authorize it

# Create tunnel
cloudflared tunnel create lims-tunnel

# Get tunnel ID
cloudflared tunnel list
# Note the ID (looks like: f3d4b2a1-...)
```

### C. Configure Tunnel
```bash
# Create config file
sudo nano ~/.cloudflared/config.yml
```

Add:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/limsadmin/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: lims.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

### D. Start Tunnel
```bash
# Install as service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

### E. Configure DNS
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to DNS
4. Add CNAME record:
   - Name: `lims`
   - Target: `YOUR_TUNNEL_ID.cfargotunnel.com`

Now accessible at: https://lims.yourdomain.com

---

# PART 9: TROUBLESHOOTING

## Common Issues and Solutions

### Application Won't Start
```bash
# Check logs
docker compose -f docker-compose.simple.yml logs

# Check port conflicts
sudo netstat -tlnp | grep 3001

# Rebuild fresh
docker compose -f docker-compose.simple.yml down
docker system prune -f
docker compose -f docker-compose.simple.yml build --no-cache
docker compose -f docker-compose.simple.yml up -d
```

### Can't Access from Browser
```bash
# Check firewall
sudo ufw status

# Check Docker is running
docker ps

# Check application health
curl http://localhost:3001/health

# Check IP address
ip addr show
```

### Database Issues
```bash
# Backup current database
cp /opt/lims/data/lims.db /opt/lims/data/lims.db.backup

# Check database integrity
docker exec -it labscientific-lims sh
sqlite3 /app/data/lims.db "PRAGMA integrity_check;"
exit
```

### Disk Space Issues
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a -f

# Clean old logs
find /opt/lims/logs -name "*.log" -mtime +30 -delete

# Clean old backups
find /opt/lims/backups -name "*.db" -mtime +60 -delete
```

---

# PART 10: PRODUCTION CHECKLIST

## Before Going Live

- [ ] Change default admin password
- [ ] Configure firewall rules
- [ ] Setup automated backups
- [ ] Test backup restoration
- [ ] Configure monitoring alerts
- [ ] Document server IP and credentials
- [ ] Create user accounts for staff
- [ ] Train staff on system usage
- [ ] Create support contact list
- [ ] Test from client computers

## Daily Maintenance

- [ ] Check monitoring dashboard
- [ ] Verify backups completed
- [ ] Review error logs
- [ ] Check disk space

## Weekly Maintenance

- [ ] Test backup restoration
- [ ] Review user access logs
- [ ] Check for system updates
- [ ] Review performance metrics

## Monthly Maintenance

- [ ] Full system backup
- [ ] Security updates
- [ ] Performance optimization
- [ ] User access audit

---

# QUICK REFERENCE CARD

## Server Access
```bash
IP Address: 192.168.1.100
SSH: ssh limsadmin@192.168.1.100
Web: http://192.168.1.100:3001
```

## Essential Commands
```bash
# Start LIMS
cd /opt/lims && docker compose -f docker-compose.simple.yml up -d

# Stop LIMS
cd /opt/lims && docker compose -f docker-compose.simple.yml down

# View logs
cd /opt/lims && docker compose -f docker-compose.simple.yml logs -f

# Check status
docker ps

# Backup database
/opt/lims/backup.sh

# Monitor system
/opt/lims/monitor.sh
```

## File Locations
```
Application: /opt/lims
Database: /opt/lims/data/lims.db
Backups: /opt/lims/backups/
Logs: /opt/lims/logs/
Uploads: /opt/lims/uploads/
```

## Support Contacts
```
Developer: [Your contact]
IT Support: [Client IT contact]
Emergency: [Emergency contact]
```

---

# CONGRATULATIONS! 🎉

Your LIMS is now deployed and running. Access it at:
- Local Network: http://[SERVER-IP]:3001
- Internet (if configured): https://lims.yourdomain.com

Remember to:
1. Change the default password immediately
2. Set up regular backups
3. Monitor the system daily
4. Keep the system updated

For additional help, refer to the documentation or contact support.