/**
 * Lastmile Gig - SageMaker Module
 *
 * ML model endpoints for driver scoring, demand forecasting, and fraud detection.
 *
 * @see docs/specs/05_AI_AGENTIC_LAYER.md - Section 5
 */

resource "aws_sagemaker_domain" "ml" {
  domain_name = "${var.project}-ml-${var.environment}"
  auth_mode   = "IAM"
  vpc_id      = var.vpc_id
  subnet_ids  = var.private_subnet_ids

  default_user_settings {
    execution_role = aws_iam_role.sagemaker_execution.arn
  }

  tags = merge(var.tags, { Module = "sagemaker" })
}

resource "aws_iam_role" "sagemaker_execution" {
  name = "${var.project}-sagemaker-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "sagemaker_full" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy_attachment" "sagemaker_s3" {
  role       = aws_iam_role.sagemaker_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
