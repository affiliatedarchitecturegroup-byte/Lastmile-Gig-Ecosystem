/**
 * Kafka event types for AI and Agentic layer events.
 *
 * Event schemas for inference requests, agent runs, crew executions,
 * HITL decisions, and analytics events.
 *
 * @see docs/specs/05_AI_AGENTIC_LAYER.md
 * @see docs/specs/18_AGENTIC_DEV_STANDARDS.md
 */

import type { KafkaEvent } from './kafka-events.types';

// --- Inference Events ---

export interface InferenceCompletedEvent
  extends KafkaEvent<{
    requestId: string;
    inferenceType: string;
    modelId: string;
    provider: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    confidence: number | null;
    confidenceAction: string | null;
    cached: boolean;
  }> {
  eventType: 'ai.inference.completed';
}

export interface InferenceFailedEvent
  extends KafkaEvent<{
    requestId: string;
    inferenceType: string;
    modelId: string;
    error: string;
    latencyMs: number;
  }> {
  eventType: 'ai.inference.failed';
}

// --- Agent Events ---

export interface AgentRunStartedEvent
  extends KafkaEvent<{
    runId: string;
    agentType: string;
    inputData: Record<string, unknown>;
  }> {
  eventType: 'ai.agent.run.started';
}

export interface AgentRunCompletedEvent
  extends KafkaEvent<{
    runId: string;
    agentType: string;
    status: string;
    confidence: number;
    confidenceAction: string;
    totalSteps: number;
    totalTokens: number;
    totalDurationMs: number;
    hitlRequired: boolean;
  }> {
  eventType: 'ai.agent.run.completed';
}

export interface AgentHITLRequestedEvent
  extends KafkaEvent<{
    runId: string;
    agentType: string;
    confidence: number;
    reason: string;
    pendingResult: Record<string, unknown>;
  }> {
  eventType: 'ai.agent.hitl.requested';
}

export interface AgentHITLDecisionEvent
  extends KafkaEvent<{
    runId: string;
    approved: boolean;
    reviewerId: string;
    notes: string | null;
  }> {
  eventType: 'ai.agent.hitl.decision';
}

// --- Crew Events ---

export interface CrewRunCompletedEvent
  extends KafkaEvent<{
    runId: string;
    crewType: string;
    status: string;
    agentCount: number;
    totalTokens: number;
    totalDurationMs: number;
  }> {
  eventType: 'ai.crew.run.completed';
}

// --- RAG Events ---

export interface RAGQueryEvent
  extends KafkaEvent<{
    requestId: string;
    queryLength: number;
    sourcesRetrieved: number;
    topScore: number;
    tokensUsed: number;
    latencyMs: number;
  }> {
  eventType: 'ai.rag.query';
}

export interface DocumentIndexedEvent
  extends KafkaEvent<{
    documentId: string;
    chunksCreated: number;
    vectorsUpserted: number;
    namespace: string;
  }> {
  eventType: 'ai.rag.document.indexed';
}

// --- Analytics Events ---

export interface ForecastGeneratedEvent
  extends KafkaEvent<{
    zone: string;
    forecastHours: number;
    modelVersion: string;
    peakDemandHour: number;
    peakOrdersPredicted: number;
  }> {
  eventType: 'analytics.forecast.generated';
}

export interface ReportGeneratedEvent
  extends KafkaEvent<{
    reportId: string;
    reportType: string;
    zone: string;
    periodStart: string;
    periodEnd: string;
  }> {
  eventType: 'analytics.report.generated';
}

// --- Kafka Topic Constants ---

export const AI_KAFKA_TOPICS = {
  INFERENCE_COMPLETED: 'lmg.ai.inference.completed',
  INFERENCE_FAILED: 'lmg.ai.inference.failed',
  AGENT_RUN_STARTED: 'lmg.ai.agent.run.started',
  AGENT_RUN_COMPLETED: 'lmg.ai.agent.run.completed',
  AGENT_HITL_REQUESTED: 'lmg.ai.agent.hitl.requested',
  AGENT_HITL_DECISION: 'lmg.ai.agent.hitl.decision',
  CREW_RUN_COMPLETED: 'lmg.ai.crew.run.completed',
  RAG_QUERY: 'lmg.ai.rag.query',
  RAG_DOCUMENT_INDEXED: 'lmg.ai.rag.document.indexed',
  FORECAST_GENERATED: 'lmg.analytics.forecast.generated',
  REPORT_GENERATED: 'lmg.analytics.report.generated',
} as const;
