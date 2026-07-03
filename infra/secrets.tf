resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "${var.project_name}/openai-api-key"
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

# Only created when database_url is supplied — main.py falls back to
# local JSON state (data/state.json) when DATABASE_URL is unset, so the
# task def can run without this secret existing yet.
resource "aws_secretsmanager_secret" "database_url" {
  count = var.database_url != "" ? 1 : 0
  name  = "${var.project_name}/database-url"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  count         = var.database_url != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.database_url[0].id
  secret_string = var.database_url
}
