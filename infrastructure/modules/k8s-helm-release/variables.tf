# K8s Helm Release Module - Variables

variable "release_name" {
  description = "Name of the Helm release"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace to deploy into"
  type        = string
}

variable "create_namespace" {
  description = "Create namespace if it doesn't exist"
  type        = bool
  default     = false
}

variable "repository" {
  description = "Helm chart repository URL (null for local charts)"
  type        = string
  default     = null
}

variable "chart" {
  description = "Helm chart name or path"
  type        = string
}

variable "chart_version" {
  description = "Helm chart version"
  type        = string
  default     = null
}

variable "values_files" {
  description = "List of values file paths"
  type        = list(string)
  default     = null
}

variable "set_values" {
  description = "Map of values to set via --set"
  type        = map(string)
  default     = {}
}

variable "set_sensitive_values" {
  description = "Map of sensitive values to set"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "wait" {
  description = "Wait for resources to be ready"
  type        = bool
  default     = true
}

variable "timeout" {
  description = "Timeout in seconds for Helm operations"
  type        = number
  default     = 300
}

variable "atomic" {
  description = "Rollback on failure"
  type        = bool
  default     = true
}

variable "cleanup_on_fail" {
  description = "Cleanup resources on failed install"
  type        = bool
  default     = true
}

variable "force_update" {
  description = "Force resource update"
  type        = bool
  default     = false
}

variable "recreate_pods" {
  description = "Recreate pods on upgrade"
  type        = bool
  default     = false
}

variable "max_history" {
  description = "Maximum release history to keep"
  type        = number
  default     = 5
}

variable "depends_on_resources" {
  description = "Resources this release depends on"
  type        = list(any)
  default     = []
}
