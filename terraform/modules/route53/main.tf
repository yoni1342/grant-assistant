variable "domain_name" {}
variable "route53_zone_id" {}
variable "cloudfront_domain" {}
variable "cloudfront_hosted_zone_id" {}

# Apex domain → CloudFront
resource "aws_route53_record" "apex" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# www → CloudFront
resource "aws_route53_record" "www" {
  zone_id = var.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  alias {
    name                   = var.cloudfront_domain
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

output "apex_fqdn" { value = aws_route53_record.apex.fqdn }
output "www_fqdn"  { value = aws_route53_record.www.fqdn }
