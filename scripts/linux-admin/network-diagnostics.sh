#!/bin/bash
# Network Diagnostics Script - LFCS Skills Demonstration
# Comprehensive network analysis and troubleshooting

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check network connectivity
check_connectivity() {
    local host=$1
    local port=${2:-80}
    
    if nc -z -w3 "$host" "$port" 2>/dev/null; then
        log "✓ $host:$port is reachable"
        return 0
    else
        error "✗ $host:$port is not reachable"
        return 1
    fi
}

# Function to check DNS resolution
check_dns() {
    local hostname=$1
    
    if nslookup "$hostname" > /dev/null 2>&1; then
        local ip=$(nslookup "$hostname" | grep "Address:" | tail -1 | awk '{print $2}')
        log "✓ DNS resolution for $hostname: $ip"
        return 0
    else
        error "✗ DNS resolution failed for $hostname"
        return 1
    fi
}

# Function to test network performance
test_network_performance() {
    local host=$1
    
    log "Testing network performance to $host..."
    
    # Ping test
    if ping -c 4 "$host" > /dev/null 2>&1; then
        local ping_result=$(ping -c 4 "$host" 2>/dev/null | tail -1)
        log "✓ Ping to $host: $ping_result"
    else
        error "✗ Ping to $host failed"
    fi
    
    # Traceroute test
    if command -v traceroute > /dev/null 2>&1; then
        log "Traceroute to $host:"
        traceroute -m 5 "$host" 2>/dev/null | head -5
    fi
}

# Function to check firewall status
check_firewall() {
    log "=== Firewall Status ==="
    
    # Check UFW status
    if command -v ufw > /dev/null 2>&1; then
        local ufw_status=$(sudo ufw status | head -1)
        log "UFW Status: $ufw_status"
        
        if [[ $ufw_status == *"active"* ]]; then
            log "Active UFW rules:"
            sudo ufw status numbered | grep -E "(ALLOW|DENY)" | head -10
        fi
    fi
    
    # Check iptables rules
    if command -v iptables > /dev/null 2>&1; then
        local iptables_rules=$(sudo iptables -L | grep -c "^Chain")
        log "Iptables chains: $iptables_rules"
    fi
}

# Function to check network interfaces
check_interfaces() {
    log "=== Network Interfaces ==="
    
    # Show all interfaces
    ip addr show | grep -E "^[0-9]+" | while read -r line; do
        local interface=$(echo "$line" | awk '{print $2}' | cut -d':' -f1)
        local state=$(echo "$line" | grep -o "state [A-Z]*" | awk '{print $2}')
        
        if [[ $state == "UP" ]]; then
            log "✓ Interface $interface is UP"
        else
            warning "⚠ Interface $interface is $state"
        fi
    done
    
    # Show interface statistics
    log "Interface statistics:"
    cat /proc/net/dev | grep -E "(eth|wlan|enp|wlp)" | while read -r line; do
        local interface=$(echo "$line" | awk '{print $1}' | cut -d':' -f1)
        local rx_bytes=$(echo "$line" | awk '{print $2}')
        local tx_bytes=$(echo "$line" | awk '{print $10}')
        
        # Convert bytes to human readable
        local rx_human=$(numfmt --to=iec --suffix=B "$rx_bytes")
        local tx_human=$(numfmt --to=iec --suffix=B "$tx_bytes")
        
        info "$interface: RX=$rx_human, TX=$tx_human"
    done
}

# Function to check routing table
check_routing() {
    log "=== Routing Table ==="
    
    # Show default route
    local default_route=$(ip route show default | head -1)
    if [[ -n $default_route ]]; then
        log "Default route: $default_route"
    else
        error "No default route found"
    fi
    
    # Show all routes
    log "All routes:"
    ip route show | head -10
}

# Function to check DNS configuration
check_dns_config() {
    log "=== DNS Configuration ==="
    
    # Check resolv.conf
    if [[ -f /etc/resolv.conf ]]; then
        log "DNS servers configured:"
        grep "nameserver" /etc/resolv.conf | while read -r line; do
            local nameserver=$(echo "$line" | awk '{print $2}')
            log "  $nameserver"
            
            # Test DNS server
            if nc -z -w3 "$nameserver" 53 2>/dev/null; then
                log "    ✓ DNS server $nameserver is reachable"
            else
                error "    ✗ DNS server $nameserver is not reachable"
            fi
        done
    else
        error "No /etc/resolv.conf file found"
    fi
}

