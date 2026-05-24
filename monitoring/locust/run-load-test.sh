#!/bin/bash
#
# LIMS Load Test Runner
# Runs Locust tests and exports results
#
# Usage:
#   ./run-load-test.sh smoke     # Quick smoke test (1 user, 1 min)
#   ./run-load-test.sh load      # Load test (50 users, 5 min)
#   ./run-load-test.sh stress    # Stress test (200 users, 10 min)
#   ./run-load-test.sh custom 100 10 5m  # Custom: 100 users, spawn 10/s, 5 min
#
# Environment variables:
#   TARGET_HOST - Target URL (default: http://100.89.26.128:30007)
#   OUTPUT_DIR  - Results directory (default: ./results)
#

set -e

# Configuration
TARGET_HOST="${TARGET_HOST:-http://100.89.26.128:30007}"
OUTPUT_DIR="${OUTPUT_DIR:-./results}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create results directory
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_DIR="$OUTPUT_DIR/$TIMESTAMP"
mkdir -p "$RUN_DIR"

# Test configurations
run_smoke_test() {
    log_info "Running Smoke Test..."
    log_info "Target: $TARGET_HOST"
    log_info "Config: 1 user, 1 minute"

    locust -f "$SCRIPT_DIR/scenarios/smoke_test.py" \
        --headless \
        --host="$TARGET_HOST" \
        --users 1 \
        --spawn-rate 1 \
        --run-time 1m \
        --html="$RUN_DIR/smoke_report.html" \
        --csv="$RUN_DIR/smoke" \
        --only-summary
}

run_load_test() {
    log_info "Running Load Test..."
    log_info "Target: $TARGET_HOST"
    log_info "Config: 50 users, 5 minutes"

    locust -f "$SCRIPT_DIR/scenarios/load_test.py" \
        --headless \
        --host="$TARGET_HOST" \
        --users 50 \
        --spawn-rate 5 \
        --run-time 5m \
        --html="$RUN_DIR/load_report.html" \
        --csv="$RUN_DIR/load" \
        --only-summary
}

run_stress_test() {
    log_info "Running Stress Test..."
    log_info "Target: $TARGET_HOST"
    log_info "Config: 200 users (stepped), 10 minutes"

    locust -f "$SCRIPT_DIR/scenarios/stress_test.py" \
        --headless \
        --host="$TARGET_HOST" \
        --html="$RUN_DIR/stress_report.html" \
        --csv="$RUN_DIR/stress" \
        --only-summary
}

run_custom_test() {
    local users=$1
    local spawn_rate=$2
    local duration=$3

    log_info "Running Custom Test..."
    log_info "Target: $TARGET_HOST"
    log_info "Config: $users users, spawn $spawn_rate/s, $duration"

    locust -f "$SCRIPT_DIR/locustfile.py" \
        --headless \
        --host="$TARGET_HOST" \
        --users "$users" \
        --spawn-rate "$spawn_rate" \
        --run-time "$duration" \
        --html="$RUN_DIR/custom_report.html" \
        --csv="$RUN_DIR/custom" \
        --only-summary
}

# Check results and determine pass/fail
check_results() {
    local csv_file=$1
    local max_failure_rate=${2:-5}  # Default 5% failure threshold
    local max_avg_response=${3:-2000}  # Default 2000ms threshold

    if [ ! -f "${csv_file}_stats.csv" ]; then
        log_error "Results file not found: ${csv_file}_stats.csv"
        return 1
    fi

    # Parse results (skip header, get aggregated row)
    local stats=$(tail -1 "${csv_file}_stats.csv")
    local total_requests=$(echo "$stats" | cut -d',' -f3)
    local failures=$(echo "$stats" | cut -d',' -f4)
    local avg_response=$(echo "$stats" | cut -d',' -f6)

    # Calculate failure rate
    if [ "$total_requests" -gt 0 ]; then
        local failure_rate=$(echo "scale=2; $failures * 100 / $total_requests" | bc)
    else
        local failure_rate=100
    fi

    log_info "Results Summary:"
    log_info "  Total Requests: $total_requests"
    log_info "  Failures: $failures ($failure_rate%)"
    log_info "  Avg Response: ${avg_response}ms"

    # Check thresholds
    local passed=true

    if (( $(echo "$failure_rate > $max_failure_rate" | bc -l) )); then
        log_error "FAIL: Failure rate ($failure_rate%) exceeds threshold ($max_failure_rate%)"
        passed=false
    fi

    if (( $(echo "$avg_response > $max_avg_response" | bc -l) )); then
        log_error "FAIL: Avg response (${avg_response}ms) exceeds threshold (${max_avg_response}ms)"
        passed=false
    fi

    if [ "$passed" = true ]; then
        log_info "PASS: All thresholds met"
        return 0
    else
        return 1
    fi
}

# Generate summary JSON for CI
generate_summary() {
    local test_type=$1
    local csv_prefix="$RUN_DIR/${test_type}"

    if [ ! -f "${csv_prefix}_stats.csv" ]; then
        return
    fi

    local stats=$(tail -1 "${csv_prefix}_stats.csv")
    local total=$(echo "$stats" | cut -d',' -f3)
    local failures=$(echo "$stats" | cut -d',' -f4)
    local avg=$(echo "$stats" | cut -d',' -f6)
    local p50=$(echo "$stats" | cut -d',' -f7)
    local p95=$(echo "$stats" | cut -d',' -f10)
    local p99=$(echo "$stats" | cut -d',' -f11)

    cat > "$RUN_DIR/summary.json" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "target": "$TARGET_HOST",
    "test_type": "$test_type",
    "results": {
        "total_requests": $total,
        "failures": $failures,
        "failure_rate": $(echo "scale=4; $failures / $total * 100" | bc 2>/dev/null || echo 0),
        "avg_response_ms": $avg,
        "p50_response_ms": $p50,
        "p95_response_ms": $p95,
        "p99_response_ms": $p99
    }
}
EOF

    log_info "Summary written to: $RUN_DIR/summary.json"
}

# Main
case "${1:-smoke}" in
    smoke)
        run_smoke_test
        check_results "$RUN_DIR/smoke" 1 1000  # Strict for smoke
        generate_summary "smoke"
        ;;
    load)
        run_load_test
        check_results "$RUN_DIR/load" 5 2000
        generate_summary "load"
        ;;
    stress)
        run_stress_test
        check_results "$RUN_DIR/stress" 10 5000  # More lenient for stress
        generate_summary "stress"
        ;;
    custom)
        if [ $# -lt 4 ]; then
            log_error "Usage: $0 custom <users> <spawn_rate> <duration>"
            log_error "Example: $0 custom 100 10 5m"
            exit 1
        fi
        run_custom_test "$2" "$3" "$4"
        check_results "$RUN_DIR/custom"
        generate_summary "custom"
        ;;
    *)
        echo "LIMS Load Test Runner"
        echo ""
        echo "Usage: $0 <test_type> [options]"
        echo ""
        echo "Test types:"
        echo "  smoke   - Quick verification (1 user, 1 min)"
        echo "  load    - Normal load test (50 users, 5 min)"
        echo "  stress  - Stress test (200 users stepped, 10 min)"
        echo "  custom  - Custom test: $0 custom <users> <spawn_rate> <duration>"
        echo ""
        echo "Environment:"
        echo "  TARGET_HOST - Target URL (default: http://100.89.26.128:30007)"
        echo "  OUTPUT_DIR  - Results directory (default: ./results)"
        exit 1
        ;;
esac

log_info "Results saved to: $RUN_DIR"
log_info "HTML Report: $RUN_DIR/*_report.html"
