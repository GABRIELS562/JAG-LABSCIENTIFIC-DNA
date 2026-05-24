# K8s Secret Module
# Creates Kubernetes Secrets for sensitive data

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

resource "kubernetes_secret" "this" {
  metadata {
    name      = var.name
    namespace = var.namespace

    labels = merge(
      {
        "app.kubernetes.io/name"      = var.app_name
        "app.kubernetes.io/component" = "secret"
        "environment"                 = var.environment
      },
      var.labels
    )

    annotations = var.annotations
  }

  type = var.type

  data        = var.data
  binary_data = var.binary_data
}
