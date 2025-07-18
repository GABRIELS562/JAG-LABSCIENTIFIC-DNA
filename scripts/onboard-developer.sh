#!/bin/bash

# Developer Onboarding Script for LabScientific LIMS
# This script automates the complete developer onboarding process

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ONBOARDING_DIR="$PROJECT_ROOT/.onboarding"
LOG_FILE="$ONBOARDING_DIR/onboarding.log"

# System requirements
MIN_NODE_VERSION="18.0.0"
MIN_DOCKER_VERSION="24.0.0"
MIN_RAM_GB="8"

# Welcome message
show_welcome() {
    clear
    echo -e "${CYAN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🧬 LabScientific LIMS Developer Onboarding                ║
║                                                                              ║
║                    Welcome to the team! Let's get you set up.               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
    echo -e "${BLUE}This script will:${NC}"
    echo -e "  ${GREEN}✓${NC} Check system requirements"
    echo -e "  ${GREEN}✓${NC} Install project dependencies"
    echo -e "  ${GREEN}✓${NC} Set up development environment"
    echo -e "  ${GREEN}✓${NC} Configure development tools"
    echo -e "  ${GREEN}✓${NC} Run health checks"
    echo -e "  ${GREEN}✓${NC} Open documentation and resources"
    echo
    read -p "Press Enter to continue or Ctrl+C to exit..."
}

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Function to get system info
get_system_info() {
    log "Gathering system information..."
    
    # Create onboarding directory
    mkdir -p "$ONBOARDING_DIR"
    
    # System info
    local os_name=$(uname -s)
    local os_version=$(uname -r)
    local arch=$(uname -m)
    local total_ram=$(free -g 2>/dev/null | awk 'NR==2{print $2}' || echo "Unknown")
    
    cat > "$ONBOARDING_DIR/system-info.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "os": {
    "name": "$os_name",
    "version": "$os_version",
    "architecture": "$arch"
  },
  "hardware": {
    "totalRamGB": "$total_ram"
  },
  "onboarding": {
    "version": "1.0.0",
    "status": "in_progress"
  }
}
EOF
    
    success "System information gathered"
}

# Function to check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    local requirements_met=true
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        if version_ge "$node_version" "$MIN_NODE_VERSION"; then
            success "Node.js version $node_version meets requirement (>= $MIN_NODE_VERSION)"
        else
            error "Node.js version $node_version is below minimum requirement ($MIN_NODE_VERSION)"
            requirements_met=false
        fi
    else
        error "Node.js is not installed"
        requirements_met=false
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        success "npm version $npm_version is installed"
    else
        error "npm is not installed"
        requirements_met=false
    fi
    
    # Check Docker
    if command_exists docker; then
        local docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        if version_ge "$docker_version" "$MIN_DOCKER_VERSION"; then
            success "Docker version $docker_version meets requirement (>= $MIN_DOCKER_VERSION)"
        else
            warning "Docker version $docker_version is below recommended version ($MIN_DOCKER_VERSION)"
        fi
    else
        error "Docker is not installed"
        requirements_met=false
    fi
    
    # Check Docker Compose
    if command_exists docker-compose || docker compose version &>/dev/null; then
        success "Docker Compose is available"
    else
        error "Docker Compose is not installed"
        requirements_met=false
    fi
    
    # Check Git
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        success "Git version $git_version is installed"
    else
        error "Git is not installed"
        requirements_met=false
    fi
    
    # Check RAM (Linux/macOS)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        local total_ram=$(free -g | awk 'NR==2{print $2}')
        if [ "$total_ram" -ge "$MIN_RAM_GB" ]; then
            success "System has ${total_ram}GB RAM (>= ${MIN_RAM_GB}GB recommended)"
        else
            warning "System has ${total_ram}GB RAM (${MIN_RAM_GB}GB recommended for optimal performance)"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        local total_ram=$(system_profiler SPHardwareDataType | grep "Memory:" | cut -d':' -f2 | cut -d' ' -f2)
        success "System has ${total_ram} RAM"
    fi
    
    if [ "$requirements_met" = false ]; then
        error "Some system requirements are not met. Please install missing dependencies."
        echo
        echo -e "${YELLOW}Installation guides:${NC}"
        echo -e "  ${BLUE}Node.js:${NC} https://nodejs.org/en/download/"
        echo -e "  ${BLUE}Docker:${NC} https://docs.docker.com/get-docker/"
        echo -e "  ${BLUE}Git:${NC} https://git-scm.com/downloads"
        echo
        read -p "Press Enter to continue anyway or Ctrl+C to exit..."
    fi
}

