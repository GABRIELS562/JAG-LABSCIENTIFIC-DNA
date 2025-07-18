#!/bin/bash
# Log Rotation Setup Script - LFCS Skills Demonstration
# Configures log rotation for LIMS application

set -euo pipefail

# Color output
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log "Setting up log rotation for LIMS application"

# Create logrotate configuration for LIMS
sudo tee /etc/logrotate.d/lims > /dev/null <<EOF
# LIMS Application Log Rotation
/var/log/lims/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 lims lims
    postrotate
        # Restart rsyslog to reopen log files
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

# LIMS Application Backend Logs
/opt/lims/app/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 lims lims
    copytruncate
}

# Docker container logs
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        # Send HUP signal to Docker daemon to reopen log files
        kill -HUP $(cat /var/run/docker.pid) 2>/dev/null || true
    endscript
}

# Nginx logs
/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        # Reload nginx to reopen log files
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF

# Create rsyslog configuration for LIMS
sudo tee /etc/rsyslog.d/10-lims.conf > /dev/null <<EOF
# LIMS Application Logging Configuration

# Create separate log files for LIMS application
if \$programname == 'lims' then /var/log/lims/application.log
if \$programname == 'lims' and \$msg contains 'ERROR' then /var/log/lims/error.log
if \$programname == 'lims' and \$msg contains 'ALERT' then /var/log/lims/alerts.log

# Stop processing if it's a LIMS log (don't duplicate in syslog)
if \$programname == 'lims' then stop
EOF

# Create systemd journal configuration for LIMS
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/lims.conf > /dev/null <<EOF
[Journal]
# Store logs persistently
Storage=persistent
# Compress logs
Compress=yes
# Limit journal size
SystemMaxUse=500M
RuntimeMaxUse=100M
# Retention time
MaxRetentionSec=30day
# Rate limiting
RateLimitIntervalSec=30s
RateLimitBurst=1000
EOF

# Create log directories
sudo mkdir -p /var/log/lims
sudo mkdir -p /opt/lims/app/backend/logs
sudo chown -R lims:lims /var/log/lims
sudo chown -R lims:lims /opt/lims/app/backend/logs

# Set appropriate permissions
sudo chmod 755 /var/log/lims
sudo chmod 755 /opt/lims/app/backend/logs

# Create initial log files
sudo touch /var/log/lims/application.log
sudo touch /var/log/lims/error.log
sudo touch /var/log/lims/alerts.log
sudo touch /var/log/lims/system-monitor.log
sudo chown lims:lims /var/log/lims/*.log
sudo chmod 644 /var/log/lims/*.log

# Test logrotate configuration
log "Testing logrotate configuration..."
sudo logrotate -d /etc/logrotate.d/lims

# Restart services to apply changes
log "Restarting services..."
sudo systemctl restart rsyslog
sudo systemctl restart systemd-journald

# Create cron job for log cleanup (backup to cron)
(sudo crontab -l 2>/dev/null; echo "0 1 * * * /usr/sbin/logrotate /etc/logrotate.conf") | sudo crontab -

# Create log monitoring script
sudo tee /opt/lims/scripts/log-monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Log monitoring script for LIMS

LOGFILE="/var/log/lims/application.log"
ERROR_LOG="/var/log/lims/error.log"
ALERT_LOG="/var/log/lims/alerts.log"

# Check for errors in the last 5 minutes
ERROR_COUNT=$(grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" "$ERROR_LOG" 2>/dev/null | wc -l)

if [[ $ERROR_COUNT -gt 5 ]]; then
    logger "LIMS ALERT: High error rate detected - $ERROR_COUNT errors in last 5 minutes"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: High error rate - $ERROR_COUNT errors in last 5 minutes" >> "$ALERT_LOG"
fi

# Check log file sizes
APPLICATION_LOG_SIZE=$(stat -c%s "$LOGFILE" 2>/dev/null || echo 0)
ERROR_LOG_SIZE=$(stat -c%s "$ERROR_LOG" 2>/dev/null || echo 0)

# Alert if log files are growing too large (>100MB)
if [[ $APPLICATION_LOG_SIZE -gt 104857600 ]]; then
    logger "LIMS ALERT: Application log file is large ($(($APPLICATION_LOG_SIZE / 1024 / 1024))MB)"
fi

if [[ $ERROR_LOG_SIZE -gt 10485760 ]]; then
    logger "LIMS ALERT: Error log file is large ($(($ERROR_LOG_SIZE / 1024 / 1024))MB)"
fi

# Check available disk space
DISK_USAGE=$(df /var/log | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [[ $DISK_USAGE -gt 80 ]]; then
    logger "LIMS ALERT: Log partition is ${DISK_USAGE}% full"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: Log partition is ${DISK_USAGE}% full" >> "$ALERT_LOG"
fi
EOF

sudo chmod +x /opt/lims/scripts/log-monitor.sh
sudo chown lims:lims /opt/lims/scripts/log-monitor.sh

# Add log monitoring to cron
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * /opt/lims/scripts/log-monitor.sh") | sudo crontab -

log "Log rotation setup completed successfully!"
log "Configuration files created:"
echo "  - /etc/logrotate.d/lims"
echo "  - /etc/rsyslog.d/10-lims.conf"
echo "  - /etc/systemd/journald.conf.d/lims.conf"
echo "  - /opt/lims/scripts/log-monitor.sh"
echo ""
log "Log directories created:"
echo "  - /var/log/lims/"
echo "  - /opt/lims/app/backend/logs/"
echo ""
log "Cron jobs added for log rotation and monitoring"