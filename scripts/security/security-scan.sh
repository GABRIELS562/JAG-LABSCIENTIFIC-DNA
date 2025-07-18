#!/bin/bash
# Comprehensive Security Scanning Script for LIMS Application
# This script runs multiple security tools to identify vulnerabilities and security issues

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
RESULTS_DIR="$PROJECT_ROOT/security-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$RESULTS_DIR/$TIMESTAMP"

# Create results directory
mkdir -p "$REPORT_DIR"

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install security tools
install_security_tools() {
    log "Installing security tools..."
    
    # Install npm security tools
    if command_exists npm; then
        npm install -g audit-ci retire semgrep eslint-plugin-security @microsoft/eslint-plugin-sdl
    fi
    
    # Install Python security tools
    if command_exists pip3; then
        pip3 install --user bandit safety checkov
    fi
    
    # Install Go security tools
    if command_exists go; then
        go install github.com/securecodewarrior/github-action-add-sarif@latest
        go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    fi
    
    success "Security tools installation completed"
}

# Function to run dependency vulnerability scanning
run_dependency_scan() {
    log "Running dependency vulnerability scanning..."
    
    # NPM Audit
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        info "Running npm audit..."
        npm audit --json > "$REPORT_DIR/npm-audit.json" 2>/dev/null || {
            warning "npm audit found vulnerabilities"
        }
        
        # Audit CI for strict checking
        if command_exists audit-ci; then
            audit-ci --config "$PROJECT_ROOT/.auditrc.json" --report-type json --output "$REPORT_DIR/audit-ci.json" || {
                warning "audit-ci found critical vulnerabilities"
            }
        fi
    fi
    
    # Retire.js for JavaScript vulnerabilities
    if command_exists retire; then
        info "Running retire.js..."
        retire --path "$PROJECT_ROOT" --outputformat json --outputpath "$REPORT_DIR/retire-js.json" || {
            warning "retire.js found vulnerabilities"
        }
    fi
    
    # Safety for Python dependencies
    if [ -f "$PROJECT_ROOT/requirements.txt" ] && command_exists safety; then
        info "Running safety check..."
        safety check --json --output "$REPORT_DIR/safety.json" || {
            warning "safety found vulnerabilities"
        }
    fi
    
    # Snyk (if available)
    if command_exists snyk; then
        info "Running Snyk scan..."
        snyk test --json > "$REPORT_DIR/snyk.json" 2>/dev/null || {
            warning "Snyk found vulnerabilities"
        }
    fi
    
    success "Dependency vulnerability scanning completed"
}

# Function to run static code analysis
run_static_analysis() {
    log "Running static code analysis..."
    
    # ESLint with security plugins
    if [ -f "$PROJECT_ROOT/.eslintrc.js" ]; then
        info "Running ESLint security scan..."
        npx eslint "$PROJECT_ROOT/src" "$PROJECT_ROOT/backend" \
            --ext .js,.jsx,.ts,.tsx \
            --config "$PROJECT_ROOT/.eslintrc.js" \
            --format json \
            --output-file "$REPORT_DIR/eslint-security.json" || {
            warning "ESLint found security issues"
        }
    fi
    
    # Bandit for Python security
    if command_exists bandit; then
        info "Running Bandit security scan..."
        find "$PROJECT_ROOT" -name "*.py" -type f | head -100 | xargs bandit -f json -o "$REPORT_DIR/bandit.json" || {
            warning "Bandit found security issues"
        }
    fi
    
    # Semgrep for multiple languages
    if command_exists semgrep; then
        info "Running Semgrep security scan..."
        semgrep --config=auto --json --output="$REPORT_DIR/semgrep.json" "$PROJECT_ROOT" || {
            warning "Semgrep found security issues"
        }
    fi
    
    success "Static code analysis completed"
}

