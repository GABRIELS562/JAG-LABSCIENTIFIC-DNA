# Develop Environment - Terragrunt Configuration
# This environment shares the same K3s cluster as production
# but uses different namespace and resource configurations

include "root" {
  path = find_in_parent_folders()
}

# Reference the same cluster module for consistency
terraform {
  source = "../../modules/k3s-cluster"
}

# Depends on production cluster
dependency "production" {
  config_path = "../production"

  mock_outputs = {
    kubeconfig_path = "~/.kube/config"
  }

  skip_outputs = true
}

inputs = {
  environment = "develop"

  # Use same server as production (shared cluster)
  server_ip    = "100.89.26.128"
  tailscale_ip = "100.89.26.128"
  k3s_version  = "v1.28.4+k3s1"

  ssh_user     = "ubuntu"
  ssh_key_path = "~/.ssh/id_rsa"

  # Develop namespace only (others created by production)
  namespaces = ["develop"]

  # Don't reinstall registry (already installed by production)
  install_registry = false
  generate_ssh_key = false

  nginx_ingress_version = "1.9.4"
}
