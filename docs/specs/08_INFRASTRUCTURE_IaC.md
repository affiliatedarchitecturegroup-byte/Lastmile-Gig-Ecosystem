# INFRASTRUCTURE & INFRASTRUCTURE-AS-CODE SPECIFICATION
**Document:** 08 of 19 | **Version:** 1.0 | **Classification:** Confidential  
**Domain:** `lastmilegig.aagais.co.za` | **Parent Entity:** Affiliated Architecture Group (AAG)

---

## 1. Cloud Strategy — AWS First, 100%

All production infrastructure runs on AWS. The primary region is **af-south-1 (Cape Town)** — chosen for data sovereignty alignment with POPIA and lowest latency to South African users. The disaster recovery region is **eu-west-1 (Ireland)**.

```
PRIMARY REGION:   af-south-1    (Cape Town)     → All production workloads
DR REGION:        eu-west-1     (Ireland)        → Replica databases, failover cluster
```

---

## 2. Terraform + Terragrunt — Infrastructure as Code

### 2.1 Repository Structure
```
infrastructure/
├── terraform/
│   ├── modules/
│   │   ├── vpc/               # VPC, subnets, NAT, IGW
│   │   ├── eks/               # EKS cluster, node groups, Karpenter
│   │   ├── msk/               # Managed Kafka (MSK)
│   │   ├── rds/               # RDS (if needed beyond Supabase)
│   │   ├── opensearch/        # AWS OpenSearch cluster
│   │   ├── s3/                # S3 buckets (assets, backups, artifacts)
│   │   ├── cloudfront/        # CDN distributions
│   │   ├── route53/           # DNS zones and records
│   │   ├── waf/               # WAF rules and associations
│   │   ├── iam/               # IAM roles, policies, IRSA
│   │   ├── secrets/           # Secrets Manager entries
│   │   ├── sagemaker/         # SageMaker domains, endpoints
│   │   └── monitoring/        # CloudWatch alarms, dashboards
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── production/
└── terragrunt/
    ├── terragrunt.hcl         # Root config — remote state, provider
    ├── dev/
    │   └── terragrunt.hcl
    ├── staging/
    │   └── terragrunt.hcl
    └── production/
        └── terragrunt.hcl
```

### 2.2 Root Terragrunt Config
```hcl
# terragrunt/terragrunt.hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "lmg-terraform-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "af-south-1"
    encrypt        = true
    dynamodb_table = "lmg-terraform-locks"
  }
}

locals {
  account_id  = get_aws_account_id()
  environment = get_env("ENVIRONMENT", "dev")
  common_tags = {
    Project     = "lastmile-gig"
    ManagedBy   = "terraform"
    Environment = local.environment
    Owner       = "AAG-TechTeam"
  }
}
```

### 2.3 VPC Module
```hcl
# modules/vpc/main.tf
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "lmg-vpc-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["af-south-1a", "af-south-1b", "af-south-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false  # One NAT per AZ for HA
  enable_dns_hostnames = true
  enable_dns_support   = true

  # EKS cluster tags (required for ALB controller)
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
    "kubernetes.io/cluster/lmg-eks"   = "owned"
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb"        = 1
    "kubernetes.io/cluster/lmg-eks" = "owned"
  }
}
```

### 2.4 EKS Cluster Module
```hcl
# modules/eks/main.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "lmg-eks-${var.environment}"
  cluster_version = "1.30"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  cluster_endpoint_public_access = true

  # Managed node group — baseline capacity
  eks_managed_node_groups = {
    baseline = {
      min_size     = 3
      max_size     = 6
      desired_size = 3
      instance_types = ["m6i.xlarge"]
      capacity_type  = "ON_DEMAND"
      labels = { role = "baseline" }
    }
    # Karpenter manages additional node provisioning dynamically
  }

  # IRSA for AWS service access from pods
  enable_irsa = true
}

# Karpenter for intelligent autoscaling
resource "helm_release" "karpenter" {
  name       = "karpenter"
  repository = "oci://public.ecr.aws/karpenter"
  chart      = "karpenter"
  namespace  = "karpenter"

  set { name = "settings.clusterName"; value = module.eks.cluster_name }
  set { name = "settings.interruptionQueue"; value = aws_sqs_queue.karpenter.name }
}
```

---

## 3. Kubernetes Cluster Architecture

