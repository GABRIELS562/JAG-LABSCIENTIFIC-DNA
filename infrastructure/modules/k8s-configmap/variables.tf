variable "name" {
  description = "Name of the ConfigMap"
  type        = string
}

variable "namespace" {
  description = "Namespace to create the ConfigMap in"
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

variable "data" {
  description = "Map of key-value pairs for ConfigMap data"
  type        = map(string)
  default     = {}
}

variable "binary_data" {
  description = "Map of binary data for ConfigMap"
  type        = map(string)
  default     = {}
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
