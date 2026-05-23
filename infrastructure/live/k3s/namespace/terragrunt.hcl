# Namespace Configuration - Terragrunt
# Creates all LIMS namespaces (test, develop, production)

include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/k8s-namespace"
}

# This will be run multiple times with different inputs
# Use: terragrunt run-all apply

locals {
  # Namespace configurations - ALL SETTINGS HERE
  namespaces = {
    test = {
      name        = "test"
      environment = "test"
      resource_quota = {
        requests_cpu    = "500m"
        requests_memory = "512Mi"
        limits_cpu      = "1"
        limits_memory   = "1Gi"
        pods            = "10"
      }
      allow_external_egress  = true
      allow_external_ingress = false
    }
    develop = {
      name        = "develop"
      environment = "develop"
      resource_quota = {
        requests_cpu    = "1"
        requests_memory = "1Gi"
        limits_cpu      = "2"
        limits_memory   = "2Gi"
        pods            = "15"
      }
      allow_external_egress  = true
      allow_external_ingress = false
    }
    production = {
      name        = "production"
      environment = "production"
      resource_quota = {
        requests_cpu    = "2"
        requests_memory = "2Gi"
        limits_cpu      = "4"
        limits_memory   = "4Gi"
        pods            = "20"
      }
      allow_external_egress  = true
      allow_external_ingress = true
    }
  }
}

# Default to test - override via TF_VAR_namespace_name
inputs = {
  name                   = "test"
  environment            = "test"
  resource_quota_enabled = true
  resource_quota = {
    requests_cpu    = "500m"
    requests_memory = "512Mi"
    limits_cpu      = "1"
    limits_memory   = "1Gi"
    pods            = "10"
  }
  network_policy_enabled = true
  allow_external_egress  = true
  allow_external_ingress = false
}
