variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "eks_node_security_group_id" { type = string }
variable "opensearch_instance_type" { type = string; default = "r6g.large.search" }
variable "opensearch_instance_count" { type = number; default = 2 }
variable "opensearch_master_password" { type = string; sensitive = true }
variable "tags" { type = map(string); default = {} }