# Function to check network services
check_network_services() {
    log "=== Network Services ==="
    
    # Check if essential services are running
    local services=("ssh" "networking" "systemd-networkd" "systemd-resolved")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log "✓ $service is running"
        else
            info "- $service is not running (may be normal)"
        fi
    done
}

# Function to check listening ports
check_listening_ports() {
    log "=== Listening Ports ==="
    
    # Check LIMS application ports
    local lims_ports=(3000 3001 80 443 22)
    
    for port in "${lims_ports[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            log "✓ Port $port is listening"
        else
            warning "⚠ Port $port is not listening"
        fi
    done
    
    # Show all listening ports
    log "All listening ports:"
    ss -tuln | grep "LISTEN" | head -10
}

# Function to check network security
check_network_security() {
    log "=== Network Security ==="
    
    # Check for open ports
    local open_ports=$(ss -tuln | grep "LISTEN" | wc -l)
    log "Total listening ports: $open_ports"
    
    # Check for suspicious connections
    local established_connections=$(ss -tun | grep "ESTAB" | wc -l)
    log "Established connections: $established_connections"
    
    # Check fail2ban status
    if command -v fail2ban-client > /dev/null 2>&1; then
        if systemctl is-active --quiet fail2ban; then
            log "✓ fail2ban is active"
            local banned_ips=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" | awk -F: '{print $2}' | wc -w)
            log "Banned IPs: $banned_ips"
        else
            warning "⚠ fail2ban is not active"
        fi
    fi
}

# Function to run bandwidth test
run_bandwidth_test() {
    log "=== Bandwidth Test ==="
    
    # Simple bandwidth test using dd and network tools
    log "Testing local network performance..."
    
    # Test disk I/O (affects network performance)
    local disk_speed=$(dd if=/dev/zero of=/tmp/test_file bs=1M count=100 2>&1 | grep "copied" | awk '{print $(NF-1) " " $NF}')
    log "Disk write speed: $disk_speed"
    rm -f /tmp/test_file
    
    # Test network latency to common servers
    local test_servers=("8.8.8.8" "1.1.1.1")
    
    for server in "${test_servers[@]}"; do
        if ping -c 3 "$server" > /dev/null 2>&1; then
            local avg_latency=$(ping -c 3 "$server" 2>/dev/null | tail -1 | awk -F'/' '{print $5}')
            log "Average latency to $server: ${avg_latency}ms"
        fi
    done
}

# Function to generate network report
generate_report() {
    local report_file="/tmp/network_diagnostics_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "LIMS Network Diagnostics Report"
        echo "Generated: $(date)"
        echo "Hostname: $(hostname)"
        echo "==============================="
        echo ""
        
        echo "System Information:"
        echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2)"
        echo "Kernel: $(uname -r)"
        echo "Uptime: $(uptime | cut -d',' -f1)"
        echo ""
        
        echo "Network Interfaces:"
        ip addr show
        echo ""
        
        echo "Routing Table:"
        ip route show
        echo ""
        
        echo "DNS Configuration:"
        cat /etc/resolv.conf
        echo ""
        
        echo "Listening Ports:"
        ss -tuln | grep "LISTEN"
        echo ""
        
        echo "Network Connections:"
        ss -tun | grep "ESTAB" | head -20
        echo ""
        
        echo "Firewall Status:"
        sudo ufw status 2>/dev/null || echo "UFW not available"
        echo ""
        
    } > "$report_file"
    
    log "Network diagnostics report generated: $report_file"
}

# Main execution
main() {
    log "Starting LIMS Network Diagnostics - LFCS Skills Demonstration"
    echo ""
    
    # Run all checks
    check_interfaces
    echo ""
    
    check_routing
    echo ""
    
    check_dns_config
    echo ""
    
    check_listening_ports
    echo ""
    
    check_firewall
    echo ""
    
    check_network_services
    echo ""
    
    check_network_security
    echo ""
    
    # Test connectivity to important services
    log "=== Connectivity Tests ==="
    check_dns "google.com"
    check_connectivity "8.8.8.8" 53
    check_connectivity "github.com" 443
    check_connectivity "docker.io" 443
    echo ""
    
    # Test network performance
    test_network_performance "8.8.8.8"
    echo ""
    
    run_bandwidth_test
    echo ""
    
    # Generate report
    generate_report
    
    log "Network diagnostics completed successfully!"
}

# Run main function
main "$@"