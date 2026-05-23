# AWS EC2 Module - Outputs

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.this.id
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.this.private_ip
}

output "public_ip" {
  description = "Public IP address"
  value       = var.create_elastic_ip ? aws_eip.this[0].public_ip : aws_instance.this.public_ip
}

output "public_dns" {
  description = "Public DNS name"
  value       = aws_instance.this.public_dns
}

output "availability_zone" {
  description = "Availability zone"
  value       = aws_instance.this.availability_zone
}

output "key_name" {
  description = "Key pair name"
  value       = aws_instance.this.key_name
}
