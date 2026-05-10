/**
 * Lastmile Gig - CloudWatch Monitoring Module
 *
 * CloudWatch alarms, dashboards, and SNS topics for alerting.
 *
 * @see docs/specs/09_OBSERVABILITY.md
 */

# --- SNS Topics for Alerts ---

resource "aws_sns_topic" "critical_alerts" {
  name = "${var.project}-critical-alerts-${var.environment}"
  tags = merge(var.tags, { Severity = "critical" })
}

resource "aws_sns_topic" "warning_alerts" {
  name = "${var.project}-warning-alerts-${var.environment}"
  tags = merge(var.tags, { Severity = "warning" })
}

# --- EKS Cluster Alarms ---

resource "aws_cloudwatch_metric_alarm" "eks_node_count" {
  alarm_name          = "${var.project}-eks-node-count-low-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "cluster_node_count"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = var.eks_min_nodes
  alarm_description   = "EKS node count dropped below minimum"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  tags = var.tags
}

# --- API Gateway Latency Alarm ---

resource "aws_cloudwatch_metric_alarm" "api_latency_p99" {
  alarm_name          = "${var.project}-api-latency-p99-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 5000
  alarm_description   = "API Gateway p99 latency exceeds 5 seconds"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  metric_query {
    id          = "latency"
    return_data = true

    metric {
      metric_name = "TargetResponseTime"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "p99"

      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  tags = var.tags
}

# --- Kafka Consumer Lag Alarm ---

resource "aws_cloudwatch_metric_alarm" "kafka_consumer_lag" {
  alarm_name          = "${var.project}-kafka-lag-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "SumOffsetLag"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Maximum"
  threshold           = 50000
  alarm_description   = "Kafka consumer lag exceeds 50,000 messages"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]

  dimensions = {
    Cluster = var.msk_cluster_name
  }

  tags = var.tags
}

# --- Platform Dashboard ---

resource "aws_cloudwatch_dashboard" "platform" {
  dashboard_name = "${var.project}-platform-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "API Gateway - Request Count"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "API Gateway - Response Time (p99)"
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]
          ]
          period = 60
          stat   = "p99"
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "EKS - Node Count"
          metrics = [
            ["ContainerInsights", "cluster_node_count", "ClusterName", var.eks_cluster_name]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Kafka - Consumer Lag"
          metrics = [
            ["AWS/Kafka", "SumOffsetLag", "Cluster", var.msk_cluster_name]
          ]
          period = 300
          stat   = "Maximum"
          region = var.aws_region
        }
      }
    ]
  })
}
