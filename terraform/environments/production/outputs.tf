# Production Environment Outputs

output "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  value       = module.k3s_cluster.kubeconfig_path
}

output "cluster_info" {
  description = "K3s cluster information"
  value = {
    server_ip    = module.k3s_cluster.server_ip
    tailscale_ip = module.k3s_cluster.tailscale_ip
    namespaces   = module.k3s_cluster.namespaces
    registry_url = module.k3s_cluster.registry_url
  }
}

output "argocd_url" {
  description = "ArgoCD URL"
  value       = "http://${module.k3s_cluster.tailscale_ip}:30338"
}

output "application_urls" {
  description = "Application URLs"
  value = {
    production_frontend = "http://${module.k3s_cluster.tailscale_ip}:30005"
    production_backend  = "http://${module.k3s_cluster.tailscale_ip}:30007"
    develop_frontend    = "http://${module.k3s_cluster.tailscale_ip}:30202"
    develop_backend     = "http://${module.k3s_cluster.tailscale_ip}:30201"
    test_frontend       = "http://${module.k3s_cluster.tailscale_ip}:30102"
    test_backend        = "http://${module.k3s_cluster.tailscale_ip}:30101"
  }
}
