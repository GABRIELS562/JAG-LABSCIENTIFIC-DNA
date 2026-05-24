output "name" {
  description = "Name of the created Secret"
  value       = kubernetes_secret.this.metadata[0].name
}

output "namespace" {
  description = "Namespace of the Secret"
  value       = kubernetes_secret.this.metadata[0].namespace
}
