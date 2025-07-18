#!/bin/bash
# Process Management Script - LFCS Skills Demonstration
# Manages LIMS application processes and system services

set -euo pipefail

ACTION=$1
SERVICE=${2:-"all"}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a process is running
is_running() {
    local process_name=$1
    pgrep -f "$process_name" > /dev/null 2>&1
}

# Function to manage Docker containers
manage_containers() {
    local action=$1
    case $action in
        "start")
            log "Starting Docker containers..."
            docker-compose up -d
            ;;
        "stop")
            log "Stopping Docker containers..."
            docker-compose down
            ;;
        "restart")
            log "Restarting Docker containers..."
            docker-compose restart
            ;;
        "status")
            log "Docker container status:"
            docker-compose ps
            ;;
    esac
}

# Function to manage system services
manage_service() {
    local service_name=$1
    local action=$2
    
    case $action in
        "start")
            log "Starting $service_name..."
            sudo systemctl start $service_name
            ;;
        "stop")
            log "Stopping $service_name..."
            sudo systemctl stop $service_name
            ;;
        "restart")
            log "Restarting $service_name..."
            sudo systemctl restart $service_name
            ;;
        "status")
            log "Status of $service_name:"
            sudo systemctl status $service_name --no-pager
            ;;
        "enable")
            log "Enabling $service_name..."
            sudo systemctl enable $service_name
            ;;
        "disable")
            log "Disabling $service_name..."
            sudo systemctl disable $service_name
            ;;
    esac
}

# Function to show system resource usage
show_resources() {
    log "=== System Resource Usage ==="
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2 $3 $4}'
    echo ""
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h
    echo ""
    echo "Network Connections:"
    ss -tuln | head -10
    echo ""
    echo "Top Processes:"
    ps aux --sort=-%cpu | head -10
}

# Function to perform health checks
health_check() {
    log "=== LIMS Health Check ==="
    
    # Check if LIMS application is running
    if is_running "node.*server.js"; then
        log "✓ LIMS application is running"
    else
        error "✗ LIMS application is not running"
    fi
    
    # Check database connection
    if docker exec labscientific-lims-redis redis-cli ping > /dev/null 2>&1; then
        log "✓ Redis is responding"
    else
        error "✗ Redis is not responding"
    fi
    
    # Check if ports are accessible
    if nc -z localhost 3000 2>/dev/null; then
        log "✓ Frontend port (3000) is accessible"
    else
        error "✗ Frontend port (3000) is not accessible"
    fi
    
    if nc -z localhost 3001 2>/dev/null; then
        log "✓ Backend port (3001) is accessible"
    else
        error "✗ Backend port (3001) is not accessible"
    fi
    
    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    if (( DISK_USAGE < 80 )); then
        log "✓ Disk usage is acceptable (${DISK_USAGE}%)"
    else
        warning "⚠ Disk usage is high (${DISK_USAGE}%)"
    fi
    
    # Check system load
    LOAD_5MIN=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $2}' | cut -d',' -f1)
    CPU_CORES=$(nproc)
    if (( $(echo "$LOAD_5MIN < $CPU_CORES" | bc -l) )); then
        log "✓ System load is acceptable ($LOAD_5MIN)"
    else
        warning "⚠ System load is high ($LOAD_5MIN)"
    fi
}

# Main script logic
case $ACTION in
    "start")
        case $SERVICE in
            "lims")
                log "Starting LIMS application..."
                manage_containers "start"
                ;;
            "nginx")
                manage_service "nginx" "start"
                ;;
            "fail2ban")
                manage_service "fail2ban" "start"
                ;;
            "all")
                log "Starting all services..."
                manage_service "nginx" "start"
                manage_service "fail2ban" "start"
                manage_containers "start"
                ;;
            *)
                error "Unknown service: $SERVICE"
                exit 1
                ;;
        esac
        ;;
        
    "stop")
        case $SERVICE in
            "lims")
                log "Stopping LIMS application..."
                manage_containers "stop"
                ;;
            "nginx")
                manage_service "nginx" "stop"
                ;;
            "fail2ban")
                manage_service "fail2ban" "stop"
                ;;
            "all")
                log "Stopping all services..."
                manage_containers "stop"
                manage_service "nginx" "stop"
                ;;
            *)
                error "Unknown service: $SERVICE"
                exit 1
                ;;
        esac
        ;;
        
    "restart")
        case $SERVICE in
            "lims")
                log "Restarting LIMS application..."
                manage_containers "restart"
                ;;
            "nginx")
                manage_service "nginx" "restart"
                ;;
            "fail2ban")
                manage_service "fail2ban" "restart"
                ;;
            "all")
                log "Restarting all services..."
                manage_containers "restart"
                manage_service "nginx" "restart"
                manage_service "fail2ban" "restart"
                ;;
            *)
                error "Unknown service: $SERVICE"
                exit 1
                ;;
        esac
        ;;
        
    "status")
        case $SERVICE in
            "lims")
                manage_containers "status"
                ;;
            "nginx")
                manage_service "nginx" "status"
                ;;
            "fail2ban")
                manage_service "fail2ban" "status"
                ;;
            "all")
                log "=== Service Status ==="
                manage_containers "status"
                manage_service "nginx" "status"
                manage_service "fail2ban" "status"
                show_resources
                ;;
            *)
                error "Unknown service: $SERVICE"
                exit 1
                ;;
        esac
        ;;
        
    "health")
        health_check
        ;;
        
    "resources")
        show_resources
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|health|resources} [service]"
        echo "Services: lims, nginx, fail2ban, all"
        echo "Examples:"
        echo "  $0 start all       # Start all services"
        echo "  $0 stop lims       # Stop LIMS application"
        echo "  $0 status nginx    # Check nginx status"
        echo "  $0 health          # Perform health check"
        echo "  $0 resources       # Show system resources"
        exit 1
        ;;
esac

log "Operation completed successfully"