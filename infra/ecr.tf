resource "aws_ecr_repository" "job" {
  name                 = "${var.project_name}-job"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
