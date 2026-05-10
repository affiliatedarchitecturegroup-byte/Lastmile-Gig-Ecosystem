variable "domain_name" { type = string; default = "lastmilegig.aagais.co.za" }
variable "environment" { type = string }
variable "alb_dns_name" { type = string; description = "ALB DNS name for HTTP services" }
variable "alb_zone_id" { type = string; description = "ALB hosted zone ID" }
variable "nlb_dns_name" { type = string; description = "NLB DNS name for WebSocket" }
variable "nlb_zone_id" { type = string; description = "NLB hosted zone ID" }
variable "tags" { type = map(string); default = {} }
