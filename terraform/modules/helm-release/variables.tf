# Helm Release Module Variables

variable "name" {
  description = "Release name"
  type        = string
}

variable "repository" {
  description = "Helm repository URL"
  type        = string
}

variable "chart" {
  description = "Chart name"
  type        = string
}

variable "chart_version" {
  description = "Chart version"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
}

variable "create_namespace" {
  description = "Create namespace if it doesn't exist"
  type        = bool
  default     = true
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 300
}

variable "wait" {
  description = "Wait for resources to be ready"
  type        = bool
  default     = true
}

variable "atomic" {
  description = "Rollback on failure"
  type        = bool
  default     = true
}

variable "cleanup_on_fail" {
  description = "Delete new resources on failure"
  type        = bool
  default     = true
}

variable "set_values" {
  description = "List of set values"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "values_yaml" {
  description = "YAML values for the chart"
  type        = string
  default     = ""
}

variable "values" {
  description = "Values map (will be converted to YAML)"
  type        = any
  default     = {}
}
