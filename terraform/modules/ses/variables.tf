# SES Module Variables

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "domain_name" {
  description = "Domain name to verify for SES (e.g., fundory.ai)"
  type        = string
}

variable "sender_email" {
  description = "Sender email address to verify (e.g., noreply@fundory.ai)"
  type        = string
}

variable "enable_notifications" {
  description = "Enable SNS notifications for bounces and complaints"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for automatic DNS record creation (optional but recommended)"
  type        = string
  default     = ""
}
