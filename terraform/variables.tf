variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "jagdna-lims"
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 3
}

variable "image_repository" {
  description = "Docker image repository"
  type        = string
  default     = "localhost:5000/jagdna-lims"
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "v1.0.3"
}