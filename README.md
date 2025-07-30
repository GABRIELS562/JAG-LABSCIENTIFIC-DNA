# 🧬 LabScientific LIMS - Complete System with DevOps

**Full-Stack Laboratory Information Management System with Production-Ready Infrastructure**

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)](https://docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?logo=kubernetes)](https://kubernetes.io/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-green?logo=github)](https://github.com/features/actions)

This is a **complete LIMS application** with comprehensive DevOps implementation. Features the full business application plus production-ready infrastructure, containerization, CI/CD pipelines, and scalable deployment strategies.

> **Note**: This branch contains the **complete system** (application + DevOps). The `client-specific` branch contains only the core application without DevOps configurations.

## 🚀 **DevOps Portfolio Highlights**

### **🏗️ Infrastructure as Code**
- **Docker Containerization**: Multi-stage builds with optimized images
- **Docker Compose**: Development and production environment orchestration
- **Kubernetes Deployment**: Production-ready cluster configuration with auto-scaling
- **Nginx Configuration**: Load balancing, SSL termination, and reverse proxy

### **⚡ CI/CD Pipeline**
- **GitHub Actions**: Automated testing, building, and deployment
- **Multi-Environment**: Separate staging and production deployments
- **Security Scanning**: Automated vulnerability detection and audit checks
- **Quality Gates**: Linting, testing, and code quality enforcement

### **🛡️ Production-Ready Features**
- **Health Checks**: Application and database monitoring endpoints
- **Logging Strategy**: Structured logging with log aggregation
- **Security Hardening**: Rate limiting, security headers, and input validation
- **Performance Optimization**: Caching, connection pooling, and resource limits

## 🏗️ **DevOps Technology Stack**

### **Containerization & Orchestration**
- **Docker**: Multi-stage builds, image optimization
- **Docker Compose**: Local development and testing environments
- **Kubernetes**: Production cluster deployment with auto-scaling
- **Helm**: Package management for Kubernetes deployments

### **CI/CD & Automation**
- **GitHub Actions**: Automated workflows for testing and deployment
- **Jest**: Unit and integration testing framework
- **ESLint**: Code quality and consistency enforcement
- **Audit Tools**: Security vulnerability scanning

### **Infrastructure & Monitoring**
- **Nginx**: Reverse proxy, load balancing, SSL termination
- **PostgreSQL**: Production database with connection pooling
- **Redis**: Caching and session management
- **Winston**: Structured logging and log aggregation

### **Security & Performance**
- **Rate Limiting**: API protection and abuse prevention
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **SSL/TLS**: End-to-end encryption
- **Resource Optimization**: Gzip compression, static file caching

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js Backend │    │   SQLite Database│
│                 │◄──►│                 │◄──►│                 │
│ • Material-UI   │    │ • Express.js    │    │ • Better-SQLite3│
│ • Vite          │    │ • RESTful API   │    │ • ACID Compliant│
│ • State Mgmt    │    │ • File Upload   │    │ • Full-Text Search│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Osiris Software │
                       │                 │
                       │ • STR Analysis  │
                       │ • FSA Processing│
                       │ • Report Gen    │
                       └─────────────────┘
```

## 🚀 **DevOps Deployment Guide**

### **Prerequisites**
- Docker & Docker Compose
- Kubernetes cluster (optional)
- Node.js 18+ (for local development)

### **Quick Start - Development**

```bash
# Clone the repository
git clone https://github.com/GABRIELS562/LABSCIENTIFIC-LIMS.git
cd LABSCIENTIFIC-LIMS

# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Or run locally
npm install && npm run dev
```

### **Production Deployment**

```bash
# Production with Docker Compose
docker-compose -f deployment/docker-compose.prod.yml up -d

# Kubernetes deployment
kubectl apply -f deployment/k8s-deployment.yml

# Monitor deployment
kubectl get pods -l app=labscientific-lims
```

### **Access Points**
- **Application**: http://localhost (production) / http://localhost:5173 (dev)
- **API**: http://localhost/api
- **Health Check**: http://localhost/health

## 📋 **DevOps Workflows**

### **Development Workflow**

1. **Local Development**
   - Run application with `npm run dev`
   - Use Docker Compose for backend services
   - Hot reload for rapid development

2. **Testing & Quality**
   - Automated testing with Jest
   - Code linting with ESLint
   - Security auditing with npm audit

3. **Container Development**
   - Build Docker images locally
   - Test containerized application
   - Validate multi-stage builds

### **Deployment Pipeline**

1. **Continuous Integration**
   - Automated testing on push/PR
   - Security vulnerability scanning
   - Docker image building and testing

2. **Continuous Deployment**
   - Staging deployment for `client-specific` branch
   - Production deployment for `main` branch
   - Health checks and rollback capabilities

## 📊 **Performance Features**

- **Optimized Queries**: Indexed database operations
- **Lazy Loading**: Component-level code splitting
- **Memoization**: Efficient re-rendering prevention  
- **Connection Pooling**: Database optimization
- **Error Boundaries**: Graceful error handling

## 🔐 **Security & Compliance**

- **Data Validation**: Input sanitization and validation
- **Audit Logging**: Complete activity tracking
- **Error Handling**: Secure error management
- **Data Backup**: Automated backup procedures

## 📈 **Analytics & Monitoring**

- **Real-time Metrics**: Live dashboard updates
- **Performance Tracking**: System health monitoring
- **Usage Statistics**: Comprehensive analytics
- **Alert System**: Proactive issue notification

## 🧪 **Testing Strategy**

- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint validation
- **Error Boundary Tests**: Graceful failure handling
- **Performance Tests**: Load and stress testing

## 🚀 **Deployment**

The application supports multiple deployment strategies:

- **Development**: Local SQLite database
- **Production**: Containerized deployment
- **Cloud**: Docker + cloud database
- **Hybrid**: On-premise with cloud backup

## 📝 **API Documentation**

### **Key Endpoints**

```http
# Sample Management
GET    /api/samples
POST   /api/samples
PUT    /api/samples/:id

# Genetic Analysis  
GET    /api/genetic-analysis/cases
POST   /api/genetic-analysis/upload
POST   /api/genetic-analysis/launch-osiris

# Reporting
GET    /api/reports
POST   /api/reports/generate
```

## 🤝 **Contributing**

This project demonstrates modern full-stack development practices including:

- **Clean Architecture**: Separation of concerns
- **RESTful Design**: Standard API patterns
- **Responsive UI**: Mobile-first design
- **Performance Optimization**: Production-ready code
- **Error Handling**: Robust error management

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌿 **Branch Strategy**

This repository uses a **dual-branch approach** to demonstrate both portfolio and production capabilities:

### **Main Branch** (Complete System)
- **Purpose**: Full system with DevOps capabilities
- **Content**: Complete LIMS application + DevOps infrastructure
- **Target Audience**: DevOps teams, technical leads, full-stack demonstrations
- **Focus**: Production-ready application with deployment automation

### **Client-Specific Branch** (Core Application)
- **Purpose**: Clean application for client delivery
- **Content**: LIMS application without DevOps configurations
- **Target Audience**: End users, laboratory staff, client deployments
- **Focus**: Core business functionality and user experience

```bash
# Switch to clean client version
git checkout client-specific

# Return to complete system
git checkout main
```

## 🏆 **DevOps Skills Demonstrated**

- **Infrastructure as Code**: Docker, Kubernetes, Docker Compose
- **CI/CD Pipelines**: GitHub Actions with comprehensive workflows
- **Production Deployment**: Multi-environment strategy with staging/production
- **Security Practices**: Vulnerability scanning, security headers, rate limiting
- **Performance Optimization**: Caching, load balancing, resource management
- **Monitoring & Logging**: Health checks, structured logging, observability
- **Container Orchestration**: Kubernetes deployments with auto-scaling
- **Load Balancing**: Nginx configuration with SSL termination

---

**🚀 Showcasing DevOps excellence through practical implementation**