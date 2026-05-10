variable "project" { type = string }
variable "environment" { type = string }
variable "aws_region" { type = string; default = "af-south-1" }
variable "oidc_provider_arn" { type = string }
variable "assets_bucket_arn" { type = string }
variable "backups_bucket_arn" { type = string }
variable "tags" { type = map(string); default = {} }
