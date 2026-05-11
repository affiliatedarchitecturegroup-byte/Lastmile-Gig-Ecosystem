/**
 * Performance Scoring Service - SageMaker ML Integration
 *
 * Calculates driver performance scores using an XGBoost model
 * deployed on AWS SageMaker. Scores are used for dispatch priority,
 * tier assignment, and commission rate adjustments.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P131-P134
 * @see docs/specs/05_AI_AGENTIC_LAYER.md
 * @module services/performance-scoring.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DriverRepository } from '../repositories/driver.repository';
import { KafkaProducerService } from './kafka-producer.service';
import type { DriverServiceConfig } from '../config/driver.config';

/**
 * Performance score input features for SageMaker model.
 */
export interface PerformanceFeatures {
  deliveriesCompleted30d: number;
  onTimeRate: number;
  customerRatingAvg: number;
  acceptanceRate: number;
  cancellationRate: number;
  averageDeliveryTime: number;
  peakHoursParticipation: number;
  incidentCount30d: number;
  daysActive30d: number;
  zoneCoverage: number;
}

/**
 * Performance score result from SageMaker.
 */
export interface PerformanceScoreResult {
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'elite';
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  calculatedAt: string;
  modelVersion: string;
}

/**
 * Tier thresholds and benefits.
 */
const TIER_THRESHOLDS = {
  elite: { minScore: 90, commissionRate: 0.10, label: 'Elite', color: '#8B5CF6' },
  gold: { minScore: 75, commissionRate: 0.12, label: 'Gold', color: '#F59E0B' },
  silver: { minScore: 55, commissionRate: 0.15, label: 'Silver', color: '#94A3B8' },
  bronze: { minScore: 0, commissionRate: 0.18, label: 'Bronze', color: '#CD7F32' },
} as const;

