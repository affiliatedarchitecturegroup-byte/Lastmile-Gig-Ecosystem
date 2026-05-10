/**
 * Lastmile Gig - Terraform Version Constraints
 *
 * All infrastructure provisioned via Terraform + Terragrunt.
 * Cloud: AWS 100% | Primary: af-south-1 | DR: eu-west-1
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md
 */

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
