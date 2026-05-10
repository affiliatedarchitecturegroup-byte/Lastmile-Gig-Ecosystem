/**
 * Lastmile Gig - AWS OpenSearch Module
 *
 * Search engine for menu search, driver discovery, full-text order search.
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 6
 */

resource "aws_opensearch_domain" "search" {
  domain_name    = "${var.project}-search-${var.environment}"
  engine_version = "OpenSearch_2.13"

  cluster_config {
    instance_type          = var.opensearch_instance_type
    instance_count         = var.opensearch_instance_count
    zone_awareness_enabled = var.opensearch_instance_count > 1

    dynamic "zone_awareness_config" {
      for_each = var.opensearch_instance_count > 1 ? [1] : []
      content {
        availability_zone_count = min(var.opensearch_instance_count, 3)
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = var.environment == "production" ? 100 : 20
    volume_type = "gp3"
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, min(var.opensearch_instance_count, length(var.private_subnet_ids)))
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-PFS-2023-10"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "lmg-admin"
      master_user_password = var.opensearch_master_password
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  tags = merge(var.tags, { Module = "opensearch" })
}

resource "aws_security_group" "opensearch" {
  name_prefix = "${var.project}-opensearch-${var.environment}-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from EKS"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.eks_node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-opensearch-sg-${var.environment}" })
}

resource "aws_cloudwatch_log_group" "opensearch" {
  name              = "/aws/opensearch/${var.project}-${var.environment}"
  retention_in_days = 30
  tags              = var.tags
}
