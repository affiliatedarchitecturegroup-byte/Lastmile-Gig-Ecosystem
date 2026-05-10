/**
 * Lastmile Gig - Remote State Backend
 *
 * S3 backend with DynamoDB state locking.
 * This file is overridden by Terragrunt per environment.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 2.2
 */

terraform {
  backend "s3" {
    # These values are injected by Terragrunt
    # bucket         = "lmg-terraform-state-${account_id}"
    # key            = "terraform.tfstate"
    # region         = "af-south-1"
    # encrypt        = true
    # dynamodb_table = "lmg-terraform-locks"
  }
}
