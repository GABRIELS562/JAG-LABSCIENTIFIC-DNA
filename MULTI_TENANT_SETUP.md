# 🖥️ Multi-Tenant Server Setup Guide

## Overview
This guide sets up the mini PC to run multiple applications with secure isolated access for both client and developer.

## Architecture
```
Internet
    ↓
Cloudflare Edge
    ↓
Multiple Tunnels
    ├── lims.clientdomain.com → Client LIMS
    ├── dev.yourdomain.com → Your Apps
    └── ssh.yourdomain.com → Your SSH Access
    ↓
Mini PC (Ubuntu Server)
    ├── Docker Network: client-network
    │   └── LIMS Application
    └── Docker Network: dev-network
        └── Your Applications
```

## Step 1: Operating System Setup

### Install Ubuntu Server 22.04 LTS
```bash
# During installation:
- Hostname: labserver
- Username: sysadmin (shared admin)
- Enable SSH: Yes
- No GUI needed (save resources)
```

### Create User Accounts
```bash
# Admin account (you)
sudo adduser devadmin
sudo usermod -aG sudo,docker devadmin

# Client account (limited)
sudo adduser clientuser
sudo usermod -aG docker clientuser

# Set up SSH keys for your remote access
su - devadmin
mkdir ~/.ssh
echo "your-public-ssh-key" > ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Step 2: Docker Setup with Isolation

### Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
```

### Create Isolated Networks
```bash
# Network for client applications
docker network create client-network --subnet=172.20.0.0/16

# Network for your applications
docker network create dev-network --subnet=172.21.0.0/16

# Shared network (if needed for communication)
docker network create shared-network --subnet=172.22.0.0/16
```

## Step 3: Directory Structure

```bash
# Create organized structure
sudo mkdir -p /opt/apps/{client,developer,shared}

# Client's LIMS
sudo mkdir -p /opt/apps/client/lims
sudo chown -R clientuser:clientuser /opt/apps/client

# Your applications
sudo mkdir -p /opt/apps/developer/{app1,app2,databases}
sudo chown -R devadmin:devadmin /opt/apps/developer

# Shared resources
sudo mkdir -p /opt/apps/shared/{backups,logs}
```

## Step 4: Deploy Client's LIMS

### Create docker-compose for LIMS
```yaml
# /opt/apps/client/lims/docker-compose.yml
version: '3.8'

services:
  lims-app:
    image: labscientific-lims:latest
    container_name: client-lims
    restart: unless-stopped
    networks:
      - client-network
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/lims.db
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  lims-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: client-tunnel
    restart: unless-stopped
    networks:
      - client-network
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLIENT_TUNNEL_TOKEN}

networks:
  client-network:
    external: true
```

## Step 5: Deploy Your Applications

### Create docker-compose for your apps
```yaml
# /opt/apps/developer/docker-compose.yml
version: '3.8'

services:
  # Your Admin Dashboard
  admin-panel:
    image: your-admin-panel:latest
    container_name: dev-admin
    restart: unless-stopped
    networks:
      - dev-network
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./admin-data:/app/data

  # Your Database
  postgres:
    image: postgres:15-alpine
    container_name: dev-postgres
    restart: unless-stopped
    networks:
      - dev-network
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data

  # Your API Service
  api-service:
    image: your-api:latest
    container_name: dev-api
    restart: unless-stopped
    networks:
      - dev-network
      - shared-network  # If needs to communicate with LIMS
    ports:
      - "127.0.0.1:4001:4001"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/yourdb

  # Your Tunnel
  dev-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: dev-tunnel
    restart: unless-stopped
    networks:
      - dev-network
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${DEV_TUNNEL_TOKEN}

networks:
  dev-network:
    external: true
  shared-network:
    external: true
```

## Step 6: Cloudflare Configuration

### Create Multiple Tunnels
```bash
# Tunnel 1: Client's LIMS
cloudflared tunnel create client-lims
cloudflared tunnel route dns client-lims lims.clientdomain.com

# Tunnel 2: Your Development Access
cloudflared tunnel create dev-access
cloudflared tunnel route dns dev-access admin.yourdomain.com
cloudflared tunnel route dns dev-access ssh.yourdomain.com
cloudflared tunnel route dns dev-access db.yourdomain.com
```

### Configure Access Policies

#### Client Access (lims.clientdomain.com)
```yaml
Policies:
  - Name: Client Access
    Include: [Everyone]
    Require: [Purpose: Client access only]
```

#### Your Admin Access (*.yourdomain.com)
```yaml
Policies:
  - Name: Developer Access
    Include: [Email: your@email.com]
    Require: [Multi-factor authentication]
```

## Step 7: Resource Management

