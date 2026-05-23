# Test Environment - Terragrunt Configuration
# ALL CHANGES GO HERE - DO NOT MODIFY TERRAFORM MODULES

include "root" {
  path = find_in_parent_folders()
}

# Deploy namespace first, then helm release
dependency "namespace" {
  config_path  = "../namespace"
  skip_outputs = true

  mock_outputs = {
    name = "test"
  }
}

terraform {
  source = "../../../modules/k8s-helm-release"
}

locals {
  environment = "test"

  # Test environment specific settings
  config = {
    release_name = "lims-test"
    namespace    = "test"

    # Image settings
    backend_image_tag  = "test-latest"
    frontend_image_tag = "test-latest"

    # Resource settings (minimal for test)
    backend_replicas  = 1
    frontend_replicas = 1

    # NodePort settings
    backend_nodeport  = 30101
    frontend_nodeport = 30102

    # Feature flags
    enable_mock_samples     = "true"
    sample_cycle_interval   = "15000"
    enable_service_monitor  = true
  }
}

inputs = {
  release_name     = local.config.release_name
  namespace        = local.config.namespace
  create_namespace = false  # Created by namespace module

  chart = "${get_terragrunt_dir()}/../../../../helm/lims"

  values_files = [
    "${get_terragrunt_dir()}/../../../../helm/lims/values-test.yaml"
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
