/**
 * Meta-Evolution Engine - Learning to Evolve Better
 *
 * Tracks which mutation operators work best and adapts strategy over time.
 * The system LEARNS how to evolve more effectively!
 *
 * Key Features:
 * - Operator Performance Tracking
 * - Dynamic Probability Adjustment
 * - Strategy Learning (which operators work in which contexts)
 * - Fitness Weight Adaptation
 *
 * This is evolution of evolution itself!
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0 - Evolution Boost
 */

import type { MutationType } from '../../types/GenomeV2.js';

/**
 * Operator performance record
 */
export interface OperatorPerformance {
    operatorName: MutationType | string;
    timesUsed: number;
    timesSuccessful: number; // Promoted to production
    avgFitnessImprovement: number;
    avgSandboxScore: number;
    lastUsed: Date;
    successRate: number; // timesSuccessful / timesUsed
}

/**
 * Context-specific performance (which operators work in which situations)
 */
export interface ContextualPerformance {
    context: string; // e.g., "low-quality", "high-latency", etc.
    operators: Map<string, {
        successRate: number;
        avgImprovement: number;
        sampleSize: number;
    }>;
}

/**
 * Strategy recommendation based on learned operator performance
 */
export interface StrategyRecommendation {
    bestOperator: string | null;
    confidence: number;
    alternatives: Array<{ operator: string; score: number }>;
    reasoning: string;
}

/**
 * Learning velocity — how fast the meta-learning is converging
 */
export interface LearningVelocity {
    velocityScore: number;
    status: 'converging' | 'exploring' | 'unstable';
    dominantOperator: string | null;
    stabilityTrend: 'stabilizing' | 'volatile' | 'unknown';
}

/**
 * Meta-Evolution Configuration
 */
export interface MetaEvolutionConfig {
    // Learning rate for probability adjustment
    learningRate: number; // Default: 0.1

    // Minimum sample size before adjusting probabilities
    minSampleSize: number; // Default: 10

    // Exploration rate (try underperforming operators sometimes)
    explorationRate: number; // Default: 0.15 (15% exploration)
}

/**
 * Meta-Evolution Engine
 *
 * Learns which mutation operators work best and adapts the evolution strategy.
 */
export class MetaEvolutionEngine {
    private operatorPerformance = new Map<string, OperatorPerformance>();
    private contextualPerformance: ContextualPerformance[] = [];
    private operatorProbabilities = new Map<string, number>();
    private config: Required<MetaEvolutionConfig>;
    private probabilitySnapshots: Array<{ probabilities: Map<string, number>; timestamp: Date }> = [];
    private totalMutationCount = 0;

    constructor(config?: Partial<MetaEvolutionConfig>) {
        this.config = {
            learningRate: config?.learningRate ?? 0.1,
            minSampleSize: config?.minSampleSize ?? 10,
            explorationRate: config?.explorationRate ?? 0.15,
        };
    }

    /**
     * Record mutation attempt
     */
    recordMutationAttempt(
        operatorName: string,
        success: boolean,
        fitnessImprovement: number,
        sandboxScore?: number,
        context?: string
    ): void {
        // Update operator performance
        let perf = this.operatorPerformance.get(operatorName);

        if (!perf) {
            perf = {
                operatorName,
                timesUsed: 0,
                timesSuccessful: 0,
                avgFitnessImprovement: 0,
                avgSandboxScore: 0,
                lastUsed: new Date(),
                successRate: 0,
            };
            this.operatorPerformance.set(operatorName, perf);
        }

        // Update stats
        perf.timesUsed++;
        if (success) {
            perf.timesSuccessful++;
        }

        // Update moving average for fitness improvement
        const alpha = 0.2; // Smoothing factor
        perf.avgFitnessImprovement =
            alpha * fitnessImprovement + (1 - alpha) * perf.avgFitnessImprovement;

        if (sandboxScore !== undefined) {
            perf.avgSandboxScore =
                alpha * sandboxScore + (1 - alpha) * perf.avgSandboxScore;
        }

        perf.successRate = perf.timesSuccessful / perf.timesUsed;
        perf.lastUsed = new Date();

        // Update contextual performance if context provided
        if (context) {
            this.recordContextualPerformance(operatorName, context, success, fitnessImprovement);
        }

        // Adapt operator probabilities
        this.adaptOperatorProbabilities();

        // Snapshot probabilities every 5 mutations for velocity tracking
        this.totalMutationCount++;
        if (this.totalMutationCount % 5 === 0) {
            this.probabilitySnapshots.push({
                probabilities: new Map(this.operatorProbabilities),
                timestamp: new Date(),
            });
            // Keep max 20 snapshots
            if (this.probabilitySnapshots.length > 20) {
                this.probabilitySnapshots = this.probabilitySnapshots.slice(-20);
            }
        }
    }

