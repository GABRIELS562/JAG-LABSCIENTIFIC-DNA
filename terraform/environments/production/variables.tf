# Production Environment Variables

variable "ssh_user" {
  description = "SSH username for server access"
  type        = string
  default     = "ubuntu"
}

variable "ssh_private_key" {
  description = "SSH private key content"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssh_key_path" {
  description = "Path to SSH private key file"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "k3s_version" {
  description = "K3s version to install"
  type        = string
  default     = "v1.28.4+k3s1"
}

variable "argocd_version" {
  description = "ArgoCD Helm chart version"
  type        = string
  default     = "5.51.4"
}

variable "external_secrets_version" {
  description = "External Secrets Operator Helm chart version"
  type        = string
  default     = "0.9.9"
}

variable "prometheus_version" {
  description = "Prometheus Stack Helm chart version"
  type        = string
  default     = "54.2.2"
}

variable "install_monitoring" {
  description = "Whether to install the monitoring stack"
  type        = bool
  default     = false  # Monitoring is on Server2
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = "admin"
}