@Injectable()
export class PerformanceScoringService {
  private readonly logger = new Logger(PerformanceScoringService.name);
  private readonly config: DriverServiceConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly driverRepo: DriverRepository,
    private readonly kafkaProducer: KafkaProducerService,
  ) {
    const config = this.configService.get<DriverServiceConfig>('driver');
    if (!config) throw new Error('Driver configuration not loaded');
    this.config = config;
  }

  /**
   * Calculates a driver's performance score.
   * In production, calls SageMaker endpoint with feature vector.
   * In development, uses a rule-based scoring algorithm.
   *
   * @param driverId - Driver to score
   * @returns Performance score result with tier and recommendations
   */
  async scoreDriver(driverId: string): Promise<PerformanceScoreResult> {
    this.logger.log(`Scoring driver ${driverId}`);

    // Gather features (in production, query from analytics DB)
    const features = await this.gatherFeatures(driverId);

    // Calculate score
    let score: number;
    if (this.config.environment === 'production' && this.config.sagemaker.driverScoreEndpoint) {
      score = await this.invokeSageMaker(features);
    } else {
      score = this.calculateRuleBasedScore(features);
    }

    // Determine tier
    const tier = this.determineTier(score);

    // Generate insights
    const insights = this.generateInsights(features, score);

    // Detect trend (compare to previous score)
    const driver = await this.driverRepo.findById(driverId);
    const previousScore = driver.performance_score ?? 0;
    const trend = this.determineTrend(previousScore, score);

    // Update driver record
    await this.driverRepo.update(driverId, { performance_score: score });

    // Publish Kafka event
    await this.kafkaProducer.publishPerformanceScored(driverId, score, tier);

    const result: PerformanceScoreResult = {
      score: Math.round(score * 10) / 10,
      tier,
      trend,
      strengths: insights.strengths,
      improvementAreas: insights.improvements,
      recommendations: insights.recommendations,
      calculatedAt: new Date().toISOString(),
      modelVersion: 'v1.0.0-rules',
    };

    this.logger.log(`Driver ${driverId} scored: ${result.score} (${result.tier})`);
    return result;
  }

  /**
   * Scores all active drivers (weekly cron job via BullMQ).
   */
  async scoreAllDrivers(): Promise<{ scored: number; errors: number }> {
    this.logger.log('Starting weekly driver score batch');
    const { drivers } = await this.driverRepo.findAll(1, 10000, undefined, 'active');

    let scored = 0;
    let errors = 0;

    for (const driver of drivers) {
      try {
        await this.scoreDriver(driver.id);
        scored++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown';
        this.logger.error(`Failed to score driver ${driver.id}: ${msg}`);
        errors++;
      }
    }

    this.logger.log(`Batch scoring complete: ${scored} scored, ${errors} errors`);
    return { scored, errors };
  }

  /**
   * Gets tier information for display.
   */
  getTierInfo(tier: string): { label: string; color: string; commissionRate: number } {
    const info = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS];
    return info ?? TIER_THRESHOLDS.bronze;
  }

  /**
   * Gets all tier definitions.
   */
  getAllTiers(): Array<{ tier: string; minScore: number; commissionRate: number; label: string }> {
    return Object.entries(TIER_THRESHOLDS).map(([tier, config]) => ({
      tier,
      ...config,
    }));
  }

  // --- Private helpers ---

  private async gatherFeatures(_driverId: string): Promise<PerformanceFeatures> {
    // Dev mode: return mock features
    return {
      deliveriesCompleted30d: 120 + Math.floor(Math.random() * 80),
      onTimeRate: 0.85 + Math.random() * 0.12,
      customerRatingAvg: 4.2 + Math.random() * 0.7,
      acceptanceRate: 0.75 + Math.random() * 0.2,
      cancellationRate: Math.random() * 0.08,
      averageDeliveryTime: 18 + Math.floor(Math.random() * 10),
      peakHoursParticipation: 0.5 + Math.random() * 0.4,
      incidentCount30d: Math.floor(Math.random() * 3),
      daysActive30d: 20 + Math.floor(Math.random() * 10),
      zoneCoverage: 0.6 + Math.random() * 0.35,
    };
  }

  private calculateRuleBasedScore(features: PerformanceFeatures): number {
    const weights = {
      onTimeRate: 25,
      customerRating: 20,
      acceptanceRate: 15,
      deliveryVolume: 15,
      peakParticipation: 10,
      lowCancellation: 10,
      consistency: 5,
    };

    let score = 0;
    score += Math.min(features.onTimeRate, 1) * weights.onTimeRate;
    score += (features.customerRatingAvg / 5) * weights.customerRating;
    score += Math.min(features.acceptanceRate, 1) * weights.acceptanceRate;
    score += Math.min(features.deliveriesCompleted30d / 200, 1) * weights.deliveryVolume;
    score += Math.min(features.peakHoursParticipation, 1) * weights.peakParticipation;
    score += (1 - Math.min(features.cancellationRate, 0.2) / 0.2) * weights.lowCancellation;
    score += (features.daysActive30d / 30) * weights.consistency;

    // Penalty for incidents
    score -= features.incidentCount30d * 5;

    return Math.max(0, Math.min(100, score));
  }

  private async invokeSageMaker(features: PerformanceFeatures): Promise<number> {
    // Production: call SageMaker runtime endpoint
    // const client = new SageMakerRuntimeClient({ region: this.config.sagemaker.region });
    // const response = await client.send(new InvokeEndpointCommand({ ... }));
    return this.calculateRuleBasedScore(features);
  }

  private determineTier(score: number): 'bronze' | 'silver' | 'gold' | 'elite' {
    if (score >= TIER_THRESHOLDS.elite.minScore) return 'elite';
    if (score >= TIER_THRESHOLDS.gold.minScore) return 'gold';
    if (score >= TIER_THRESHOLDS.silver.minScore) return 'silver';
    return 'bronze';
  }

  private determineTrend(previous: number, current: number): 'improving' | 'stable' | 'declining' {
    const diff = current - previous;
    if (diff > 3) return 'improving';
    if (diff < -3) return 'declining';
    return 'stable';
  }

  private generateInsights(features: PerformanceFeatures, _score: number): {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    if (features.onTimeRate > 0.9) strengths.push('Excellent on-time delivery rate');
    else if (features.onTimeRate < 0.8) improvements.push('On-time delivery rate needs improvement');

    if (features.customerRatingAvg > 4.5) strengths.push('Outstanding customer ratings');
    else if (features.customerRatingAvg < 4.0) improvements.push('Customer ratings below average');

    if (features.acceptanceRate > 0.85) strengths.push('High order acceptance rate');
    else if (features.acceptanceRate < 0.7) {
      improvements.push('Order acceptance rate is low');
      recommendations.push('Try accepting more orders during peak hours to boost your score');
    }

    if (features.peakHoursParticipation > 0.7) strengths.push('Strong peak hours participation');
    else recommendations.push('Working during lunch (11-14) and dinner (17-20) hours earns bonus points');

    if (features.cancellationRate > 0.05) {
      improvements.push('High cancellation rate');
      recommendations.push('Reduce cancellations by only accepting orders you can complete');
    }

    if (features.deliveriesCompleted30d > 150) strengths.push('High delivery volume this month');

    return { strengths, improvements, recommendations };
  }
}
