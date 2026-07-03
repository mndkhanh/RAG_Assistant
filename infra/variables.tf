variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Short name used as a prefix for all resource names"
  type        = string
  default     = "rag-assistant"
}

variable "image_tag" {
  description = "Docker image tag to run (pushed to the ECR repo this module creates)"
  type        = string
  default     = "latest"
}

variable "openai_api_key" {
  description = "OpenAI API key, stored in Secrets Manager and injected into the task at runtime"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Postgres connection string (Supabase). Leave empty to skip creating the secret; main.py falls back to local JSON state if DATABASE_URL is unset."
  type        = string
  sensitive   = true
  default     = ""
}

variable "schedule_expression" {
  description = "EventBridge Scheduler cron expression for the daily run (UTC)"
  type        = string
  default     = "cron(0 2 * * ? *)"
}

variable "task_cpu" {
  description = "Fargate task CPU units"
  type        = string
  default     = "1024"
}

variable "task_memory" {
  description = "Fargate task memory (MB)"
  type        = string
  default     = "2048"
}

variable "log_retention_days" {
  type    = number
  default = 30
}
