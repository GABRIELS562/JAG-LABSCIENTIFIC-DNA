variable "name" {
  description = "Name of the deployment"
  type        = string
}

variable "namespace" {
  description = "Namespace to deploy to"
  type        = string
}

variable "app_name" {
  description = "Application name for labels"
  type        = string
  default     = "lims"
}

variable "component" {
  description = "Component name (backend, frontend)"
  type        = string
}

variable "environment" {
  description = "Environment (test, develop, production)"
  type        = string
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 1
}

variable "image_repository" {
  description = "Container image repository"
  type        = string
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "container_name" {
  description = "Name of the container"
  type        = string
  default     = "app"
}

variable "ports" {
  description = "Container ports"
  type = list(object({
    name           = string
    container_port = number
    protocol       = optional(string)
  }))
  default = []
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "env_from_secret" {
  description = "Environment variables from secrets"
  type = map(object({
    secret_name = string
    key         = string
  }))
  default = {}
}

variable "env_from_configmap" {
  description = "Environment variables from configmaps"
  type = map(object({
    configmap_name = string
    key            = string
  }))
  default = {}
}

variable "resources" {
  description = "Resource requests and limits"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}

variable "liveness_probe" {
  description = "Liveness probe configuration"
  type = object({
    path              = string
    port              = number
    initial_delay     = number
    period            = number
    timeout           = number
    failure_threshold = number
  })
  default = null
}

variable "readiness_probe" {
  description = "Readiness probe configuration"
  type = object({
    path              = string
    port              = number
    initial_delay     = number
    period            = number
    timeout           = number
    failure_threshold = number
  })
  default = null
}

variable "volume_mounts" {
  description = "Volume mounts"
  type = list(object({
    name       = string
    mount_path = string
    read_only  = optional(bool)
  }))
  default = []
}

variable "volumes" {
  description = "Volumes"
  type = list(object({
    name = string
    config_map = optional(object({
      name = string
    }))
    secret = optional(object({
      name = string
    }))
    pvc = optional(object({
      name = string
    }))
  }))
  default = []
}

variable "labels" {
  description = "Additional labels"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Deployment annotations"
  type        = map(string)
  default     = {}
}

variable "pod_annotations" {
  description = "Pod annotations"
  type        = map(string)
  default     = {}
}

variable "strategy_type" {
  description = "Deployment strategy (RollingUpdate or Recreate)"
  type        = string
  default     = "RollingUpdate"
}

variable "max_surge" {
  description = "Max surge for rolling update"
  type        = string
  default     = "25%"
}

variable "max_unavailable" {
  description = "Max unavailable for rolling update"
  type        = string
  default     = "25%"
}

variable "image_pull_secrets" {
  description = "Image pull secrets"
  type        = list(string)
  default     = []
}

variable "wait_for_rollout" {
  description = "Wait for rollout to complete"
  type        = bool
  default     = true
}

variable "timeout" {
  description = "Timeout for create/update/delete"
  type        = string
  default     = "5m"
}

# Service variables
variable "create_service" {
  description = "Create a service for the deployment"
  type        = bool
  default     = true
}

variable "service_name" {
  description = "Service name (defaults to deployment name)"
  type        = string
  default     = null
}

variable "service_type" {
  description = "Service type (ClusterIP, NodePort, LoadBalancer)"
  type        = string
  default     = "ClusterIP"
}

variable "service_ports" {
  description = "Service ports"
  type = list(object({
    name        = string
    port        = number
    target_port = number
    protocol    = optional(string)
    node_port   = optional(number)
  }))
  default = []
}
