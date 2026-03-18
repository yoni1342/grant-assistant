variable "app_name" {}
variable "environment" {}
variable "aws_region" {}
variable "vpc_id" {}
variable "private_subnet_ids" { type = list(string) }
variable "ecs_sg_id" {}
variable "ecr_repository_url" {}
variable "target_group_arn" {}
variable "task_cpu" { type = number }
variable "task_memory" { type = number }
variable "min_tasks" { type = number }
variable "max_tasks" { type = number }
variable "next_public_supabase_url" {}
variable "next_public_supabase_anon_key" {}
variable "ses_policy_arn" {
  description = "ARN of the SES IAM policy to attach to the task role"
  type        = string
  default     = ""
}

locals { name = "${var.app_name}-${var.environment}" }

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = 30
  tags              = { Name = "/ecs/${local.name}" }
}

resource "aws_iam_role" "task_execution" {
  name = "${local.name}-ecs-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${local.name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Attach SES policy to task role (always attach, idempotent)
resource "aws_iam_role_policy_attachment" "ses_send" {
  role       = aws_iam_role.task.name
  policy_arn = var.ses_policy_arn
}

resource "aws_ecs_cluster" "main" {
  name = local.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Name = local.name }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${var.ecr_repository_url}:latest"
    essential = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    # All secrets are now baked into the Docker image at build time via GitHub Secrets
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "NEXT_PUBLIC_SUPABASE_URL", value = var.next_public_supabase_url },
      { name = "NEXT_PUBLIC_SUPABASE_ANON_KEY", value = var.next_public_supabase_anon_key }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    # No container health check — ALB target group health check handles this.
    # ECS container health check with wget caused false UNHEALTHY on Alpine.
  }])
}

resource "aws_ecs_service" "app" {
  name            = "${local.name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.min_tasks
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller { type = "ECS" }

  lifecycle { ignore_changes = [task_definition, desired_count] }
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_tasks
  min_capacity       = var.min_tasks
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

output "cluster_name"    { value = aws_ecs_cluster.main.name }
output "service_name"    { value = aws_ecs_service.app.name }
output "task_definition" { value = aws_ecs_task_definition.app.arn }
