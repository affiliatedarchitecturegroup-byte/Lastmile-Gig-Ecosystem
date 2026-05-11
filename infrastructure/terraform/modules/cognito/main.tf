# -------------------------------------------------------------------
# Lastmile Gig Ecosystem - AWS Cognito Driver & M2M Pools
# Phase: P060 | Cognito user pool for drivers + M2M app client
# -------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

locals {
  common_tags = merge(var.tags, {
    Module    = "cognito"
    ManagedBy = "terraform"
    Platform  = "lastmile-gig"
  })
}

# Driver User Pool
resource "aws_cognito_user_pool" "driver_pool" {
  name = "lmg-${var.environment}-driver-pool"

  # Password policy
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_email"
      priority = 2
    }
  }

  # User attributes
  schema {
    name                     = "driver_id"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = false
    required                 = false
    string_attribute_constraints {
      min_length = 36
      max_length = 36
    }
  }

  schema {
    name                     = "zone"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  schema {
    name                     = "tier"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  # Verification
  auto_verified_attributes = ["phone_number"]

  # Device tracking
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # Lambda triggers (placeholders)
  # lambda_config {
  #   pre_sign_up          = aws_lambda_function.pre_signup.arn
  #   post_confirmation    = aws_lambda_function.post_confirmation.arn
  #   pre_token_generation = aws_lambda_function.pre_token.arn
  # }

  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = false
    invite_message_template {
      email_subject = "Welcome to Lastmile Gig - Driver Portal"
      email_message = "Your driver account has been created. Username: {username}, Temporary password: {####}"
      sms_message   = "Lastmile Gig driver login: {username}, password: {####}"
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn            = "arn:aws:ses:af-south-1:*:identity/noreply@lastmilegig.aagais.co.za"
    from_email_address    = "Lastmile Gig <noreply@lastmilegig.aagais.co.za>"
  }

  tags = local.common_tags
}

# Driver App Client
resource "aws_cognito_user_pool_client" "driver_mobile_app" {
  name         = "lmg-${var.environment}-driver-mobile"
  user_pool_id = aws_cognito_user_pool.driver_pool.id

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH"
  ]

  generate_secret               = false
  prevent_user_existence_errors  = "ENABLED"
  enable_token_revocation       = true
  allowed_oauth_flows_user_pool_client = true

  allowed_oauth_flows  = ["code"]
  allowed_oauth_scopes = ["openid", "profile", "email", "phone"]

  callback_urls = [
    "lastmilegig://callback",
    "exp://localhost:8081/--/callback"
  ]

  logout_urls = [
    "lastmilegig://logout",
    "exp://localhost:8081/--/logout"
  ]

  supported_identity_providers = ["COGNITO"]

  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# M2M App Client (service-to-service)
resource "aws_cognito_user_pool_client" "m2m_client" {
  name         = "lmg-${var.environment}-m2m-services"
  user_pool_id = aws_cognito_user_pool.driver_pool.id

  explicit_auth_flows = [
    "ALLOW_ADMIN_NO_SRP_AUTH"
  ]

  generate_secret              = true
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation      = true

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 1

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "driver_domain" {
  domain       = "lmg-${var.environment}-drivers"
  user_pool_id = aws_cognito_user_pool.driver_pool.id
}

# Resource Server
resource "aws_cognito_resource_server" "driver_api" {
  identifier = "https://drivers.lastmilegig.aagais.co.za"
  name       = "Driver API"

  user_pool_id = aws_cognito_user_pool.driver_pool.id

  scope {
    scope_name        = "driver.read"
    scope_description = "Read driver data"
  }

  scope {
    scope_name        = "driver.write"
    scope_description = "Update driver data"
  }

  scope {
    scope_name        = "delivery.accept"
    scope_description = "Accept delivery orders"
  }

  scope {
    scope_name        = "earnings.read"
    scope_description = "Read earnings data"
  }

  scope {
    scope_name        = "fleet.read"
    scope_description = "Read fleet data"
  }
}

# Outputs
output "driver_pool_id" {
  description = "Cognito Driver User Pool ID"
  value       = aws_cognito_user_pool.driver_pool.id
}

output "driver_pool_arn" {
  description = "Cognito Driver User Pool ARN"
  value       = aws_cognito_user_pool.driver_pool.arn
}

output "driver_mobile_client_id" {
  description = "Cognito Driver Mobile App Client ID"
  value       = aws_cognito_user_pool_client.driver_mobile_app.id
}

output "m2m_client_id" {
  description = "Cognito M2M Client ID"
  value       = aws_cognito_user_pool_client.m2m_client.id
}

output "driver_pool_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.driver_domain.domain
}
