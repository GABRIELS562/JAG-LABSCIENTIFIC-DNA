# Infrastructure as Code (Terraform + Terragrunt)

This directory contains the Infrastructure as Code for the LIMS application using Terraform modules managed by Terragrunt.

## Architecture

```
infrastructure/
├── terragrunt.hcl          # Root config (providers, backend)
├── modules/                 # Terraform modules (DO NOT MODIFY)
│   ├── aws-vpc/            # AWS VPC + Subnets
│   ├── aws-ec2/            # AWS EC2 with k3s
│   ├── aws-security-group/ # AWS Security Groups
│   ├── k8s-namespace/      # K8s Namespace + Quotas
│   └── k8s-helm-release/   # Helm deployments
└── live/                    # Terragrunt configs (ALL CHANGES HERE)
    ├── aws-infra/          # AWS infrastructure
    │   ├── vpc/
    │   └── ec2/
    └── k3s/                # K8s deployments
        ├── namespace/
        ├── test/
        ├── develop/
        └── production/
```

## Key Principle

> **ALL configuration changes go in `live/` directory (Terragrunt files)**
> **NEVER modify files in `modules/` directory**

## Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-get update && sudo apt-get install terraform

# Install Terragrunt
brew install terragrunt  # macOS
# or
curl -LO https://github.com/gruntwork-io/terragrunt/releases/download/v0.54.0/terragrunt_linux_amd64
chmod +x terragrunt_linux_amd64 && sudo mv terragrunt_linux_amd64 /usr/local/bin/terragrunt

# Configure kubectl (for k3s deployments)
export KUBECONFIG=~/.kube/config
```

## Quick Start - k3s Deployments

### Deploy to Test Environment

```bash
cd infrastructure/live/k3s/test
terragrunt init
terragrunt plan
terragrunt apply
```

### Deploy to All Environments

```bash
cd infrastructure/live/k3s
terragrunt run-all apply
```

### Destroy Test Environment

```bash
cd infrastructure/live/k3s/test
terragrunt destroy
```

## Changing Configuration

### Example: Change Test Replicas

Edit `infrastructure/live/k3s/test/terragrunt.hcl`:

```hcl
locals {
  config = {
    # Change this value
    backend_replicas  = 2   # was 1
    frontend_replicas = 2   # was 1
    ...
  }
}
```

Then apply:

```bash
cd infrastructure/live/k3s/test
terragrunt apply
```

### Example: Change Production NodePorts

Edit `infrastructure/live/k3s/production/terragrunt.hcl`:

```hcl
locals {
  config = {
    backend_nodeport  = 30010   # was 30007
    frontend_nodeport = 30011   # was 30005
    ...
  }
}
```

## Environment Configuration Summary

| Setting | Test | Develop | Production |
|---------|------|---------|------------|
| Namespace | test | develop | production |
| Backend NodePort | 30101 | 30201 | 30007 |
| Frontend NodePort | 30102 | 30202 | 30005 |
| Replicas | 1 | 1 | 2 |
| Autoscaling | No | No | Yes |
| PDB | No | No | Yes |
| Ingress | No | Yes | Yes |

## State Management

Terraform state is stored locally at:
```
infrastructure/.terraform-state/<environment>/terraform.tfstate
```

For production use, consider:
- AWS S3 + DynamoDB for remote state
- Terraform Cloud
- GitLab/GitHub managed state

## Troubleshooting

### View current state
```bash
terragrunt state list
```

### Force unlock state
```bash
terragrunt force-unlock <lock-id>
```

### Debug mode
```bash
TF_LOG=DEBUG terragrunt apply
```

## Integration with CI/CD

The GitHub Actions workflows use Terragrunt for deployments:

```yaml
- name: Deploy with Terragrunt
  run: |
    cd infrastructure/live/k3s/${{ env.ENVIRONMENT }}
    terragrunt apply -auto-approve
```

## See Also

- [AWS Deployment Guide](./docs/AWS_DEPLOYMENT.md)
- [Helm Chart Documentation](../helm/lims/README.md)
