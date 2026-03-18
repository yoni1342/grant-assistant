terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM certificate must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "networking" {
  source      = "../../modules/networking"
  app_name    = var.app_name
  environment = var.environment
}

module "ecr" {
  source      = "../../modules/ecr"
  app_name    = var.app_name
  environment = var.environment
}

# Secrets are now injected at Docker build time via GitHub Secrets
# See .github/workflows/deploy-production.yml

module "acm" {
  source          = "../../modules/acm"
  providers       = { aws = aws.us_east_1 }
  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
}

module "ses" {
  source          = "../../modules/ses"
  app_name        = var.app_name
  environment     = var.environment
  domain_name     = var.domain_name
  sender_email    = "noreply@fundory.ai"
  route53_zone_id = var.route53_zone_id
}

module "alb" {
  source             = "../../modules/alb"
  app_name           = var.app_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  alb_sg_id          = module.networking.alb_sg_id
  acm_certificate_arn = module.acm.certificate_arn
}

module "ecs" {
  source              = "../../modules/ecs"
  app_name            = var.app_name
  environment         = var.environment
  aws_region          = var.aws_region
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  ecs_sg_id           = module.networking.ecs_sg_id
  ecr_repository_url  = module.ecr.repository_url
  target_group_arn    = module.alb.target_group_arn
  task_cpu            = var.task_cpu
  task_memory         = var.task_memory
  min_tasks           = var.min_tasks
  max_tasks           = var.max_tasks
  next_public_supabase_url      = var.next_public_supabase_url
  next_public_supabase_anon_key = var.next_public_supabase_anon_key
  ses_policy_arn      = module.ses.ses_send_policy_arn
}

module "cloudfront" {
  source          = "../../modules/cloudfront"
  app_name        = var.app_name
  environment     = var.environment
  alb_dns_name    = module.alb.alb_dns_name
  domain_name     = var.domain_name
  acm_certificate_arn = module.acm.certificate_arn
}

module "route53" {
  source                = "../../modules/route53"
  domain_name           = var.domain_name
  route53_zone_id       = var.route53_zone_id
  cloudfront_domain     = module.cloudfront.cloudfront_domain_name
  cloudfront_hosted_zone_id = module.cloudfront.cloudfront_hosted_zone_id
}

output "app_url" { value = "https://${var.domain_name}" }
output "cloudfront_domain" { value = module.cloudfront.cloudfront_domain_name }
output "alb_dns" { value = module.alb.alb_dns_name }
output "ecr_repository_url" { value = module.ecr.repository_url }
output "ecs_cluster_name" { value = module.ecs.cluster_name }
output "ses_identity_arn" { value = module.ses.ses_identity_arn }
output "ses_region" { value = module.ses.ses_region }
output "ses_sender_email" { value = module.ses.verified_sender_email }
output "ses_dkim_tokens" {
  value       = module.ses.dkim_tokens
  description = "Add these as CNAME records in Route53: token1._domainkey, token2._domainkey, token3._domainkey -> token.dkim.amazonses.com"
}
