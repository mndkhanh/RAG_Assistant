output "ecr_repository_url" {
  value = aws_ecr_repository.job.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.job.arn
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.job.name
}

output "schedule_name" {
  value = aws_scheduler_schedule.daily_job.name
}

output "cloudwatch_console_url" {
  value = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#logsV2:log-groups/log-group/${replace(aws_cloudwatch_log_group.job.name, "/", "$252F")}"
}

output "subnet_ids" {
  value = data.aws_subnets.default.ids
}

output "task_security_group_id" {
  value = aws_security_group.task.id
}
