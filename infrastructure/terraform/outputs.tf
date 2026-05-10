/**
 * Lastmile Gig - Root Outputs
 *
 * Key outputs exposed for cross-module reference and Terragrunt consumption.
 */

output "project" {
  description = "Project identifier"
  value       = var.project
}

output "environment" {
  description = "Current deployment environment"
  value       = var.environment
}

output "aws_region" {
  description = "Primary AWS region"
  value       = var.aws_region
}

output "common_tags" {
  description = "Common tags applied to all resources"
  value = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "AAG-TechTeam"
  })
}
