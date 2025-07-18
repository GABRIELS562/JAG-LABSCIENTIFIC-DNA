# Terraform Modules

This directory contains reusable Terraform modules for the LabScientific LIMS infrastructure.

## 📋 Available Modules

### ✅ VPC Module (`./vpc/`)
- **Purpose**: Creates VPC with public, private, and database subnets
- **Features**: NAT Gateway, Internet Gateway, Route Tables, Flow Logs
- **Status**: Implemented

### 🔄 Planned Modules

The following modules are referenced in the main configuration but need to be implemented:

#### Security Module (`./security/`)
- **Purpose**: Security groups and network ACLs
- **Features**: Application, database, and cache security groups
- **Status**: Pending implementation

#### EKS Module (`./eks/`)
- **Purpose**: Amazon EKS cluster and node groups
- **Features**: Cluster setup, node groups, OIDC provider
- **Status**: Pending implementation

#### RDS Module (`./rds/`)
- **Purpose**: Amazon RDS database instance
- **Features**: PostgreSQL, encryption, backup configuration
- **Status**: Pending implementation

#### ElastiCache Module (`./elasticache/`)
- **Purpose**: Redis cluster for caching
- **Features**: Redis cluster, subnet groups, security
- **Status**: Pending implementation

#### S3 Module (`./s3/`)
- **Purpose**: S3 buckets with configurations
- **Features**: Multiple buckets, lifecycle rules, encryption
- **Status**: Pending implementation

#### CloudFront Module (`./cloudfront/`)
- **Purpose**: CloudFront distribution
- **Features**: CDN, OAI, caching behaviors
- **Status**: Pending implementation

#### ALB Module (`./alb/`)
- **Purpose**: Application Load Balancer
- **Features**: Load balancer, target groups, listeners
- **Status**: Pending implementation

#### Route53 Module (`./route53/`)
- **Purpose**: DNS management
- **Features**: Hosted zones, records, health checks
- **Status**: Pending implementation

#### Monitoring Module (`./monitoring/`)
- **Purpose**: CloudWatch monitoring setup
- **Features**: Log groups, alarms, dashboards
- **Status**: Pending implementation

#### Backup Module (`./backup/`)
- **Purpose**: AWS Backup configuration
- **Features**: Backup vault, policies, schedules
- **Status**: Pending implementation

## 🏗️ Module Structure

Each module should follow this structure:

```
module-name/
├── main.tf          # Main resource definitions
├── variables.tf     # Input variables
├── outputs.tf       # Output values
├── versions.tf      # Provider version constraints
├── README.md        # Module documentation
└── examples/        # Usage examples
    └── basic/
        ├── main.tf
        └── variables.tf
```

## 📝 Module Development Guidelines

### 1. Naming Conventions
- Use lowercase with hyphens for module names
- Use descriptive resource names
- Prefix all resources with the module name

### 2. Variable Design
- Use descriptive variable names
- Include validation where appropriate
- Provide sensible defaults
- Document all variables

### 3. Output Values
- Output all important resource identifiers
- Include ARNs for resources that have them
- Provide computed values that callers might need

### 4. Documentation
- Include a comprehensive README.md
- Document all variables and outputs
- Provide usage examples
- Include any prerequisites or dependencies

### 5. Testing
- Include basic examples in the examples/ directory
- Test modules in isolation
- Validate with different input combinations

## 🔧 Module Implementation Priority

1. **Security Module** - Foundation for all other modules
2. **EKS Module** - Core application platform
3. **RDS Module** - Database layer
4. **ElastiCache Module** - Caching layer
5. **S3 Module** - Object storage
6. **ALB Module** - Load balancing
7. **CloudFront Module** - CDN
8. **Route53 Module** - DNS
9. **Monitoring Module** - Observability
10. **Backup Module** - Data protection

## 🚀 Quick Start for Module Development

### 1. Create Module Structure
```bash
mkdir -p modules/module-name/examples/basic
cd modules/module-name
```

### 2. Create Base Files
```bash
# Create main resource file
cat > main.tf << 'EOF'
# Module: module-name
# Description: Brief description of what this module does

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Resources go here
EOF

# Create variables file
cat > variables.tf << 'EOF'
# Input variables for module-name module

variable "name" {
  description = "Name prefix for resources"
  type        = string
  
  validation {
    condition     = length(var.name) > 0
    error_message = "Name must not be empty."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
EOF

# Create outputs file
cat > outputs.tf << 'EOF'
# Outputs for module-name module

output "id" {
  description = "Resource ID"
  value       = # resource reference
}

output "arn" {
  description = "Resource ARN"
  value       = # resource arn
}
EOF
```

### 3. Create Example Usage
```bash
cat > examples/basic/main.tf << 'EOF'
# Basic example for module-name module

module "example" {
  source = "../.."
  
  name = "example"
  
  tags = {
    Environment = "dev"
    Purpose     = "example"
  }
}

output "example_id" {
  value = module.example.id
}
EOF
```

### 4. Test Module
```bash
cd examples/basic
terraform init
terraform plan
```

## 🔗 Module References

- [Terraform Module Documentation](https://www.terraform.io/docs/language/modules/index.html)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Module Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

## 📞 Support

For questions about module development or usage:
1. Check the main project README
2. Review existing module implementations
3. Consult Terraform documentation
4. Create an issue in the project repository