    /**
     * Record contextual performance
     */
    private recordContextualPerformance(
        operatorName: string,
        context: string,
        success: boolean,
        improvement: number
    ): void {
        // Find or create context
        let ctx = this.contextualPerformance.find(c => c.context === context);

        if (!ctx) {
            ctx = {
                context,
                operators: new Map(),
            };
            this.contextualPerformance.push(ctx);
        }

        // Update operator stats for this context
        let stats = ctx.operators.get(operatorName);

        if (!stats) {
            stats = {
                successRate: 0,
                avgImprovement: 0,
                sampleSize: 0,
            };
            ctx.operators.set(operatorName, stats);
        }

        stats.sampleSize++;

        // Update moving averages
        const alpha = 0.3;
        stats.avgImprovement = alpha * improvement + (1 - alpha) * stats.avgImprovement;
        stats.successRate =
            alpha * (success ? 1 : 0) + (1 - alpha) * stats.successRate;
    }

    /**
     * Adapt operator probabilities based on performance
     *
     * Better-performing operators get higher probability
     */
    private adaptOperatorProbabilities(): void {
        const operators = Array.from(this.operatorPerformance.values());

        if (operators.length === 0) {
            return;
        }

        // Only adapt if we have enough samples
        const hasEnoughSamples = operators.some(
            op => op.timesUsed >= this.config.minSampleSize
        );

        if (!hasEnoughSamples) {
            // Equal probabilities until we have data
            const equalProb = 1 / operators.length;
            for (const op of operators) {
                this.operatorProbabilities.set(op.operatorName, equalProb);
            }
            return;
        }

        // Calculate scores for each operator
        const scores = operators.map(op => ({
            name: op.operatorName,
            score: this.calculateOperatorScore(op),
        }));

        // Softmax to get probabilities
        const totalExp = scores.reduce((sum, s) => sum + Math.exp(s.score), 0);

        for (const { name, score } of scores) {
            const prob = Math.exp(score) / totalExp;

            // Mix exploitation (learned probs) with exploration (uniform)
            const finalProb =
                (1 - this.config.explorationRate) * prob +
                this.config.explorationRate * (1 / operators.length);

            this.operatorProbabilities.set(name, finalProb);
        }
    }

    /**
     * Calculate score for an operator (higher = better)
     */
    private calculateOperatorScore(perf: OperatorPerformance): number {
        // Combine multiple factors:
        // - Success rate (0-1)
        // - Average improvement (0-1+)
        // - Recency bonus (used recently = might be on a streak)

        const successWeight = 0.4;
        const improvementWeight = 0.5;
        const recencyWeight = 0.1;

        // Recency score: decays over time
        const hoursSinceUse = (Date.now() - perf.lastUsed.getTime()) / (1000 * 60 * 60);
        const recencyScore = Math.exp(-hoursSinceUse / 24); // Decay over 24 hours

        const score =
            perf.successRate * successWeight +
            perf.avgFitnessImprovement * improvementWeight +
            recencyScore * recencyWeight;

        return score;
    }

    /**
     * Select operator based on learned probabilities
     */
    selectOperator(availableOperators: string[], context?: string): string {
        // If context provided and we have contextual data, use it
        if (context) {
            const contextual = this.selectOperatorForContext(availableOperators, context);
            if (contextual) {
                return contextual;
            }
        }

        // Use learned probabilities
        const probabilities = availableOperators.map(name => ({
            name,
            prob: this.operatorProbabilities.get(name) || 1 / availableOperators.length,
        }));

        // Normalize
        const total = probabilities.reduce((sum, p) => sum + p.prob, 0);
        const normalized = probabilities.map(p => ({
            ...p,
            prob: p.prob / total,
        }));

        // Random selection weighted by probabilities
        const rand = Math.random();
        let cumulative = 0;

        for (const { name, prob } of normalized) {
            cumulative += prob;
            if (rand <= cumulative) {
                return name;
            }
        }

        // Fallback (shouldn't happen)
        return availableOperators[0];
    }

