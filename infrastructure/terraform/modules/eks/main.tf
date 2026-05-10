/**
 * Lastmile Gig - EKS Cluster Module
 *
 * Production Kubernetes cluster on AWS EKS with managed node groups
 * and Karpenter autoscaler configuration.
 *
 * @see docs/specs/08_INFRASTRUCTURE_IaC.md - Section 2.4
 */

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "${var.project}-eks-${var.environment}"
  cluster_version = var.eks_cluster_version

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Cluster access
  cluster_endpoint_public_access  = var.environment != "production"
  cluster_endpoint_private_access = true

  # IRSA for AWS service access from pods
  enable_irsa = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent              = true
      service_account_role_arn = module.vpc_cni_irsa.iam_role_arn
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  # Managed node groups
  eks_managed_node_groups = {
    baseline = {
      name = "${var.project}-baseline-${var.environment}"

      min_size     = var.eks_node_min_size
      max_size     = var.eks_node_max_size
      desired_size = var.eks_node_desired_size

      instance_types = var.eks_node_instance_types
      capacity_type  = "ON_DEMAND"

      labels = {
        role        = "baseline"
        environment = var.environment
      }

      tags = merge(var.tags, {
        "karpenter.sh/discovery" = "${var.project}-eks-${var.environment}"
      })
    }
  }

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports = {
      description                = "Nodes to cluster on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  # Node security group rules
  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all traffic"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }
    # Allow Istio sidecar injection
    ingress_cluster_istio = {
      description                   = "Cluster to nodes Istio webhook"
      protocol                      = "tcp"
      from_port                     = 15017
      to_port                       = 15017
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }

  tags = merge(var.tags, {
    Module = "eks"
  })
}

# IRSA for VPC CNI
module "vpc_cni_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name             = "${var.project}-vpc-cni-${var.environment}"
  attach_vpc_cni_policy = true
  vpc_cni_enable_ipv4   = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-node"]
    }
  }

  tags = var.tags
}

# IRSA for EBS CSI Driver
module "ebs_csi_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.37"

  role_name             = "${var.project}-ebs-csi-${var.environment}"
  attach_ebs_csi_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:ebs-csi-controller-sa"]
    }
  }

  tags = var.tags
}
