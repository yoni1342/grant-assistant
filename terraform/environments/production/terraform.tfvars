aws_region         = "us-east-1"
environment        = "production"
app_name           = "grant-assistant"
domain_name        = "fundory.ai"
route53_zone_id    = "Z00322472SVWWWPPXX02D"

# ECS task sizing (production)
task_cpu    = 1024
task_memory = 2048
min_tasks   = 2
max_tasks   = 5

# Supabase public vars (baked into Docker build)
next_public_supabase_url      = "https://fgudhlcktsstwpxwtwzz.supabase.co"
next_public_supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndWRobGNrdHNzdHdweHd0d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjYwOTUsImV4cCI6MjA4NjU0MjA5NX0.hc1HdJTTU2cWfH3NpdnMQ19-f3ATm54POn92qgHKXfo"
