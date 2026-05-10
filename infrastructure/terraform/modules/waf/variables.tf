variable "project" { type = string }
variable "environment" { type = string }
variable "alb_arn" { type = string; default = ""; description = "ALB ARN to associate WAF with" }
variable "tags" { type = map(string); default = {} }
