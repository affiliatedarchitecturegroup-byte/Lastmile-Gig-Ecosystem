/**
 * Lastmile Gig - AWS Provider Configuration
 *
 * Primary region: af-south-1 (Cape Town)
 * DR region: eu-west-1 (Ireland)
 */

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "AAG-TechTeam"
    }
  }
}

# DR region provider (for cross-region replication)
provider "aws" {
  alias  = "dr"
  region = var.aws_dr_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "AAG-TechTeam"
      Purpose     = "disaster-recovery"
    }
  }
}
