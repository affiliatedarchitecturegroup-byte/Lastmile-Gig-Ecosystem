/**
 * Lastmile Gig - Root Variables
 *
 * Shared variables consumed by all Terraform modules.
 * Values injected via Terragrunt per environment.
 */

# --- General ---

variable "project" {
  description = "Project identifier used in resource naming"
  type        = string
  default     = "lastmile-gig"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "Primary AWS region"
  type        = string
  default     = "af-south-1"
}

variable "aws_dr_region" {
  description = "Disaster recovery AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["af-south-1a", "af-south-1b", "af-south-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# --- EKS ---

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.30"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS managed node group"
  type        = list(string)
  default     = ["m6i.xlarge"]
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes in the baseline node group"
  type        = number
  default     = 3
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes in the baseline node group"
  type        = number
  default     = 6
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes in the baseline node group"
  type        = number
  default     = 3
}

# --- Kafka (MSK) ---

variable "kafka_version" {
  description = "Apache Kafka version for MSK cluster"
  type        = string
  default     = "3.6.0"
}

variable "kafka_broker_instance_type" {
  description = "Instance type for MSK broker nodes"
  type        = string
  default     = "kafka.m5.xlarge"
}

variable "kafka_broker_count" {
  description = "Number of Kafka broker nodes"
  type        = number
  default     = 3
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size per broker (GB)"
  type        = number
  default     = 500
}

# --- OpenSearch ---

variable "opensearch_instance_type" {
  description = "Instance type for OpenSearch cluster"
  type        = string
  default     = "r6g.large.search"
}

variable "opensearch_instance_count" {
  description = "Number of OpenSearch data nodes"
  type        = number
  default     = 2
}

# --- Domain ---

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "lastmilegig.aagais.co.za"
}

# --- Coolify ---

variable "coolify_instance_type" {
  description = "EC2 instance type for Coolify deployment platform"
  type        = string
  default     = "t3.medium"
}
