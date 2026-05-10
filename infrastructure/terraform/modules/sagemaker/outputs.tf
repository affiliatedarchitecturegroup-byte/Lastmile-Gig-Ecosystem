output "domain_id" {
  value = aws_sagemaker_domain.ml.id
}

output "domain_arn" {
  value = aws_sagemaker_domain.ml.arn
}

output "execution_role_arn" {
  value = aws_iam_role.sagemaker_execution.arn
}
