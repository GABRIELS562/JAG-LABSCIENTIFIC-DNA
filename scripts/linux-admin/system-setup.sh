#!/bin/bash
# LIMS System Setup Script - LFCS Skills Demonstration
# This script demonstrates Linux system administration skills for LFCS certification

set -euo pipefail

# Color output for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if script is run as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

log "Starting LIMS System Setup - LFCS Skills Demonstration"

# 1. SYSTEM INFORMATION AND MONITORING
log "=== System Information Collection ==="
echo "Hostname: $(hostname)"
echo "Kernel: $(uname -r)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '"')"
echo "Architecture: $(uname -m)"
echo "CPU Cores: $(nproc)"
echo "Memory: $(free -h | grep '^Mem:' | awk '{print $2}')"
echo "Disk Space: $(df -h / | tail -1 | awk '{print $4}')"

# 2. PACKAGE MANAGEMENT
log "=== Package Management ==="
if command -v apt &> /dev/null; then
    PACKAGE_MANAGER="apt"
    UPDATE_CMD="sudo apt update"
    INSTALL_CMD="sudo apt install -y"
elif command -v yum &> /dev/null; then
    PACKAGE_MANAGER="yum"
    UPDATE_CMD="sudo yum update -y"
    INSTALL_CMD="sudo yum install -y"
elif command -v dnf &> /dev/null; then
    PACKAGE_MANAGER="dnf"
    UPDATE_CMD="sudo dnf update -y"
    INSTALL_CMD="sudo dnf install -y"
else
    error "Unsupported package manager"
    exit 1
fi

log "Detected package manager: $PACKAGE_MANAGER"

# Essential packages for LIMS
PACKAGES=(
    "docker.io"
    "docker-compose"
    "git"
    "curl"
    "wget"
    "htop"
    "iotop"
    "net-tools"
    "nginx"
    "postgresql-client"
    "redis-tools"
    "fail2ban"
    "ufw"
    "logrotate"
    "rsyslog"
    "cron"
    "ntp"
)

log "Installing essential packages..."
$UPDATE_CMD
for package in "${PACKAGES[@]}"; do
    log "Installing $package..."
    $INSTALL_CMD $package || warning "Failed to install $package"
done

# 3. USER AND GROUP MANAGEMENT
log "=== User and Group Management ==="
# Create lims user and group
if ! getent group lims > /dev/null 2>&1; then
    log "Creating lims group..."
    sudo groupadd -r lims
else
    log "Group 'lims' already exists"
fi

if ! getent passwd lims > /dev/null 2>&1; then
    log "Creating lims user..."
    sudo useradd -r -g lims -d /opt/lims -s /bin/bash -c "LIMS Application User" lims
    sudo mkdir -p /opt/lims
    sudo chown lims:lims /opt/lims
else
    log "User 'lims' already exists"
fi

# Add current user to lims group
log "Adding current user to lims group..."
sudo usermod -a -G lims $USER

# Add lims user to docker group
log "Adding lims user to docker group..."
sudo usermod -a -G docker lims

# 4. DIRECTORY STRUCTURE AND PERMISSIONS
log "=== Directory Structure Setup ==="
DIRECTORIES=(
    "/opt/lims/app"
    "/opt/lims/data"
    "/opt/lims/logs"
    "/opt/lims/backups"
    "/opt/lims/config"
    "/opt/lims/scripts"
    "/var/log/lims"
    "/var/lib/lims"
)

for dir in "${DIRECTORIES[@]}"; do
    log "Creating directory: $dir"
    sudo mkdir -p "$dir"
    sudo chown lims:lims "$dir"
    sudo chmod 755 "$dir"
done

# Special permissions for log directory
sudo chmod 775 /var/log/lims

# 5. FIREWALL CONFIGURATION
log "=== Firewall Configuration ==="
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# LIMS application ports
sudo ufw allow 3000/tcp comment "LIMS Frontend"
sudo ufw allow 3001/tcp comment "LIMS Backend"
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Database ports (restricted to localhost)
sudo ufw allow from 127.0.0.1 to any port 5432 comment "PostgreSQL"
sudo ufw allow from 127.0.0.1 to any port 6379 comment "Redis"

log "Firewall rules configured"
sudo ufw status

# 6. SYSTEM SECURITY HARDENING
log "=== Security Hardening ==="

# Configure fail2ban for SSH protection
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure automatic security updates
if [[ $PACKAGE_MANAGER == "apt" ]]; then
    sudo apt install -y unattended-upgrades
    sudo dpkg-reconfigure -plow unattended-upgrades
fi

log "System setup completed successfully!"