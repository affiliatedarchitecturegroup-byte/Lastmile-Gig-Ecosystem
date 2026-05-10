# =============================================================
# Lastmile Gig - Production Environment
# =============================================================

include "root" {
  path = find_in_parent_folders()
}

inputs = {
  environment = "production"

  # Full production scale
  eks_node_min_size     = 3
  eks_node_max_size     = 6
  eks_node_desired_size = 3
  eks_node_instance_types = ["m6i.xlarge"]

  kafka_broker_count         = 3
  kafka_broker_instance_type = "kafka.m5.xlarge"
  kafka_ebs_volume_size      = 500

  opensearch_instance_type  = "r6g.large.search"
  opensearch_instance_count = 2

  coolify_instance_type = "t3.medium"
}
