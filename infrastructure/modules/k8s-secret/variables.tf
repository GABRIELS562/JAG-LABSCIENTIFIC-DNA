variable "name" {
  description = "Name of the Secret"
  type        = string
}

variable "namespace" {
  description = "Namespace to create the Secret in"
  type        = string
}

variable "app_name" {
  description = "Application name for labeling"
  type        = string
  default     = "lims"
}

variable "environment" {
  description = "Environment (test, develop, production)"
  type        = string
}

variable "type" {
  description = "Type of secret (Opaque, kubernetes.io/tls, etc)"
  type        = string
  default     = "Opaque"
}

variable "data" {
  description = "Map of key-value pairs for Secret data (will be base64 encoded)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "binary_data" {
  description = "Map of binary data for Secret (already base64 encoded)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "labels" {
  description = "Additional labels"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations"
  type        = map(string)
  default     = {}
}
