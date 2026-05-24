# K3s Cluster Module Outputs

output "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  value       = "${path.module}/kubeconfig.yaml"
}

output "server_ip" {
  description = "IP address of the K3s server"
  value       = var.server_ip
}

output "tailscale_ip" {
  description = "Tailscale IP address"
  value       = var.tailscale_ip
}

output "namespaces" {
  description = "List of created namespaces"
  value       = var.namespaces
}

output "ssh_public_key" {
  description = "Generated SSH public key (if generate_ssh_key is true)"
  value       = var.generate_ssh_key ? tls_private_key.k3s_ssh[0].public_key_openssh : null
}

output "registry_url" {
  description = "Docker registry URL"
  value       = var.install_registry ? "localhost:5000" : null
}
