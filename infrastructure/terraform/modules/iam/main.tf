/**
 * Lastmile Gig - IAM Module
 *
 * Core IAM roles and policies for the platform.
 * IRSA roles for EKS service-to-AWS access.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md
 */

# --- EKS Service Account Roles (IRSA) ---

# API Gateway IRSA - S3 read, SQS, SNS
module "api_gateway_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name = "${var.project}-api-gateway-${var.environment}"

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["lmg-core:api-gateway"]
    }
  }

  role_policy_arns = {
    s3_read = aws_iam_policy.s3_assets_read.arn
  }

  tags = var.tags
}

# AI Service IRSA - SageMaker, Bedrock, S3
module "ai_service_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name = "${var.project}-ai-service-${var.environment}"

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["lmg-ai:svc-ai", "lmg-ai:svc-agents"]
    }
  }

  role_policy_arns = {
    sagemaker  = aws_iam_policy.sagemaker_invoke.arn
    bedrock    = aws_iam_policy.bedrock_invoke.arn
    s3_read    = aws_iam_policy.s3_assets_read.arn
  }

  tags = var.tags
}

# IoT Service IRSA - TimescaleDB write (via Supabase), S3 for cold storage
module "iot_service_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name = "${var.project}-iot-service-${var.environment}"

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["lmg-fleet:svc-iot"]
    }
  }

  role_policy_arns = {
    s3_write = aws_iam_policy.s3_backups_write.arn
  }

  tags = var.tags
}

# --- Custom IAM Policies ---

resource "aws_iam_policy" "s3_assets_read" {
  name = "${var.project}-s3-assets-read-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = ["${var.assets_bucket_arn}", "${var.assets_bucket_arn}/*"]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "s3_backups_write" {
  name = "${var.project}-s3-backups-write-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["${var.backups_bucket_arn}/*"]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "sagemaker_invoke" {
  name = "${var.project}-sagemaker-invoke-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sagemaker:InvokeEndpoint"]
        Resource = "arn:aws:sagemaker:${var.aws_region}:*:endpoint/lmg-*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "bedrock_invoke" {
  name = "${var.project}-bedrock-invoke-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:*:*:model/anthropic.*"
      }
    ]
  })

  tags = var.tags
}
