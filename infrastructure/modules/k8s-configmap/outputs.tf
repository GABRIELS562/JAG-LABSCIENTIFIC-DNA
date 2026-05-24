output "name" {
  description = "Name of the created ConfigMap"
  value       = kubernetes_config_map.this.metadata[0].name
}

output "namespace" {
  description = "Namespace of the ConfigMap"
  value       = kubernetes_config_map.this.metadata[0].namespace
}
