# External Secrets Operator - Terragrunt Configuration

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/helm-release"
}

dependency "k3s" {
  config_path = "../"

  mock_outputs = {
    kubeconfig_path = "~/.kube/config"
  }
}

inputs = {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  chart_version    = "0.9.9"
  namespace        = "external-secrets"
  create_namespace = true
  kubeconfig_path  = dependency.k3s.outputs.kubeconfig_path

  values = {
    installCRDs = true
  }
}
