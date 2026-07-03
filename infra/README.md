# infra/

Terraform for the AWS side of the daily job: ECR repo, ECS Fargate
cluster + task definition, IAM roles, Secrets Manager, a CloudWatch log
group, and the EventBridge Scheduler cron. Region `ap-southeast-1`.

## Prerequisites

- Terraform `>= 1.5`
- AWS credentials for the target account, already configured (env vars,
  `~/.aws/credentials`, or SSO) — this config doesn't create the IAM user
  running it, only the roles the ECS task itself uses.
- Docker, to build and push the scraper image after the first `apply`.

## First-time setup

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` (gitignored — never commit it):

```hcl
openai_api_key = "sk-..."       # required
database_url   = ""              # optional; see scraper/ README for the pooler caveat
```

```bash
terraform init
terraform plan
terraform apply
```

This provisions everything except the Docker image itself — the task
definition points at `<ecr_repository_url>:latest`, so push an image
before the first run (or the task will fail to pull):

```bash
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin "$(terraform output -raw ecr_repository_url | cut -d/ -f1)"

docker build -t rag-assistant ../scraper
docker tag rag-assistant:latest "$(terraform output -raw ecr_repository_url):latest"
docker push "$(terraform output -raw ecr_repository_url):latest"
```

## Outputs

`terraform output` after `apply` gives you everything the `supabase/`
Edge Functions need to drive this same ECS cluster for the manual
trigger — see `../supabase/README.md`:

- `ecr_repository_url`
- `ecs_cluster_name`
- `task_definition_arn`
- `subnet_ids`
- `task_security_group_id`
- `log_group_name` / `cloudwatch_console_url`
- `schedule_name`

## Variables

| Variable | Default | Notes |
|---|---|---|
| `aws_region` | `ap-southeast-1` | |
| `project_name` | `rag-assistant` | prefix for every resource name |
| `image_tag` | `latest` | tag the task definition pulls from ECR |
| `openai_api_key` | — | required, sensitive, stored in Secrets Manager |
| `database_url` | `""` | optional, sensitive; omit to skip Postgres and let the job use local JSON state |
| `schedule_expression` | `cron(0 2 * * ? *)` | daily UTC cron for EventBridge Scheduler |
| `task_cpu` / `task_memory` | `1024` / `2048` | Fargate task size |
| `log_retention_days` | `30` | CloudWatch log retention |

## Updating

Change code, then `terraform plan` / `apply` again. Pushing a new image
with the same tag (`latest`) does **not** trigger a new ECS deployment on
its own — a fresh `RunTask` (scheduled or manual) always pulls the
current tag, but nothing needs re-applying just for a new image.
