terraform {
  required_version = ">= 1.0"
}

# Example null resource that can be used for testing
resource "null_resource" "example" {
  triggers = {
    timestamp = timestamp()
  }

  provisioner "local-exec" {
    command = "echo 'Hello from Terraform!'"
  }
}

# Another null resource for testing ignore functionality
resource "null_resource" "ignored_resource" {
  triggers = {
    always_run = uuid()
  }

  provisioner "local-exec" {
    command = "echo 'This resource should be ignored'"
  }
}

# Local file resource for additional testing
resource "local_file" "example" {
  content  = "Hello, Terraform!"
  filename = "${path.module}/hello.txt"
}

# Random string resource
resource "random_string" "example" {
  length  = 16
  special = false
  upper   = false
}

# Output examples
output "null_resource_id" {
  description = "ID of the null resource"
  value       = null_resource.example.id
}

output "random_string_value" {
  description = "Generated random string"
  value       = random_string.example.result
}