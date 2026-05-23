# K8s Helm Release Module
# Deploys applications using Helm charts

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

resource "helm_release" "this" {
  name             = var.release_name
  namespace        = var.namespace
  create_namespace = var.create_namespace

  repository = var.repository
  chart      = var.chart
  version    = var.chart_version

  values = var.values_files != null ? [for f in var.values_files : file(f)] : []

  # Dynamic set blocks for individual values
  dynamic "set" {
    for_each = var.set_values
    content {
      name  = set.key
      value = set.value
    }
  }

  # Sensitive values
  dynamic "set_sensitive" {
    for_each = var.set_sensitive_values
    content {
      name  = set_sensitive.key
      value = set_sensitive.value
    }
  }

  wait             = var.wait
  timeout          = var.timeout
  atomic           = var.atomic
  cleanup_on_fail  = var.cleanup_on_fail
  force_update     = var.force_update
  recreate_pods    = var.recreate_pods
  max_history      = var.max_history

  depends_on = var.depends_on_resources
}
