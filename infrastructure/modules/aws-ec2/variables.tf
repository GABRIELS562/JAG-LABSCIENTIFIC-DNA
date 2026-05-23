# AWS EC2 Module - Variables

variable "name" {
  description = "Name of the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "ami_id" {
  description = "AMI ID (uses latest Ubuntu 22.04 if null)"
  type        = string
  default     = null
}

variable "subnet_id" {
  description = "Subnet ID to launch instance in"
  type        = string
}

variable "security_group_ids" {
  description = "Security group IDs to attach"
  type        = list(string)
}

variable "associate_public_ip" {
  description = "Associate public IP address"
  type        = bool
  default     = true
}

variable "create_key_pair" {
  description = "Create new key pair"
  type        = bool
  default     = false
}

variable "key_name" {
  description = "Key pair name"
  type        = string
}

variable "public_key" {
  description = "Public key for key pair (if creating)"
  type        = string
  default     = ""
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 50
}

variable "root_volume_type" {
  description = "Root volume type"
  type        = string
  default     = "gp3"
}

variable "create_elastic_ip" {
  description = "Create and attach elastic IP"
  type        = bool
  default     = true
}

variable "install_k3s" {
  description = "Install k3s on the instance"
  type        = bool
  default     = true
}

variable "domain" {
  description = "Domain for TLS SAN"
  type        = string
  default     = "local"
}

variable "user_data" {
  description = "Custom user data script"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
