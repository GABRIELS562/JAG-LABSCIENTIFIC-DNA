# Variables for AWS Infrastructure Template
# This file defines all configurable parameters for the LIMS AWS deployment

# General Configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lims"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.7.0/24", "10.0.8.0/24", "10.0.9.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDR blocks that can access the Amazon EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# EKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_ami_type" {
  description = "AMI type for EKS nodes"
  type        = string
  default     = "AL2_x86_64"
}

variable "node_capacity_type" {
  description = "Capacity type for EKS nodes (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
}

variable "node_disk_size" {
  description = "Disk size for EKS nodes in GB"
  type        = number
  default     = 50
}

variable "node_desired_size" {
  description = "Desired number of EKS nodes"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of EKS nodes"
  type        = number
  default     = 5
}

variable "node_min_size" {
  description = "Minimum number of EKS nodes"
  type        = number
  default     = 1
}

variable "node_ssh_key" {
  description = "SSH key name for EKS nodes"
  type        = string
  default     = ""
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15.4"
}

variable "postgres_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "postgres_allocated_storage" {
  description = "Initial storage allocation for RDS in GB"
  type        = number
  default     = 20
}

variable "postgres_max_allocated_storage" {
  description = "Maximum storage allocation for RDS in GB"
  type        = number
  default     = 100
}

variable "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "lims"
}

variable "postgres_username" {
  description = "Master username for PostgreSQL"
  type        = string
  default     = "lims_user"
}

variable "postgres_password" {
  description = "Master password for PostgreSQL"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}

variable "postgres_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "postgres_backup_window" {
  description = "Backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "postgres_maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Cache Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters"
  type        = number
  default     = 2
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 5
}

variable "redis_snapshot_window" {
  description = "Snapshot window"
  type        = string
  default     = "03:00-05:00"
}

# Monitoring Configuration
variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for resources"
  type        = bool
  default     = true
}

# Cost Management
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "enable_auto_scaling" {
  description = "Enable auto scaling for EKS nodes"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_encryption" {
  description = "Enable encryption at rest for all resources"
  type        = bool
  default     = true
}

variable "enable_network_policies" {
  description = "Enable Kubernetes network policies"
  type        = bool
  default     = true
}

variable "enable_pod_security_policy" {
  description = "Enable Pod Security Policy"
  type        = bool
  default     = true
}

# Backup Configuration
variable "enable_automated_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

# Application Configuration
variable "application_port" {
  description = "Port for the LIMS application"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health check path for the application"
  type        = string
  default     = "/health"
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "lims.example.com"
}

# Feature Flags
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging"
  type        = bool
  default     = true
}

variable "enable_tracing" {
  description = "Enable distributed tracing"
  type        = bool
  default     = true
}

variable "enable_service_mesh" {
  description = "Enable service mesh (Istio)"
  type        = bool
  default     = false
}

# Environment-specific scaling
variable "scaling_config" {
  description = "Environment-specific scaling configuration"
  type = object({
    min_capacity = number
    max_capacity = number
    target_cpu   = number
    target_memory = number
  })
  default = {
    min_capacity = 2
    max_capacity = 10
    target_cpu   = 70
    target_memory = 80
  }
}

# Multi-AZ Configuration
variable "multi_az_deployment" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

# Disaster Recovery Configuration
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup"
  type        = bool
  default     = false
}

variable "dr_region" {
  description = "Disaster recovery region"
  type        = string
  default     = "us-west-2"
}

# Cost Optimization
variable "cost_optimization_config" {
  description = "Cost optimization configuration"
  type = object({
    enable_scheduled_scaling = bool
    scale_down_schedule     = string
    scale_up_schedule       = string
    reserved_instances      = bool
    savings_plans          = bool
  })
  default = {
    enable_scheduled_scaling = true
    scale_down_schedule     = "0 18 * * 1-5"  # Scale down at 6 PM on weekdays
    scale_up_schedule       = "0 8 * * 1-5"   # Scale up at 8 AM on weekdays
    reserved_instances      = false
    savings_plans          = false
  }
}

# Compliance and Governance
variable "compliance_config" {
  description = "Compliance and governance configuration"
  type = object({
    enable_config_rules    = bool
    enable_cloudtrail     = bool
    enable_guardduty      = bool
    enable_security_hub   = bool
    compliance_framework  = string
  })
  default = {
    enable_config_rules    = true
    enable_cloudtrail     = true
    enable_guardduty      = true
    enable_security_hub   = true
    compliance_framework  = "SOC2"
  }
}

# Resource Tagging Strategy
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Performance Configuration
variable "performance_config" {
  description = "Performance optimization configuration"
  type = object({
    enable_enhanced_monitoring = bool
    enable_performance_insights = bool
    monitoring_interval        = number
    insights_retention_period  = number
  })
  default = {
    enable_enhanced_monitoring = true
    enable_performance_insights = true
    monitoring_interval        = 60
    insights_retention_period  = 7
  }
}

# Network Security
variable "network_security_config" {
  description = "Network security configuration"
  type = object({
    enable_waf                = bool
    enable_ddos_protection   = bool
    enable_vpc_flow_logs     = bool
    allowed_cidr_blocks      = list(string)
    enable_private_endpoints = bool
  })
  default = {
    enable_waf                = true
    enable_ddos_protection   = true
    enable_vpc_flow_logs     = true
    allowed_cidr_blocks      = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    enable_private_endpoints = true
  }
}

# Application-specific Configuration
variable "lims_config" {
  description = "LIMS application specific configuration"
  type = object({
    enable_genetic_analysis    = bool
    enable_sample_tracking     = bool
    enable_reporting_module    = bool
    enable_user_management     = bool
    enable_audit_logging       = bool
    max_file_upload_size_mb    = number
    session_timeout_minutes    = number
    max_concurrent_users       = number
  })
  default = {
    enable_genetic_analysis    = true
    enable_sample_tracking     = true
    enable_reporting_module    = true
    enable_user_management     = true
    enable_audit_logging       = true
    max_file_upload_size_mb    = 50
    session_timeout_minutes    = 30
    max_concurrent_users       = 100
  }
}

# Integration Configuration
variable "integration_config" {
  description = "External integration configuration"
  type = object({
    enable_osiris_integration     = bool
    enable_genomics_integration   = bool
    enable_email_notifications    = bool
    enable_slack_notifications    = bool
    enable_external_auth         = bool
    auth_provider               = string
  })
  default = {
    enable_osiris_integration     = true
    enable_genomics_integration   = true
    enable_email_notifications    = true
    enable_slack_notifications    = false
    enable_external_auth         = false
    auth_provider               = "internal"
  }
}