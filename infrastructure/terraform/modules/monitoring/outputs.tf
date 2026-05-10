output "critical_alerts_topic_arn" {
  value = aws_sns_topic.critical_alerts.arn
}

output "warning_alerts_topic_arn" {
  value = aws_sns_topic.warning_alerts.arn
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.platform.dashboard_name
}
