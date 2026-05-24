# K3s Cluster Module
# Manages the K3s Kubernetes cluster infrastructure

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Generate SSH key for cluster access
resource "tls_private_key" "k3s_ssh" {
  count     = var.generate_ssh_key ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Save SSH private key locally
resource "local_file" "ssh_private_key" {
  count           = var.generate_ssh_key ? 1 : 0
  content         = tls_private_key.k3s_ssh[0].private_key_pem
  filename        = "${path.module}/keys/k3s_id_rsa"
  file_permission = "0600"
}

# K3s server installation
resource "null_resource" "k3s_server" {
  triggers = {
    k3s_version = var.k3s_version
    server_ip   = var.server_ip
  }

  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = var.ssh_private_key
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "#!/bin/bash",
      "set -e",
      "",
      "# Install K3s server",
      "curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${var.k3s_version} sh -s - server \\",
      "  --disable traefik \\",
      "  --write-kubeconfig-mode 644 \\",
      "  --tls-san ${var.server_ip} \\",
      "  --tls-san ${var.tailscale_ip} \\",
      "  --node-label environment=${var.environment} \\",
      "  --node-label role=server",
      "",
      "# Wait for K3s to be ready",
      "until kubectl get nodes; do sleep 5; done",
      "",
      "echo 'K3s server installation complete'"
    ]
  }
}

# Get kubeconfig from server
resource "null_resource" "fetch_kubeconfig" {
  depends_on = [null_resource.k3s_server]

  triggers = {
    server_ip = var.server_ip
  }

  provisioner "local-exec" {
    command = <<-EOT
      ssh -o StrictHostKeyChecking=no -i ${var.ssh_key_path} ${var.ssh_user}@${var.server_ip} \
        "sudo cat /etc/rancher/k3s/k3s.yaml" | \
        sed "s/127.0.0.1/${var.tailscale_ip}/g" > ${path.module}/kubeconfig.yaml
    EOT
  }
}

# Install NGINX Ingress Controller
resource "null_resource" "nginx_ingress" {
  depends_on = [null_resource.k3s_server]

  triggers = {
    nginx_version = var.nginx_ingress_version
  }

  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = var.ssh_private_key
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v${var.nginx_ingress_version}/deploy/static/provider/baremetal/deploy.yaml",
      "kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s"
    ]
  }
}

# Install local-path provisioner for storage
resource "null_resource" "local_path_provisioner" {
  depends_on = [null_resource.k3s_server]

  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = var.ssh_private_key
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml",
      "kubectl patch storageclass local-path -p '{\"metadata\": {\"annotations\":{\"storageclass.kubernetes.io/is-default-class\":\"true\"}}}'"
    ]
  }
}

# Create namespaces
resource "null_resource" "namespaces" {
  depends_on = [null_resource.k3s_server]

  for_each = toset(var.namespaces)

  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = var.ssh_private_key
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "kubectl create namespace ${each.value} --dry-run=client -o yaml | kubectl apply -f -",
      "kubectl label namespace ${each.value} name=${each.value} --overwrite"
    ]
  }
}

# Install Docker Registry
resource "null_resource" "docker_registry" {
  count      = var.install_registry ? 1 : 0
  depends_on = [null_resource.k3s_server]

  connection {
    type        = "ssh"
    host        = var.server_ip
    user        = var.ssh_user
    private_key = var.ssh_private_key
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "docker run -d --restart=always -p 5000:5000 --name registry registry:2 || true",
      "echo '{\"insecure-registries\": [\"localhost:5000\"]}' | sudo tee /etc/docker/daemon.json",
      "sudo systemctl restart docker || true"
    ]
  }
}
