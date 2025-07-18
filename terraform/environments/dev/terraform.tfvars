# Development Environment Configuration
# This file demonstrates environment-specific variable values

# Project Configuration
project_name = "labscientific-lims"
environment  = "dev"
project_owner = "devops-team"
cost_center   = "engineering"

# AWS Configuration
aws_region = "us-east-1"
backup_region = "us-west-2"
availability_zones = ["us-east-1a", "us-east-1b"]

# Network Configuration
vpc_cidr = "10.0.0.0/16"
public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.101.0/24", "10.0.102.0/24"]
database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]

# Cost optimization for development
enable_nat_gateway = false
enable_vpn_gateway = false

# EKS Configuration
eks_cluster_name = "lims-dev-cluster"
eks_cluster_version = "1.28"

# Minimal node groups for development
eks_node_groups = {
  general = {
    instance_types = ["t3.small"]
    ami_type      = "AL2_x86_64"
    capacity_type = "SPOT"
    scaling_config = {
      desired_size = 1
      max_size     = 2
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
}

# RDS Configuration - Minimal for development
rds_engine = "postgres"
rds_engine_version = "15.4"
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_max_allocated_storage = 50
rds_backup_retention_period = 1
rds_multi_az = false
rds_storage_encrypted = false

# ElastiCache Configuration - Minimal for development
elasticache_engine = "redis"
elasticache_node_type = "cache.t3.micro"
elasticache_num_cache_nodes = 1
elasticache_parameter_group_name = "default.redis7"

# S3 Configuration
s3_bucket_versioning = false
s3_bucket_encryption = true

# Application Configuration
application_config = {
  name            = "lims-app"
  port            = 3000
  health_check_path = "/health"
  cpu_requests    = "100m"
  memory_requests = "256Mi"
  cpu_limits      = "500m"
  memory_limits   = "1Gi"
  replica_count   = 1
  max_replicas    = 2
  min_replicas    = 1
}

# Monitoring Configuration
monitoring_config = {
  enable_cloudwatch = true
  enable_prometheus = false
  enable_grafana    = false
  retention_days    = 7
}

# Security Configuration - Basic for development
security_config = {
  enable_waf                = false
  enable_shield             = false
  enable_guardduty          = false
  enable_config             = false
  enable_cloudtrail         = false
  enable_security_hub       = false
  enable_secrets_manager    = false
  ssl_certificate_arn       = ""
}

# Feature Flags - Minimal setup for development
feature_flags = {
  enable_eks              = true
  enable_rds              = true
  enable_elasticache      = true
  enable_s3               = true
  enable_cloudfront       = false
  enable_route53          = false
  enable_acm              = false
  enable_backup           = false
  enable_monitoring       = true
  enable_logging          = true
  enable_multi_region     = false
}

# Additional tags for development
additional_tags = {
  Purpose = "Development"
  AutoShutdown = "true"
  BackupPolicy = "none"
}