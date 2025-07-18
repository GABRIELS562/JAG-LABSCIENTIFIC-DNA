# Terraform Locals - Terraform Associate Skills Demonstration
# This file demonstrates local values, data manipulation, and computed values

locals {
  # Common naming convention
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Common tags applied to all resources
  common_tags = merge(
    var.additional_tags,
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.project_owner
      CostCenter  = var.cost_center
      CreatedBy   = "DevOps-Showcase"
      CreatedAt   = timestamp()
    }
  )
  
  # Environment-specific configurations
  environment_config = {
    dev = {
      instance_count = 1
      instance_size  = "small"
      backup_enabled = false
      monitoring_level = "basic"
    }
    staging = {
      instance_count = 2
      instance_size  = "medium"
      backup_enabled = true
      monitoring_level = "enhanced"
    }
    prod = {
      instance_count = 3
      instance_size  = "large"
      backup_enabled = true
      monitoring_level = "full"
    }
  }
  
  # Current environment configuration
  current_env_config = local.environment_config[var.environment]
  
  # Computed values based on environment
  rds_backup_enabled = var.environment == "prod" ? true : var.rds_backup_retention_period > 0
  rds_multi_az_enabled = var.environment == "prod" ? true : var.rds_multi_az
  
  # Network calculations
  vpc_cidr_block = var.vpc_cidr
  vpc_cidr_newbits = 8 - tonumber(split("/", var.vpc_cidr)[1])
  
  # Availability zones processing
  azs = data.aws_availability_zones.available.names
  az_count = length(local.azs)
  
  # Subnet calculations
  public_subnets = [
    for i in range(min(length(var.public_subnets), local.az_count)) :
    cidrsubnet(local.vpc_cidr_block, 8, i + 1)
  ]
  
  private_subnets = [
    for i in range(min(length(var.private_subnets), local.az_count)) :
    cidrsubnet(local.vpc_cidr_block, 8, i + 101)
  ]
  
  database_subnets = [
    for i in range(min(length(var.database_subnets), local.az_count)) :
    cidrsubnet(local.vpc_cidr_block, 8, i + 201)
  ]
  
  # EKS node group configurations with computed values
  eks_node_groups = {
    for name, config in var.eks_node_groups : name => merge(config, {
      node_group_name = "${local.name_prefix}-${name}-nodes"
      # Adjust instance counts based on environment
      scaling_config = merge(config.scaling_config, {
        desired_size = var.environment == "prod" ? config.scaling_config.desired_size : max(1, config.scaling_config.desired_size - 1)
        max_size     = var.environment == "prod" ? config.scaling_config.max_size : max(2, config.scaling_config.max_size - 1)
      })
    })
  }
  
  # Security group rules
  security_group_rules = {
    alb_ingress = [
      {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP from internet"
      },
      {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTPS from internet"
      }
    ]
    
    app_ingress = [
      {
        from_port   = 3000
        to_port     = 3000
        protocol    = "tcp"
        cidr_blocks = local.private_subnets
        description = "Frontend from private subnets"
      },
      {
        from_port   = 3001
        to_port     = 3001
        protocol    = "tcp"
        cidr_blocks = local.private_subnets
        description = "Backend from private subnets"
      }
    ]
    
    db_ingress = [
      {
        from_port   = 5432
        to_port     = 5432
        protocol    = "tcp"
        cidr_blocks = local.private_subnets
        description = "PostgreSQL from private subnets"
      }
    ]
    
    cache_ingress = [
      {
        from_port   = 6379
        to_port     = 6379
        protocol    = "tcp"
        cidr_blocks = local.private_subnets
        description = "Redis from private subnets"
      }
    ]
  }
  
  # S3 bucket configurations
  s3_buckets = {
    app_data = {
      name = "${local.name_prefix}-app-data"
      versioning = var.s3_bucket_versioning
      encryption = var.s3_bucket_encryption
      lifecycle_rules = var.s3_lifecycle_rules
    }
    
    backups = {
      name = "${local.name_prefix}-backups"
      versioning = true
      encryption = true
      lifecycle_rules = [
        {
          id                            = "backup_lifecycle"
          enabled                       = true
          abort_incomplete_multipart_upload_days = 7
          noncurrent_version_expiration_days     = 30
          expiration_days                        = 90
        }
      ]
    }
    
    logs = {
      name = "${local.name_prefix}-logs"
      versioning = false
      encryption = true
      lifecycle_rules = [
        {
          id                            = "log_lifecycle"
          enabled                       = true
          abort_incomplete_multipart_upload_days = 1
          noncurrent_version_expiration_days     = 7
          expiration_days                        = 30
        }
      ]
    }
  }
  
  # CloudWatch log groups
  cloudwatch_log_groups = {
    application = {
      name = "/aws/application/${local.name_prefix}"
      retention_days = var.monitoring_config.retention_days
    }
    
    eks_cluster = {
      name = "/aws/eks/${var.eks_cluster_name}/cluster"
      retention_days = var.monitoring_config.retention_days
    }
    
    rds = {
      name = "/aws/rds/instance/${local.name_prefix}-postgres/postgresql"
      retention_days = var.monitoring_config.retention_days
    }
  }
  
  # IAM role configurations
  iam_roles = {
    eks_cluster = {
      name = "${local.name_prefix}-eks-cluster-role"
      assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Action = "sts:AssumeRole"
            Effect = "Allow"
            Principal = {
              Service = "eks.amazonaws.com"
            }
          }
        ]
      })
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
      ]
    }
    
    eks_node_group = {
      name = "${local.name_prefix}-eks-node-group-role"
      assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Action = "sts:AssumeRole"
            Effect = "Allow"
            Principal = {
              Service = "ec2.amazonaws.com"
            }
          }
        ]
      })
      managed_policy_arns = [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
      ]
    }
  }
  
  # Route53 zone configuration
  route53_zone = var.feature_flags.enable_route53 ? {
    name = "${local.name_prefix}.local"
    records = {
      main = {
        name = local.name_prefix
        type = "A"
        alias = true
      }
      www = {
        name = "www.${local.name_prefix}"
        type = "CNAME"
        alias = false
      }
    }
  } : null
  
  # ACM certificate configuration
  acm_certificate = var.feature_flags.enable_acm ? {
    domain_name = "${local.name_prefix}.local"
    subject_alternative_names = [
      "*.${local.name_prefix}.local"
    ]
    validation_method = "DNS"
  } : null
  
  # Application Load Balancer configuration
  alb_config = {
    name = "${local.name_prefix}-alb"
    internal = false
    type = "application"
    subnets = local.public_subnets
    enable_deletion_protection = var.environment == "prod"
    
    target_groups = {
      frontend = {
        name = "${local.name_prefix}-frontend-tg"
        port = 3000
        protocol = "HTTP"
        health_check_path = "/health"
        health_check_interval = 30
        health_check_timeout = 5
        healthy_threshold = 2
        unhealthy_threshold = 3
      }
      
      backend = {
        name = "${local.name_prefix}-backend-tg"
        port = 3001
        protocol = "HTTP"
        health_check_path = "/api/health"
        health_check_interval = 30
        health_check_timeout = 5
        healthy_threshold = 2
        unhealthy_threshold = 3
      }
    }
  }
  
  # CloudFront distribution configuration
  cloudfront_config = var.feature_flags.enable_cloudfront ? {
    aliases = ["${local.name_prefix}.local"]
    default_root_object = "index.html"
    price_class = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
    
    origins = {
      alb = {
        domain_name = "alb.${local.name_prefix}.local"
        origin_id = "${local.name_prefix}-alb"
        custom_origin_config = {
          http_port = 80
          https_port = 443
          origin_protocol_policy = "https-only"
          origin_ssl_protocols = ["TLSv1.2"]
        }
      }
      
      s3 = {
        domain_name = "${local.name_prefix}-app-data.s3.amazonaws.com"
        origin_id = "${local.name_prefix}-s3"
        s3_origin_config = {
          origin_access_identity = "${local.name_prefix}-oai"
        }
      }
    }
    
    default_cache_behavior = {
      target_origin_id = "${local.name_prefix}-alb"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods = ["GET", "HEAD"]
      compress = true
      
      forwarded_values = {
        query_string = true
        cookies = {
          forward = "none"
        }
      }
      
      min_ttl = 0
      default_ttl = 3600
      max_ttl = 86400
    }
    
    cache_behaviors = [
      {
        path_pattern = "/api/*"
        target_origin_id = "${local.name_prefix}-alb"
        viewer_protocol_policy = "redirect-to-https"
        allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
        cached_methods = ["GET", "HEAD"]
        compress = true
        min_ttl = 0
        default_ttl = 0
        max_ttl = 0
      }
    ]
  } : null
  
  # WAF configuration
  waf_config = var.security_config.enable_waf ? {
    name = "${local.name_prefix}-waf"
    scope = "CLOUDFRONT"
    
    rules = [
      {
        name = "AWSManagedRulesCommonRuleSet"
        priority = 1
        override_action = "none"
        managed_rule_group_statement = {
          name = "AWSManagedRulesCommonRuleSet"
          vendor_name = "AWS"
        }
        visibility_config = {
          cloudwatch_metrics_enabled = true
          metric_name = "CommonRuleSetMetric"
          sampled_requests_enabled = true
        }
      },
      {
        name = "AWSManagedRulesKnownBadInputsRuleSet"
        priority = 2
        override_action = "none"
        managed_rule_group_statement = {
          name = "AWSManagedRulesKnownBadInputsRuleSet"
          vendor_name = "AWS"
        }
        visibility_config = {
          cloudwatch_metrics_enabled = true
          metric_name = "KnownBadInputsRuleSetMetric"
          sampled_requests_enabled = true
        }
      }
    ]
  } : null
}