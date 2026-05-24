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
│   ├── k8s-namespace/      # K8s Namespace + Quotas + Network Policies
│   ├── k8s-deployment/     # K8s Deployments + Services
│   ├── k8s-configmap/      # K8s ConfigMaps
│   ├── k8s-secret/         # K8s Secrets
│   └── k8s-helm-release/   # Helm deployments
└── live/                    # Terragrunt configs (ALL CHANGES HERE)
    ├── aws-infra/          # AWS infrastructure
    │   ├── vpc/
    │   └── ec2/
    └── k3s/                # K8s deployments on Server1
        ├── namespace/      # Namespace creation
        ├── test/           # Test environment (feature branches)
        ├── develop/        # Develop environment
        └── production/     # Production environment
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

## Quick Start

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

## Available Modules

### k8s-namespace

Creates Kubernetes namespaces with resource quotas and network policies.

```hcl
inputs = {
  name                   = "production"
  environment            = "production"
  resource_quota_enabled = true
  resource_quota = {
    requests_cpu    = "2"
    requests_memory = "2Gi"
    limits_cpu      = "4"
    limits_memory   = "4Gi"
    pods            = "20"
  }
  network_policy_enabled = true
  allow_external_egress  = true
  allow_external_ingress = true  # For production
}
```

### k8s-deployment

Creates Kubernetes Deployments with optional Services.

```hcl
inputs = {
  name             = "lims-backend"
  namespace        = "production"
  component        = "backend"
  image_repository = "localhost:5000/lims-backend"
  image_tag        = "v1.0.0"
  replicas         = 2

  ports = [{
    name           = "http"
    container_port = 3001
  }]

  env_vars = {
    NODE_ENV = "production"
  }

  resources = {
    requests = { cpu = "500m", memory = "512Mi" }
    limits   = { cpu = "1000m", memory = "1Gi" }
  }

  liveness_probe = {
    path              = "/health"
    port              = 3001
    initial_delay     = 30
    period            = 10
    timeout           = 5
    failure_threshold = 3
  }

  create_service = true
  service_type   = "NodePort"
  service_ports = [{
    name        = "http"
    port        = 3001
    target_port = 3001
    node_port   = 30007
  }]
}
```

### k8s-helm-release

Deploys applications using Helm charts.

```hcl
inputs = {
  release_name     = "lims"
  namespace        = "production"
  chart            = "../../../helm/lims"
  create_namespace = true

  values_files = ["../../../helm/lims/values-production.yaml"]

  set_values = {
    "backend.image.tag"  = "v1.0.0"
    "frontend.image.tag" = "v1.0.0"
    "ingress.enabled"    = "true"
  }

  set_sensitive_values = {
    "postgresql.auth.password" = var.db_password
  }

  wait    = true
  timeout = 600
  atomic  = true
}
```

### k8s-configmap

Creates ConfigMaps for application configuration.

```hcl
inputs = {
  name        = "lims-config"
  namespace   = "production"
  environment = "production"

  data = {
    "NODE_ENV"              = "production"
    "ENABLE_MOCK_SAMPLES"   = "false"
    "SAMPLE_CYCLE_INTERVAL" = "60000"
  }
}
```

### k8s-secret

Creates Secrets for sensitive data.

```hcl
inputs = {
  name        = "lims-secrets"
  namespace   = "production"
  environment = "production"

  data = {
    "DB_PASSWORD" = var.db_password
    "JWT_SECRET"  = var.jwt_secret
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
| CPU Request | 100m | 200m | 500m |
| Memory Request | 128Mi | 256Mi | 512Mi |
| Autoscaling | No | No | Yes |
| PDB | No | No | Yes |
| Ingress | No | No | Yes |
| Mock Data | Yes | Yes | No |

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

### Example: Add Environment Variables

```hcl
set_values = {
  # Existing values...
  "backend.env.NEW_FEATURE_FLAG" = "true"
  "backend.env.CUSTOM_SETTING"   = "value"
}
```

## State Management

Terraform state is stored locally at:
```
infrastructure/.terraform-state/<environment>/terraform.tfstate
```

For production use, consider:
- AWS S3 + DynamoDB for remote state
- Terraform Cloud
- GitLab/GitHub managed state

## Using Sensitive Variables

Set environment variables for sensitive data:

```bash
# Option 1: Environment variables
export TF_VAR_db_password="secure_password"
export TF_VAR_db_admin_password="admin_password"
terragrunt apply

# Option 2: .tfvars file (DO NOT COMMIT!)
echo 'db_password = "secure_password"' > secrets.tfvars
terragrunt apply -var-file=secrets.tfvars

# Option 3: Interactive prompt
terragrunt apply  # Will prompt for missing required variables
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: "1.6.0"

- name: Setup Terragrunt
  run: |
    curl -LO https://github.com/gruntwork-io/terragrunt/releases/download/v0.54.0/terragrunt_linux_amd64
    chmod +x terragrunt_linux_amd64
    sudo mv terragrunt_linux_amd64 /usr/local/bin/terragrunt

- name: Deploy with Terragrunt
  env:
    TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
  run: |
    cd infrastructure/live/k3s/${{ env.ENVIRONMENT }}
    terragrunt apply -auto-approve
```

## Troubleshooting

### View Current State

```bash
terragrunt state list
terragrunt state show <resource>
```

### Force Unlock State

```bash
terragrunt force-unlock <lock-id>
```

### Debug Mode

```bash
TF_LOG=DEBUG terragrunt apply
```

### Refresh State

```bash
terragrunt refresh
```

### Import Existing Resource

```bash
terragrunt import kubernetes_deployment.this production/lims-backend
```

## Directory Layout for New Environments

To add a new environment (e.g., staging):

```bash
mkdir -p infrastructure/live/k3s/staging
cp infrastructure/live/k3s/develop/terragrunt.hcl infrastructure/live/k3s/staging/

# Edit the new terragrunt.hcl:
# - Change environment = "staging"
# - Adjust NodePorts, replicas, etc.
```

## See Also

- [AWS Deployment Guide](./docs/AWS_DEPLOYMENT.md)
- [Helm Chart Documentation](../helm/lims/README.md)
- [Terragrunt Documentation](https://terragrunt.gruntwork.io/docs/)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
