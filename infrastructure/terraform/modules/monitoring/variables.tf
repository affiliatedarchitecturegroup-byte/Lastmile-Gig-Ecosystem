variable "project" { type = string }
variable "environment" { type = string }
variable "aws_region" { type = string; default = "af-south-1" }
variable "eks_cluster_name" { type = string }
variable "eks_min_nodes" { type = number; default = 3 }
variable "alb_arn_suffix" { type = string; default = "" }
variable "msk_cluster_name" { type = string; default = "" }
variable "tags" { type = map(string); default = {} }
