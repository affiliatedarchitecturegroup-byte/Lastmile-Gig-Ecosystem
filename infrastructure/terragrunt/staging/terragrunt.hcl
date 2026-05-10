# =============================================================
# Lastmile Gig - Staging Environment
# =============================================================

include "root" {
  path = find_in_parent_folders()
}

inputs = {
  environment = "staging"

  # 1/3 production size
  eks_node_min_size     = 2
  eks_node_max_size     = 4
  eks_node_desired_size = 2
  eks_node_instance_types = ["m6i.large"]

  kafka_broker_count         = 2
  kafka_broker_instance_type = "kafka.m5.large"
  kafka_ebs_volume_size      = 200

  opensearch_instance_type  = "r6g.large.search"
  opensearch_instance_count = 1

  coolify_instance_type = "t3.medium"
}
