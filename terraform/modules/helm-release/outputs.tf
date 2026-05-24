# Helm Release Module Outputs

output "release_name" {
  description = "Name of the Helm release"
  value       = helm_release.this.name
}

output "namespace" {
  description = "Namespace where the release is installed"
  value       = helm_release.this.namespace
}

output "version" {
  description = "Version of the chart installed"
  value       = helm_release.this.version
}

output "status" {
  description = "Status of the release"
  value       = helm_release.this.status
}
