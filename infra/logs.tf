resource "aws_cloudwatch_log_group" "job" {
  name              = "/ecs/${var.project_name}-job"
  retention_in_days = var.log_retention_days
}
