# SES Module Outputs

output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_email_identity_arn" {
  description = "ARN of the SES email identity"
  value       = aws_ses_email_identity.sender.arn
}

output "ses_identity_arn" {
  description = "Primary SES identity ARN (domain)"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_region" {
  description = "AWS region where SES is configured"
  value       = data.aws_region.current.name
}

output "verified_sender_email" {
  description = "Verified sender email address"
  value       = var.sender_email
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS configuration"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "ses_send_policy_arn" {
  description = "ARN of the IAM policy for SES sending"
  value       = aws_iam_policy.ses_send.arn
}

output "mail_from_domain" {
  description = "MAIL FROM domain for better deliverability"
  value       = aws_ses_domain_mail_from.main.mail_from_domain
}

output "sns_topic_arn" {
  description = "SNS topic ARN for bounce/complaint notifications"
  value       = var.enable_notifications ? aws_sns_topic.ses_notifications[0].arn : null
}

# Data source to get current region
data "aws_region" "current" {}
