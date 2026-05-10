# =============================================================
# Lastmile Gig - Development Environment
# =============================================================

include "root" {
  path = find_in_parent_folders()
}

inputs = {
  environment = "dev"

  # Scaled-down resources for dev
  eks_node_min_size     = 1
  eks_node_max_size     = 2
  eks_node_desired_size = 1
  eks_node_instance_types = ["t3.large"]

  kafka_broker_count         = 1
  kafka_broker_instance_type = "kafka.t3.small"
  kafka_ebs_volume_size      = 50

  opensearch_instance_type  = "t3.small.search"
  opensearch_instance_count = 1

  coolify_instance_type = "t3.small"
}
