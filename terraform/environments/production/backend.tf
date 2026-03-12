terraform {
  backend "s3" {
    bucket         = "nova4ai-terraform-state"
    key            = "grant-assistant/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "nova4ai-terraform-locks"
    encrypt        = true
  }
}
