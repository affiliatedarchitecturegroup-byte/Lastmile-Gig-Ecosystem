output "assets_bucket_id" {
  value = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  value = aws_s3_bucket.assets.arn
}

output "assets_bucket_domain" {
  value = aws_s3_bucket.assets.bucket_regional_domain_name
}

output "backups_bucket_id" {
  value = aws_s3_bucket.backups.id
}

output "artifacts_bucket_id" {
  value = aws_s3_bucket.artifacts.id
}

output "logs_bucket_id" {
  value = aws_s3_bucket.logs.id
}
