output "deployment_name" {
  description = "Name of the deployment"
  value       = kubernetes_deployment.this.metadata[0].name
}

output "namespace" {
  description = "Namespace of the deployment"
  value       = kubernetes_deployment.this.metadata[0].namespace
}

output "service_name" {
  description = "Name of the service (if created)"
  value       = var.create_service ? kubernetes_service.this[0].metadata[0].name : null
}

output "service_cluster_ip" {
  description = "Cluster IP of the service (if created)"
  value       = var.create_service ? kubernetes_service.this[0].spec[0].cluster_ip : null
}
