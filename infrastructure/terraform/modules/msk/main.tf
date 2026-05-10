/**
 * Lastmile Gig - AWS MSK (Managed Kafka) Module
 *
 * Apache Kafka is the primary event streaming backbone.
 * All inter-service async communication flows through MSK.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 4
 * @see docs/specs/04_BACKEND_MICROSERVICES.md - Section 3.1
 */

resource "aws_msk_cluster" "kafka" {
  cluster_name           = "${var.project}-kafka-${var.environment}"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.kafka_broker_count

  broker_node_group_info {
    instance_type  = var.kafka_broker_instance_type
    client_subnets = var.private_subnet_ids

    storage_info {
      ebs_storage_info {
        volume_size = var.kafka_ebs_volume_size
      }
    }

    security_groups = [aws_security_group.kafka.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = var.kms_key_arn
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka.arn
    revision = aws_msk_configuration.kafka.latest_revision
  }

  enhanced_monitoring = var.environment == "production" ? "PER_TOPIC_PER_BROKER" : "DEFAULT"

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
    }
  }

  tags = merge(var.tags, { Module = "msk" })
}

resource "aws_msk_configuration" "kafka" {
  name              = "${var.project}-kafka-config-${var.environment}"
  kafka_versions    = [var.kafka_version]

  server_properties = <<PROPERTIES
auto.create.topics.enable=false
default.replication.factor=${min(var.kafka_broker_count, 3)}
min.insync.replicas=${min(var.kafka_broker_count, 2)}
num.partitions=6
log.retention.hours=168
log.retention.bytes=1073741824
message.max.bytes=10485760
PROPERTIES
}

resource "aws_security_group" "kafka" {
  name_prefix = "${var.project}-kafka-${var.environment}-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Kafka from EKS nodes"
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [var.eks_node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-kafka-sg-${var.environment}" })
}

resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/aws/msk/${var.project}-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = var.tags
}
