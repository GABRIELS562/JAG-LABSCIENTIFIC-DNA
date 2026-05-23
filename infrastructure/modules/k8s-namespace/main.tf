# K8s Namespace Module
# Creates namespace with optional resource quotas and network policies

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

resource "kubernetes_namespace" "this" {
  metadata {
    name = var.name

    labels = merge(
      {
        "app.kubernetes.io/name"       = "lims"
        "app.kubernetes.io/component"  = "${var.name}-environment"
        "environment"                  = var.environment
      },
      var.labels
    )

    annotations = var.annotations
  }
}

resource "kubernetes_resource_quota" "this" {
  count = var.resource_quota_enabled ? 1 : 0

  metadata {
    name      = "${var.name}-quota"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = var.resource_quota.requests_cpu
      "requests.memory" = var.resource_quota.requests_memory
      "limits.cpu"      = var.resource_quota.limits_cpu
      "limits.memory"   = var.resource_quota.limits_memory
      "pods"            = var.resource_quota.pods
    }
  }
}

resource "kubernetes_network_policy" "allow_same_namespace" {
  count = var.network_policy_enabled ? 1 : 0

  metadata {
    name      = "allow-same-namespace"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}

    policy_types = ["Ingress", "Egress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = var.name
          }
        }
      }
    }

    egress {
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = var.name
          }
        }
      }
    }

    # Allow DNS
    egress {
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }
      }
      ports {
        protocol = "UDP"
        port     = "53"
      }
    }

    # Allow external egress if enabled
    dynamic "egress" {
      for_each = var.allow_external_egress ? [1] : []
      content {
        to {}
      }
    }

    # Allow external ingress if enabled (production)
    dynamic "ingress" {
      for_each = var.allow_external_ingress ? [1] : []
      content {
        from {}
        ports {
          protocol = "TCP"
          port     = "80"
        }
        ports {
          protocol = "TCP"
          port     = "3001"
        }
      }
    }
  }
}
