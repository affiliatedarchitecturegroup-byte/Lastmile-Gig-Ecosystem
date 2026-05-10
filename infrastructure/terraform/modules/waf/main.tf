/**
 * Lastmile Gig - AWS WAF Module
 *
 * Web Application Firewall with OWASP rules, rate limiting,
 * and DDoS protection via Shield Advanced.
 *
 * @see docs/specs/10_SECURITY_COMPLIANCE.md - Section 6
 */

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project}-waf-${var.environment}"
  scope       = "REGIONAL"
  description = "Lastmile Gig WAF - ${var.environment}"

  default_action {
    allow {}
  }

  # Rule 1: AWS Managed OWASP Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed SQL Injection Rule Set
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: General rate limiting (2000 req/5min per IP)
  rule {
    name     = "RateLimitGeneral"
    priority = 3

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-rate-limit-general"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Payment endpoint rate limit (100 req/5min per IP)
  rule {
    name     = "RateLimitPayments"
    priority = 4

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }
            positional_constraint = "STARTS_WITH"
            search_string         = "/v1/payments"
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-rate-limit-payments"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: AWS Managed Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 5

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, { Module = "waf" })
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.alb_arn != "" ? 1 : 0
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# WAF logging to CloudWatch
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.project}-${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = var.tags
}