    /**
     * Select operator for specific context
     */
    private selectOperatorForContext(
        availableOperators: string[],
        context: string
    ): string | null {
        const ctx = this.contextualPerformance.find(c => c.context === context);

        if (!ctx || ctx.operators.size === 0) {
            return null; // No data for this context
        }

        // Find best operator for this context
        let bestOperator: string | null = null;
        let bestScore = -Infinity;

        for (const name of availableOperators) {
            const stats = ctx.operators.get(name);

            if (!stats || stats.sampleSize < 3) {
                continue; // Not enough data
            }

            // Score = combination of success rate and improvement
            const score = stats.successRate * 0.5 + stats.avgImprovement * 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestOperator = name;
            }
        }

        return bestOperator;
    }

    /**
     * Get operator performance stats
     */
    getOperatorPerformance(operatorName?: string): OperatorPerformance[] {
        if (operatorName) {
            const perf = this.operatorPerformance.get(operatorName);
            return perf ? [perf] : [];
        }

        return Array.from(this.operatorPerformance.values());
    }

    /**
     * Get operator probabilities
     */
    getOperatorProbabilities(): Map<string, number> {
        return new Map(this.operatorProbabilities);
    }

    /**
     * Get contextual performance
     */
    getContextualPerformance(): ContextualPerformance[] {
        return [...this.contextualPerformance];
    }

    /**
     * Get learning summary
     */
    getLearningSummary(): {
        totalMutations: number;
        successfulMutations: number;
        overallSuccessRate: number;
        bestOperator: string | null;
        worstOperator: string | null;
    } {
        const operators = Array.from(this.operatorPerformance.values());

        if (operators.length === 0) {
            return {
                totalMutations: 0,
                successfulMutations: 0,
                overallSuccessRate: 0,
                bestOperator: null,
                worstOperator: null,
            };
        }

        const totalMutations = operators.reduce((sum, op) => sum + op.timesUsed, 0);
        const successfulMutations = operators.reduce((sum, op) => sum + op.timesSuccessful, 0);
        const overallSuccessRate = successfulMutations / totalMutations;

        // Find best and worst
        const sorted = [...operators].sort((a, b) => b.successRate - a.successRate);

        return {
            totalMutations,
            successfulMutations,
            overallSuccessRate,
            bestOperator: sorted[0]?.operatorName || null,
            worstOperator: sorted[sorted.length - 1]?.operatorName || null,
        };
    }

    /**
     * Get a strategy recommendation based on learned operator performance.
     */
    getStrategyRecommendation(context?: string): StrategyRecommendation {
        const operators = Array.from(this.operatorPerformance.values());

        if (operators.length === 0) {
            return {
                bestOperator: null,
                confidence: 0,
                alternatives: [],
                reasoning: 'No mutation data yet — using uniform exploration.',
            };
        }

        // If context provided, check contextual performance first
        if (context) {
            const ctx = this.contextualPerformance.find(c => c.context === context);
            if (ctx && ctx.operators.size > 0) {
                const ranked = Array.from(ctx.operators.entries())
                    .filter(([, stats]) => stats.sampleSize >= 3)
                    .sort((a, b) => (b[1].successRate * 0.5 + b[1].avgImprovement * 0.5) - (a[1].successRate * 0.5 + a[1].avgImprovement * 0.5));

                if (ranked.length > 0) {
                    const [bestName, bestStats] = ranked[0];
                    return {
                        bestOperator: bestName,
                        confidence: Math.min(1, bestStats.successRate * (bestStats.sampleSize / 10)),
                        alternatives: ranked.slice(1, 3).map(([name, stats]) => ({
                            operator: name,
                            score: stats.successRate * 0.5 + stats.avgImprovement * 0.5,
                        })),
                        reasoning: `Contextual best for '${context}': ${bestName} (${Math.round(bestStats.successRate * 100)}% success, ${bestStats.sampleSize} samples).`,
                    };
                }
            }
        }

        // Use global scores
        const scored = operators.map(op => ({
            name: op.operatorName,
            score: this.calculateOperatorScore(op),
            perf: op,
        })).sort((a, b) => b.score - a.score);

        const best = scored[0];
        const totalSamples = operators.reduce((sum, op) => sum + op.timesUsed, 0);

        return {
            bestOperator: best.name,
            confidence: Math.min(1, best.perf.successRate * (totalSamples / 20)),
            alternatives: scored.slice(1, 3).map(s => ({ operator: s.name, score: s.score })),
            reasoning: `Best operator: ${best.name} (${Math.round(best.perf.successRate * 100)}% success rate across ${best.perf.timesUsed} uses).`,
        };
    }

    /**
     * Get learning velocity — how fast the meta-learning is converging.
     */
    getLearningVelocity(): LearningVelocity {
        if (this.probabilitySnapshots.length < 2) {
            const dominant = this.getDominantOperator();
            return {
                velocityScore: 0.3,
                status: 'exploring',
                dominantOperator: dominant,
                stabilityTrend: 'unknown',
            };
        }

        // Calculate average delta between consecutive snapshots
        const deltas: number[] = [];
        for (let i = 1; i < this.probabilitySnapshots.length; i++) {
            const prev = this.probabilitySnapshots[i - 1].probabilities;
            const curr = this.probabilitySnapshots[i].probabilities;
            let totalDelta = 0;
            let count = 0;
            for (const [name, prob] of curr) {
                const prevProb = prev.get(name) ?? prob;
                totalDelta += Math.abs(prob - prevProb);
                count++;
            }
            if (count > 0) deltas.push(totalDelta / count);
        }

        const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

        // Determine status
        const status: LearningVelocity['status'] =
            avgDelta < 0.1 ? 'converging' :
            avgDelta < 0.4 ? 'exploring' : 'unstable';

        // Determine stability trend: compare recent deltas vs older
        let stabilityTrend: LearningVelocity['stabilityTrend'] = 'unknown';
        if (deltas.length >= 4) {
            const midpoint = Math.floor(deltas.length / 2);
            const olderAvg = deltas.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
            const recentAvg = deltas.slice(midpoint).reduce((a, b) => a + b, 0) / (deltas.length - midpoint);
            stabilityTrend = recentAvg < olderAvg * 0.8 ? 'stabilizing' : 'volatile';
        }

        return {
            velocityScore: avgDelta,
            status,
            dominantOperator: this.getDominantOperator(),
            stabilityTrend,
        };
    }

    /**
     * Generate a prompt section for the system prompt with evolution strategy info.
     * Returns null if no mutation data exists yet.
     */
    toPromptSection(): string | null {
        const summary = this.getLearningSummary();
        if (summary.totalMutations === 0) return null;

        const recommendation = this.getStrategyRecommendation();
        const velocity = this.getLearningVelocity();

        const lines: string[] = ['## Evolution Strategy'];
        if (recommendation.bestOperator) {
            lines.push(`**Best operator:** ${recommendation.bestOperator} (${Math.round(recommendation.confidence * 100)}% confidence)`);
        }
        lines.push(`**Success rate:** ${Math.round(summary.overallSuccessRate * 100)}% across ${summary.totalMutations} mutations`);
        lines.push(`**Learning status:** ${velocity.status} (velocity: ${velocity.velocityScore.toFixed(2)}, trend: ${velocity.stabilityTrend})`);

        return lines.join('\n');
    }

    /**
     * Reset learning (for testing or fresh start)
     */
    reset(): void {
        this.operatorPerformance.clear();
        this.contextualPerformance = [];
        this.operatorProbabilities.clear();
        this.probabilitySnapshots = [];
        this.totalMutationCount = 0;
    }

    // ── Private Helpers ─────────────────────────────────────

    private getDominantOperator(): string | null {
        let maxProb = 0;
        let dominant: string | null = null;
        for (const [name, prob] of this.operatorProbabilities) {
            if (prob > maxProb) {
                maxProb = prob;
                dominant = name;
            }
        }
        return dominant;
    }
}