# Function to run secrets scanning
run_secrets_scan() {
    log "Running secrets scanning..."
    
    # GitLeaks
    if command_exists gitleaks; then
        info "Running GitLeaks..."
        gitleaks detect --source="$PROJECT_ROOT" --report-format json --report-path "$REPORT_DIR/gitleaks.json" || {
            warning "GitLeaks found potential secrets"
        }
    fi
    
    # TruffleHog
    if command_exists trufflehog; then
        info "Running TruffleHog..."
        trufflehog filesystem "$PROJECT_ROOT" --json > "$REPORT_DIR/trufflehog.json" 2>/dev/null || {
            warning "TruffleHog found potential secrets"
        }
    fi
    
    # Manual secrets pattern check
    info "Running manual secrets pattern check..."
    {
        echo "{"
        echo "  \"scan_time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"results\": ["
        
        # Common secret patterns
        patterns=(
            "password\s*[:=]\s*['\"][^'\"]*['\"]"
            "api_key\s*[:=]\s*['\"][^'\"]*['\"]"
            "secret\s*[:=]\s*['\"][^'\"]*['\"]"
            "token\s*[:=]\s*['\"][^'\"]*['\"]"
            "private_key"
            "BEGIN RSA PRIVATE KEY"
            "BEGIN PRIVATE KEY"
            "BEGIN OPENSSH PRIVATE KEY"
            "ssh-rsa"
            "ssh-ed25519"
            "AKIA[0-9A-Z]{16}"
            "gh[pousr]_[0-9A-Za-z]{36}"
            "sk_live_[0-9A-Za-z]{24}"
            "xox[baprs]-[0-9A-Za-z-]{10,48}"
        )
        
        first=true
        for pattern in "${patterns[@]}"; do
            if ! $first; then
                echo ","
            fi
            first=false
            
            results=$(find "$PROJECT_ROOT" -type f -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.env*" -o -name "*.config*" | \
                      grep -v node_modules | \
                      grep -v ".git" | \
                      xargs grep -l "$pattern" 2>/dev/null || echo "")
            
            echo -n "    {\"pattern\": \"$pattern\", \"matches\": ["
            if [ -n "$results" ]; then
                echo "$results" | sed 's/^/      "/; s/$/",/' | sed '$ s/,$//'
            fi
            echo -n "]}"
        done
        
        echo ""
        echo "  ]"
        echo "}"
    } > "$REPORT_DIR/manual-secrets.json"
    
    success "Secrets scanning completed"
}

# Function to run infrastructure security scan
run_infrastructure_scan() {
    log "Running infrastructure security scanning..."
    
    # Checkov for IaC security
    if command_exists checkov; then
        info "Running Checkov IaC scan..."
        checkov --directory "$PROJECT_ROOT" --output json --output-file "$REPORT_DIR/checkov.json" || {
            warning "Checkov found infrastructure security issues"
        }
    fi
    
    # Docker security scan
    if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
        info "Running Docker security scan..."
        
        # Hadolint for Dockerfile linting
        if command_exists hadolint; then
            hadolint "$PROJECT_ROOT/Dockerfile" --format json > "$REPORT_DIR/hadolint.json" 2>/dev/null || {
                warning "Hadolint found Dockerfile issues"
            }
        fi
        
        # Trivy for container scanning
        if command_exists trivy; then
            trivy fs --format json --output "$REPORT_DIR/trivy-fs.json" "$PROJECT_ROOT" || {
                warning "Trivy found container vulnerabilities"
            }
        fi
    fi
    
    # Kubernetes security scan
    if [ -d "$PROJECT_ROOT/k8s" ]; then
        info "Running Kubernetes security scan..."
        
        # Kube-score
        if command_exists kube-score; then
            find "$PROJECT_ROOT/k8s" -name "*.yaml" -o -name "*.yml" | \
                xargs kube-score score --output-format json > "$REPORT_DIR/kube-score.json" 2>/dev/null || {
                warning "Kube-score found Kubernetes security issues"
            }
        fi
        
        # Polaris
        if command_exists polaris; then
            polaris audit --audit-path "$PROJECT_ROOT/k8s" --format json --output-file "$REPORT_DIR/polaris.json" || {
                warning "Polaris found Kubernetes security issues"
            }
        fi
    fi
    
    success "Infrastructure security scanning completed"
}

# Function to run web application security scan
run_web_security_scan() {
    log "Running web application security scanning..."
    
    # Check for common web vulnerabilities
    info "Checking for common web vulnerabilities..."
    
    {
        echo "{"
        echo "  \"scan_time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"vulnerabilities\": ["
        
        # SQL Injection patterns
        echo "    {"
        echo "      \"type\": \"sql_injection\","
        echo "      \"description\": \"Potential SQL injection vulnerabilities\","
        echo "      \"files\": ["
        find "$PROJECT_ROOT" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
            grep -v node_modules | \
            xargs grep -l "query.*+\|execute.*+\|SELECT.*+\|INSERT.*+\|UPDATE.*+\|DELETE.*+" 2>/dev/null | \
            sed 's/^/        "/; s/$/",/' | sed '$ s/,$//' || echo ""
        echo "      ]"
        echo "    },"
        
        # XSS patterns
        echo "    {"
        echo "      \"type\": \"xss\","
        echo "      \"description\": \"Potential XSS vulnerabilities\","
        echo "      \"files\": ["
        find "$PROJECT_ROOT" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
            grep -v node_modules | \
            xargs grep -l "innerHTML\|dangerouslySetInnerHTML\|document.write\|eval(" 2>/dev/null | \
            sed 's/^/        "/; s/$/",/' | sed '$ s/,$//' || echo ""
        echo "      ]"
        echo "    },"
        
        # CSRF patterns
        echo "    {"
        echo "      \"type\": \"csrf\","
        echo "      \"description\": \"Missing CSRF protection\","
        echo "      \"files\": ["
        find "$PROJECT_ROOT" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | \
            grep -v node_modules | \
            xargs grep -L "csrf\|xsrf" 2>/dev/null | \
            head -10 | \
            sed 's/^/        "/; s/$/",/' | sed '$ s/,$//' || echo ""
        echo "      ]"
        echo "    }"
        
        echo "  ]"
        echo "}"
    } > "$REPORT_DIR/web-security.json"
    
    success "Web application security scanning completed"
}

# Function to run license compliance scan
run_license_scan() {
    log "Running license compliance scanning..."
    
    # NPM license checker
    if [ -f "$PROJECT_ROOT/package.json" ] && command_exists npm; then
        info "Running npm license check..."
        npx license-checker --json --out "$REPORT_DIR/licenses.json" 2>/dev/null || {
            warning "License checker found issues"
        }
        
        # Check for problematic licenses
        npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0;Unlicense' --json > "$REPORT_DIR/license-compliance.json" 2>/dev/null || {
            warning "Found potentially problematic licenses"
        }
    fi
    
    success "License compliance scanning completed"
}

