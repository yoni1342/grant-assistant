variable "app_name" {}
variable "environment" {}
variable "secrets" {
  type        = map(string)
  description = "Map of secret name suffix → secret value"
}

resource "aws_secretsmanager_secret" "secrets" {
  for_each = var.secrets
  name     = "${var.app_name}/${var.environment}/${each.key}"
  tags     = { App = var.app_name, Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "secrets" {
  for_each      = var.secrets
  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = each.value
}

output "secret_arns" {
  value = { for k, s in aws_secretsmanager_secret.secrets : k => s.arn }
}
