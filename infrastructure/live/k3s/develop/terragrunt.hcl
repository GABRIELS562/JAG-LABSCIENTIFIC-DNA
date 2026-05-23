# Develop Environment - Terragrunt Configuration
# ALL CHANGES GO HERE - DO NOT MODIFY TERRAFORM MODULES

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/k8s-helm-release"
}

locals {
  environment = "develop"

  # Develop environment specific settings
  config = {
    release_name = "lims-develop"
    namespace    = "develop"

    # Image settings
    backend_image_tag  = "develop-latest"
    frontend_image_tag = "develop-latest"

    # Resource settings (moderate for develop)
    backend_replicas  = 1
    frontend_replicas = 1

    # NodePort settings
    backend_nodeport  = 30201
    frontend_nodeport = 30202

    # Feature flags
    enable_mock_samples     = "true"
    sample_cycle_interval   = "30000"
    enable_service_monitor  = true
  }
}

inputs = {
  release_name     = local.config.release_name
  namespace        = local.config.namespace
  create_namespace = true

  chart = "${get_terragrunt_dir()}/../../../../helm/lims"

  values_files = [
    "${get_terragrunt_dir()}/../../../../helm/lims/values-develop.yaml"
  ]

  set_values = {
    "backend.image.tag"           = local.config.backend_image_tag
    "frontend.image.tag"          = local.config.frontend_image_tag
    "backend.replicaCount"        = tostring(local.config.backend_replicas)
    "frontend.replicaCount"       = tostring(local.config.frontend_replicas)
    "backend.service.nodePort"    = tostring(local.config.backend_nodeport)
    "frontend.service.nodePort"   = tostring(local.config.frontend_nodeport)
    "serviceMonitor.enabled"      = tostring(local.config.enable_service_monitor)
  }

  wait    = true
  timeout = 300
  atomic  = true
}