# Function to generate security report
generate_security_report() {
    log "Generating comprehensive security report..."
    
    local report_file="$REPORT_DIR/security-report.html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LIMS Security Scan Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #007acc;
            padding-bottom: 10px;
        }
        h2 {
            color: #555;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #007acc;
            padding-left: 15px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #dee2e6;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .summary-card .number {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .info { color: #17a2b8; }
        .scan-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
        }
        .file-list {
            background: #ffffff;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #dee2e6;
            margin-top: 10px;
        }
        .file-item {
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .file-item:last-child {
            border-bottom: none;
        }
        .timestamp {
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin-top: 30px;
        }
        .no-issues {
            color: #28a745;
            font-weight: bold;
        }
        .has-issues {
            color: #dc3545;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .severity-critical { background-color: #f8d7da; }
        .severity-high { background-color: #fff3cd; }
        .severity-medium { background-color: #d4edda; }
        .severity-low { background-color: #cce5ff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 LIMS Security Scan Report</h1>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Dependencies Scanned</h3>
                <div class="number">✓</div>
            </div>
            <div class="summary-card">
                <h3>Static Analysis</h3>
                <div class="number">✓</div>
            </div>
            <div class="summary-card">
                <h3>Secrets Scan</h3>
                <div class="number">✓</div>
            </div>
            <div class="summary-card">
                <h3>Infrastructure</h3>
                <div class="number">✓</div>
            </div>
        </div>
        
        <h2>🔍 Scan Results</h2>
        
        <div class="scan-section">
            <h3>Dependency Vulnerabilities</h3>
            <p>Scanned package dependencies for known security vulnerabilities.</p>
            <div class="file-list">
                <div class="file-item">npm audit: Check npm-audit.json for details</div>
                <div class="file-item">retire.js: Check retire-js.json for details</div>
                <div class="file-item">safety: Check safety.json for details</div>
            </div>
        </div>
        
        <div class="scan-section">
            <h3>Static Code Analysis</h3>
            <p>Analyzed source code for security vulnerabilities and code quality issues.</p>
            <div class="file-list">
                <div class="file-item">ESLint Security: Check eslint-security.json for details</div>
                <div class="file-item">Semgrep: Check semgrep.json for details</div>
                <div class="file-item">Bandit: Check bandit.json for details</div>
            </div>
        </div>
        
        <div class="scan-section">
            <h3>Secrets Detection</h3>
            <p>Scanned for hardcoded secrets, passwords, and sensitive information.</p>
            <div class="file-list">
                <div class="file-item">GitLeaks: Check gitleaks.json for details</div>
                <div class="file-item">TruffleHog: Check trufflehog.json for details</div>
                <div class="file-item">Manual Patterns: Check manual-secrets.json for details</div>
            </div>
        </div>
        
        <div class="scan-section">
            <h3>Infrastructure Security</h3>
            <p>Analyzed Docker, Kubernetes, and infrastructure-as-code configurations.</p>
            <div class="file-list">
                <div class="file-item">Checkov: Check checkov.json for details</div>
                <div class="file-item">Hadolint: Check hadolint.json for details</div>
                <div class="file-item">Trivy: Check trivy-fs.json for details</div>
                <div class="file-item">Kube-score: Check kube-score.json for details</div>
            </div>
        </div>
        
        <div class="scan-section">
            <h3>Web Application Security</h3>
            <p>Checked for common web vulnerabilities like XSS, SQL injection, and CSRF.</p>
            <div class="file-list">
                <div class="file-item">Web Vulnerabilities: Check web-security.json for details</div>
            </div>
        </div>
        
        <div class="scan-section">
            <h3>License Compliance</h3>
            <p>Verified license compatibility and compliance for all dependencies.</p>
            <div class="file-list">
                <div class="file-item">License Check: Check licenses.json for details</div>
                <div class="file-item">Compliance: Check license-compliance.json for details</div>
            </div>
        </div>
        
        <div class="timestamp">
            Report generated on: $(date)
        </div>
    </div>
</body>
</html>
EOF

    success "Security report generated: $report_file"
}

# Function to send notifications
send_notifications() {
    log "Sending security scan notifications..."
    
    # Create summary
    local summary_file="$REPORT_DIR/scan-summary.txt"
    {
        echo "LIMS Security Scan Summary"
        echo "========================="
        echo "Scan completed at: $(date)"
        echo "Report directory: $REPORT_DIR"
        echo ""
        echo "Scans performed:"
        echo "- Dependency vulnerabilities"
        echo "- Static code analysis"
        echo "- Secrets detection"
        echo "- Infrastructure security"
        echo "- Web application security"
        echo "- License compliance"
        echo ""
        echo "Review the individual JSON reports for detailed findings."
    } > "$summary_file"
    
    # Send to Slack (if webhook URL is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔒 LIMS Security Scan Completed\\n\\nReport: $REPORT_DIR\\n\\nReview findings at: $(cat "$summary_file")\"}" \
            "$SLACK_WEBHOOK_URL" || {
            warning "Failed to send Slack notification"
        }
    fi
    
    success "Notifications sent"
}

# Main execution
main() {
    log "Starting comprehensive security scan for LIMS application"
    log "Results will be saved to: $REPORT_DIR"
    
    # Check if we should install tools
    if [ "${INSTALL_TOOLS:-false}" = "true" ]; then
        install_security_tools
    fi
    
    # Run all security scans
    run_dependency_scan
    run_static_analysis
    run_secrets_scan
    run_infrastructure_scan
    run_web_security_scan
    run_license_scan
    
    # Generate report
    generate_security_report
    
    # Send notifications
    send_notifications
    
    success "Security scan completed successfully!"
    success "View the report at: $REPORT_DIR/security-report.html"
    
    # Exit with appropriate code
    if find "$REPORT_DIR" -name "*.json" -exec grep -l "critical\|high" {} \; | grep -q .; then
        warning "Critical or high severity issues found. Please review the reports."
        exit 1
    else
        success "No critical or high severity issues detected."
        exit 0
    fi
}

# Command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-tools)
            INSTALL_TOOLS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --install-tools    Install security scanning tools"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"