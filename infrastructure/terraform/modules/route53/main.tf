/**
 * Lastmile Gig - Route 53 DNS Module
 *
 * DNS zone and records for all platform subdomains.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 6
 */

resource "aws_route53_zone" "primary" {
  name    = var.domain_name
  comment = "Lastmile Gig primary hosted zone - ${var.environment}"

  tags = merge(var.tags, { Module = "route53" })
}

# --- Subdomain Records ---

# Corporate site + storefronts (Next.js via ALB)
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Ops dashboards (Angular)
resource "aws_route53_record" "ops" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "ops.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Admin console (Angular)
resource "aws_route53_record" "admin" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "admin.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Command centre (Angular)
resource "aws_route53_record" "command" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "command.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# API Gateway (NestJS)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Developer Portal
resource "aws_route53_record" "dev" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "dev.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# WebSocket (Elixir - NLB for TCP passthrough)
resource "aws_route53_record" "ws" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "ws.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.nlb_dns_name
    zone_id                = var.nlb_zone_id
    evaluate_target_health = true
  }
}
