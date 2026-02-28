/**
 * Canary Deployment System - Gradual Rollout Manager
 *
 * Deploys mutations to a small percentage of traffic (5% default)
 * for real-world validation before full promotion.
 *
 * Features:
 * - Traffic splitting (5% canary, 95% stable)
 * - Automatic rollback on performance degradation
 * - Real-time metrics comparison (canary vs stable)
 * - Gradual ramp-up (5% → 25% → 50% → 100%)
 *
 * Living OS v1.0 Must-Have: Safe production deployments
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { GeneAllele } from '../types/index.js';

// ─── Canary Configuration ───────────────────────────────────

export interface CanaryConfig {
    // Traffic allocation
    initialTrafficPercent: number;      // Start at 5%
    rampUpSteps: number[];              // [25, 50, 100]
    rampUpIntervalMinutes: number;      // Time between ramp-ups

    // Safety thresholds
    maxErrorRateIncrease: number;       // Max % increase vs stable (0.1 = 10%)
    maxLatencyIncrease: number;         // Max ms increase vs stable
    minSampleSize: number;              // Min requests before evaluation

    // Rollback behavior
    autoRollback: boolean;              // Auto-rollback on failure
    rollbackOnError: boolean;           // Rollback on any error
}

// ─── Canary Deployment ──────────────────────────────────────

export interface CanaryDeployment {
    id: string;
    genomeId: string;
    layer: 0 | 1 | 2;
    gene: string;

    // Variants
    stableVariant: string;              // Current production variant
    canaryVariant: string;              // New variant being tested

    // Traffic allocation
    trafficPercent: number;             // Current % to canary
    targetPercent: number;              // Target % (ramp-up)

    // Status
    status: 'active' | 'ramping' | 'complete' | 'rolled-back';
    startedAt: Date;
    lastRampAt?: Date;

    // Metrics
    metrics: {
        stable: DeploymentMetrics;
        canary: DeploymentMetrics;
    };
}

export interface DeploymentMetrics {
    requests: number;
    errors: number;
    avgLatencyMs: number;
    avgFitness: number;
    successRate: number;
}

// ─── Canary Decision ────────────────────────────────────────

export interface CanaryDecision {
    action: 'continue' | 'ramp-up' | 'promote' | 'rollback';
    reason: string;
    comparison: {
        errorRateDelta: number;
        latencyDelta: number;
        fitnessDelta: number;
    };
    recommendation?: string;
}

// ─── Canary Deployment Manager ──────────────────────────────

export class CanaryDeploymentManager {
    private activeDeployments = new Map<string, CanaryDeployment>();
    private defaultConfig: CanaryConfig = {
        initialTrafficPercent: 5,
        rampUpSteps: [25, 50, 100],
        rampUpIntervalMinutes: 30,
        maxErrorRateIncrease: 0.10,     // 10%
        maxLatencyIncrease: 500,         // 500ms
        minSampleSize: 50,
        autoRollback: true,
        rollbackOnError: false,
    };

    constructor(
        private storage: StorageAdapter,
        private config: Partial<CanaryConfig> = {},
    ) {
        this.config = { ...this.defaultConfig, ...config };
    }

    /**
     * Start canary deployment
     *
     * Deploys new variant to small % of traffic
     */
    async startCanary(options: {
        genomeId: string;
        layer: 0 | 1 | 2;
        gene: string;
        stableAllele: GeneAllele;
        canaryAllele: GeneAllele;
    }): Promise<CanaryDeployment> {
        const deploymentId = `canary_${options.genomeId}_${options.gene}_${Date.now()}`;

        const deployment: CanaryDeployment = {
            id: deploymentId,
            genomeId: options.genomeId,
            layer: options.layer,
            gene: options.gene,
            stableVariant: options.stableAllele.variant,
            canaryVariant: options.canaryAllele.variant,
            trafficPercent: this.config.initialTrafficPercent!,
            targetPercent: this.config.initialTrafficPercent!,
            status: 'active',
            startedAt: new Date(),
            metrics: {
                stable: this.initializeMetrics(),
                canary: this.initializeMetrics(),
            },
        };

        this.activeDeployments.set(deploymentId, deployment);

        // Log canary start
        await this.storage.logMutation({
            genomeId: options.genomeId,
            layer: options.layer,
            gene: options.gene,
            variant: options.canaryAllele.variant,
            mutationType: 'exploratory',
            parentVariant: options.stableAllele.variant,
            deployed: false,
            reason: `Canary deployment started (${this.config.initialTrafficPercent}% traffic)`,
            createdAt: new Date(),
        });

        return deployment;
    }

    /**
     * Route request to stable or canary variant
     *
     * Uses traffic % to determine routing
     */
    shouldUseCanary(deploymentId: string, userId: string): boolean {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment || deployment.status !== 'active') {
            return false;
        }

        // Consistent hashing: same user always gets same variant
        const hash = this.hashUserId(userId);
        const threshold = deployment.trafficPercent / 100;

        return hash < threshold;
    }

    /**
     * Record request metrics
     */
    recordRequest(
        deploymentId: string,
        variant: 'stable' | 'canary',
        metrics: {
            success: boolean;
            latencyMs: number;
            fitness?: number;
        },
    ): void {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) return;

        const target = deployment.metrics[variant];

        target.requests += 1;
        if (!metrics.success) target.errors += 1;

        // Exponential moving average for latency
        const alpha = 0.1;
        target.avgLatencyMs = target.avgLatencyMs * (1 - alpha) + metrics.latencyMs * alpha;

        if (metrics.fitness !== undefined) {
            target.avgFitness = target.avgFitness * (1 - alpha) + metrics.fitness * alpha;
        }

        target.successRate = target.requests > 0
            ? (target.requests - target.errors) / target.requests
            : 1.0;
    }

    /**
     * Evaluate canary performance
     *
     * Compare canary vs stable and make decision
     */
    async evaluateCanary(deploymentId: string): Promise<CanaryDecision> {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error(`Canary deployment not found: ${deploymentId}`);
        }

        const { stable, canary } = deployment.metrics;

        // Check if we have enough samples
        if (canary.requests < this.config.minSampleSize!) {
            return {
                action: 'continue',
                reason: `Insufficient samples (${canary.requests}/${this.config.minSampleSize})`,
                comparison: {
                    errorRateDelta: 0,
                    latencyDelta: 0,
                    fitnessDelta: 0,
                },
            };
        }

        // Calculate deltas
        const errorRateDelta = (1 - canary.successRate) - (1 - stable.successRate);
        const latencyDelta = canary.avgLatencyMs - stable.avgLatencyMs;
        const fitnessDelta = canary.avgFitness - stable.avgFitness;

        // Check for rollback conditions
        if (this.config.autoRollback) {
            // Error rate increased too much
            if (errorRateDelta > this.config.maxErrorRateIncrease!) {
                return {
                    action: 'rollback',
                    reason: `Error rate increased by ${(errorRateDelta * 100).toFixed(1)}% (max: ${(this.config.maxErrorRateIncrease! * 100).toFixed(1)}%)`,
                    comparison: { errorRateDelta, latencyDelta, fitnessDelta },
                    recommendation: 'Canary variant performing worse than stable',
                };
            }

            // Latency increased too much
            if (latencyDelta > this.config.maxLatencyIncrease!) {
                return {
                    action: 'rollback',
                    reason: `Latency increased by ${latencyDelta.toFixed(0)}ms (max: ${this.config.maxLatencyIncrease}ms)`,
                    comparison: { errorRateDelta, latencyDelta, fitnessDelta },
                    recommendation: 'Canary variant too slow',
                };
            }
        }

        // Check for ramp-up conditions
        if (deployment.status === 'active') {
            // Canary performing well, ramp up traffic
            if (errorRateDelta <= 0 && fitnessDelta >= 0) {
                return {
                    action: 'ramp-up',
                    reason: 'Canary performing as well or better than stable',
                    comparison: { errorRateDelta, latencyDelta, fitnessDelta },
                    recommendation: `Increase traffic to next step: ${this.getNextRampStep(deployment.trafficPercent)}%`,
                };
            }
        }

        // Check for full promotion
        if (deployment.trafficPercent >= 100) {
            return {
                action: 'promote',
                reason: 'Canary successfully validated at 100% traffic',
                comparison: { errorRateDelta, latencyDelta, fitnessDelta },
                recommendation: 'Promote canary to stable',
            };
        }

        // Continue monitoring
        return {
            action: 'continue',
            reason: 'Canary performing acceptably, continue monitoring',
            comparison: { errorRateDelta, latencyDelta, fitnessDelta },
        };
    }

    /**
     * Ramp up canary traffic
     */
    async rampUp(deploymentId: string): Promise<void> {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error(`Canary deployment not found: ${deploymentId}`);
        }

        const nextPercent = this.getNextRampStep(deployment.trafficPercent);

        deployment.trafficPercent = nextPercent;
        deployment.targetPercent = nextPercent;
        deployment.lastRampAt = new Date();

        if (nextPercent >= 100) {
            deployment.status = 'ramping';
        }

        await this.storage.logMutation({
            genomeId: deployment.genomeId,
            layer: deployment.layer,
            gene: deployment.gene,
            variant: deployment.canaryVariant,
            mutationType: 'exploratory',
            parentVariant: deployment.stableVariant,
            deployed: false,
            reason: `Canary ramped up to ${nextPercent}% traffic`,
            createdAt: new Date(),
        });
    }

    /**
     * Promote canary to stable (full deployment)
     */
    async promote(deploymentId: string): Promise<void> {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error(`Canary deployment not found: ${deploymentId}`);
        }

        deployment.status = 'complete';

        await this.storage.logMutation({
            genomeId: deployment.genomeId,
            layer: deployment.layer,
            gene: deployment.gene,
            variant: deployment.canaryVariant,
            mutationType: 'exploratory',
            parentVariant: deployment.stableVariant,
            deployed: true,
            reason: 'Canary successfully promoted to stable',
            fitnessImprovement: deployment.metrics.canary.avgFitness - deployment.metrics.stable.avgFitness,
            createdAt: new Date(),
        });

        this.activeDeployments.delete(deploymentId);
    }

    /**
     * Rollback canary deployment
     */
    async rollback(deploymentId: string, reason: string): Promise<void> {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            throw new Error(`Canary deployment not found: ${deploymentId}`);
        }

        deployment.status = 'rolled-back';

        await this.storage.logMutation({
            genomeId: deployment.genomeId,
            layer: deployment.layer,
            gene: deployment.gene,
            variant: deployment.stableVariant,
            mutationType: 'rollback',
            parentVariant: deployment.canaryVariant,
            deployed: true,
            reason: `Canary rolled back: ${reason}`,
            createdAt: new Date(),
        });

        this.activeDeployments.delete(deploymentId);
    }

    /**
     * Get canary deployment status
     */
    getDeployment(deploymentId: string): CanaryDeployment | undefined {
        return this.activeDeployments.get(deploymentId);
    }

    /**
     * Get all active deployments
     */
    getActiveDeployments(): CanaryDeployment[] {
        return Array.from(this.activeDeployments.values());
    }

    /**
     * Get canary report
     */
    getCanaryReport(deploymentId: string): string {
        const deployment = this.activeDeployments.get(deploymentId);
        if (!deployment) {
            return `Canary deployment not found: ${deploymentId}`;
        }

        const { stable, canary } = deployment.metrics;

        const lines: string[] = [];
        lines.push(`# 🐤 Canary Deployment Report\n`);
        lines.push(`**ID**: ${deployment.id}`);
        lines.push(`**Gene**: ${deployment.gene}`);
        lines.push(`**Status**: ${deployment.status}`);
        lines.push(`**Traffic**: ${deployment.trafficPercent}%\n`);

        lines.push(`## Metrics Comparison\n`);
        lines.push(`### Stable (${deployment.stableVariant})`);
        lines.push(`- Requests: ${stable.requests}`);
        lines.push(`- Success Rate: ${(stable.successRate * 100).toFixed(1)}%`);
        lines.push(`- Avg Latency: ${stable.avgLatencyMs.toFixed(0)}ms`);
        lines.push(`- Avg Fitness: ${(stable.avgFitness * 100).toFixed(1)}%\n`);

        lines.push(`### Canary (${deployment.canaryVariant})`);
        lines.push(`- Requests: ${canary.requests}`);
        lines.push(`- Success Rate: ${(canary.successRate * 100).toFixed(1)}%`);
        lines.push(`- Avg Latency: ${canary.avgLatencyMs.toFixed(0)}ms`);
        lines.push(`- Avg Fitness: ${(canary.avgFitness * 100).toFixed(1)}%`);

        return lines.join('\n');
    }

    // ═══════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════

    private initializeMetrics(): DeploymentMetrics {
        return {
            requests: 0,
            errors: 0,
            avgLatencyMs: 0,
            avgFitness: 0.5,
            successRate: 1.0,
        };
    }

    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash % 100) / 100; // 0-1 range
    }

    private getNextRampStep(currentPercent: number): number {
        const steps = this.config.rampUpSteps!;
        for (const step of steps) {
            if (step > currentPercent) {
                return step;
            }
        }
        return 100;
    }
}