# Function to install dependencies
install_dependencies() {
    log "Installing project dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    log "Installing root dependencies..."
    if npm install; then
        success "Root dependencies installed successfully"
    else
        error "Failed to install root dependencies"
        exit 1
    fi
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        log "Installing backend dependencies..."
        cd backend
        if npm install; then
            success "Backend dependencies installed successfully"
        else
            error "Failed to install backend dependencies"
            exit 1
        fi
        cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        log "Installing frontend dependencies..."
        cd frontend
        if npm install; then
            success "Frontend dependencies installed successfully"
        else
            error "Failed to install frontend dependencies"
            exit 1
        fi
        cd ..
    fi
    
    # Install test dependencies
    if [ -d "tests" ]; then
        log "Installing test dependencies..."
        cd tests
        if npm install; then
            success "Test dependencies installed successfully"
        else
            error "Failed to install test dependencies"
            exit 1
        fi
        cd ..
    fi
    
    success "All dependencies installed successfully"
}

# Function to setup development environment
setup_development_environment() {
    log "Setting up development environment..."
    
    cd "$PROJECT_ROOT"
    
    # Create .env file from template
    if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
        log "Creating .env.local from template..."
        cp .env.example .env.local
        success "Environment file created"
    fi
    
    # Setup Git hooks
    if [ -d ".git" ]; then
        log "Setting up Git hooks..."
        
        # Create pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for LabScientific LIMS

echo "Running pre-commit checks..."

# Run linting
npm run lint:check
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix the issues and try again."
    exit 1
fi

# Run formatting check
npm run format:check
if [ $? -ne 0 ]; then
    echo "❌ Code formatting issues found. Run 'npm run format' to fix."
    exit 1
fi

# Run tests
npm run test:unit
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix the issues and try again."
    exit 1
fi

echo "✅ Pre-commit checks passed"
EOF
        chmod +x .git/hooks/pre-commit
        success "Git hooks configured"
    fi
    
    # Setup VS Code workspace
    if command_exists code; then
        log "Setting up VS Code workspace..."
        
        mkdir -p .vscode
        
        # Create VS Code settings
        cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["backend", "frontend", "tests"],
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.nyc_output": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/coverage": true
  }
}
EOF
        
        # Create VS Code extensions recommendations
        cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-json"
  ]
}
EOF
        
        # Create launch configuration
        cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/.bin/vite",
      "args": ["--port", "3000"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/mocha",
      "args": ["--timeout", "5000", "tests/**/*.test.js"],
      "console": "integratedTerminal"
    }
  ]
}
EOF
        
        success "VS Code workspace configured"
    fi
    
    success "Development environment setup complete"
}

# Function to configure development tools
configure_development_tools() {
    log "Configuring development tools..."
    
    cd "$PROJECT_ROOT"
    
    # Setup database
    if [ -d "database" ]; then
        log "Setting up database..."
        
        # Start database services
        docker-compose up -d postgres redis
        
        # Wait for services to be ready
        log "Waiting for database services to be ready..."
        sleep 10
        
        # Run migrations
        if command_exists npm && npm run db:migrate; then
            success "Database migrations completed"
        else
            warning "Database migrations failed or not available"
        fi
        
        # Seed development data
        if npm run db:seed:dev 2>/dev/null; then
            success "Development data seeded"
        else
            warning "Database seeding failed or not available"
        fi
    fi
    
    # Setup monitoring stack
    if [ -f "monitoring/docker-compose.yml" ]; then
        log "Starting monitoring stack..."
        cd monitoring
        docker-compose up -d
        cd ..
        success "Monitoring stack started"
    fi
    
    success "Development tools configured"
}

