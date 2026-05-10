variable "project" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string; default = "lastmilegig.aagais.co.za" }
variable "assets_bucket_domain" { type = string }
variable "cdn_secret" { type = string; sensitive = true }
variable "acm_certificate_arn" { type = string; default = "" }
variable "tags" { type = map(string); default = {} }
