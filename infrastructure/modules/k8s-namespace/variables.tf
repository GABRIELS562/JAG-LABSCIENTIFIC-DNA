# K8s Namespace Module - Variables
# All configuration comes from Terragrunt

variable "name" {
  description = "Name of the namespace"
  type        = string
}

variable "environment" {
  description = "Environment name (test, develop, production)"
  type        = string
}

variable "labels" {
  description = "Additional labels for the namespace"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations for the namespace"
  type        = map(string)
  default     = {}
}

variable "resource_quota_enabled" {
  description = "Enable resource quota for namespace"
  type        = bool
  default     = true
}

variable "resource_quota" {
  description = "Resource quota configuration"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
  })
  default = {
    requests_cpu    = "1"
    requests_memory = "1Gi"
    limits_cpu      = "2"
    limits_memory   = "2Gi"
    pods            = "10"
  }
}

variable "network_policy_enabled" {
  description = "Enable network policy for namespace"
  type        = bool
  default     = true
}

variable "allow_external_egress" {
  description = "Allow egress to external networks"
  type        = bool
  default     = false
}

variable "allow_external_ingress" {
  description = "Allow ingress from external networks"
  type        = bool
  default     = false
}
