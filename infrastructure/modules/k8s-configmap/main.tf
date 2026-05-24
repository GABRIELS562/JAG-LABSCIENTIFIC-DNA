# K8s ConfigMap Module
# Creates ConfigMaps for application configuration

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

resource "kubernetes_config_map" "this" {
  metadata {
    name      = var.name
    namespace = var.namespace

    labels = merge(
      {
        "app.kubernetes.io/name"      = var.app_name
        "app.kubernetes.io/component" = "config"
        "environment"                 = var.environment
      },
      var.labels
    )

    annotations = var.annotations
  }

  data        = var.data
  binary_data = var.binary_data
}
