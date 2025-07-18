#!/bin/bash
# Comprehensive Performance Testing Runner for LIMS Application
# This script orchestrates all performance testing tools and generates unified reports

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RUN_ID="perf_test_${TIMESTAMP}"
REPORT_DIR="$RESULTS_DIR/$RUN_ID"

# Test configuration
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
TEST_DURATION="${TEST_DURATION:-300}"
MAX_VUS="${MAX_VUS:-100}"
RAMP_TIME="${RAMP_TIME:-60}"

# Tool availability flags
ARTILLERY_AVAILABLE=false
K6_AVAILABLE=false
LIGHTHOUSE_AVAILABLE=false
JMETER_AVAILABLE=false
AUTOCANNON_AVAILABLE=false

# Create results directory
mkdir -p "$REPORT_DIR"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$REPORT_DIR/test.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$REPORT_DIR/test.log" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$REPORT_DIR/test.log"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$REPORT_DIR/test.log"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$REPORT_DIR/test.log"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check tool availability
check_tools() {
    log "Checking available performance testing tools..."
    
    if command_exists artillery; then
        ARTILLERY_AVAILABLE=true
        info "Artillery.io: Available ($(artillery --version))"
    else
        warning "Artillery.io: Not available"
    fi
    
    if command_exists k6; then
        K6_AVAILABLE=true
        info "k6: Available ($(k6 version))"
    else
        warning "k6: Not available"
    fi
    
    if command_exists lighthouse; then
        LIGHTHOUSE_AVAILABLE=true
        info "Lighthouse: Available ($(lighthouse --version))"
    else
        warning "Lighthouse: Not available"
    fi
    
    if command_exists jmeter; then
        JMETER_AVAILABLE=true
        info "JMeter: Available"
    else
        warning "JMeter: Not available"
    fi
    
    if command_exists autocannon; then
        AUTOCANNON_AVAILABLE=true
        info "Autocannon: Available ($(autocannon --version))"
    else
        warning "Autocannon: Not available"
    fi
    
    # Check if Node.js is available for custom scripts
    if command_exists node; then
        info "Node.js: Available ($(node --version))"
    else
        error "Node.js: Not available - required for custom performance scripts"
        exit 1
    fi
}

# Function to check system health
check_system_health() {
    log "Checking system health before testing..."
    
    # Check target URL
    if curl -s --head "$TARGET_URL" >/dev/null; then
        success "Target URL is accessible: $TARGET_URL"
    else
        error "Target URL is not accessible: $TARGET_URL"
        exit 1
    fi
    
    # Check system resources
    local memory_mb=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    local cpu_cores=$(nproc)
    local disk_gb=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    
    info "System Resources:"
    info "  Available Memory: ${memory_mb}MB"
    info "  CPU Cores: ${cpu_cores}"
    info "  Available Disk: ${disk_gb}GB"
    
    if [ "$memory_mb" -lt 1000 ]; then
        warning "Low memory available. Performance tests may be affected."
    fi
    
    if [ "$cpu_cores" -lt 2 ]; then
        warning "Limited CPU cores. Consider reducing load test intensity."
    fi
}

# Function to run Artillery.io tests
run_artillery_tests() {
    if [ "$ARTILLERY_AVAILABLE" = true ]; then
        log "Running Artillery.io load tests..."
        
        local config_file="$SCRIPT_DIR/artillery.yml"
        local results_file="$REPORT_DIR/artillery-results.json"
        local report_file="$REPORT_DIR/artillery-report.html"
        
        # Update target URL in config
        sed "s|http://localhost:3000|$TARGET_URL|g" "$config_file" > "$REPORT_DIR/artillery-config.yml"
        
        # Run Artillery test
        if artillery run "$REPORT_DIR/artillery-config.yml" --output "$results_file"; then
            success "Artillery.io tests completed successfully"
            
            # Generate HTML report
            if [ -f "$results_file" ]; then
                artillery report "$results_file" --output "$report_file"
                info "Artillery.io report generated: $report_file"
            fi
        else
            error "Artillery.io tests failed"
            return 1
        fi
    else
        warning "Skipping Artillery.io tests - tool not available"
    fi
}

