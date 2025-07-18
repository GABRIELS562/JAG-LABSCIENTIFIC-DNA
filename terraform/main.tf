# Main Terraform Configuration - Terraform Associate Skills Demonstration
# This file demonstrates module usage, resource dependencies, and infrastructure orchestration

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  name               = local.name_prefix
  cidr               = var.vpc_cidr
  azs                = slice(local.azs, 0, 3)
  public_subnets     = local.public_subnets
  private_subnets    = local.private_subnets
  database_subnets   = local.database_subnets
  
  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support = var.enable_dns_support
  
  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_destination_type            = "cloud-watch-logs"
  
  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  
  # Security group configurations
  alb_ingress_rules   = local.security_group_rules.alb_ingress
  app_ingress_rules   = local.security_group_rules.app_ingress
  db_ingress_rules    = local.security_group_rules.db_ingress
  cache_ingress_rules = local.security_group_rules.cache_ingress
  
  tags = local.common_tags
}

# EKS Module
module "eks" {
  source = "./modules/eks"
  count  = var.feature_flags.enable_eks ? 1 : 0
  
  cluster_name    = var.eks_cluster_name
  cluster_version = var.eks_cluster_version
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # Node groups
  node_groups = local.eks_node_groups
  
  # OIDC provider
  enable_irsa = true
  
  # Cluster encryption
  cluster_encryption_config = [
    {
      provider_key_arn = aws_kms_key.eks.arn
      resources        = ["secrets"]
    }
  ]
  
  # CloudWatch logging
  cluster_enabled_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]
  
  # Security group IDs
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Node groups to cluster API"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }
  
  tags = local.common_tags
}

# RDS Module
module "rds" {
  source = "./modules/rds"
  count  = var.feature_flags.enable_rds ? 1 : 0
  
  identifier = "${local.name_prefix}-postgres"
  
  # Database configuration
  engine         = var.rds_engine
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class
  
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_encrypted     = var.rds_storage_encrypted
  kms_key_id           = aws_kms_key.rds.arn
  
  # Database details
  db_name  = "limsdatabase"
  username = "limsuser"
  password = random_password.rds_password.result
  
  # Network configuration
  vpc_security_group_ids = [module.security_groups.database_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group
  
  # Backup configuration
  backup_retention_period = var.rds_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Multi-AZ and monitoring
  multi_az               = local.rds_multi_az_enabled
  monitoring_interval    = var.environment == "prod" ? 60 : 0
  monitoring_role_arn    = var.environment == "prod" ? aws_iam_role.rds_enhanced_monitoring[0].arn : null
  
  # Performance Insights
  performance_insights_enabled = var.environment == "prod"
  performance_insights_kms_key_id = var.environment == "prod" ? aws_kms_key.rds.arn : null
  
  # Deletion protection
  deletion_protection = var.environment == "prod"
  
  tags = local.common_tags
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"
  count  = var.feature_flags.enable_elasticache ? 1 : 0
  
  cluster_id = "${local.name_prefix}-redis"
  
  # Engine configuration
  engine               = var.elasticache_engine
  node_type           = var.elasticache_node_type
  num_cache_nodes     = var.elasticache_num_cache_nodes
  parameter_group_name = var.elasticache_parameter_group_name
  
  # Network configuration
  subnet_group_name  = module.vpc.elasticache_subnet_group
  security_group_ids = [module.security_groups.cache_security_group_id]
  
  # Backup configuration
  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  
  # Authentication
  auth_token_enabled = true
  auth_token        = random_password.elasticache_auth_token.result
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.common_tags
}

# S3 Module
module "s3" {
  source = "./modules/s3"
  count  = var.feature_flags.enable_s3 ? 1 : 0
  
  buckets = local.s3_buckets
  
  # CloudFront OAI
  cloudfront_oai_arn = var.feature_flags.enable_cloudfront ? aws_cloudfront_origin_access_identity.main[0].iam_arn : null
  
