# K3s Cluster Module Variables

variable "server_ip" {
  description = "IP address of the K3s server"
  type        = string
}

variable "tailscale_ip" {
  description = "Tailscale IP address for the server"
  type        = string
}

variable "ssh_user" {
  description = "SSH username for server access"
  type        = string
  default     = "ubuntu"
}

variable "ssh_private_key" {
  description = "SSH private key content"
  type        = string
  sensitive   = true
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

variable "nginx_ingress_version" {
  description = "NGINX Ingress Controller version"
  type        = string
  default     = "1.9.4"
}

variable "environment" {
  description = "Environment name (production, develop, test)"
  type        = string
  default     = "production"
}

variable "namespaces" {
  description = "List of namespaces to create"
  type        = list(string)
  default     = ["production", "develop", "test", "monitoring", "argocd"]
}

variable "install_registry" {
  description = "Whether to install a local Docker registry"
  type        = bool
  default     = true
}

variable "generate_ssh_key" {
  description = "Whether to generate a new SSH key"
  type        = bool
  default     = false
}
