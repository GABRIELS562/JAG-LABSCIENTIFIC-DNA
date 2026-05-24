# K8s Deployment Module
# Creates Kubernetes Deployments for applications

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

resource "kubernetes_deployment" "this" {
  metadata {
    name      = var.name
    namespace = var.namespace

    labels = merge(
      {
        "app.kubernetes.io/name"      = var.app_name
        "app.kubernetes.io/component" = var.component
        "app.kubernetes.io/version"   = var.image_tag
        "environment"                 = var.environment
      },
      var.labels
    )

    annotations = var.annotations
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        "app.kubernetes.io/name"      = var.app_name
        "app.kubernetes.io/component" = var.component
      }
    }

    strategy {
      type = var.strategy_type

      dynamic "rolling_update" {
        for_each = var.strategy_type == "RollingUpdate" ? [1] : []
        content {
          max_surge       = var.max_surge
          max_unavailable = var.max_unavailable
        }
      }
    }

    template {
      metadata {
        labels = merge(
          {
            "app.kubernetes.io/name"      = var.app_name
            "app.kubernetes.io/component" = var.component
            "app.kubernetes.io/version"   = var.image_tag
            "environment"                 = var.environment
          },
          var.labels
        )

        annotations = var.pod_annotations
      }

      spec {
        container {
          name  = var.container_name
          image = "${var.image_repository}:${var.image_tag}"

          dynamic "port" {
            for_each = var.ports
            content {
              name           = port.value.name
              container_port = port.value.container_port
              protocol       = lookup(port.value, "protocol", "TCP")
            }
          }

          dynamic "env" {
            for_each = var.env_vars
            content {
              name  = env.key
              value = env.value
            }
          }

          dynamic "env" {
            for_each = var.env_from_secret
            content {
              name = env.key
              value_from {
                secret_key_ref {
                  name = env.value.secret_name
                  key  = env.value.key
                }
              }
            }
          }

          dynamic "env" {
            for_each = var.env_from_configmap
            content {
              name = env.key
              value_from {
                config_map_key_ref {
                  name = env.value.configmap_name
                  key  = env.value.key
                }
              }
            }
          }

          resources {
            requests = {
              cpu    = var.resources.requests.cpu
              memory = var.resources.requests.memory
            }
            limits = {
              cpu    = var.resources.limits.cpu
              memory = var.resources.limits.memory
            }
          }

          dynamic "liveness_probe" {
            for_each = var.liveness_probe != null ? [1] : []
            content {
              http_get {
                path = var.liveness_probe.path
                port = var.liveness_probe.port
              }
              initial_delay_seconds = var.liveness_probe.initial_delay
              period_seconds        = var.liveness_probe.period
              timeout_seconds       = var.liveness_probe.timeout
              failure_threshold     = var.liveness_probe.failure_threshold
            }
          }

          dynamic "readiness_probe" {
            for_each = var.readiness_probe != null ? [1] : []
            content {
              http_get {
                path = var.readiness_probe.path
                port = var.readiness_probe.port
              }
              initial_delay_seconds = var.readiness_probe.initial_delay
              period_seconds        = var.readiness_probe.period
              timeout_seconds       = var.readiness_probe.timeout
              failure_threshold     = var.readiness_probe.failure_threshold
            }
          }

          dynamic "volume_mount" {
            for_each = var.volume_mounts
            content {
              name       = volume_mount.value.name
              mount_path = volume_mount.value.mount_path
              read_only  = lookup(volume_mount.value, "read_only", false)
            }
          }
        }

        dynamic "volume" {
          for_each = var.volumes
          content {
            name = volume.value.name

            dynamic "config_map" {
              for_each = lookup(volume.value, "config_map", null) != null ? [1] : []
              content {
                name = volume.value.config_map.name
              }
            }

            dynamic "secret" {
              for_each = lookup(volume.value, "secret", null) != null ? [1] : []
              content {
                secret_name = volume.value.secret.name
              }
            }

            dynamic "persistent_volume_claim" {
              for_each = lookup(volume.value, "pvc", null) != null ? [1] : []
              content {
                claim_name = volume.value.pvc.name
              }
            }
          }
        }

        restart_policy = "Always"

        dynamic "image_pull_secrets" {
          for_each = var.image_pull_secrets
          content {
            name = image_pull_secrets.value
          }
        }
      }
    }
  }

  wait_for_rollout = var.wait_for_rollout

  timeouts {
    create = var.timeout
    update = var.timeout
    delete = var.timeout
  }
}

# Optional Service
resource "kubernetes_service" "this" {
  count = var.create_service ? 1 : 0

  metadata {
    name      = var.service_name != null ? var.service_name : var.name
    namespace = var.namespace

    labels = merge(
      {
        "app.kubernetes.io/name"      = var.app_name
        "app.kubernetes.io/component" = var.component
      },
      var.labels
    )
  }

  spec {
    type = var.service_type

    selector = {
      "app.kubernetes.io/name"      = var.app_name
      "app.kubernetes.io/component" = var.component
    }

    dynamic "port" {
      for_each = var.service_ports
      content {
        name        = port.value.name
        port        = port.value.port
        target_port = port.value.target_port
        protocol    = lookup(port.value, "protocol", "TCP")
        node_port   = var.service_type == "NodePort" ? lookup(port.value, "node_port", null) : null
      }
    }
  }
}
