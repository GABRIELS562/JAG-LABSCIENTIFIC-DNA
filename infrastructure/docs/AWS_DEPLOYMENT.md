# AWS Deployment Guide

This guide explains how to deploy the LIMS infrastructure on AWS using Terraform/Terragrunt.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS Cloud                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    VPC (10.0.0.0/16)                      │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐        │  │
│  │  │   Public Subnet 1   │  │   Public Subnet 2   │        │  │
│  │  │    10.0.0.0/24      │  │    10.0.1.0/24      │        │  │
│  │  │  ┌───────────────┐  │  │                     │        │  │
│  │  │  │  EC2 Instance │  │  │                     │        │  │
│  │  │  │    (k3s)      │  │  │                     │        │  │
│  │  │  │  ┌─────────┐  │  │  │                     │        │  │
│  │  │  │  │ LIMS    │  │  │  │                     │        │  │
│  │  │  │  │ Pods    │  │  │  │                     │        │  │
│  │  │  │  └─────────┘  │  │  │                     │        │  │
│  │  │  └───────────────┘  │  │                     │        │  │
│  │  └─────────────────────┘  └─────────────────────┘        │  │
│  │                                                           │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐        │  │
│  │  │  Private Subnet 1   │  │  Private Subnet 2   │        │  │
│  │  │    10.0.2.0/24      │  │    10.0.3.0/24      │        │  │
│  │  │   (RDS - Future)    │  │                     │        │  │
│  │  └─────────────────────┘  └─────────────────────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                       Internet Gateway                           │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                           Internet
                               │
                    ┌──────────┴──────────┐
                    │   Cloudflare CDN    │
                    │  lims.jagdevops.co.za│
                    └─────────────────────┘
```

## Prerequisites

### 1. AWS CLI Configuration

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter:
#   AWS Access Key ID
#   AWS Secret Access Key
#   Default region: af-south-1 (Cape Town)
#   Output format: json
```

### 2. SSH Key Pair

```bash
# Generate SSH key for EC2 access
ssh-keygen -t ed25519 -f ~/.ssh/lims-server-key -C "lims-server"

# Import to AWS (optional - or let Terraform create it)
aws ec2 import-key-pair \
  --key-name lims-server-key \
  --public-key-material fileb://~/.ssh/lims-server-key.pub
```

## Step-by-Step Deployment

### Step 1: Configure AWS Provider

Edit `infrastructure/terragrunt.hcl` if needed:

```hcl
provider "aws" {
  region = "af-south-1"  # Change to your preferred region
}
```

### Step 2: Deploy VPC

```bash
cd infrastructure/live/aws-infra/vpc

# Review configuration
cat terragrunt.hcl

# Initialize and apply
terragrunt init
terragrunt plan
terragrunt apply
```

**Outputs:**
- VPC ID
- Public Subnet IDs
- Private Subnet IDs
- Internet Gateway ID

### Step 3: Deploy EC2 Instance

Edit `infrastructure/live/aws-infra/ec2/terragrunt.hcl`:

```hcl
locals {
  config = {
    name          = "lims-k3s-server"
    instance_type = "t3.large"      # Adjust based on needs

    # If creating new key pair
    create_key_pair = true
    public_key      = file("~/.ssh/lims-server-key.pub")

    # Or use existing
    create_key_pair = false
    key_name        = "your-existing-key"
  }
}
```

Deploy:

```bash
cd infrastructure/live/aws-infra/ec2
terragrunt init
terragrunt plan
terragrunt apply
```

**Outputs:**
- Instance ID
- Public IP (Elastic IP)
- Private IP

### Step 4: Connect to Server

```bash
# Get the public IP
cd infrastructure/live/aws-infra/ec2
terragrunt output public_ip

# SSH into server
ssh -i ~/.ssh/lims-server-key ubuntu@<public-ip>

# Verify k3s is running
sudo kubectl get nodes
sudo kubectl get pods -A
```

### Step 5: Configure kubectl Locally

```bash
# Copy kubeconfig from server
scp -i ~/.ssh/lims-server-key ubuntu@<public-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config-aws

# Update server address
sed -i 's/127.0.0.1/<public-ip>/g' ~/.kube/config-aws

# Use the config
export KUBECONFIG=~/.kube/config-aws
kubectl get nodes
```

