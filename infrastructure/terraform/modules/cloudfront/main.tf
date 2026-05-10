/**
 * Lastmile Gig - CloudFront CDN Module
 *
 * Global CDN for static assets, media, and restaurant images.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 7
 */

resource "aws_cloudfront_origin_access_identity" "assets" {
  comment = "${var.project} assets OAI - ${var.environment}"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"
  comment             = "${var.project} CDN - ${var.environment}"
  aliases             = var.environment == "production" ? ["cdn.${var.domain_name}"] : []

  origin {
    domain_name = var.assets_bucket_domain
    origin_id   = "S3-${var.project}-assets"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.assets.cloudfront_access_identity_path
    }

    custom_header {
      name  = "X-LMG-CDN-Secret"
      value = var.cdn_secret
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.project}-assets"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Cache behavior for restaurant images (longer TTL)
  ordered_cache_behavior {
    path_pattern     = "/restaurants/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.project}-assets"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 3600
    default_ttl = 604800
    max_ttl     = 2592000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.environment != "production"
    acm_certificate_arn           = var.environment == "production" ? var.acm_certificate_arn : null
    ssl_support_method            = var.environment == "production" ? "sni-only" : null
    minimum_protocol_version      = "TLSv1.2_2021"
  }

  tags = merge(var.tags, { Module = "cloudfront" })
}
