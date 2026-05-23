# AWS EC2 Module
# Creates EC2 instance with k3s installation support

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "this" {
  count = var.create_key_pair ? 1 : 0

  key_name   = var.key_name
  public_key = var.public_key

  tags = var.tags
}

resource "aws_instance" "this" {
  ami           = var.ami_id != null ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = var.security_group_ids
  associate_public_ip_address = var.associate_public_ip
  key_name                    = var.create_key_pair ? aws_key_pair.this[0].key_name : var.key_name

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    delete_on_termination = true
    encrypted             = true
  }

  user_data = var.install_k3s ? base64encode(local.k3s_install_script) : var.user_data

  tags = merge(var.tags, {
    Name = var.name
  })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "this" {
  count = var.create_elastic_ip ? 1 : 0

  instance = aws_instance.this.id
  domain   = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name}-eip"
  })
}

locals {
  k3s_install_script = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    apt-get update && apt-get upgrade -y

    # Install dependencies
    apt-get install -y curl wget git apt-transport-https ca-certificates

    # Install k3s
    curl -sfL https://get.k3s.io | sh -s - \
      --write-kubeconfig-mode 644 \
      --disable traefik \
      --tls-san ${var.name}.${var.domain}

    # Wait for k3s to be ready
    sleep 30
    kubectl wait --for=condition=Ready nodes --all --timeout=300s

    # Install Helm
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    # Install Docker for local registry
    curl -fsSL https://get.docker.com | bash
    usermod -aG docker ubuntu

    # Start local registry
    docker run -d -p 5000:5000 --restart=always --name registry registry:2

    echo "k3s installation complete!"
  EOF
}
