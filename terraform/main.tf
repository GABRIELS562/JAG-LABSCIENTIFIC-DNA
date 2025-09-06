resource "kubernetes_namespace" "lims" {
  metadata {
    name = var.namespace
    
    labels = {
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_deployment" "lims_backend" {
  metadata {
    name      = "${var.app_name}-backend"
    namespace = kubernetes_namespace.lims.metadata[0].name
    
    labels = {
      app         = var.app_name
      component   = "backend"
      environment = var.environment
    }
  }
  
  spec {
    replicas = var.replicas
    
    selector {
      match_labels = {
        app       = var.app_name
        component = "backend"
      }
    }
    
    template {
      metadata {
        labels = {
          app       = var.app_name
          component = "backend"
        }
      }
      
      spec {
        container {
          image = "${var.image_repository}:${var.image_tag}"
          name  = "lims-backend"
          
          port {
            container_port = 3001
            name          = "http"
          }
          
          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }
          
          liveness_probe {
            http_get {
              path = "/health/live"
              port = "http"
            }
            initial_delay_seconds = 30
            period_seconds       = 10
          }
          
          readiness_probe {
            http_get {
              path = "/health/ready"
              port = "http"
            }
            initial_delay_seconds = 10
            period_seconds       = 5
          }
        }
      }
    }
  }
}