# Function to run health checks
run_health_checks() {
    log "Running health checks..."
    
    cd "$PROJECT_ROOT"
    
    local health_status="healthy"
    
    # Check linting
    log "Checking code quality..."
    if npm run lint:check &>/dev/null; then
        success "Code quality check passed"
    else
        warning "Code quality issues found"
        health_status="warning"
    fi
    
    # Check formatting
    log "Checking code formatting..."
    if npm run format:check &>/dev/null; then
        success "Code formatting check passed"
    else
        warning "Code formatting issues found"
        health_status="warning"
    fi
    
    # Run unit tests
    log "Running unit tests..."
    if npm run test:unit &>/dev/null; then
        success "Unit tests passed"
    else
        warning "Some unit tests failed"
        health_status="warning"
    fi
    
    # Check Docker services
    log "Checking Docker services..."
    if docker-compose ps | grep -q "Up"; then
        success "Docker services are running"
    else
        warning "Some Docker services are not running"
        health_status="warning"
    fi
    
    # Check database connectivity
    log "Checking database connectivity..."
    if npm run db:health-check &>/dev/null; then
        success "Database connectivity check passed"
    else
        warning "Database connectivity issues"
        health_status="warning"
    fi
    
    # Update system info with health status
    local system_info=$(cat "$ONBOARDING_DIR/system-info.json")
    echo "$system_info" | jq --arg status "$health_status" '.onboarding.status = $status' > "$ONBOARDING_DIR/system-info.json"
    
    if [ "$health_status" = "healthy" ]; then
        success "All health checks passed"
    else
        warning "Some health checks failed - review warnings above"
    fi
}

# Function to create developer profile
create_developer_profile() {
    log "Creating developer profile..."
    
    echo
    echo -e "${BLUE}Please provide some information to personalize your setup:${NC}"
    echo
    
    read -p "Your name: " developer_name
    read -p "Your email: " developer_email
    read -p "Your team (backend/frontend/fullstack/devops): " developer_team
    read -p "Your preferred IDE (vscode/intellij/vim/other): " developer_ide
    
    # Create developer profile
    cat > "$ONBOARDING_DIR/developer-profile.json" << EOF
{
  "name": "$developer_name",
  "email": "$developer_email",
  "team": "$developer_team",
  "preferredIDE": "$developer_ide",
  "onboardingDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "setupVersion": "1.0.0"
}
EOF
    
    # Configure Git if not already configured
    if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
        log "Configuring Git..."
        git config --global user.name "$developer_name"
        git config --global user.email "$developer_email"
        success "Git configured"
    fi
    
    success "Developer profile created"
}

# Function to open documentation and resources
open_documentation() {
    log "Opening documentation and resources..."
    
    # Create welcome page
    cat > "$ONBOARDING_DIR/welcome.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LabScientific LIMS</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .section h2 {
            color: #495057;
            margin-top: 0;
        }
        .links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .link {
            display: block;
            padding: 15px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            text-align: center;
            transition: background 0.3s;
        }
        .link:hover {
            background: #0056b3;
        }
        .commands {
            background: #f1f3f4;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            margin-top: 15px;
        }
        .emoji {
            font-size: 1.5em;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧬 Welcome to LabScientific LIMS!</h1>
        
        <div class="section">
            <h2><span class="emoji">🎉</span>Congratulations!</h2>
            <p>Your development environment has been successfully set up. You're ready to start contributing to the LabScientific LIMS project.</p>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🚀</span>Quick Start</h2>
            <p>Get started with development:</p>
            <div class="commands">
                # Start the development environment<br>
                npm run dev<br><br>
                # Run tests<br>
                npm run test<br><br>
                # Access the application<br>
                http://localhost:3000
            </div>
        </div>
        
        <div class="section">
            <h2><span class="emoji">📚</span>Documentation & Resources</h2>
            <div class="links">
                <a href="http://localhost:3001/api-docs" class="link">API Documentation</a>
                <a href="../docs/architecture/" class="link">Architecture Guide</a>
                <a href="../docs/development/" class="link">Development Guide</a>
                <a href="../docs/deployment/" class="link">Deployment Guide</a>
            </div>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🛠️</span>Development Tools</h2>
            <div class="links">
                <a href="http://localhost:3001" class="link">Grafana Dashboard</a>
                <a href="http://localhost:9090" class="link">Prometheus</a>
                <a href="http://localhost:16686" class="link">Jaeger Tracing</a>
                <a href="http://localhost:5555" class="link">Database Admin</a>
            </div>
        </div>
        
        <div class="section">
            <h2><span class="emoji">💡</span>Next Steps</h2>
            <ul>
                <li>Explore the codebase and familiarize yourself with the architecture</li>
                <li>Run the test suite to ensure everything works correctly</li>
                <li>Check out the issues on GitHub to find tasks to work on</li>
                <li>Join the team Slack channel for questions and discussions</li>
                <li>Review the contributing guidelines before making your first PR</li>
            </ul>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🤝</span>Need Help?</h2>
            <p>If you encounter any issues or have questions:</p>
            <ul>
                <li>Check the documentation in the <code>docs/</code> directory</li>
                <li>Ask questions in the team Slack channel</li>
                <li>Create an issue on GitHub if you find bugs</li>
                <li>Reach out to your team lead or mentor</li>
            </ul>
        </div>
    </div>
</body>
</html>
EOF
    
    # Open welcome page in browser
    if command_exists open; then
        open "$ONBOARDING_DIR/welcome.html"
    elif command_exists xdg-open; then
        xdg-open "$ONBOARDING_DIR/welcome.html"
    else
        log "Welcome page created at: $ONBOARDING_DIR/welcome.html"
    fi
    
    success "Documentation and resources opened"
}

