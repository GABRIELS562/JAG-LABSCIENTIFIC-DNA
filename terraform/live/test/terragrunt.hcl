# Test Environment - Terragrunt Configuration
# Ephemeral test environment for feature branches

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/k3s-cluster"
}

dependency "production" {
  config_path = "../production"

  mock_outputs = {
    kubeconfig_path = "~/.kube/config"
  }

  skip_outputs = true
}

inputs = {
  environment = "test"

  server_ip    = "100.89.26.128"
  tailscale_ip = "100.89.26.128"
  k3s_version  = "v1.28.4+k3s1"

  ssh_user     = "ubuntu"
  ssh_key_path = "~/.ssh/id_rsa"

  # Test namespace only
  namespaces = ["test"]

  install_registry = false
  generate_ssh_key = false

  nginx_ingress_version = "1.9.4"
}
