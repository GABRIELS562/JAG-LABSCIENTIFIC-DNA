# 🧬 JAGDNA Forensics LIMS - DevOps Implementation

## 📊 Project Overview

A production-grade DevOps implementation for a forensics Laboratory Information Management System (LIMS), demonstrating enterprise-level practices for regulated environments requiring ISO 17025:2017 compliance.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                    (Multi-Environment)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Development │  │   Staging   │  │ Production  │        │
│  │  Namespace  │  │  Namespace  │  │  Namespace  │        │
│  │             │  │             │  │             │        │
│  │ NodePort:   │  │ NodePort:   │  │ NodePort:   │        │
│  │   30001     │  │   30002     │  │   30003     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         Docker Registry (localhost:5000)             │  │
│  │         Images: v1.0.1, v1.0.2, v1.0.3              │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Technologies Stack

### Core Infrastructure
- **Kubernetes v1.31.12**: Container orchestration
- **Docker**: Containerization (local registry on port 5000)
- **Helm v3**: Kubernetes package management
- **Terraform**: Infrastructure as Code

### Automation & Monitoring
- **Python 3**: Automation scripts for operations
- **Prometheus & Grafana**: Monitoring stack (planned)
- **GitHub Actions**: CI/CD pipeline (planned)

## 📁 Project Structure

```
JAG-LABSCIENTIFIC-DNA/
├── devops-scripts/           # Python automation scripts
│   ├── simple_deploy.py      # Deployment management
│   ├── health_check.py       # Service health monitoring
│   └── pod_logs.py          # Log aggregation
├── helm-charts/              # Helm packages
│   └── lims-chart/          # Custom LIMS chart
├── docker/                   # Docker configurations
│   ├── Dockerfile           # Container definition
│   └── server.js            # Node.js application
├── terraform/                # Infrastructure as Code
│   ├── main.tf              # Resource definitions
│   ├── variables.tf         # Input variables
│   └── providers.tf         # Provider configuration
└── docs/                     # Documentation
    ├── Day1_Learning_Journey.md
    └── PORTFOLIO_POLISH_PLAN.md
```

## 🔧 Quick Start

### Prerequisites
- Kubernetes cluster (v1.30+)
- Docker installed
- Helm v3 installed
- Python 3.8+
- Terraform 1.0+

### 1. Deploy with Helm
```bash
cd helm-charts/lims-chart
helm install lims-prod . --namespace production --create-namespace
```

### 2. Deploy with Terraform
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 3. Use Python Automation
```bash
cd devops-scripts
python3 simple_deploy.py list
python3 health_check.py monitor
```

## 🧪 Forensics Lab Workflow Integration

The system models a real forensics lab workflow:

1. **Sample Collection** → Pod creation
2. **DNA Extraction** → Container processing
3. **PCR Amplification** → Horizontal scaling
4. **Electrophoresis** → Data processing
5. **Analysis** → Result generation
6. **Report Generation** → Output delivery

## 📈 Key Features

### Multi-Environment Support
- Development: 1 replica, NodePort 30001
- Staging: 2 replicas, NodePort 30002  
- Production: 3 replicas, NodePort 30003

### High Availability
- Auto-scaling based on CPU/Memory
- Health checks (liveness & readiness)
- Rolling updates with zero downtime

### Compliance & Security
- Complete audit trail
- Chain of custody tracking
- ISO 17025:2017 compliance ready
- Secrets management

## 🐛 Issues Resolved During Implementation

1. **Server.js Bug** (Occurred twice)
   - File contained "vi server.js" instead of JavaScript
   - Solution: Proper file creation with heredocs

2. **NodePort Conflicts**
   - Ports already allocated across namespaces
   - Solution: Systematic port allocation (30001-30003)

3. **Helm Release Stuck Issues**
   - Failed releases blocking reinstalls
   - Solution: Clean uninstall before retry

4. **Python Indentation Errors**
   - Mixed tabs and spaces
   - Solution: Consistent 4-space indentation

## 📊 Performance Metrics

- **Deployment Time**: < 2 minutes
- **Scaling Time**: < 30 seconds
- **Health Check Interval**: 5 seconds
- **Uptime Target**: 99.9%

## 🔗 Related Documentation

- [Learning Journey](Day1_Learning_Journey.md) - Complete implementation story
- [Python Guide](Day2_Python_StepByStep.md) - Step-by-step automation
- [Portfolio Plan](PORTFOLIO_POLISH_PLAN.md) - Enhancement strategy

## 🤝 Contributing

This is a portfolio project demonstrating DevOps capabilities. For questions or collaboration:
- GitHub: [@GABRIELS562](https://github.com/GABRIELS562)
- Project: [JAG-LABSCIENTIFIC-DNA](https://github.com/GABRIELS562/JAG-LABSCIENTIFIC-DNA)

## 📝 License

Portfolio project for educational and demonstration purposes.

---

**Time Invested**: 22+ hours of hands-on implementation
**Environments**: Development | Staging | Production
**Status**: ✅ Operational