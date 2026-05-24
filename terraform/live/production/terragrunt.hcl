# Production Environment - Terragrunt Configuration

# Include the root terragrunt.hcl configuration
include "root" {
  path = find_in_parent_folders()
}

# Include the k3s-cluster module
terraform {
  source = "../../modules/k3s-cluster"
}

# Dependencies - ensure these are applied first
dependencies {
  paths = []
}

# Environment-specific inputs
inputs = {
  environment = "production"

  # K3s Configuration
  server_ip    = "100.89.26.128"
  tailscale_ip = "100.89.26.128"
  k3s_version  = "v1.28.4+k3s1"

  # SSH Configuration
  ssh_user     = "ubuntu"
  ssh_key_path = "~/.ssh/id_rsa"

  # Namespaces to create
  namespaces = [
    "production",
    "develop",
    "test",
    "monitoring",
    "argocd",
    "external-secrets"
  ]

  # Features
  install_registry = true
  generate_ssh_key = false

  # Component versions
  nginx_ingress_version = "1.9.4"
}
