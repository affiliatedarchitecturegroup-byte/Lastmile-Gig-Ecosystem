variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "eks_node_security_group_id" { type = string }
variable "kms_key_arn" { type = string; default = "" }
variable "kafka_version" { type = string; default = "3.6.0" }
variable "kafka_broker_count" { type = number; default = 3 }
variable "kafka_broker_instance_type" { type = string; default = "kafka.m5.xlarge" }
variable "kafka_ebs_volume_size" { type = number; default = 500 }
variable "tags" { type = map(string); default = {} }