# Function to run k6 tests
run_k6_tests() {
    if [ "$K6_AVAILABLE" = true ]; then
        log "Running k6 load tests..."
        
        local test_file="$SCRIPT_DIR/k6-load-test.js"
        local results_file="$REPORT_DIR/k6-results.json"
        
        # Set environment variables
        export BASE_URL="$TARGET_URL"
        export K6_OUT="json=$results_file"
        
        # Run k6 test
        if k6 run --vus "$MAX_VUS" --duration "${TEST_DURATION}s" "$test_file"; then
            success "k6 tests completed successfully"
            
            # Generate additional reports if results exist
            if [ -f "$results_file" ]; then
                info "k6 results saved: $results_file"
            fi
        else
            error "k6 tests failed"
            return 1
        fi
    else
        warning "Skipping k6 tests - tool not available"
    fi
}

# Function to run Lighthouse tests
run_lighthouse_tests() {
    if [ "$LIGHTHOUSE_AVAILABLE" = true ]; then
        log "Running Lighthouse performance tests..."
        
        local lighthouse_script="$SCRIPT_DIR/lighthouse-performance.js"
        
        # Set environment variables
        export BASE_URL="$TARGET_URL"
        export LIGHTHOUSE_OUTPUT_DIR="$REPORT_DIR"
        
        # Run Lighthouse tests
        if cd "$SCRIPT_DIR" && node "$lighthouse_script"; then
            success "Lighthouse tests completed successfully"
        else
            error "Lighthouse tests failed"
            return 1
        fi
    else
        warning "Skipping Lighthouse tests - tool not available"
    fi
}

# Function to run JMeter tests
run_jmeter_tests() {
    if [ "$JMETER_AVAILABLE" = true ]; then
        log "Running JMeter load tests..."
        
        local test_plan="$SCRIPT_DIR/jmeter-test-plan.jmx"
        local results_file="$REPORT_DIR/jmeter-results.jtl"
        local dashboard_dir="$REPORT_DIR/jmeter-dashboard"
        
        # Run JMeter test
        if jmeter -n -t "$test_plan" -l "$results_file" -e -o "$dashboard_dir" \
           -JBASE_URL="$TARGET_URL" -JTEST_DURATION="$TEST_DURATION" -JMAX_VUS="$MAX_VUS"; then
            success "JMeter tests completed successfully"
            info "JMeter dashboard generated: $dashboard_dir"
        else
            error "JMeter tests failed"
            return 1
        fi
    else
        warning "Skipping JMeter tests - tool not available"
    fi
}

# Function to run Autocannon tests
run_autocannon_tests() {
    if [ "$AUTOCANNON_AVAILABLE" = true ]; then
        log "Running Autocannon benchmark tests..."
        
        local results_file="$REPORT_DIR/autocannon-results.json"
        
        # Run Autocannon benchmark
        if autocannon -c 100 -d "$TEST_DURATION" -p 10 -j "$TARGET_URL/api/health" > "$results_file"; then
            success "Autocannon tests completed successfully"
            info "Autocannon results saved: $results_file"
        else
            error "Autocannon tests failed"
            return 1
        fi
    else
        warning "Skipping Autocannon tests - tool not available"
    fi
}

# Function to run database benchmarks
run_database_benchmarks() {
    log "Running database performance benchmarks..."
    
    local benchmark_script="$SCRIPT_DIR/benchmark-database.js"
    local results_file="$REPORT_DIR/database-benchmark-results.json"
    
    if [ -f "$benchmark_script" ]; then
        if cd "$SCRIPT_DIR" && node "$benchmark_script" > "$results_file"; then
            success "Database benchmarks completed successfully"
            info "Database benchmark results saved: $results_file"
        else
            error "Database benchmarks failed"
            return 1
        fi
    else
        warning "Database benchmark script not found, skipping..."
    fi
}

# Function to monitor system resources during tests
monitor_resources() {
    log "Starting resource monitoring..."
    
    local monitor_file="$REPORT_DIR/resource-monitor.log"
    
    # Start resource monitoring in background
    {
        echo "timestamp,cpu_percent,memory_percent,disk_io_read,disk_io_write,network_in,network_out"
        while true; do
            timestamp=$(date +"%Y-%m-%d %H:%M:%S")
            cpu_percent=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
            memory_percent=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
            
            echo "$timestamp,$cpu_percent,$memory_percent,0,0,0,0"
            sleep 5
        done
    } > "$monitor_file" &
    
    local monitor_pid=$!
    echo "$monitor_pid" > "$REPORT_DIR/monitor.pid"
    
    info "Resource monitoring started (PID: $monitor_pid)"
}

