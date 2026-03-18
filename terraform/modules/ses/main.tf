# SES Email Service Module
# Configures AWS SES for transactional emails

locals {
  name = "${var.app_name}-${var.environment}"
  common_tags = {
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Module      = "ses"
  }
}

# Verify domain identity for SES
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# Generate DKIM tokens for email authentication
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Verify email identity (sender address)
resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

# Optional: Configure MAIL FROM domain for better deliverability
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

# IAM policy document for SES sending permissions
data "aws_iam_policy_document" "ses_send" {
  statement {
    sid    = "AllowSESSending"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    # Use "*" to allow sending from any verified identity to any recipient
    # SES will still only allow sending from verified identities
    resources = ["*"]
  }
}

# IAM policy for SES sending (can be attached to ECS task role)
resource "aws_iam_policy" "ses_send" {
  name        = "${local.name}-ses-send"
  description = "Allow sending emails via AWS SES for ${local.name}"
  policy      = data.aws_iam_policy_document.ses_send.json
  tags        = local.common_tags
}

# Optional: SNS topic for bounce and complaint notifications
resource "aws_sns_topic" "ses_notifications" {
  count = var.enable_notifications ? 1 : 0
  name  = "${local.name}-ses-notifications"
  tags  = local.common_tags
}

# Optional: Configure SES to send bounce notifications to SNS
resource "aws_ses_identity_notification_topic" "bounce" {
  count                    = var.enable_notifications ? 1 : 0
  topic_arn                = aws_sns_topic.ses_notifications[0].arn
  notification_type        = "Bounce"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

# Optional: Configure SES to send complaint notifications to SNS
resource "aws_ses_identity_notification_topic" "complaint" {
  count                    = var.enable_notifications ? 1 : 0
  topic_arn                = aws_sns_topic.ses_notifications[0].arn
  notification_type        = "Complaint"
  identity                 = aws_ses_domain_identity.main.domain
  include_original_headers = true
}

# Route53 DNS Records for SES Verification
# These records are automatically created if route53_zone_id is provided

# SES Domain Verification TXT Record
resource "aws_route53_record" "ses_verification" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

# DKIM CNAME Records (3 records for email authentication)
resource "aws_route53_record" "dkim" {
  count   = var.route53_zone_id != "" ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# MAIL FROM MX Record (for better deliverability)
resource "aws_route53_record" "mail_from_mx" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "mail.${var.domain_name}"
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${data.aws_region.current.name}.amazonses.com"]
}

# MAIL FROM SPF Record (prevents spoofing)
resource "aws_route53_record" "mail_from_spf" {
  count   = var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "mail.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}
