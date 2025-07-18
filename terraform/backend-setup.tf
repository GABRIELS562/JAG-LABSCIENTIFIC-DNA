# Terraform Backend Setup - State Management Infrastructure
# This file creates the necessary S3 buckets and DynamoDB tables for Terraform state management
# Run this separately before the main infrastructure

# S3 Bucket for Dev Environment State
resource "aws_s3_bucket" "terraform_state_dev" {
  bucket = "lims-terraform-state-dev-${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "lims-terraform-state-dev"
    Environment = "dev"
    Purpose     = "Terraform State Storage"
    ManagedBy   = "Terraform"
  }
}

# S3 Bucket for Staging Environment State
resource "aws_s3_bucket" "terraform_state_staging" {
  bucket = "lims-terraform-state-staging-${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "lims-terraform-state-staging"
    Environment = "staging"
    Purpose     = "Terraform State Storage"
    ManagedBy   = "Terraform"
  }
}

# S3 Bucket for Prod Environment State
resource "aws_s3_bucket" "terraform_state_prod" {
  bucket = "lims-terraform-state-prod-${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "lims-terraform-state-prod"
    Environment = "prod"
    Purpose     = "Terraform State Storage"
    ManagedBy   = "Terraform"
  }
}

# Random string for unique bucket naming
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Enable versioning for all state buckets
resource "aws_s3_bucket_versioning" "terraform_state_dev" {
  bucket = aws_s3_bucket.terraform_state_dev.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state_staging" {
  bucket = aws_s3_bucket.terraform_state_staging.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state_prod" {
  bucket = aws_s3_bucket.terraform_state_prod.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption for all state buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_dev" {
  bucket = aws_s3_bucket.terraform_state_dev.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_staging" {
  bucket = aws_s3_bucket.terraform_state_staging.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state_prod" {
  bucket = aws_s3_bucket.terraform_state_prod.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Block public access for all state buckets
resource "aws_s3_bucket_public_access_block" "terraform_state_dev" {
  bucket = aws_s3_bucket.terraform_state_dev.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "terraform_state_staging" {
  bucket = aws_s3_bucket.terraform_state_staging.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "terraform_state_prod" {
  bucket = aws_s3_bucket.terraform_state_prod.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle configuration for state buckets
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state_dev" {
  bucket = aws_s3_bucket.terraform_state_dev.id
  
  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"
    
    # Keep non-current versions for 30 days
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    
    # Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state_staging" {
  bucket = aws_s3_bucket.terraform_state_staging.id
  
  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"
    
    # Keep non-current versions for 60 days
    noncurrent_version_expiration {
      noncurrent_days = 60
    }
    
    # Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state_prod" {
  bucket = aws_s3_bucket.terraform_state_prod.id
  
  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"
    
    # Keep non-current versions for 90 days
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
    
    # Abort incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# DynamoDB Table for Dev Environment State Locking
resource "aws_dynamodb_table" "terraform_state_lock_dev" {
  name         = "lims-terraform-state-lock-dev"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = {
    Name        = "lims-terraform-state-lock-dev"
    Environment = "dev"
    Purpose     = "Terraform State Locking"
    ManagedBy   = "Terraform"
  }
}

# DynamoDB Table for Staging Environment State Locking
resource "aws_dynamodb_table" "terraform_state_lock_staging" {
  name         = "lims-terraform-state-lock-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = {
    Name        = "lims-terraform-state-lock-staging"
    Environment = "staging"
    Purpose     = "Terraform State Locking"
    ManagedBy   = "Terraform"
  }
}

# DynamoDB Table for Prod Environment State Locking
resource "aws_dynamodb_table" "terraform_state_lock_prod" {
  name         = "lims-terraform-state-lock-prod"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  tags = {
    Name        = "lims-terraform-state-lock-prod"
    Environment = "prod"
    Purpose     = "Terraform State Locking"
    ManagedBy   = "Terraform"
  }
}

# Output the bucket names for use in backend configuration
output "terraform_state_bucket_dev" {
  description = "S3 bucket name for dev environment state"
  value       = aws_s3_bucket.terraform_state_dev.id
}

output "terraform_state_bucket_staging" {
  description = "S3 bucket name for staging environment state"
  value       = aws_s3_bucket.terraform_state_staging.id
}

output "terraform_state_bucket_prod" {
  description = "S3 bucket name for prod environment state"
  value       = aws_s3_bucket.terraform_state_prod.id
}

output "dynamodb_table_dev" {
  description = "DynamoDB table name for dev environment state locking"
  value       = aws_dynamodb_table.terraform_state_lock_dev.name
}

output "dynamodb_table_staging" {
  description = "DynamoDB table name for staging environment state locking"
  value       = aws_dynamodb_table.terraform_state_lock_staging.name
}

output "dynamodb_table_prod" {
  description = "DynamoDB table name for prod environment state locking"
  value       = aws_dynamodb_table.terraform_state_lock_prod.name
}

# Backend setup instructions
output "backend_setup_instructions" {
  description = "Instructions for setting up the backend configuration"
  value = <<-EOT
    Backend Setup Complete!
    
    1. Update your backend configuration files with the following bucket names:
       - Dev: ${aws_s3_bucket.terraform_state_dev.id}
       - Staging: ${aws_s3_bucket.terraform_state_staging.id}
       - Prod: ${aws_s3_bucket.terraform_state_prod.id}
    
    2. Update your DynamoDB table names:
       - Dev: ${aws_dynamodb_table.terraform_state_lock_dev.name}
       - Staging: ${aws_dynamodb_table.terraform_state_lock_staging.name}
       - Prod: ${aws_dynamodb_table.terraform_state_lock_prod.name}
    
    3. Run terraform init to initialize the backend
    4. Run terraform plan to verify the configuration
    5. Run terraform apply to create your infrastructure
  EOT
}