# Function to generate onboarding report
generate_onboarding_report() {
    log "Generating onboarding report..."
    
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local start_time=$(jq -r '.timestamp' "$ONBOARDING_DIR/system-info.json")
    
    # Calculate duration
    local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s)
    local end_epoch=$(date -d "$end_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$end_time" +%s)
    local duration=$((end_epoch - start_epoch))
    
    # Create comprehensive report
    cat > "$ONBOARDING_DIR/onboarding-report.json" << EOF
{
  "onboarding": {
    "startTime": "$start_time",
    "endTime": "$end_time",
    "durationSeconds": $duration,
    "status": "completed",
    "version": "1.0.0"
  },
  "system": $(cat "$ONBOARDING_DIR/system-info.json"),
  "developer": $(cat "$ONBOARDING_DIR/developer-profile.json"),
  "setup": {
    "dependenciesInstalled": true,
    "environmentConfigured": true,
    "toolsConfigured": true,
    "healthChecksRun": true,
    "documentationOpened": true
  },
  "nextSteps": [
    "Explore the codebase and documentation",
    "Run the development environment",
    "Execute the test suite",
    "Review contributing guidelines",
    "Join team communication channels"
  ]
}
EOF
    
    success "Onboarding report generated"
}

# Function to show completion summary
show_completion_summary() {
    clear
    echo -e "${GREEN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🎉 ONBOARDING COMPLETED SUCCESSFULLY!                     ║
║                                                                              ║
║                         Welcome to the LabScientific team!                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo
    echo -e "${BLUE}Your development environment is ready!${NC}"
    echo
    echo -e "${YELLOW}Quick Start Commands:${NC}"
    echo -e "  ${GREEN}npm run dev${NC}          # Start development servers"
    echo -e "  ${GREEN}npm run test${NC}         # Run test suite"
    echo -e "  ${GREEN}npm run lint${NC}         # Check code quality"
    echo -e "  ${GREEN}npm run build${NC}        # Build for production"
    echo
    echo -e "${YELLOW}Access Points:${NC}"
    echo -e "  ${GREEN}Application:${NC}     http://localhost:3000"
    echo -e "  ${GREEN}API Docs:${NC}        http://localhost:3001/api-docs"
    echo -e "  ${GREEN}Monitoring:${NC}      http://localhost:3001 (Grafana)"
    echo
    echo -e "${YELLOW}Documentation:${NC}"
    echo -e "  ${GREEN}Architecture:${NC}    docs/architecture/"
    echo -e "  ${GREEN}Development:${NC}     docs/development/"
    echo -e "  ${GREEN}API Reference:${NC}   docs/api/"
    echo
    echo -e "${YELLOW}Need Help?${NC}"
    echo -e "  ${GREEN}Slack:${NC}           #labscientific-lims"
    echo -e "  ${GREEN}GitHub:${NC}          Create an issue"
    echo -e "  ${GREEN}Email:${NC}           support@labscientific.com"
    echo
    echo -e "${BLUE}Happy coding! 🚀${NC}"
    echo
}

# Main onboarding process
main() {
    # Show welcome message
    show_welcome
    
    # Create log file
    mkdir -p "$ONBOARDING_DIR"
    touch "$LOG_FILE"
    
    log "Starting developer onboarding process..."
    log "Project: LabScientific LIMS"
    log "Version: 1.0.0"
    log "Date: $(date)"
    
    # Run onboarding steps
    get_system_info
    check_requirements
    install_dependencies
    setup_development_environment
    configure_development_tools
    run_health_checks
    create_developer_profile
    open_documentation
    generate_onboarding_report
    
    # Show completion summary
    show_completion_summary
    
    log "Developer onboarding completed successfully"
    
    # Ask if they want to start development immediately
    echo
    read -p "Would you like to start the development environment now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Starting development environment..."
        npm run dev
    fi
}

# Error handling
trap 'error "Onboarding failed at line $LINENO. Check the log file: $LOG_FILE"' ERR

# Run main function
main "$@"