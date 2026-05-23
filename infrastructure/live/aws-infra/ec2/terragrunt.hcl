# AWS EC2 (k3s Server) - Terragrunt Configuration
# ALL CHANGES GO HERE - DO NOT MODIFY TERRAFORM MODULES

include "root" {
  path = find_in_parent_folders()
}

# Depends on VPC being created first
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id            = "vpc-mock123"
    public_subnet_ids = ["subnet-mock123"]
  }
}

terraform {
  source = "../../../modules/aws-ec2"
}

locals {
  # EC2 Configuration - CHANGE THESE VALUES AS NEEDED
  config = {
    name          = "lims-k3s-server"
    instance_type = "t3.large"    # 2 vCPU, 8GB RAM - good for k3s

    # Storage
    root_volume_size = 100  # GB
    root_volume_type = "gp3"

    # Networking
    create_elastic_ip   = true
    associate_public_ip = true

    # k3s Installation
    install_k3s = true
    domain      = "jagdevops.co.za"

    # SSH Key
    key_name        = "lims-server-key"
    create_key_pair = false  # Set true if creating new key
    # public_key    = "ssh-rsa AAAA..."  # Uncomment if creating key
  }

  # Security Group Rules
  ingress_rules = [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]  # Restrict in production!
      description = "SSH"
    },
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    },
    {
      from_port   = 6443
      to_port     = 6443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Kubernetes API"
    },
    {
      from_port   = 30000
      to_port     = 32767
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "NodePort Services"
    }
  ]
}

inputs = {
  name              = local.config.name
  instance_type     = local.config.instance_type
  subnet_id         = dependency.vpc.outputs.public_subnet_ids[0]
  security_group_ids = []  # Will be created separately

  root_volume_size    = local.config.root_volume_size
  root_volume_type    = local.config.root_volume_type
  create_elastic_ip   = local.config.create_elastic_ip
  associate_public_ip = local.config.associate_public_ip

  install_k3s = local.config.install_k3s
  domain      = local.config.domain

  key_name        = local.config.key_name
  create_key_pair = local.config.create_key_pair

  tags = {
    Environment = "production"
    Application = "LIMS"
    Role        = "k3s-server"
  }
}