  tags = local.common_tags
}

# CloudFront Module
module "cloudfront" {
  source = "./modules/cloudfront"
  count  = var.feature_flags.enable_cloudfront ? 1 : 0
  
  config = local.cloudfront_config
  
  # S3 bucket for static content
  s3_bucket_domain_name = module.s3[0].bucket_domain_names["app_data"]
  
  # ALB domain name
  alb_domain_name = module.alb[0].dns_name
  
  # ACM certificate
  acm_certificate_arn = var.security_config.ssl_certificate_arn != "" ? var.security_config.ssl_certificate_arn : null
  
  # WAF Web ACL
  web_acl_id = var.security_config.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
  
  tags = local.common_tags
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"
  count  = var.feature_flags.enable_eks ? 1 : 0
  
  config = local.alb_config
  
  vpc_id    = module.vpc.vpc_id
  subnets   = module.vpc.public_subnets
  
  # Security group
  security_group_id = module.security_groups.alb_security_group_id
  
  # SSL certificate
  ssl_certificate_arn = var.security_config.ssl_certificate_arn
  
  tags = local.common_tags
}

# Route53 Module
module "route53" {
  source = "./modules/route53"
  count  = var.feature_flags.enable_route53 ? 1 : 0
  
  zone_config = local.route53_zone
  
  # CloudFront distribution
  cloudfront_domain_name = var.feature_flags.enable_cloudfront ? module.cloudfront[0].domain_name : null
  cloudfront_zone_id     = var.feature_flags.enable_cloudfront ? module.cloudfront[0].hosted_zone_id : null
  
  # ALB
  alb_domain_name = var.feature_flags.enable_eks ? module.alb[0].dns_name : null
  alb_zone_id     = var.feature_flags.enable_eks ? module.alb[0].zone_id : null
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  count  = var.feature_flags.enable_monitoring ? 1 : 0
  
  name_prefix = local.name_prefix
  
  # CloudWatch configuration
  log_groups = local.cloudwatch_log_groups
  
  # SNS topic for alerts
  sns_topic_name = "${local.name_prefix}-alerts"
  
  # CloudWatch alarms
  create_alarms = true
  
  # Resources to monitor
  eks_cluster_name = var.feature_flags.enable_eks ? var.eks_cluster_name : null
  rds_instance_id  = var.feature_flags.enable_rds ? module.rds[0].instance_id : null
  alb_arn_suffix   = var.feature_flags.enable_eks ? module.alb[0].arn_suffix : null
  
  tags = local.common_tags
}

# Backup Module
module "backup" {
  source = "./modules/backup"
  count  = var.feature_flags.enable_backup ? 1 : 0
  
  name_prefix = local.name_prefix
  
  # Backup vault
  backup_vault_name = "${local.name_prefix}-backup-vault"
  
  # Resources to backup
  rds_instance_arn = var.feature_flags.enable_rds ? module.rds[0].instance_arn : null
  s3_bucket_arns   = var.feature_flags.enable_s3 ? [for bucket in module.s3[0].bucket_arns : bucket] : []
  
  # Backup schedule
  backup_schedule = "cron(0 2 * * ? *)"  # Daily at 2 AM
  
  # Retention
  delete_after_days = var.environment == "prod" ? 30 : 7
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"
  count  = var.security_config.enable_guardduty || var.security_config.enable_config ? 1 : 0
  
  name_prefix = local.name_prefix
  
  # GuardDuty
  enable_guardduty = var.security_config.enable_guardduty
  
  # Config
  enable_config = var.security_config.enable_config
  
  # CloudTrail
  enable_cloudtrail = var.security_config.enable_cloudtrail
  cloudtrail_s3_bucket = var.security_config.enable_cloudtrail ? "${local.name_prefix}-cloudtrail-logs" : null
  
  # Security Hub
  enable_security_hub = var.security_config.enable_security_hub
  
  tags = local.common_tags
}