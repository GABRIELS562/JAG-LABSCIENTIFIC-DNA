# AWS VPC - Terragrunt Configuration
# ALL CHANGES GO HERE - DO NOT MODIFY TERRAFORM MODULES

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/aws-vpc"
}

locals {
  # VPC Configuration - CHANGE THESE VALUES AS NEEDED
  config = {
    name                 = "lims"
    vpc_cidr             = "10.0.0.0/16"
    public_subnet_count  = 2
    private_subnet_count = 2
    enable_nat_gateway   = false  # Set to true if private subnets need internet
  }
}

inputs = {
  name                 = local.config.name
  vpc_cidr             = local.config.vpc_cidr
  public_subnet_count  = local.config.public_subnet_count
  private_subnet_count = local.config.private_subnet_count
  enable_nat_gateway   = local.config.enable_nat_gateway

  tags = {
    Environment = "production"
    Application = "LIMS"
  }
}
