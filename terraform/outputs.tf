# Terraform Outputs - Terraform Associate Skills Demonstration
# This file demonstrates output values, sensitive data handling, and data export

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

# EKS Outputs
output "eks_cluster_id" {
  description = "The ID of the EKS cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_id : null
}

output "eks_cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_arn : null
}

output "eks_cluster_endpoint" {
  description = "Endpoint for your Kubernetes API server"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_endpoint : null
}

output "eks_cluster_version" {
  description = "The Kubernetes version for the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_version : null
}

output "eks_cluster_platform_version" {
  description = "Platform version for the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_platform_version : null
}

output "eks_cluster_status" {
  description = "Status of the EKS cluster. One of `CREATING`, `ACTIVE`, `DELETING`, `FAILED`"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_status : null
}

output "eks_cluster_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_security_group_id : null
}

output "eks_cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_iam_role_name : null
}

output "eks_cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_iam_role_arn : null
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_certificate_authority_data : null
}

output "eks_cluster_primary_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = var.feature_flags.enable_eks ? module.eks[0].cluster_primary_security_group_id : null
}

output "eks_oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = var.feature_flags.enable_eks ? module.eks[0].oidc_provider_arn : null
}

output "eks_node_groups" {
  description = "Map of attribute maps for all EKS node groups created"
  value       = var.feature_flags.enable_eks ? module.eks[0].node_groups : null
}

# RDS Outputs
output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_endpoint : null
}

output "rds_instance_hosted_zone_id" {
  description = "The canonical hosted zone ID of the DB instance (to be used in a Route 53 Alias record)"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_hosted_zone_id : null
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_id : null
}

output "rds_instance_resource_id" {
  description = "RDS instance resource ID"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_resource_id : null
}

output "rds_instance_status" {
  description = "RDS instance status"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_status : null
}

output "rds_instance_name" {
  description = "RDS instance name"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_name : null
}

output "rds_instance_username" {
  description = "RDS instance root username"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_username : null
  sensitive   = true
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = var.feature_flags.enable_rds ? module.rds[0].instance_port : null
}

output "rds_subnet_group_id" {
  description = "The db subnet group name"
  value       = var.feature_flags.enable_rds ? module.rds[0].subnet_group_id : null
}

output "rds_subnet_group_arn" {
  description = "The ARN of the db subnet group"
  value       = var.feature_flags.enable_rds ? module.rds[0].subnet_group_arn : null
}

output "rds_parameter_group_id" {
  description = "The db parameter group id"
  value       = var.feature_flags.enable_rds ? module.rds[0].parameter_group_id : null
}

output "rds_parameter_group_arn" {
  description = "The ARN of the db parameter group"
  value       = var.feature_flags.enable_rds ? module.rds[0].parameter_group_arn : null
}

# ElastiCache Outputs
output "elasticache_cluster_address" {
  description = "DNS name of the cache cluster without the port appended"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].cluster_address : null
}

output "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].cluster_id : null
}

output "elasticache_cluster_arn" {
  description = "ARN of the ElastiCache cluster"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].cluster_arn : null
}

output "elasticache_cluster_port" {
  description = "Port number on which each of the cache nodes will accept connections"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].cluster_port : null
}

output "elasticache_parameter_group_id" {
  description = "The ElastiCache parameter group ID"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].parameter_group_id : null
}

output "elasticache_subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = var.feature_flags.enable_elasticache ? module.elasticache[0].subnet_group_name : null
}

# S3 Outputs
output "s3_bucket_ids" {
  description = "The name of the S3 buckets"
  value       = var.feature_flags.enable_s3 ? module.s3[0].bucket_ids : null
}

output "s3_bucket_arns" {
  description = "The ARN of the S3 buckets"
  value       = var.feature_flags.enable_s3 ? module.s3[0].bucket_arns : null
}

output "s3_bucket_domain_names" {
  description = "The bucket domain names"
  value       = var.feature_flags.enable_s3 ? module.s3[0].bucket_domain_names : null
}

output "s3_bucket_regional_domain_names" {
  description = "The bucket region-specific domain names"
  value       = var.feature_flags.enable_s3 ? module.s3[0].bucket_regional_domain_names : null
}

# ALB Outputs
output "alb_id" {
  description = "The ID and ARN of the load balancer"
  value       = var.feature_flags.enable_eks ? module.alb[0].alb_id : null
}

output "alb_arn" {
  description = "The ID and ARN of the load balancer"
  value       = var.feature_flags.enable_eks ? module.alb[0].alb_arn : null
}

output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = var.feature_flags.enable_eks ? module.alb[0].dns_name : null
}

output "alb_canonical_hosted_zone_id" {
  description = "The canonical hosted zone ID of the load balancer (to be used in a Route 53 Alias record)"
  value       = var.feature_flags.enable_eks ? module.alb[0].zone_id : null
}

# Route53 Outputs
output "route53_zone_id" {
  description = "The Hosted Zone ID"
  value       = var.feature_flags.enable_route53 ? module.route53[0].zone_id : null
}

output "route53_zone_arn" {
  description = "The Amazon Resource Name (ARN) of the Hosted Zone"
  value       = var.feature_flags.enable_route53 ? module.route53[0].zone_arn : null
}

output "route53_name_servers" {
  description = "A list of name servers in associated (or default) delegation set"
  value       = var.feature_flags.enable_route53 ? module.route53[0].name_servers : null
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "The identifier for the distribution"
  value       = var.feature_flags.enable_cloudfront ? module.cloudfront[0].distribution_id : null
}

output "cloudfront_distribution_arn" {
  description = "The ARN (Amazon Resource Name) for the distribution"
  value       = var.feature_flags.enable_cloudfront ? module.cloudfront[0].distribution_arn : null
}