### Step 6: Deploy LIMS Application

```bash
cd infrastructure/live/k3s/production
terragrunt init
terragrunt apply
```

## Configuration Reference

### Instance Types Comparison

| Type | vCPU | Memory | Use Case | Monthly Cost* |
|------|------|--------|----------|---------------|
| t3.medium | 2 | 4 GB | Test/Dev | ~$30 |
| t3.large | 2 | 8 GB | Small Prod | ~$60 |
| t3.xlarge | 4 | 16 GB | Medium Prod | ~$120 |
| m5.large | 2 | 8 GB | Prod (consistent) | ~$70 |

*Approximate costs for af-south-1 region

### Security Group Rules

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH Access |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 6443 | TCP | Your IP | k8s API |
| 30000-32767 | TCP | 0.0.0.0/0 | NodePorts |

### Restricting SSH Access

Edit `infrastructure/live/aws-infra/ec2/terragrunt.hcl`:

```hcl
ingress_rules = [
  {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_IP/32"]  # Restrict to your IP
    description = "SSH"
  },
  ...
]
```

## DNS Configuration (Cloudflare)

### 1. Add DNS Record

```
Type: A
Name: lims
Content: <EC2 Elastic IP>
Proxy: Yes (orange cloud)
```

### 2. SSL/TLS Settings

- Mode: Full (strict)
- Always Use HTTPS: On
- Minimum TLS Version: 1.2

### 3. Origin Certificate (Optional)

```bash
# On EC2 server
sudo mkdir -p /etc/ssl/cloudflare
# Upload Cloudflare Origin Certificate
```

## Cost Optimization

### 1. Use Reserved Instances

For production workloads running 24/7:
- 1-year reserved: ~30% savings
- 3-year reserved: ~50% savings

### 2. Spot Instances (Test/Dev)

Edit EC2 config for test environment:

```hcl
# Not implemented in current module
# Would need to add spot instance support
```

### 3. Auto-Shutdown for Dev

Set up CloudWatch alarm to stop dev instances at night.

## Monitoring

### CloudWatch Metrics

- CPU Utilization
- Network In/Out
- Disk Read/Write

### CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "LIMS-High-CPU" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

## Backup & Recovery

### EC2 Snapshots

```bash
# Create snapshot
aws ec2 create-snapshot \
  --volume-id <volume-id> \
  --description "LIMS backup $(date +%Y-%m-%d)"
```

### Database Backup

```bash
# On EC2 server
kubectl exec -n production lims-postgresql-0 -- \
  pg_dump -U lims_user lims_db > backup.sql
```

## Teardown

### Destroy Application

```bash
cd infrastructure/live/k3s/production
terragrunt destroy
```

### Destroy Infrastructure

```bash
# Destroy in reverse order
cd infrastructure/live/aws-infra/ec2
terragrunt destroy

cd infrastructure/live/aws-infra/vpc
terragrunt destroy
```

## Troubleshooting

### Cannot Connect to EC2

1. Check security group allows SSH from your IP
2. Verify key pair is correct
3. Check EC2 instance is running

```bash
aws ec2 describe-instances --instance-ids <id>
```

### k3s Not Starting

```bash
# SSH into server
sudo systemctl status k3s
sudo journalctl -u k3s -f
```

### Terraform State Issues

```bash
# List state
terragrunt state list

# Remove problematic resource
terragrunt state rm <resource>

# Import existing resource
terragrunt import <resource> <id>
```

## Comparison: On-Prem vs AWS

| Aspect | On-Prem (Current) | AWS |
|--------|-------------------|-----|
| Cost | Fixed hardware | Pay-as-you-go |
| Scaling | Manual | Auto (HPA + EC2) |
| Maintenance | You | AWS |
| Networking | Tailscale | VPC + IGW |
| Backup | Manual | Automated |
| DR | Limited | Multi-AZ |

## Next Steps

1. **Add RDS** - Move PostgreSQL to managed RDS
2. **Add EKS** - Replace k3s with managed EKS
3. **Add ALB** - Use Application Load Balancer
4. **Add Route53** - Manage DNS in AWS
5. **Add ACM** - AWS Certificate Manager for SSL