### 3.1 Namespace Structure
```
NAMESPACE              PURPOSE
────────────────────────────────────────────────────────────
lmg-core               Core platform services (API gateway, auth, order)
lmg-drivers            Driver-facing services
lmg-fleet              Fleet management and IoT services
lmg-storefronts        Restaurant storefront services
lmg-ai                 AI inference and agentic services
lmg-blockchain         Blockchain and smart contract services
lmg-payments           Payment processing services
lmg-comms              Communications services
lmg-logistics          Enterprise logistics services
lmg-analytics          Analytics and reporting services
lmg-monitoring         Prometheus, Grafana, Loki, Tempo
lmg-ingress            Istio ingress gateway, ALB controller
lmg-argocd             ArgoCD GitOps controllers
karpenter              Karpenter autoscaler
vault                  HashiCorp Vault
```

### 3.2 Istio Service Mesh Configuration
```yaml
# istio-config/peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: lmg-core
spec:
  mtls:
    mode: STRICT  # All inter-service traffic must use mTLS

---
# istio-config/destination-rule.yaml — Circuit Breaker
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-circuit-breaker
spec:
  host: payment-service.lmg-payments.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

### 3.3 Sample Service Deployment
```yaml
# deployments/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: lmg-core
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
    spec:
      containers:
        - name: api-gateway
          image: lmg/api-gateway:latest
          ports:
            - containerPort: 3000
            - containerPort: 3001  # metrics
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: lmg-supabase-secret
                  key: DATABASE_URL
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: lmg-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 4. AWS MSK — Managed Kafka

```hcl
# modules/msk/main.tf
resource "aws_msk_cluster" "lmg_kafka" {
  cluster_name           = "lmg-kafka-${var.environment}"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.xlarge"
    client_subnets  = var.private_subnet_ids
    storage_info {
      ebs_storage_info { volume_size = 500 }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  enhanced_monitoring = "PER_TOPIC_PER_BROKER"
}
```

---

## 5. Coolify — Internal Deployment Platform

**Coolify** is deployed on a dedicated AWS EC2 instance (`t3.medium`) and serves as:
- Internal deployment UI for staging and preview environments
- Developer preview deployments (feature branches)
- Internal tooling hosting (SonarQube, pgAdmin, etc.)
- Non-production environment management

```
Instance Type:    t3.medium (2 vCPU, 4GB RAM)
OS:               Ubuntu 22.04 LTS
Storage:          100GB gp3 EBS
Access:           VPN-only (AWS Client VPN) — not public-facing
Backups:          Daily AMI snapshot
Domain:           deploy-internal.lastmilegig.aagais.co.za (private DNS)
```

---

## 6. Route 53 — DNS Architecture

```hcl
# DNS Records
lastmilegig.aagais.co.za          → AWS ALB (Next.js corporate + storefronts)
ops.lastmilegig.aagais.co.za      → AWS ALB (Angular ops dashboards)
admin.lastmilegig.aagais.co.za    → AWS ALB (Angular admin console)
command.lastmilegig.aagais.co.za  → AWS ALB (Angular command centre)
api.lastmilegig.aagais.co.za      → AWS ALB (NestJS API Gateway)
dev.lastmilegig.aagais.co.za      → AWS ALB (Developer Portal)
ws.lastmilegig.aagais.co.za       → AWS NLB (Elixir WebSocket — TCP passthrough)
```

---

## 7. AWS CloudFront — CDN

```hcl
resource "aws_cloudfront_distribution" "lmg_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"  # global CDN

  origin {
    domain_name = aws_s3_bucket.lmg_assets.bucket_regional_domain_name
    origin_id   = "S3-lmg-assets"
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.lmg.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-lmg-assets"
    compress         = true
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id = aws_cloudfront_cache_policy.lmg.id
  }

  # Custom header for WAF — only allow traffic through CloudFront
  custom_header {
    name  = "X-LMG-CDN-Secret"
    value = var.cdn_secret  # validated by WAF on origin
  }
}
```

---

## 8. Environment Strategy

| Environment | Purpose | Infrastructure |
|---|---|---|
| `dev` | Individual developer feature development | Coolify (shared EC2), Supabase dev project |
| `staging` | Pre-production integration testing, QA | Scaled-down EKS cluster (1/3 prod size) |
| `production` | Live platform | Full EKS cluster, Multi-AZ, all AWS services |

**Promotion Flow:**
```
feature-branch → dev (auto) → staging (PR merge) → production (manual approval gate)
```

---

*© 2026 Lastmile Gig (Pty) Ltd — A Subsidiary of Affiliated Architecture Group | Confidential*
