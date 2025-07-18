# Staging Environment Configuration
# This file demonstrates staging environment variable values

# Project Configuration
project_name = "labscientific-lims"
environment  = "staging"
project_owner = "devops-team"
cost_center   = "engineering"

# AWS Configuration
aws_region = "us-east-1"
backup_region = "us-west-2"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Network Configuration
vpc_cidr = "10.0.0.0/16"
public_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnets = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

# Staging networking - cost optimized but production-like
enable_nat_gateway = true
enable_vpn_gateway = false

# EKS Configuration
eks_cluster_name = "lims-staging-cluster"
eks_cluster_version = "1.28"

# Staging node groups - production-like but smaller
eks_node_groups = {
  general = {
    instance_types = ["t3.medium"]
    ami_type      = "AL2_x86_64"
    capacity_type = "ON_DEMAND"
    scaling_config = {
      desired_size = 2
      max_size     = 4
      min_size     = 2
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
      max_size     = 2
      min_size     = 1
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

# RDS Configuration - Production-like but smaller
rds_engine = "postgres"
rds_engine_version = "15.4"
rds_instance_class = "db.t3.small"
rds_allocated_storage = 50
rds_max_allocated_storage = 200
rds_backup_retention_period = 7
rds_multi_az = true
rds_storage_encrypted = true

# ElastiCache Configuration - Production-like but smaller
elasticache_engine = "redis"
elasticache_node_type = "cache.t3.small"
elasticache_num_cache_nodes = 2
elasticache_parameter_group_name = "default.redis7"

# S3 Configuration
s3_bucket_versioning = true
s3_bucket_encryption = true

# Application Configuration
application_config = {
  name            = "lims-app"
  port            = 3000
  health_check_path = "/health"
  cpu_requests    = "250m"
  memory_requests = "512Mi"
  cpu_limits      = "1000m"
  memory_limits   = "2Gi"
  replica_count   = 2
  max_replicas    = 5
  min_replicas    = 2
}

# Monitoring Configuration
monitoring_config = {
  enable_cloudwatch = true
  enable_prometheus = true
  enable_grafana    = true
  retention_days    = 30
}

# Security Configuration - Enhanced for staging
security_config = {
  enable_waf                = true
  enable_shield             = false
  enable_guardduty          = true
  enable_config             = true
  enable_cloudtrail         = true
  enable_security_hub       = true
  enable_secrets_manager    = true
  ssl_certificate_arn       = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
}

# Feature Flags - Production-like setup
feature_flags = {
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

# Additional tags for staging
additional_tags = {
  Purpose = "Staging"
  AutoShutdown = "false"
  BackupPolicy = "weekly"
  Compliance = "testing"
  SLA = "99.5"
}