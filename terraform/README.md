# LabScientific LIMS - Terraform Infrastructure

This directory contains the Terraform infrastructure-as-code for the LabScientific LIMS (Laboratory Information Management System) project. The infrastructure is designed to demonstrate Terraform Associate level skills and AWS best practices.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Environment Management](#environment-management)
- [Terraform Skills Demonstrated](#terraform-skills-demonstrated)
- [Security Features](#security-features)
- [Monitoring & Logging](#monitoring--logging)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🏗️ Overview

This Terraform configuration creates a production-ready, scalable infrastructure for a Laboratory Information Management System on AWS. The infrastructure includes:

- **Amazon EKS** for container orchestration
- **Amazon RDS** for database management
- **Amazon ElastiCache** for caching
- **Amazon S3** for object storage
- **Amazon CloudFront** for content delivery
- **Application Load Balancer** for load balancing
- **Route53** for DNS management
- **Comprehensive monitoring** with CloudWatch
- **Security features** including WAF, GuardDuty, and encryption

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Internet                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                    ┌─────▼─────┐
                    │CloudFront │
                    │    WAF    │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │    ALB    │
                    └─────┬─────┘
                          │
        ┌─────────────────▼─────────────────┐
        │             EKS Cluster           │
        │  ┌─────────┐  ┌─────────┐        │
        │  │  App    │  │  App    │        │
        │  │  Pod    │  │  Pod    │        │
        │  └─────────┘  └─────────┘        │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │          Private Subnets          │
        │  ┌─────────┐  ┌─────────┐        │
        │  │   RDS   │  │  Redis  │        │
        │  │Postgres │  │ Cluster │        │
        │  └─────────┘  └─────────┘        │
        └───────────────────────────────────┘
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) >= 2.0
- [kubectl](https://kubernetes.io/docs/tasks/tools/) >= 1.28
- [jq](https://stedolan.github.io/jq/) for JSON processing
- Valid AWS credentials configured

### Optional Tools (for enhanced validation)
- [Checkov](https://www.checkov.io/) for security scanning
- [TFLint](https://github.com/terraform-linters/tflint) for linting

## 📁 Directory Structure

```
terraform/
├── main.tf                 # Main infrastructure configuration
├── variables.tf            # Variable definitions and validation
├── outputs.tf              # Output definitions
├── locals.tf              # Local values and computations
├── data.tf                # Data sources
├── providers.tf           # Provider configurations
├── resources.tf           # Supporting resources (KMS, passwords, etc.)
├── backend-setup.tf       # Backend infrastructure setup
├── README.md              # This file
├── environments/          # Environment-specific configurations
│   ├── dev/
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── terraform.tfvars
│       └── backend.tf
└── modules/               # Terraform modules
    └── vpc/               # VPC module
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## 🚀 Quick Start

### 1. Setup Backend Infrastructure

First, create the S3 buckets and DynamoDB tables for state management:

```bash
# Run the backend setup script
./scripts/terraform/setup-backend.sh

# Or manually setup the backend
cd terraform
terraform init
terraform plan -target=aws_s3_bucket.terraform_state_dev
terraform apply -target=aws_s3_bucket.terraform_state_dev
```

### 2. Initialize Terraform

```bash
cd terraform

# Copy environment-specific backend configuration
cp environments/dev/backend.tf .

# Initialize with backend
terraform init
```

### 3. Plan and Apply

```bash
# Plan the infrastructure
terraform plan -var-file="environments/dev/terraform.tfvars"

# Apply the infrastructure
terraform apply -var-file="environments/dev/terraform.tfvars"
```

### 4. Validate Configuration

```bash
# Run validation script
./scripts/terraform/validate.sh -e dev -c -t

# Or use deployment script
./scripts/terraform/deploy.sh -e dev -a plan
```

## 🌍 Environment Management

### Available Environments

- **dev**: Development environment with minimal resources
- **staging**: Staging environment with production-like setup
- **prod**: Production environment with full resources and security

### Environment-Specific Features

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| EKS Nodes | 1-2 | 2-4 | 3-6 |
| RDS Multi-AZ | No | Yes | Yes |
| NAT Gateway | No | Yes | Yes |
| Backup Retention | 1 day | 7 days | 30 days |
| Monitoring | Basic | Enhanced | Full |
| Security Features | Basic | Enhanced | Full |

### Switching Environments

```bash
# Switch to different environment
cp environments/staging/backend.tf .
terraform init -reconfigure
terraform plan -var-file="environments/staging/terraform.tfvars"
```

## 🎯 Terraform Skills Demonstrated

### Core Terraform Concepts
- ✅ **Resource Management**: Comprehensive resource definitions
- ✅ **Variables & Validation**: Input validation and type constraints
- ✅ **Outputs**: Structured output values
- ✅ **Local Values**: Complex local computations
- ✅ **Data Sources**: External data integration
- ✅ **Providers**: Multi-provider setup with versioning

### Advanced Features
- ✅ **Modules**: Reusable VPC module
- ✅ **State Management**: Remote state with S3 and DynamoDB
- ✅ **Workspaces**: Environment-specific workspaces
- ✅ **Conditionals**: Feature flags and environment-based logic
- ✅ **Functions**: Built-in function usage (cidrsubnet, merge, etc.)
- ✅ **Loops**: for_each and count patterns
- ✅ **Dependencies**: Explicit and implicit dependencies

### Infrastructure Patterns
- ✅ **Multi-Environment**: Dev, staging, and production configs
- ✅ **Security**: KMS encryption, IAM roles, security groups
- ✅ **Networking**: VPC, subnets, NAT gateways, routing
- ✅ **High Availability**: Multi-AZ deployments
- ✅ **Scalability**: Auto-scaling groups, load balancers
- ✅ **Monitoring**: CloudWatch, logging, alerting

## 🔐 Security Features

### Encryption
- **KMS Keys**: Separate keys for EKS, RDS, and S3
- **EBS Encryption**: Encrypted storage volumes
- **RDS Encryption**: Database encryption at rest
- **S3 Encryption**: Object-level encryption
- **Transit Encryption**: TLS for data in transit

### Access Control
- **IAM Roles**: Least privilege access
- **Security Groups**: Network-level security
- **RBAC**: Kubernetes role-based access control
- **Secrets Management**: AWS Secrets Manager integration

### Monitoring & Compliance
- **WAF**: Web Application Firewall protection
- **GuardDuty**: Threat detection
- **Config**: Configuration compliance
- **CloudTrail**: API logging and auditing
- **Security Hub**: Centralized security dashboard

## 📊 Monitoring & Logging

### CloudWatch Integration
- **Metrics**: Custom and AWS service metrics
- **Logs**: Centralized log aggregation
- **Alarms**: Automated alerting
- **Dashboards**: Infrastructure visualization

### Application Monitoring
- **EKS Logging**: Container logs to CloudWatch
- **RDS Monitoring**: Database performance metrics
- **ALB Monitoring**: Load balancer metrics
- **Custom Metrics**: Application-specific metrics

## 💰 Cost Optimization

### Environment-Specific Sizing
- **Dev**: t3.small instances, minimal resources
- **Staging**: t3.medium instances, production-like
- **Prod**: Optimized instance types, reserved instances

### Storage Optimization
- **S3 Lifecycle**: Automated data lifecycle management
- **EBS Optimization**: GP3 volumes for better cost/performance
- **RDS Storage**: Auto-scaling storage allocation

### Spot Instances
- **EKS Nodes**: Mixed instance types with spot instances
- **Development**: Spot instances for non-critical workloads

## 🔧 Troubleshooting

### Common Issues

#### Backend Configuration
```bash
# Reset backend configuration
terraform init -reconfigure

# Verify backend state
terraform state list
```

#### Module Dependencies
```bash
# Refresh module dependencies
terraform get -update

# Target specific resources
terraform plan -target=module.vpc
```

#### State Management
```bash
# Import existing resources
terraform import aws_s3_bucket.example bucket-name

# Remove resources from state
terraform state rm aws_instance.example
```

### Validation Errors
```bash
# Check configuration syntax
terraform validate

# Format configuration files
terraform fmt -recursive

# Plan with detailed output
terraform plan -detailed-exitcode
```

## 📝 Best Practices

### Configuration Management
- Use consistent naming conventions
- Implement proper variable validation
- Document all variables and outputs
- Use locals for computed values

### Security
- Enable encryption for all data stores
- Use IAM roles instead of users
- Implement least privilege access
- Regular security scanning with Checkov

### State Management
- Use remote state with versioning
- Implement state locking
- Regular state backups
- Environment isolation

### Module Development
- Keep modules focused and reusable
- Version your modules
- Document module interfaces
- Test modules independently

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run validation: `./scripts/terraform/validate.sh -e dev -c -t`
5. Create a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Documentation

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)

---

**Note**: This infrastructure is designed for demonstration purposes and includes comprehensive Terraform Associate level concepts. Ensure you review and adjust configurations for your specific production requirements.