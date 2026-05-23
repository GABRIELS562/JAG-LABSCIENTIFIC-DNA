# K8s Helm Release Module - Outputs

output "release_name" {
  description = "Name of the Helm release"
  value       = helm_release.this.name
}

output "namespace" {
  description = "Namespace of the release"
  value       = helm_release.this.namespace
}

output "revision" {
  description = "Release revision number"
  value       = helm_release.this.version
}

output "status" {
  description = "Status of the release"
  value       = helm_release.this.status
}

output "chart" {
  description = "Chart name"
  value       = helm_release.this.chart
}

output "app_version" {
  description = "Application version"
  value       = helm_release.this.metadata[0].app_version
}
