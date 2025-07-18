#!/bin/bash
# System Monitoring Script - LFCS Skills Demonstration
# Collects system metrics and generates alerts

set -euo pipefail

LOGFILE="/var/log/lims/system-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=80
ALERT_THRESHOLD_DISK=80

# Ensure log directory exists
sudo mkdir -p /var/log/lims
sudo chown lims:lims /var/log/lims

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

# Memory Usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')

# Disk Usage
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)

# Load Average
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}')

# Network Statistics
NETWORK_STATS=$(ss -tuln | wc -l)

# Process Count
PROCESS_COUNT=$(ps aux | wc -l)

# Log the metrics
echo "$TIMESTAMP - CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, Load:${LOAD_AVERAGE}, Processes: ${PROCESS_COUNT}, Network: ${NETWORK_STATS}" >> $LOGFILE

# Check LIMS application health
LIMS_STATUS="DOWN"
if pgrep -f "node.*server.js" > /dev/null; then
    LIMS_STATUS="UP"
fi

# Docker container status
DOCKER_STATUS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "NAMES" | wc -l)

echo "$TIMESTAMP - LIMS Status: ${LIMS_STATUS}, Docker Containers: ${DOCKER_STATUS}" >> $LOGFILE

# Alert if thresholds exceeded
if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    echo "$TIMESTAMP - ALERT: High CPU usage: ${CPU_USAGE}%" >> $LOGFILE
    logger "LIMS ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEMORY_USAGE > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
    echo "$TIMESTAMP - ALERT: High memory usage: ${MEMORY_USAGE}%" >> $LOGFILE
    logger "LIMS ALERT: High memory usage: ${MEMORY_USAGE}%"
fi

if (( DISK_USAGE > ALERT_THRESHOLD_DISK )); then
    echo "$TIMESTAMP - ALERT: High disk usage: ${DISK_USAGE}%" >> $LOGFILE
    logger "LIMS ALERT: High disk usage: ${DISK_USAGE}%"
fi

if [[ $LIMS_STATUS == "DOWN" ]]; then
    echo "$TIMESTAMP - ALERT: LIMS application is down" >> $LOGFILE
    logger "LIMS ALERT: Application is down"
fi

# Cleanup old logs (keep last 30 days)
find /var/log/lims -name "*.log" -mtime +30 -delete 2>/dev/null || true

exit 0