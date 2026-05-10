variable "project" { type = string }
variable "environment" { type = string }
variable "domain_name" { type = string; default = "lastmilegig.aagais.co.za" }
variable "tags" { type = map(string); default = {} }
