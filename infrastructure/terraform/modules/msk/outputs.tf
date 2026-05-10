output "bootstrap_brokers_tls" {
  description = "TLS connection string for Kafka brokers"
  value       = aws_msk_cluster.kafka.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.kafka.zookeeper_connect_string
}

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.kafka.arn
}

output "security_group_id" {
  description = "Kafka security group ID"
  value       = aws_security_group.kafka.id
}
