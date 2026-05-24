# Infrastructure as Code (Terraform + Terragrunt)

This directory contains Infrastructure as Code (IaC) for the JAG LabScientific LIMS project using **Terraform** and **Terragrunt**.

## Directory Structure

```
terraform/
├── terragrunt.hcl                    # Root Terragrunt configuration
├── modules/                          # Reusable Terraform modules
│   ├── k3s-cluster/                  # K3s cluster provisioning
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── helm-release/                 # Generic Helm chart installer
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── live/                             # Terragrunt live environments
│   ├── production/                   # Production environment
│   │   ├── terragrunt.hcl
│   │   ├── argocd/
│   │   │   └── terragrunt.hcl
│   │   └── external-secrets/
│   │       └── terragrunt.hcl
│   ├── develop/                      # Development environment
│   │   └── terragrunt.hcl
│   └── test/                         # Test environment
│       └── terragrunt.hcl
└── environments/                     # Legacy Terraform (direct usage)
    └── production/
```

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0.0
- [Terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) >= 0.50.0
- SSH access to target servers
- Tailscale configured on servers

## Quick Start with Terragrunt

### 1. Apply All Infrastructure

```bash
# From the terraform directory
cd terraform/live

# Initialize and apply all environments
terragrunt run-all init
terragrunt run-all plan
terragrunt run-all apply
```

### 2. Apply Specific Environment

```bash
# Production only
cd terraform/live/production
terragrunt init
terragrunt plan
terragrunt apply
```

### 3. Apply Specific Component

```bash
# Just ArgoCD
cd terraform/live/production/argocd
terragrunt apply
```

## Modules

### k3s-cluster

Provisions a K3s Kubernetes cluster with:

| Feature | Description |
|---------|-------------|
| K3s Installation | Lightweight Kubernetes distribution |
| NGINX Ingress | Ingress controller for HTTP routing |
| Local-path Provisioner | Default StorageClass for PVCs |
| Docker Registry | Local container image registry |
| Namespace Creation | Pre-configured namespaces |

#### Inputs

| Variable | Description | Default |
|----------|-------------|---------|
| `server_ip` | Server IP address | Required |
| `tailscale_ip` | Tailscale VPN IP | Required |
| `k3s_version` | K3s version | `v1.28.4+k3s1` |
| `namespaces` | List of namespaces | `["production", "develop", "test"]` |
| `install_registry` | Install Docker registry | `true` |

### helm-release

Generic module for installing Helm charts.

#### Inputs

| Variable | Description | Default |
|----------|-------------|---------|
| `name` | Release name | Required |
| `repository` | Helm repo URL | Required |
| `chart` | Chart name | Required |
| `chart_version` | Chart version | Required |
| `namespace` | Target namespace | Required |

## Environment Configuration

### Production (`live/production/`)

- Full K3s cluster setup
- ArgoCD for GitOps
- External Secrets Operator
- Network policies applied
- Backup CronJobs configured

### Develop (`live/develop/`)

- Shares cluster with production
- Separate namespace isolation
- Reduced resource limits

### Test (`live/test/`)

- Ephemeral test namespace
- Used for feature branch testing
- Minimal resources

## Terragrunt Features Used

### DRY Configuration

Root `terragrunt.hcl` contains shared configuration:

```hcl
# Common inputs inherited by all environments
inputs = {
  project_name = "jag-lims"
  server1_ip   = "100.89.26.128"
  server2_ip   = "100.103.13.92"
}
```

### Dependencies

Environments can depend on each other:

```hcl
dependency "production" {
  config_path = "../production"
}
```

### Generated Files

Provider configuration is auto-generated:

```hcl
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
    # Provider configuration...
  EOF
}
```

## State Management

### Local State (Default)

State is stored locally in each environment directory.

### Remote State (Recommended for Production)

Configure S3 backend in root `terragrunt.hcl`:

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "jag-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "af-south-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `terragrunt init` | Initialize modules |
| `terragrunt plan` | Preview changes |
| `terragrunt apply` | Apply changes |
| `terragrunt destroy` | Destroy resources |
| `terragrunt run-all apply` | Apply all environments |
| `terragrunt graph-dependencies` | Show dependency graph |
| `terragrunt output` | Show outputs |

## Security Best Practices

1. **Never commit sensitive values** - Use environment variables or secret managers
2. **Enable state encryption** - Always encrypt remote state
3. **Use state locking** - Prevent concurrent modifications
4. **Review plans** - Always review before applying
5. **Use `-var-file`** - Keep secrets in separate, gitignored files

## Outputs

After applying production:

```bash
terragrunt output

# Example output:
# kubeconfig_path = "./kubeconfig.yaml"
# argocd_url = "http://100.89.26.128:30338"
# application_urls = {
#   production_frontend = "http://100.89.26.128:30005"
#   develop_backend = "http://100.89.26.128:30201"
#   ...
# }
```

## Troubleshooting

### State Lock Issues

```bash
# Force unlock (use with caution)
terragrunt force-unlock <LOCK_ID>
```

### Dependency Issues

```bash
# Clear cache
rm -rf .terragrunt-cache
terragrunt init
```

### SSH Connection Issues

```bash
# Test SSH access
ssh -i ~/.ssh/id_rsa ubuntu@100.89.26.128

# Check Tailscale
tailscale status
```
