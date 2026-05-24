# GitHub Secrets Configuration Guide

This document describes how to configure GitHub Secrets for the CI/CD pipelines.

## Required Secrets

### 1. Tailscale OAuth Credentials

The deployment workflows use Tailscale to connect to internal servers via VPN.

| Secret | Description |
|--------|-------------|
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth Client ID |
| `TS_OAUTH_SECRET` | Tailscale OAuth Client Secret |

**How to create:**

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin/settings/oauth)
2. Click "Generate OAuth Client..."
3. Set scopes:
   - `devices:read` - Read device information
   - `routes:read` - Read routes (for accessing internal networks)
4. Copy the Client ID and Client Secret
5. Add to GitHub Secrets

### 2. Docker Registry

| Secret | Description | Example |
|--------|-------------|---------|
| `DOCKER_REGISTRY` | Internal Docker registry URL | `100.89.26.128:5000` |

This is the Tailscale IP of Server1 where the Docker registry runs.

### 3. Kubernetes Configuration

| Secret | Description |
|--------|-------------|
| `KUBECONFIG_B64` | Base64-encoded kubeconfig file |

**How to create:**

```bash
# On Server1 (k3s master)
cat /etc/rancher/k3s/k3s.yaml | base64 -w 0

# Or if you have a local kubeconfig
cat ~/.kube/config | base64 -w 0
```

**Important:** Update the `server` URL in kubeconfig to use Tailscale IP:
```yaml
clusters:
- cluster:
    server: https://100.89.26.128:6443  # Use Tailscale IP
```

### 4. Database Credentials

| Secret | Description | Example |
|--------|-------------|---------|
| `DB_PASSWORD` | LIMS database user password | `lims_password` |
| `DB_ADMIN_PASSWORD` | PostgreSQL admin password | `lims_password` |

These are used by Helm to configure PostgreSQL.

### 5. ArgoCD (Optional)

Only required if `ARGOCD_ENABLED` variable is set to `true`.

| Secret | Description |
|--------|-------------|
| `ARGOCD_SERVER` | ArgoCD server address (Tailscale IP) |
| `ARGOCD_AUTH_TOKEN` | ArgoCD admin password or token |

**How to get ArgoCD password:**

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

---

## GitHub Variables

In addition to secrets, you may want to set these repository variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ARGOCD_ENABLED` | Enable ArgoCD sync step | `false` |

---

## How to Add Secrets in GitHub

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

---

## Environment-Specific Secrets

For production deployments, you can use GitHub Environments:

1. Go to **Settings** > **Environments**
2. Create `production` environment
3. Add environment-specific secrets
4. Enable required reviewers for production deployments

---

## Quick Setup Script

Run this locally to generate the base64 kubeconfig:

```bash
#!/bin/bash
# generate-secrets.sh

echo "=== Generating GitHub Secrets Values ==="
echo ""

# Kubeconfig
if [ -f ~/.kube/config ]; then
    echo "KUBECONFIG_B64:"
    cat ~/.kube/config | base64 -w 0
    echo ""
    echo ""
fi

# Tailscale - manual setup required
echo "TS_OAUTH_CLIENT_ID: <get from Tailscale admin console>"
echo "TS_OAUTH_SECRET: <get from Tailscale admin console>"
echo ""

# Docker Registry
echo "DOCKER_REGISTRY: 100.89.26.128:5000"
echo ""

# Database
echo "DB_PASSWORD: lims_password"
echo "DB_ADMIN_PASSWORD: lims_password"
```

---

## Verification

After setting up secrets, trigger a workflow run:

```bash
# Push a small change to trigger CI
git commit --allow-empty -m "ci: test secrets configuration"
git push
```

Check the Actions tab to verify workflows can access the secrets.

---

## Troubleshooting

### "OAuth identity empty" Error
- Verify `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET` are set
- Check Tailscale OAuth client hasn't expired
- Ensure OAuth scopes include `devices:read`

### "Connection refused" to Registry
- Verify `DOCKER_REGISTRY` uses correct Tailscale IP
- Ensure registry is running: `docker ps | grep registry`
- Check firewall allows port 5000

### "Unauthorized" to Kubernetes
- Re-generate `KUBECONFIG_B64` with fresh token
- Verify server URL uses Tailscale IP
- Check k3s is running: `systemctl status k3s`

### ArgoCD Sync Fails
- Verify `ARGOCD_SERVER` is correct
- Check `ARGOCD_AUTH_TOKEN` hasn't expired
- Test manually: `argocd login <server> --username admin --password <token>`
