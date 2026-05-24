# ArgoCD Installation - Terragrunt Configuration

include "root" {
  path = find_in_parent_folders()
}

# Use Helm to install ArgoCD
terraform {
  source = "../../../modules/helm-release"
}

# Depends on k3s cluster being ready
dependency "k3s" {
  config_path = "../"

  mock_outputs = {
    kubeconfig_path = "~/.kube/config"
  }
}

inputs = {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  chart_version    = "5.51.4"
  namespace        = "argocd"
  create_namespace = true
  kubeconfig_path  = dependency.k3s.outputs.kubeconfig_path

  values = {
    server = {
      service = {
        type         = "NodePort"
        nodePortHttp = 30338
      }
      extraArgs = ["--insecure"]
    }
    configs = {
      params = {
        "server.insecure" = true
      }
    }
  }
}