# Function to stop resource monitoring
stop_monitoring() {
    if [ -f "$REPORT_DIR/monitor.pid" ]; then
        local monitor_pid=$(cat "$REPORT_DIR/monitor.pid")
        if kill "$monitor_pid" 2>/dev/null; then
            info "Resource monitoring stopped"
        fi
        rm -f "$REPORT_DIR/monitor.pid"
    fi
}

# Function to generate unified report
generate_unified_report() {
    log "Generating unified performance report..."
    
    local report_file="$REPORT_DIR/performance-report.html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LIMS Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; text-align: center; }
        h2 { color: #555; border-bottom: 2px solid #007acc; padding-bottom: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .test-section { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 LIMS Performance Test Report</h1>
        <div class="timestamp">Generated on: $(date)</div>
        
        <h2>📊 Test Summary</h2>
        <div class="summary">
            <div class="metric-card">
                <h3>Test Duration</h3>
                <div class="metric-value">${TEST_DURATION}s</div>
            </div>
            <div class="metric-card">
                <h3>Max Virtual Users</h3>
                <div class="metric-value">${MAX_VUS}</div>
            </div>
            <div class="metric-card">
                <h3>Target URL</h3>
                <div class="metric-value">${TARGET_URL}</div>
            </div>
            <div class="metric-card">
                <h3>Run ID</h3>
                <div class="metric-value">${RUN_ID}</div>
            </div>
        </div>
        
        <h2>🔧 Tools Used</h2>
        <div class="test-section">
EOF

    # Add tool status to report
    if [ "$ARTILLERY_AVAILABLE" = true ]; then
        echo '            <p class="success">✅ Artillery.io - Load Testing</p>' >> "$report_file"
    else
        echo '            <p class="warning">⚠️ Artillery.io - Not Available</p>' >> "$report_file"
    fi
    
    if [ "$K6_AVAILABLE" = true ]; then
        echo '            <p class="success">✅ k6 - Load Testing</p>' >> "$report_file"
    else
        echo '            <p class="warning">⚠️ k6 - Not Available</p>' >> "$report_file"
    fi
    
    if [ "$LIGHTHOUSE_AVAILABLE" = true ]; then
        echo '            <p class="success">✅ Lighthouse - Performance Auditing</p>' >> "$report_file"
    else
        echo '            <p class="warning">⚠️ Lighthouse - Not Available</p>' >> "$report_file"
    fi
    
    if [ "$JMETER_AVAILABLE" = true ]; then
        echo '            <p class="success">✅ JMeter - Load Testing</p>' >> "$report_file"
    else
        echo '            <p class="warning">⚠️ JMeter - Not Available</p>' >> "$report_file"
    fi
    
    if [ "$AUTOCANNON_AVAILABLE" = true ]; then
        echo '            <p class="success">✅ Autocannon - HTTP Benchmarking</p>' >> "$report_file"
    else
        echo '            <p class="warning">⚠️ Autocannon - Not Available</p>' >> "$report_file"
    fi

    cat >> "$report_file" << 'EOF'
        </div>
        
        <h2>📁 Generated Reports</h2>
        <div class="test-section">
            <ul>
EOF

    # Add links to generated reports
    if [ -f "$REPORT_DIR/artillery-report.html" ]; then
        echo '                <li><a href="artillery-report.html">Artillery.io Report</a></li>' >> "$report_file"
    fi
    
    if [ -f "$REPORT_DIR/k6-load-test-results.html" ]; then
        echo '                <li><a href="k6-load-test-results.html">k6 Load Test Results</a></li>' >> "$report_file"
    fi
    
    if [ -d "$REPORT_DIR/jmeter-dashboard" ]; then
        echo '                <li><a href="jmeter-dashboard/index.html">JMeter Dashboard</a></li>' >> "$report_file"
    fi
    
    if [ -d "$REPORT_DIR/lighthouse-results" ]; then
        echo '                <li><a href="lighthouse-results/">Lighthouse Results</a></li>' >> "$report_file"
    fi

    cat >> "$report_file" << 'EOF'
            </ul>
        </div>
        
        <h2>📋 Test Log</h2>
        <div class="test-section">
            <pre id="test-log"></pre>
        </div>
        
        <script>
            // Load test log
            fetch('test.log')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('test-log').textContent = data;
                })
                .catch(error => {
                    document.getElementById('test-log').textContent = 'Error loading test log: ' + error;
                });
        </script>
    </div>
