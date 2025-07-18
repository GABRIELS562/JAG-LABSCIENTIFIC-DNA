# Additional Resources - Supporting Infrastructure
# This file contains KMS keys, random passwords, and other supporting resources

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS Service"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks-kms-key"
    Purpose = "EKS-Encryption"
  })
}

# KMS Key Alias for EKS
resource "aws_kms_alias" "eks" {
  name          = "alias/${local.name_prefix}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS Service"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-kms-key"
    Purpose = "RDS-Encryption"
  })
}

# KMS Key Alias for RDS
resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# KMS Key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow S3 Service"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-s3-kms-key"
    Purpose = "S3-Encryption"
  })
}

# KMS Key Alias for S3
resource "aws_kms_alias" "s3" {
  name          = "alias/${local.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 16
  special = true
  upper   = true
  lower   = true
  numeric = true
  
  # Ensure password meets RDS requirements
  min_upper   = 1
  min_lower   = 1
  min_numeric = 1
  min_special = 1
  
  # Exclude characters that might cause issues
  override_special = "!#$%&*+-=?@^_|~"
}

# Store RDS password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  name        = "${local.name_prefix}-rds-password"
  description = "RDS master password for LIMS database"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-password"
    Purpose = "RDS-Authentication"
  })
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  secret_id     = aws_secretsmanager_secret.rds_password[0].id
  secret_string = random_password.rds_password.result
}

# Random auth token for ElastiCache
resource "random_password" "elasticache_auth_token" {
  length  = 32
  special = false  # ElastiCache auth tokens don't support special characters
  upper   = true
  lower   = true
  numeric = true
  
  min_upper   = 1
  min_lower   = 1
  min_numeric = 1
}

# Store ElastiCache auth token in AWS Secrets Manager
resource "aws_secretsmanager_secret" "elasticache_auth_token" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  name        = "${local.name_prefix}-elasticache-auth-token"
  description = "ElastiCache auth token for LIMS Redis cluster"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-elasticache-auth-token"
    Purpose = "ElastiCache-Authentication"
  })
}

resource "aws_secretsmanager_secret_version" "elasticache_auth_token" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  secret_id     = aws_secretsmanager_secret.elasticache_auth_token[0].id
  secret_string = random_password.elasticache_auth_token.result
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  count = var.feature_flags.enable_cloudfront ? 1 : 0
  
  comment = "OAI for ${local.name_prefix} S3 bucket access"
}

# WAF Web ACL for CloudFront
resource "aws_wafv2_web_acl" "main" {
  count = var.security_config.enable_waf ? 1 : 0
  
  name  = "${local.name_prefix}-waf-acl"
  description = "WAF Web ACL for LIMS application"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 3
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = var.environment == "prod" ? 2000 : 1000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-waf-acl"
    Purpose = "Web-Application-Firewall"
  })
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.environment == "prod" ? 1 : 0
  
  name = "${local.name_prefix}-rds-enhanced-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-enhanced-monitoring-role"
    Purpose = "RDS-Enhanced-Monitoring"
  })
}

# Attach the AWS managed policy for RDS Enhanced Monitoring
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count = var.environment == "prod" ? 1 : 0
  
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Local file to store cluster information
resource "local_file" "cluster_info" {
  count = var.feature_flags.enable_eks ? 1 : 0
  
  filename = "${path.module}/outputs/cluster_info.json"
  content = jsonencode({
    cluster_name     = var.eks_cluster_name
    cluster_endpoint = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_data  = data.aws_eks_cluster.cluster.certificate_authority[0].data
    region          = data.aws_region.current.name
    account_id      = data.aws_caller_identity.current.account_id
    environment     = var.environment
    created_at      = timestamp()
  })
  
  depends_on = [module.eks]
}

# SSM Parameters for application configuration
resource "aws_ssm_parameter" "database_url" {
  count = var.feature_flags.enable_rds ? 1 : 0
  
  name  = "/${var.project_name}/${var.environment}/database_url"
  type  = "SecureString"
  value = "postgresql://${module.rds[0].instance_username}:${random_password.rds_password.result}@${module.rds[0].instance_endpoint}:${module.rds[0].instance_port}/${module.rds[0].instance_name}"
  
  key_id = aws_kms_key.rds.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database-url"
    Purpose = "Database-Connection"
  })
}

resource "aws_ssm_parameter" "redis_url" {
  count = var.feature_flags.enable_elasticache ? 1 : 0
  
  name  = "/${var.project_name}/${var.environment}/redis_url"
  type  = "SecureString"
  value = "redis://:${random_password.elasticache_auth_token.result}@${module.elasticache[0].cluster_address}:${module.elasticache[0].cluster_port}"
  
  key_id = aws_kms_key.s3.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-url"
    Purpose = "Cache-Connection"
  })
}

# Generate random secrets for application
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
}

resource "random_password" "app_secret_key" {
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true
}

# Store application secrets in SSM
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project_name}/${var.environment}/jwt_secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result
  
  key_id = aws_kms_key.s3.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-jwt-secret"
    Purpose = "Application-Authentication"
  })
}

resource "aws_ssm_parameter" "app_secret_key" {
  name  = "/${var.project_name}/${var.environment}/app_secret_key"
  type  = "SecureString"
  value = random_password.app_secret_key.result
  
  key_id = aws_kms_key.s3.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-secret-key"
    Purpose = "Application-Encryption"
  })
}

# Application secrets in Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  name        = "${local.name_prefix}-app-secrets"
  description = "Application secrets for LIMS"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-secrets"
    Purpose = "Application-Secrets"
  })
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  secret_id = aws_secretsmanager_secret.app_secrets[0].id
  secret_string = jsonencode({
    database_url     = var.feature_flags.enable_rds ? "postgresql://${module.rds[0].instance_username}:${random_password.rds_password.result}@${module.rds[0].instance_endpoint}:${module.rds[0].instance_port}/${module.rds[0].instance_name}" : ""
    redis_url        = var.feature_flags.enable_elasticache ? "redis://:${random_password.elasticache_auth_token.result}@${module.elasticache[0].cluster_address}:${module.elasticache[0].cluster_port}" : ""
    jwt_secret       = random_password.jwt_secret.result
    app_secret_key   = random_password.app_secret_key.result
  })
}