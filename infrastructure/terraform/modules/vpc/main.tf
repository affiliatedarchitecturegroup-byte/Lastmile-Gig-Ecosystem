/**
 * Lastmile Gig - VPC Module
 *
 * Multi-AZ VPC with public/private subnets, NAT gateways,
 * and EKS-compatible subnet tags.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 2.3
 */

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"

  name = "${var.project}-vpc-${var.environment}"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # NAT Gateway - one per AZ for production HA, single for dev/staging
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  one_nat_gateway_per_az = var.environment == "production"

  # DNS
  enable_dns_hostnames = true
  enable_dns_support   = true

  # VPN Gateway (future use)
  enable_vpn_gateway = false

  # EKS cluster subnet tags (required for ALB controller discovery)
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                        = 1
    "kubernetes.io/cluster/${var.project}-eks-${var.environment}" = "owned"
    "Tier" = "private"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb"                                 = 1
    "kubernetes.io/cluster/${var.project}-eks-${var.environment}" = "owned"
    "Tier" = "public"
  }

  tags = merge(var.tags, {
    Module = "vpc"
  })
}

# VPC Flow Logs - sent to CloudWatch for network auditing
resource "aws_flow_log" "vpc_flow_log" {
  iam_role_arn    = aws_iam_role.vpc_flow_log_role.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = module.vpc.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project}-vpc-flow-log-${var.environment}"
  })
}

resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/flow-log/${var.project}-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 30

  tags = var.tags
}

resource "aws_iam_role" "vpc_flow_log_role" {
  name = "${var.project}-vpc-flow-log-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "vpc_flow_log_policy" {
  name = "${var.project}-vpc-flow-log-policy-${var.environment}"
  role = aws_iam_role.vpc_flow_log_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