### Docker Resource Limits
```yaml
# Add to each service in docker-compose:
    deploy:
      resources:
        limits:
          cpus: '0.5'  # Limit CPU usage
          memory: 512M  # Limit RAM usage
        reservations:
          cpus: '0.25'
          memory: 256M
```

### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Create monitoring script
cat > /opt/apps/shared/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Resources ==="
free -h
echo ""
echo "=== Docker Containers ==="
docker stats --no-stream
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Network Connections ==="
ss -tuln | grep LISTEN
EOF

chmod +x /opt/apps/shared/monitor.sh
```

## Step 8: Backup Strategy

### Automated Backups
```bash
# Create backup script
cat > /opt/apps/shared/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/apps/shared/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup client LIMS
docker exec client-lims sqlite3 /app/data/lims.db ".backup $BACKUP_DIR/lims_$DATE.db"

# Backup your databases
docker exec dev-postgres pg_dump -U postgres yourdb > $BACKUP_DIR/yourdb_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

# Sync to cloud (optional)
# rclone sync $BACKUP_DIR remote:backups/
EOF

chmod +x /opt/apps/shared/backup.sh

# Add to crontab
echo "0 2 * * * /opt/apps/shared/backup.sh" | crontab -
```

## Step 9: Security Hardening

### Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from 172.20.0.0/16 to any  # Docker client network
sudo ufw allow from 172.21.0.0/16 to any  # Docker dev network
sudo ufw --force enable
```

### Fail2ban for SSH Protection
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Automatic Security Updates
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 10: Your Remote Access

### SSH Access
```bash
# From anywhere:
ssh devadmin@ssh.yourdomain.com

# Port forward to access services locally
ssh -L 5432:localhost:5432 devadmin@ssh.yourdomain.com
# Now access Postgres on your local port 5432
```

### Web Access to Your Apps
```
https://admin.yourdomain.com → Your Admin Panel
https://api.yourdomain.com → Your API
https://db.yourdomain.com → Database UI (pgAdmin/Adminer)
```

### Docker Management
```bash
# View all containers
docker ps -a

# View logs
docker logs dev-admin
docker logs client-lims

# Enter container
docker exec -it dev-postgres psql -U postgres

# Restart your services
cd /opt/apps/developer
docker-compose restart

# Update your apps
docker-compose pull
docker-compose up -d
```

## Resource Allocation Guide

### For Mini PC with 8GB RAM:
```
Ubuntu OS:        1GB
Client LIMS:      2GB
Your Apps:        3GB
PostgreSQL:       1GB
System Buffer:    1GB
```

### For Mini PC with 16GB RAM:
```
Ubuntu OS:        2GB
Client LIMS:      3GB
Your Apps:        6GB
Databases:        3GB
System Buffer:    2GB
```

## Monitoring Dashboard

### Install Portainer for GUI Management
```bash
docker volume create portainer_data
docker run -d -p 127.0.0.1:9000:9000 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce

# Access via tunnel at https://portainer.yourdomain.com
```

## Maintenance Windows

### Schedule with Client:
- **Your Maintenance**: Weekends 2-4 AM
- **Client Access**: 24/7 except maintenance
- **Automatic Updates**: Disabled for stability
- **Manual Updates**: Coordinated schedule

## Cost Sharing

### Suggested Model:
- Client pays: Mini PC hardware, Internet
- You pay: Your Cloudflare tunnel/domain
- Shared: Electricity (~$5-10/month)

## Troubleshooting

### If Client App Affects Your Apps:
```bash
# Isolate problematic container
docker update --restart=no client-lims
docker stop client-lims

# Your apps continue running
```

### If Your Apps Affect Client:
```bash
# Resource limit your containers
docker update --memory="512m" --cpus="0.5" dev-admin
```

### Emergency Access:
```bash
# Direct SSH (if Cloudflare down)
ssh devadmin@client-public-ip -p 22
```

## SLA Agreement Points

1. **Uptime Target**: 99% (allows 7 hours downtime/month)
2. **Your Access**: 24/7 with notification for heavy tasks
3. **Client Priority**: Their apps get resource priority
4. **Backup Responsibility**: Automated daily
5. **Security Updates**: You handle monthly
6. **Support Hours**: Business hours for client

---

## Quick Commands Cheat Sheet

```bash
# Check what's running
docker ps

# Check resource usage
docker stats

# View client LIMS logs
docker logs client-lims --tail 50

# View your app logs
docker logs dev-admin --tail 50

# Restart everything
docker restart $(docker ps -q)

# Backup now
/opt/apps/shared/backup.sh

# Check disk space
df -h

# Check memory
free -h

# Monitor network
nethogs

# Update your apps only
cd /opt/apps/developer && docker-compose pull && docker-compose up -d
```