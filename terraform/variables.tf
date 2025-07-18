# Terraform Variables - Terraform Associate Skills Demonstration
# This file demonstrates variable types, validation, and best practices

# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "labscientific-lims"
  
  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 50
    error_message = "Project name must be between 1 and 50 characters."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_owner" {
  description = "Owner of the project"
  type        = string
  default     = "devops-team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region for primary resources"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be in format: us-east-1, eu-west-1, etc."
  }
}

variable "backup_region" {
  description = "AWS region for backup resources"
  type        = string
  default     = "us-west-2"
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.backup_region))
    error_message = "Backup region must be in format: us-west-2, eu-central-1, etc."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified."
  }
}

variable "assume_role_arn" {
  description = "ARN of the role to assume for cross-account access"
  type        = string
  default     = null
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "List of database subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in VPC"
  type        = bool
  default     = true
}

# EKS Configuration
variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "lims-cluster"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
  
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.eks_cluster_version))
    error_message = "EKS cluster version must be in format: 1.28, 1.27, etc."
  }
}

variable "eks_node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    ami_type      = string
    capacity_type = string
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
    update_config = object({
      max_unavailable = number
    })
    labels = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  
  default = {
    general = {
      instance_types = ["t3.medium"]
      ami_type      = "AL2_x86_64"
      capacity_type = "ON_DEMAND"
      scaling_config = {
        desired_size = 2
        max_size     = 5
        min_size     = 1
      }
      update_config = {
        max_unavailable = 1
      }
      labels = {
        role = "general"
      }
      taints = []
    }
    
    compute = {
      instance_types = ["c5.large"]
      ami_type      = "AL2_x86_64"
      capacity_type = "SPOT"
      scaling_config = {
        desired_size = 1
        max_size     = 3
        min_size     = 0
      }
      update_config = {
        max_unavailable = 1
      }
      labels = {
        role = "compute"
      }
      taints = [{
        key    = "compute"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# RDS Configuration
variable "rds_engine" {
  description = "Database engine"
  type        = string
  default     = "postgres"
  
  validation {
    condition     = contains(["postgres", "mysql", "mariadb"], var.rds_engine)
    error_message = "RDS engine must be one of: postgres, mysql, mariadb."
  }
}

variable "rds_engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
  
  validation {
    condition     = var.rds_allocated_storage >= 20 && var.rds_allocated_storage <= 1000
    error_message = "RDS allocated storage must be between 20 and 1000 GB."
  }
}

variable "rds_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
  
  validation {
    condition     = var.rds_backup_retention_period >= 1 && var.rds_backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days."
  }
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "rds_storage_encrypted" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

# ElastiCache Configuration
variable "elasticache_engine" {
  description = "ElastiCache engine"
  type        = string
  default     = "redis"
  
  validation {
    condition     = contains(["redis", "memcached"], var.elasticache_engine)
    error_message = "ElastiCache engine must be redis or memcached."
  }
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "elasticache_parameter_group_name" {
  description = "ElastiCache parameter group name"
  type        = string
  default     = "default.redis7"
}

# S3 Configuration
variable "s3_bucket_versioning" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "s3_bucket_encryption" {
  description = "Enable S3 bucket encryption"
  type        = bool
  default     = true
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules"
  type = list(object({
    id                            = string
    enabled                       = bool
    abort_incomplete_multipart_upload_days = number
    noncurrent_version_expiration_days     = number
    expiration_days                        = number
  }))
  
  default = [
    {
      id                            = "lims_lifecycle"
      enabled                       = true
      abort_incomplete_multipart_upload_days = 7
      noncurrent_version_expiration_days     = 90
      expiration_days                        = 365
    }
  ]
}

# Application Configuration
variable "application_config" {
  description = "Application configuration"
  type = object({
    name            = string
    port            = number
    health_check_path = string
    cpu_requests    = string
    memory_requests = string
    cpu_limits      = string
    memory_limits   = string
    replica_count   = number
    max_replicas    = number
    min_replicas    = number
  })
  
  default = {
    name            = "lims-app"
    port            = 3000
    health_check_path = "/health"
    cpu_requests    = "250m"
    memory_requests = "512Mi"
    cpu_limits      = "1000m"
    memory_limits   = "2Gi"
    replica_count   = 3
    max_replicas    = 10
    min_replicas    = 2
  }
}

# Monitoring Configuration
variable "monitoring_config" {
  description = "Monitoring configuration"
  type = object({
    enable_cloudwatch = bool
    enable_prometheus = bool
    enable_grafana    = bool
    retention_days    = number
  })
  
  default = {
    enable_cloudwatch = true
    enable_prometheus = true
    enable_grafana    = true
    retention_days    = 30
  }
}

# Security Configuration
variable "security_config" {
  description = "Security configuration"
  type = object({
    enable_waf                = bool
    enable_shield             = bool
    enable_guardduty          = bool
    enable_config             = bool
    enable_cloudtrail         = bool
    enable_security_hub       = bool
    enable_secrets_manager    = bool
    ssl_certificate_arn       = string
  })
  
  default = {
    enable_waf                = true
    enable_shield             = false
    enable_guardduty          = true
    enable_config             = true
    enable_cloudtrail         = true
    enable_security_hub       = true
    enable_secrets_manager    = true
    ssl_certificate_arn       = ""
  }
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for conditional resource creation"
  type = object({
    enable_eks              = bool
    enable_rds              = bool
    enable_elasticache      = bool
    enable_s3               = bool
    enable_cloudfront       = bool
    enable_route53          = bool
    enable_acm              = bool
    enable_backup           = bool
    enable_monitoring       = bool
    enable_logging          = bool
    enable_multi_region     = bool
  })
  
  default = {
    enable_eks              = true
    enable_rds              = true
    enable_elasticache      = true
    enable_s3               = true
    enable_cloudfront       = true
    enable_route53          = true
    enable_acm              = true
    enable_backup           = true
    enable_monitoring       = true
    enable_logging          = true
    enable_multi_region     = false
  }
}