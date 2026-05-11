# -------------------------------------------------------------------
# Lastmile Gig Ecosystem - CloudWatch Synthetics Canary Checks
# Phase: P044-P045 | CloudWatch dashboards + uptime canaries
# -------------------------------------------------------------------

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain" {
  description = "Base domain for the platform"
  type        = string
  default     = "lastmilegig.aagais.co.za"
}

variable "canary_s3_bucket" {
  description = "S3 bucket for canary artifacts"
  type        = string
}

variable "canary_execution_role_arn" {
  description = "IAM role ARN for canary execution"
  type        = string
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

locals {
  common_tags = merge(var.tags, {
    Module    = "cloudwatch-synthetics"
    ManagedBy = "terraform"
    Platform  = "lastmile-gig"
  })

  # Endpoints to monitor with canary checks every 5 minutes
  canary_endpoints = {
    api-gateway = {
      url              = "https://api.${var.domain}/health"
      expected_status  = 200
      timeout_seconds  = 10
      frequency_minutes = 5
    }
    corporate-site = {
      url              = "https://${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
    ops-dashboard = {
      url              = "https://ops.${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
    admin-console = {
      url              = "https://admin.${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
    command-centre = {
      url              = "https://command.${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
    storefront = {
      url              = "https://store.${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
    developer-portal = {
      url              = "https://dev.${var.domain}"
      expected_status  = 200
      timeout_seconds  = 15
      frequency_minutes = 5
    }
  }
}

# Canary checks for each endpoint
resource "aws_synthetics_canary" "endpoint_checks" {
  for_each = local.canary_endpoints

  name                 = "lmg-${var.environment}-${each.key}"
  artifact_s3_location = "s3://${var.canary_s3_bucket}/canary/${each.key}"
  execution_role_arn   = var.canary_execution_role_arn
  handler              = "apiCanaryBlueprint.handler"
  zip_file             = data.archive_file.canary_script[each.key].output_path
  runtime_version      = "syn-nodejs-puppeteer-8.0"
  start_canary         = true

  schedule {
    expression          = "rate(${each.value.frequency_minutes} minutes)"
    duration_in_seconds = 0
  }

  run_config {
    timeout_in_seconds = each.value.timeout_seconds
    memory_in_mb       = 960
    active_tracing     = true

    environment_variables = {
      TARGET_URL      = each.value.url
      EXPECTED_STATUS = tostring(each.value.expected_status)
    }
  }

  success_retention_period = 31
  failure_retention_period = 31

  tags = merge(local.common_tags, {
    Endpoint = each.key
  })
}

# Canary script template
data "archive_file" "canary_script" {
  for_each = local.canary_endpoints

  type        = "zip"
  output_path = "${path.module}/canary-scripts/${each.key}.zip"

  source {
    content  = templatefile("${path.module}/canary-template.js.tpl", {
      url             = each.value.url
      expected_status = each.value.expected_status
    })
    filename = "nodejs/node_modules/apiCanaryBlueprint.js"
  }
}

# CloudWatch alarms for canary failures
resource "aws_cloudwatch_metric_alarm" "canary_failure" {
  for_each = local.canary_endpoints

  alarm_name          = "lmg-${var.environment}-canary-${each.key}-failure"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Canary check for ${each.key} is failing (success rate < 90%)"
  treat_missing_data  = "breaching"

  dimensions = {
    CanaryName = aws_synthetics_canary.endpoint_checks[each.key].name
  }

  alarm_actions = [var.alarm_sns_topic_arn]
  ok_actions    = [var.alarm_sns_topic_arn]

  tags = local.common_tags
}

# Custom CloudWatch dashboard for AWS resources
resource "aws_cloudwatch_dashboard" "lmg_infrastructure" {
  dashboard_name = "lmg-${var.environment}-infrastructure"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EKS Cluster CPU Utilisation"
          metrics = [["AWS/EKS", "node_cpu_utilization", "ClusterName", "lmg-${var.environment}"]]
          period  = 300
          stat    = "Average"
          region  = "af-south-1"
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EKS Cluster Memory Utilisation"
          metrics = [["AWS/EKS", "node_memory_utilization", "ClusterName", "lmg-${var.environment}"]]
          period  = 300
          stat    = "Average"
          region  = "af-south-1"
          view    = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "MSK Kafka - Bytes In/Out"
          metrics = [
            ["AWS/Kafka", "BytesInPerSec", "Cluster Name", "lmg-${var.environment}-msk"],
            ["AWS/Kafka", "BytesOutPerSec", "Cluster Name", "lmg-${var.environment}-msk"]
          ]
          period = 300
          stat   = "Average"
          region = "af-south-1"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "OpenSearch - Search Latency"
          metrics = [
            ["AWS/ES", "SearchLatency", "DomainName", "lmg-${var.environment}-opensearch", "ClientId", ""]
          ]
          period = 300
          stat   = "Average"
          region = "af-south-1"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title   = "Canary Success Rate"
          metrics = [for k, v in local.canary_endpoints : ["CloudWatchSynthetics", "SuccessPercent", "CanaryName", "lmg-${var.environment}-${k}"]]
          period  = 300
          stat    = "Average"
          region  = "af-south-1"
          view    = "timeSeries"
        }
      }
    ]
  })
}

# Canary script template file
resource "local_file" "canary_template" {
  filename = "${path.module}/canary-template.js.tpl"
  content  = <<-EOT
    const synthetics = require('Synthetics');
    const log = require('SyntheticsLogger');

    const apiCanaryBlueprint = async function () {
      const url = '${url}';
      const expectedStatus = ${expected_status};

      const requestOptions = {
        hostname: new URL(url).hostname,
        method: 'GET',
        path: new URL(url).pathname,
        port: 443,
        protocol: 'https:',
        headers: {
          'User-Agent': 'LMG-Synthetics-Canary/1.0',
        },
      };

      const stepConfig = {
        includeRequestHeaders: true,
        includeResponseHeaders: true,
        includeRequestBody: false,
        includeResponseBody: false,
        restrictedHeaders: ['Authorization', 'Cookie'],
        continueOnHttpStepFailure: false,
      };

      await synthetics.executeHttpStep(
        'verify-endpoint',
        requestOptions,
        (res) => {
          if (res.statusCode !== expectedStatus) {
            throw new Error(
              'Expected status ' + expectedStatus + ' but got ' + res.statusCode
            );
          }
          log.info('Endpoint returned expected status: ' + res.statusCode);
        },
        stepConfig
      );
    };

    exports.handler = async () => {
      return await apiCanaryBlueprint();
    };
  EOT
}

# Outputs
output "canary_names" {
  description = "Map of canary names"
  value       = { for k, v in aws_synthetics_canary.endpoint_checks : k => v.name }
}

output "dashboard_arn" {
  description = "CloudWatch dashboard ARN"
  value       = aws_cloudwatch_dashboard.lmg_infrastructure.dashboard_arn
}
