/**
 * AI & Agentic layer type definitions for the Lastmile Gig platform.
 *
 * Shared types for inference, agent workflows, RAG operations,
 * and analytics across TypeScript frontend and backend services.
 *
 * @see docs/specs/05_AI_AGENTIC_LAYER.md
 * @see docs/specs/18_AGENTIC_DEV_STANDARDS.md
 */

// --- Inference Types ---

export enum InferenceType {
  COMPLETION = 'completion',
  CLASSIFICATION = 'classification',
  EXTRACTION = 'extraction',
  SUMMARIZATION = 'summarization',
  SENTIMENT = 'sentiment',
  FRAUD_DETECTION = 'fraud_detection',
}

export enum LLMProvider {
  BEDROCK = 'bedrock',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export interface InferenceRequest {
  prompt: string;
  systemPrompt?: string;
  inferenceType: InferenceType;
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, unknown>;
  traceId?: string;
}

export interface InferenceResponse {
  requestId: string;
  content: string;
  inferenceType: InferenceType;
  modelId: string;
  provider: LLMProvider;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  confidence: number | null;
  confidenceAction: ConfidenceAction | null;
  cached: boolean;
  timestamp: string;
}

// --- Agent Types ---

export enum AgentType {
  DISPATCH_OPTIMIZER = 'dispatch_optimizer',
  FRAUD_INVESTIGATOR = 'fraud_investigator',
  SLA_MONITOR = 'sla_monitor',
  DRIVER_SCORER = 'driver_scorer',
  ROUTE_PLANNER = 'route_planner',
  DEMAND_FORECASTER = 'demand_forecaster',
}

export enum CrewType {
  INCIDENT_RESPONSE = 'incident_response',
  ESG_REPORTING = 'esg_reporting',
  PARTNER_ONBOARDING = 'partner_onboarding',
  FLEET_OPTIMIZATION = 'fleet_optimization',
}

export enum AgentRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  HITL_PENDING = 'hitl_pending',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}

export enum ConfidenceAction {
  AUTO_EXECUTE = 'auto_execute',
  HITL_REVIEW = 'hitl_review',
  ESCALATE = 'escalate',
}

export interface AgentRunResult {
  runId: string;
  agentType: AgentType;
  status: AgentRunStatus;
  result: Record<string, unknown> | null;
  confidence: number;
  confidenceAction: ConfidenceAction;
  steps: AgentStep[];
  totalSteps: number;
  totalTokens: number;
  totalDurationMs: number;
  hitlRequired: boolean;
  hitlReason: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AgentStep {
  stepNumber: number;
  nodeName: string;
  action: string;
  observation: string;
  durationMs: number;
  tokensUsed: number;
}

export interface HITLDecision {
  runId: string;
  approved: boolean;
  modifiedResult: Record<string, unknown> | null;
  reviewerId: string;
  notes: string | null;
}

// --- RAG Types ---

export interface RAGQuery {
  query: string;
  namespace?: string;
  topK?: number;
  minScore?: number;
  includeSources?: boolean;
  systemPrompt?: string;
  filters?: Record<string, unknown>;
}

export interface RAGResponse {
  requestId: string;
  answer: string;
  sources: RAGSource[];
  modelId: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  confidence: number;
}

export interface RAGSource {
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown> | null;
}

// --- Analytics Types ---

export enum TimeGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  zone: string | null;
}

export interface DemandForecast {
  zone: string;
  forecastHours: number;
  dataPoints: ForecastDataPoint[];
  modelVersion: string;
  generatedAt: string;
}

export interface ForecastDataPoint {
  timestamp: string;
  predictedOrders: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  driversNeeded: number;
}
