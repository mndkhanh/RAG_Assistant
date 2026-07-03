resource "aws_ecs_cluster" "this" {
  name = "${var.project_name}-cluster"
}

locals {
  base_secrets = [
    {
      name      = "OPENAI_API_KEY"
      valueFrom = aws_secretsmanager_secret.openai_api_key.arn
    }
  ]
  database_secret = var.database_url != "" ? [
    {
      name      = "DATABASE_URL"
      valueFrom = aws_secretsmanager_secret.database_url[0].arn
    }
  ] : []

  container_environment = [
    { name = "ZENDESK_BASE_URL", value = "https://support.optisigns.com" },
    { name = "ZENDESK_LOCALE", value = "en-us" },
    { name = "ARTICLE_LIMIT", value = "50" },
    { name = "VECTOR_STORE_ID", value = "vs_6a470352643c819185bb9e830453af88" },
    { name = "VECTOR_STORE_NAME", value = "OptiBot Knowledge Base" },
    { name = "ECS_CLUSTER_NAME", value = aws_ecs_cluster.this.name },
    { name = "ECS_LOG_GROUP", value = aws_cloudwatch_log_group.job.name },
    { name = "ECS_LOG_STREAM_PREFIX", value = "job" },
    { name = "ECS_CONTAINER_NAME", value = "${var.project_name}-job" },
  ]
}

resource "aws_ecs_task_definition" "job" {
  family                   = "${var.project_name}-job"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-job"
      image     = "${aws_ecr_repository.job.repository_url}:${var.image_tag}"
      essential = true
      environment = local.container_environment
      secrets     = concat(local.base_secrets, local.database_secret)
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.job.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "job"
        }
      }
    }
  ])
}
