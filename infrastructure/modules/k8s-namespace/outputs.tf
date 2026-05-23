# K8s Namespace Module - Outputs

output "name" {
  description = "Name of the created namespace"
  value       = kubernetes_namespace.this.metadata[0].name
}

output "uid" {
  description = "UID of the namespace"
  value       = kubernetes_namespace.this.metadata[0].uid
}

output "labels" {
  description = "Labels applied to the namespace"
  value       = kubernetes_namespace.this.metadata[0].labels
}
