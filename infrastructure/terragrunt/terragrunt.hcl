# =============================================================
# Lastmile Gig - Root Terragrunt Configuration
# =============================================================
# This is the root Terragrunt config consumed by all environments.
# It configures remote state backend and common inputs.
#
# @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 2.2
# =============================================================

# Remote state - S3 + DynamoDB locking
remote_state {
  backend = "s3"
  config = {
    bucket         = "lmg-terraform-state-${get_aws_account_id()}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "af-south-1"
    encrypt        = true
    dynamodb_table = "lmg-terraform-locks"

    s3_bucket_tags = {
      Project   = "lastmile-gig"
      ManagedBy = "terragrunt"
    }

    dynamodb_table_tags = {
      Project   = "lastmile-gig"
      ManagedBy = "terragrunt"
    }
  }

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "af-south-1"

  default_tags {
    tags = {
      Project     = "lastmile-gig"
      Environment = "${get_env("ENVIRONMENT", "dev")}"
      ManagedBy   = "terraform"
      Owner       = "AAG-TechTeam"
    }
  }
}

provider "aws" {
  alias  = "dr"
  region = "eu-west-1"

  default_tags {
    tags = {
      Project     = "lastmile-gig"
      Environment = "${get_env("ENVIRONMENT", "dev")}"
      ManagedBy   = "terraform"
      Owner       = "AAG-TechTeam"
      Purpose     = "disaster-recovery"
    }
  }
}
EOF
}

# Common locals
locals {
  account_id  = get_aws_account_id()
  environment = get_env("ENVIRONMENT", "dev")

  common_tags = {
    Project     = "lastmile-gig"
    ManagedBy   = "terraform"
    Environment = local.environment
    Owner       = "AAG-TechTeam"
  }
}

# Common inputs passed to all modules
inputs = {
  project     = "lastmile-gig"
  environment = local.environment
  aws_region  = "af-south-1"
  tags        = local.common_tags
}
