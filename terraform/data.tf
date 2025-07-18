# Terraform Data Sources - Terraform Associate Skills Demonstration
# This file demonstrates data source usage, filtering, and external data integration

# Current AWS caller identity
data "aws_caller_identity" "current" {}

# Current AWS region
data "aws_region" "current" {}

# Current AWS partition
data "aws_partition" "current" {}

# Available availability zones
data "aws_availability_zones" "available" {
  state = "available"
  
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
  
  filter {
    name   = "state"
    values = ["available"]
  }
}

# Latest EKS optimized AMI
data "aws_ami" "eks_worker" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amazon-eks-node-${var.eks_cluster_version}-v*"]
  }
  
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# EKS cluster data (for Kubernetes provider)
data "aws_eks_cluster" "cluster" {
  name = var.eks_cluster_name
  
  depends_on = [module.eks]
}

# EKS cluster auth data (for Kubernetes provider)
data "aws_eks_cluster_auth" "cluster" {
  name = var.eks_cluster_name
  
  depends_on = [module.eks]
}

# Default VPC (for reference)
data "aws_vpc" "default" {
  default = true
}

# Default security group
data "aws_security_group" "default" {
  vpc_id = data.aws_vpc.default.id
  
  filter {
    name   = "group-name"
    values = ["default"]
  }
}

# Route 53 hosted zone (if exists)
data "aws_route53_zone" "existing" {
  count = var.feature_flags.enable_route53 ? 1 : 0
  
  name = "${var.project_name}.local"
}

# ACM certificate (if exists)
data "aws_acm_certificate" "existing" {
  count = var.feature_flags.enable_acm ? 1 : 0
  
  domain   = "*.${var.project_name}.local"
  statuses = ["ISSUED"]
}

# KMS key for encryption
data "aws_kms_key" "default" {
  key_id = "alias/aws/s3"
}

# IAM policy documents
data "aws_iam_policy_document" "eks_cluster_assume_role" {
  statement {
    effect = "Allow"
    
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
    
    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "eks_node_group_assume_role" {
  statement {
    effect = "Allow"
    
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
    
    actions = ["sts:AssumeRole"]
  }
}

# S3 bucket policy for CloudFront
data "aws_iam_policy_document" "s3_bucket_policy" {
  count = var.feature_flags.enable_cloudfront ? 1 : 0
  
  statement {
    sid    = "AllowCloudFrontAccess"
    effect = "Allow"
    
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.main[0].iam_arn]
    }
    
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    
    resources = [
      "arn:aws:s3:::${local.s3_buckets.app_data.name}",
      "arn:aws:s3:::${local.s3_buckets.app_data.name}/*"
    ]
  }
  
  statement {
    sid    = "DenyInsecureConnections"
    effect = "Deny"
    
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    
    actions = ["s3:*"]
    
    resources = [
      "arn:aws:s3:::${local.s3_buckets.app_data.name}",
      "arn:aws:s3:::${local.s3_buckets.app_data.name}/*"
    ]
    
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

# CloudTrail bucket policy
data "aws_iam_policy_document" "cloudtrail_bucket_policy" {
  count = var.security_config.enable_cloudtrail ? 1 : 0
  
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"
    
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    
    actions = ["s3:GetBucketAcl"]
    
    resources = ["arn:aws:s3:::${local.name_prefix}-cloudtrail-logs"]
  }
  
  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"
    
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    
    actions = ["s3:PutObject"]
    
    resources = ["arn:aws:s3:::${local.name_prefix}-cloudtrail-logs/*"]
    
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

# RDS subnet group
data "aws_db_subnet_group" "existing" {
  count = var.feature_flags.enable_rds ? 1 : 0
  
  name = "${local.name_prefix}-db-subnet-group"
}

# ElastiCache subnet group
data "aws_elasticache_subnet_group" "existing" {
  count = var.feature_flags.enable_elasticache ? 1 : 0
  
  name = "${local.name_prefix}-cache-subnet-group"
}

# SSM parameters for application configuration
data "aws_ssm_parameter" "app_config" {
  for_each = toset([
    "database_url",
    "redis_url",
    "jwt_secret",
    "app_secret_key"
  ])
  
  name = "/${var.project_name}/${var.environment}/${each.key}"
}

# Secrets Manager secrets
data "aws_secretsmanager_secret" "app_secrets" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  name = "${local.name_prefix}-app-secrets"
}

data "aws_secretsmanager_secret_version" "app_secrets" {
  count = var.security_config.enable_secrets_manager ? 1 : 0
  
  secret_id = data.aws_secretsmanager_secret.app_secrets[0].id
}

# CloudWatch log groups (existing)
data "aws_cloudwatch_log_group" "existing" {
  for_each = var.monitoring_config.enable_cloudwatch ? local.cloudwatch_log_groups : {}
  
  name = each.value.name
}

# EC2 instance types for EKS nodes
data "aws_ec2_instance_types" "available" {
  filter {
    name   = "instance-type"
    values = ["t3.*", "m5.*", "c5.*"]
  }
  
  filter {
    name   = "current-generation"
    values = ["true"]
  }
}

# Price list for cost optimization
data "aws_pricing_product" "ec2" {
  service_code = "AmazonEC2"
  
  filters = [
    {
      field = "instanceType"
      value = "t3.medium"
    },
    {
      field = "location"
      value = "US East (N. Virginia)"
    },
    {
      field = "tenancy"
      value = "Shared"
    },
    {
      field = "operating-system"
      value = "Linux"
    }
  ]
}

# External data source for getting latest Kubernetes version
data "external" "latest_k8s_version" {
  program = ["bash", "-c", "curl -s https://api.github.com/repos/kubernetes/kubernetes/releases/latest | jq -r '{version: .tag_name}'"]
}

# Template file for user data
data "template_file" "user_data" {
  template = file("${path.module}/templates/user_data.sh.tpl")
  
  vars = {
    cluster_name        = var.eks_cluster_name
    cluster_endpoint    = data.aws_eks_cluster.cluster.endpoint
    cluster_ca          = data.aws_eks_cluster.cluster.certificate_authority[0].data
    bootstrap_arguments = "--container-runtime containerd"
    region             = data.aws_region.current.name
  }
}

# Local file for storing cluster information
data "local_file" "cluster_info" {
  filename = "${path.module}/outputs/cluster_info.json"
  
  depends_on = [local_file.cluster_info]
}

# HTTP data source for external IP
data "http" "external_ip" {
  url = "https://ipv4.icanhazip.com"
}

# Archive data source for lambda functions
data "archive_file" "lambda_zip" {
  count = var.feature_flags.enable_monitoring ? 1 : 0
  
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/outputs/lambda.zip"
}

# TLS certificate for internal communication
data "tls_certificate" "cluster_ca" {
  url = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

# Random resources for unique naming
data "random_id" "unique_suffix" {
  byte_length = 4
}

# DNS TXT record for domain verification
data "dns_txt_record_set" "domain_verification" {
  host = "_amazonses.${var.project_name}.local"
}