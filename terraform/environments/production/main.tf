# Production Environment - Terraform Configuration
# JAG LabScientific LIMS Infrastructure

terraform {
  required_version = ">= 1.0.0"

  # Backend configuration for state storage
  # Uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "jag-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "af-south-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

# Local variables
locals {
  environment = "production"
  project     = "lims"

  common_labels = {
    "app.kubernetes.io/managed-by" = "terraform"
    "app.kubernetes.io/part-of"    = local.project
    "environment"                   = local.environment
  }

  # Server configuration
  server1_ip    = "100.89.26.128"  # Tailscale IP
  server2_ip    = "100.103.13.92"  # Monitoring server
}

# K3s Cluster Module
module "k3s_cluster" {
  source = "../../modules/k3s-cluster"

  server_ip        = local.server1_ip
  tailscale_ip     = local.server1_ip
  ssh_user         = var.ssh_user
  ssh_private_key  = var.ssh_private_key
  ssh_key_path     = var.ssh_key_path
  k3s_version      = var.k3s_version
  environment      = local.environment
  install_registry = true

  namespaces = [
    "production",
    "develop",
    "test",
    "monitoring",
    "argocd",
    "external-secrets"
  ]
}

# Kubernetes provider configuration
provider "kubernetes" {
  config_path = module.k3s_cluster.kubeconfig_path
}

# Helm provider configuration
provider "helm" {
  kubernetes {
    config_path = module.k3s_cluster.kubeconfig_path
  }
}

# Install ArgoCD via Helm
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_version
  namespace        = "argocd"
  create_namespace = true

  values = [
    <<-EOT
    server:
      service:
        type: NodePort
        nodePortHttp: 30338
      extraArgs:
        - --insecure
    configs:
      params:
        server.insecure: true
    EOT
  ]

  set {
    name  = "global.image.tag"
    value = "v2.9.3"
  }
}

# Install External Secrets Operator
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = var.external_secrets_version
  namespace        = "external-secrets"
  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

# Install Prometheus Stack (for monitoring)
resource "helm_release" "prometheus" {
  count = var.install_monitoring ? 1 : 0

  name             = "prometheus"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.prometheus_version
  namespace        = "monitoring"
  create_namespace = true

  values = [
    <<-EOT
    grafana:
      enabled: true
      service:
        type: NodePort
        nodePort: 30300
      adminPassword: ${var.grafana_admin_password}
    prometheus:
      service:
        type: NodePort
        nodePort: 30090
    alertmanager:
      service:
        type: NodePort
        nodePort: 30093
    EOT
  ]
}

# Apply Network Policies
resource "null_resource" "network_policies" {
  depends_on = [module.k3s_cluster]

  provisioner "local-exec" {
    command = "kubectl apply -k ${path.module}/../../../k8s/network-policies/ --kubeconfig=${module.k3s_cluster.kubeconfig_path}"
  }
}

# Apply Backup CronJob
resource "null_resource" "backup_cronjob" {
  depends_on = [module.k3s_cluster]

  provisioner "local-exec" {
    command = "kubectl apply -k ${path.module}/../../../k8s/backup/ --kubeconfig=${module.k3s_cluster.kubeconfig_path}"
  }
}