output "cloudfront_distribution_domain_name" {
  description = "The domain name corresponding to the distribution"
  value       = var.feature_flags.enable_cloudfront ? module.cloudfront[0].domain_name : null
}

output "cloudfront_distribution_hosted_zone_id" {
  description = "The CloudFront Route 53 zone ID"
  value       = var.feature_flags.enable_cloudfront ? module.cloudfront[0].hosted_zone_id : null
}

# Security Outputs
output "security_group_ids" {
  description = "Map of security group IDs"
  value = {
    alb      = module.security_groups.alb_security_group_id
    app      = module.security_groups.app_security_group_id
    database = module.security_groups.database_security_group_id
    cache    = module.security_groups.cache_security_group_id
  }
}

# KMS Outputs
output "kms_key_ids" {
  description = "Map of KMS key IDs"
  value = {
    eks = aws_kms_key.eks.id
    rds = aws_kms_key.rds.id
    s3  = aws_kms_key.s3.id
  }
}

output "kms_key_arns" {
  description = "Map of KMS key ARNs"
  value = {
    eks = aws_kms_key.eks.arn
    rds = aws_kms_key.rds.arn
    s3  = aws_kms_key.s3.arn
  }
}

# Random Passwords (Sensitive)
output "random_password_rds" {
  description = "Random password for RDS"
  value       = random_password.rds_password.result
  sensitive   = true
}

output "random_password_elasticache" {
  description = "Random password for ElastiCache"
  value       = random_password.elasticache_auth_token.result
  sensitive   = true
}

# Monitoring Outputs
output "monitoring_sns_topic_arn" {
  description = "ARN of the SNS topic for monitoring alerts"
  value       = var.feature_flags.enable_monitoring ? module.monitoring[0].sns_topic_arn : null
}

output "monitoring_cloudwatch_log_groups" {
  description = "Map of CloudWatch log groups"
  value       = var.feature_flags.enable_monitoring ? module.monitoring[0].log_groups : null
}

# Backup Outputs
output "backup_vault_id" {
  description = "The name of the backup vault"
  value       = var.feature_flags.enable_backup ? module.backup[0].backup_vault_id : null
}

output "backup_vault_arn" {
  description = "The ARN of the backup vault"
  value       = var.feature_flags.enable_backup ? module.backup[0].backup_vault_arn : null
}

# Computed Values
output "cluster_info" {
  description = "Cluster information for kubectl configuration"
  value = var.feature_flags.enable_eks ? {
    cluster_name = module.eks[0].cluster_id
    endpoint     = module.eks[0].cluster_endpoint
    ca_data      = module.eks[0].cluster_certificate_authority_data
    region       = data.aws_region.current.name
    
    # kubectl config command
    kubectl_config_command = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${module.eks[0].cluster_id}"
  } : null
}

output "application_urls" {
  description = "Application URLs"
  value = {
    alb_url        = var.feature_flags.enable_eks ? "http://${module.alb[0].dns_name}" : null
    cloudfront_url = var.feature_flags.enable_cloudfront ? "https://${module.cloudfront[0].domain_name}" : null
    custom_domain  = var.feature_flags.enable_route53 ? "https://${local.name_prefix}.local" : null
  }
}

output "database_connection_info" {
  description = "Database connection information"
  value = var.feature_flags.enable_rds ? {
    endpoint = module.rds[0].instance_endpoint
    port     = module.rds[0].instance_port
    username = module.rds[0].instance_username
    database = module.rds[0].instance_name
    # password is not included for security reasons
  } : null
}

output "cache_connection_info" {
  description = "Cache connection information"
  value = var.feature_flags.enable_elasticache ? {
    endpoint = module.elasticache[0].cluster_address
    port     = module.elasticache[0].cluster_port
    # auth_token is not included for security reasons
  } : null
}

# Environment Information
output "environment_info" {
  description = "Environment information"
  value = {
    environment   = var.environment
    region        = data.aws_region.current.name
    account_id    = data.aws_caller_identity.current.account_id
    project_name  = var.project_name
    name_prefix   = local.name_prefix
    
    # Terraform info
    terraform_version = "~> 1.0"
    aws_provider_version = "~> 5.0"
    
    # Deployment info
    deployed_at = timestamp()
    deployed_by = "terraform"
  }
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    eks_cluster = var.feature_flags.enable_eks ? "$75" : "$0"
    rds_instance = var.feature_flags.enable_rds ? "$15" : "$0"
    elasticache = var.feature_flags.enable_elasticache ? "$15" : "$0"
    nat_gateway = var.enable_nat_gateway ? "$45" : "$0"
    cloudfront = var.feature_flags.enable_cloudfront ? "$10" : "$0"
    
    total_estimated = var.feature_flags.enable_eks && var.feature_flags.enable_rds && var.feature_flags.enable_elasticache && var.enable_nat_gateway && var.feature_flags.enable_cloudfront ? "$160" : "Variable"
    
    note = "Estimates are approximate and based on minimal usage. Actual costs may vary."
  }
}

# Outputs for CI/CD Integration
output "deployment_info" {
  description = "Information needed for CI/CD deployment"
  value = {
    cluster_name = var.feature_flags.enable_eks ? module.eks[0].cluster_id : null
    region       = data.aws_region.current.name
    account_id   = data.aws_caller_identity.current.account_id
    
    # ECR repository (if created)
    ecr_repository_url = var.feature_flags.enable_eks ? "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${local.name_prefix}" : null
    
    # Deployment namespace
    kubernetes_namespace = "labscientific-lims"
    
    # Service endpoints
    database_endpoint = var.feature_flags.enable_rds ? module.rds[0].instance_endpoint : null
    cache_endpoint    = var.feature_flags.enable_elasticache ? module.elasticache[0].cluster_address : null
  }
}