</body>
</html>
EOF

    success "Unified performance report generated: $report_file"
}

# Function to cleanup
cleanup() {
    log "Cleaning up..."
    stop_monitoring
    
    # Kill any remaining processes
    pkill -f "artillery" 2>/dev/null || true
    pkill -f "k6" 2>/dev/null || true
    pkill -f "lighthouse" 2>/dev/null || true
    pkill -f "jmeter" 2>/dev/null || true
    pkill -f "autocannon" 2>/dev/null || true
    
    info "Cleanup completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --target URL         Target URL for testing (default: http://localhost:3000)"
    echo "  --duration SECONDS   Test duration in seconds (default: 300)"
    echo "  --max-vus NUMBER     Maximum virtual users (default: 100)"
    echo "  --ramp-time SECONDS  Ramp-up time in seconds (default: 60)"
    echo "  --tools TOOLS        Comma-separated list of tools to run (artillery,k6,lighthouse,jmeter,autocannon)"
    echo "  --skip-health        Skip health check"
    echo "  --no-monitoring      Disable resource monitoring"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --target http://localhost:3000 --duration 600 --max-vus 50"
    echo "  $0 --tools artillery,k6 --duration 300"
    echo "  $0 --skip-health --no-monitoring"
}

# Parse command line arguments
SKIP_HEALTH=false
NO_MONITORING=false
SELECTED_TOOLS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET_URL="$2"
            shift 2
            ;;
        --duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        --max-vus)
            MAX_VUS="$2"
            shift 2
            ;;
        --ramp-time)
            RAMP_TIME="$2"
            shift 2
            ;;
        --tools)
            SELECTED_TOOLS="$2"
            shift 2
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --no-monitoring)
            NO_MONITORING=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Setup trap for cleanup
    trap cleanup EXIT INT TERM
    
    log "Starting LIMS performance testing suite..."
    log "Target URL: $TARGET_URL"
    log "Test Duration: ${TEST_DURATION}s"
    log "Max Virtual Users: $MAX_VUS"
    log "Results Directory: $REPORT_DIR"
    
    # Check tools availability
    check_tools
    
    # System health check
    if [ "$SKIP_HEALTH" = false ]; then
        check_system_health
    fi
    
    # Start resource monitoring
    if [ "$NO_MONITORING" = false ]; then
        monitor_resources
    fi
    
    # Run performance tests
    local test_failures=0
    
    if [ -n "$SELECTED_TOOLS" ]; then
        # Run only selected tools
        IFS=',' read -ra TOOLS <<< "$SELECTED_TOOLS"
        for tool in "${TOOLS[@]}"; do
            case $tool in
                artillery)
                    run_artillery_tests || ((test_failures++))
                    ;;
                k6)
                    run_k6_tests || ((test_failures++))
                    ;;
                lighthouse)
                    run_lighthouse_tests || ((test_failures++))
                    ;;
                jmeter)
                    run_jmeter_tests || ((test_failures++))
                    ;;
                autocannon)
                    run_autocannon_tests || ((test_failures++))
                    ;;
                *)
                    warning "Unknown tool: $tool"
                    ;;
            esac
        done
    else
        # Run all available tools
        run_artillery_tests || ((test_failures++))
        run_k6_tests || ((test_failures++))
        run_lighthouse_tests || ((test_failures++))
        run_jmeter_tests || ((test_failures++))
        run_autocannon_tests || ((test_failures++))
    fi
    
    # Run database benchmarks
    run_database_benchmarks || ((test_failures++))
    
    # Stop resource monitoring
    if [ "$NO_MONITORING" = false ]; then
        stop_monitoring
    fi
    
    # Generate unified report
    generate_unified_report
    
    # Summary
    log "Performance testing completed!"
    log "Results directory: $REPORT_DIR"
    log "Test failures: $test_failures"
    
    if [ "$test_failures" -eq 0 ]; then
        success "All performance tests completed successfully!"
        exit 0
    else
        warning "Some performance tests failed. Check the logs for details."
        exit 1
    fi
}

# Run main function
main "$@"