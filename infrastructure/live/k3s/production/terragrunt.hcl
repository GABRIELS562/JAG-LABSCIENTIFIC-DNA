# Production Environment - Terragrunt Configuration
# ALL CHANGES GO HERE - DO NOT MODIFY TERRAFORM MODULES

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/k8s-helm-release"
}

locals {
  environment = "production"

  # Production environment specific settings
  config = {
    release_name = "lims"
    namespace    = "production"

    # Image settings
    backend_image_tag  = "latest"
    frontend_image_tag = "latest"

    # Resource settings (full for production)
    backend_replicas  = 2
    frontend_replicas = 2

    # NodePort settings
    backend_nodeport  = 30007
    frontend_nodeport = 30005

    # Ingress
    ingress_enabled = true
    ingress_host    = "lims.jagdevops.co.za"
    tls_enabled     = true

    # Features
    enable_autoscaling      = true
    enable_pdb              = true
    enable_service_monitor  = true
    fallback_to_mock_data   = "false"
  }
}

inputs = {
  release_name     = local.config.release_name
  namespace        = local.config.namespace
  create_namespace = true

  chart = "${get_terragrunt_dir()}/../../../../helm/lims"

  values_files = [
    "${get_terragrunt_dir()}/../../../../helm/lims/values-production.yaml"
  ]

  set_values = {
    "backend.image.tag"                = local.config.backend_image_tag
    "frontend.image.tag"               = local.config.frontend_image_tag
    "backend.replicaCount"             = tostring(local.config.backend_replicas)
    "frontend.replicaCount"            = tostring(local.config.frontend_replicas)
    "backend.service.nodePort"         = tostring(local.config.backend_nodeport)
    "frontend.service.nodePort"        = tostring(local.config.frontend_nodeport)
    "ingress.enabled"                  = tostring(local.config.ingress_enabled)
    "ingress.hosts[0].host"            = local.config.ingress_host
    "autoscaling.enabled"              = tostring(local.config.enable_autoscaling)
    "podDisruptionBudget.enabled"      = tostring(local.config.enable_pdb)
    "serviceMonitor.enabled"           = tostring(local.config.enable_service_monitor)
    "config.fallbackToMockData"        = local.config.fallback_to_mock_data
  }

  # Sensitive values - use environment variables or secrets manager
  set_sensitive_values = {
    "postgresql.auth.password"         = get_env("TF_VAR_db_password", "change_me")
    "postgresql.auth.postgresPassword" = get_env("TF_VAR_db_admin_password", "change_me")
  }

  wait    = true
  timeout = 600
  atomic  = true
}
