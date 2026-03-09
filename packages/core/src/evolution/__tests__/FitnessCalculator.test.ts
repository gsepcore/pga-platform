/**
 * Fitness Calculator Tests
 *
 * Tests for PGA's multi-objective fitness computation system:
 * - Empty interactions handling
 * - Single successful interaction
 * - Mixed success/failure interactions
 * - Quality computation (average of quality field)
 * - Success rate computation
 * - Token efficiency normalization
 * - Latency normalization
 * - Cost computation with model pricing
 * - Intervention rate calculation
 * - Custom weights
 * - Compare fitness
 * - Meets threshold check
 * - Compute improvement percentage
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect } from 'vitest';
import type { FitnessVector } from '../../types/GenomeV2.js';
import { FitnessCalculator } from '../FitnessCalculator.js';
import type { InteractionData } from '../FitnessCalculator.js';

// ─── Test Helpers ────────────────────────────────────────────

function createInteraction(overrides?: Partial<InteractionData>): InteractionData {
    return {
        success: true,
        quality: 0.8,
        inputTokens: 500,
        outputTokens: 300,
        latency: 1000,
        model: 'claude-haiku-3',
        interventionNeeded: false,
        timestamp: new Date(),
        ...overrides,
    };
}

function createFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.8,
        successRate: 0.9,
        tokenEfficiency: 0.7,
        latency: 500,
        costPerSuccess: 0.01,
        interventionRate: 0.05,
        composite: 0.82,
        sampleSize: 50,
        lastUpdated: new Date(),
        confidence: 0.9,
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────

describe('FitnessCalculator', () => {
    // ── 1. Empty interactions array ──────────────────────────

    describe('empty interactions', () => {
        it('should return zero fitness for empty interactions array', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness([]);

            expect(fitness.quality).toBe(0);
            expect(fitness.successRate).toBe(0);
            expect(fitness.tokenEfficiency).toBe(0);
            expect(fitness.latency).toBe(0);
            expect(fitness.costPerSuccess).toBe(0);
            expect(fitness.interventionRate).toBe(0);
            expect(fitness.composite).toBe(0);
            expect(fitness.sampleSize).toBe(0);
            expect(fitness.confidence).toBe(0);
        });
    });

    // ── 2. Single successful interaction ─────────────────────

    describe('single successful interaction', () => {
        it('should compute fitness from a single successful interaction', () => {
            const calculator = new FitnessCalculator();
            const interaction = createInteraction({
                success: true,
                quality: 0.9,
                inputTokens: 400,
                outputTokens: 300,
                latency: 500,
                model: 'claude-haiku-3',
                interventionNeeded: false,
            });

            const fitness = calculator.computeFitness([interaction]);

            expect(fitness.quality).toBe(0.9);
            expect(fitness.successRate).toBe(1.0);
            expect(fitness.interventionRate).toBe(0);
            expect(fitness.sampleSize).toBe(1);
            expect(fitness.lastUpdated).toBeInstanceOf(Date);
            expect(fitness.composite).toBeGreaterThan(0);
        });

        it('should have confidence of 0.5 for a single interaction (sampleSize < 10)', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness([createInteraction()]);

            expect(fitness.confidence).toBe(0.5);
        });
    });

    // ── 3. Mixed success/failure interactions ────────────────

    describe('mixed success/failure interactions', () => {
        it('should correctly compute metrics with mixed interactions', () => {
            const calculator = new FitnessCalculator();

            const interactions: InteractionData[] = [
                createInteraction({ success: true, quality: 0.9 }),
                createInteraction({ success: true, quality: 0.8 }),
                createInteraction({ success: false, quality: 0.3 }),
                createInteraction({ success: true, quality: 0.7 }),
                createInteraction({ success: false, quality: 0.2 }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Success rate: 3/5 = 0.6
            expect(fitness.successRate).toBeCloseTo(0.6, 5);

            // Quality: average of all = (0.9 + 0.8 + 0.3 + 0.7 + 0.2) / 5 = 0.58
            expect(fitness.quality).toBeCloseTo(0.58, 5);

            expect(fitness.sampleSize).toBe(5);
        });
    });

    // ── 4. Quality computation ───────────────────────────────

    describe('quality computation', () => {
        it('should compute quality as average of all interaction quality scores', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ quality: 0.6 }),
                createInteraction({ quality: 0.8 }),
                createInteraction({ quality: 1.0 }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Average: (0.6 + 0.8 + 1.0) / 3 = 0.8
            expect(fitness.quality).toBeCloseTo(0.8, 5);
        });

        it('should handle all-zero quality scores', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ quality: 0 }),
                createInteraction({ quality: 0 }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.quality).toBe(0);
        });
    });

    // ── 5. Success rate computation ──────────────────────────

    describe('success rate computation', () => {
        it('should compute success rate as proportion of successful interactions', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: true }),
                createInteraction({ success: true }),
                createInteraction({ success: false }),
                createInteraction({ success: true }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // 3 out of 4 = 0.75
            expect(fitness.successRate).toBeCloseTo(0.75, 5);
        });

        it('should return 0 success rate when all interactions fail', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: false }),
                createInteraction({ success: false }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.successRate).toBe(0);
        });

        it('should return 1.0 success rate when all interactions succeed', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: true }),
                createInteraction({ success: true }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.successRate).toBe(1.0);
        });
    });

    // ── 6. Token efficiency normalization ────────────────────

    describe('token efficiency', () => {
        it('should give high efficiency for low token usage', () => {
            const calculator = new FitnessCalculator();

            // 500 total tokens is the "best" -> should be close to 1.0
            const interactions = [
                createInteraction({
                    success: true,
                    inputTokens: 250,
                    outputTokens: 250,
                }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // (500 total, best=500) -> normalized = 1 - (500-500)/(5000-500) = 1.0
            expect(fitness.tokenEfficiency).toBeCloseTo(1.0, 5);
        });

        it('should give low efficiency for high token usage', () => {
            const calculator = new FitnessCalculator();

            // 5000 total tokens is the "worst" -> should be close to 0.0
            const interactions = [
                createInteraction({
                    success: true,
                    inputTokens: 2500,
                    outputTokens: 2500,
                }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // (5000 total, worst=5000) -> normalized = 1 - (5000-500)/(5000-500) = 0.0
            expect(fitness.tokenEfficiency).toBeCloseTo(0.0, 5);
        });

        it('should only consider successful interactions for token efficiency', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: true, inputTokens: 200, outputTokens: 300 }),
                createInteraction({ success: false, inputTokens: 10000, outputTokens: 10000 }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Only the successful interaction counts: 500 tokens total
            // normalized = 1 - (500-500)/(5000-500) = 1.0
            expect(fitness.tokenEfficiency).toBeCloseTo(1.0, 5);
        });

        it('should return 0 efficiency when all interactions fail', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: false, inputTokens: 100, outputTokens: 100 }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.tokenEfficiency).toBe(0);
        });

        it('should clamp token efficiency between 0 and 1', () => {
            const calculator = new FitnessCalculator();

            // Extremely high token usage exceeding worst case
            const interactions = [
                createInteraction({
                    success: true,
                    inputTokens: 5000,
                    outputTokens: 5000,
                }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // 10000 tokens, normalized = 1 - (10000-500)/(5000-500) < 0 -> clamped to 0
            expect(fitness.tokenEfficiency).toBe(0);
        });
    });

    // ── 7. Latency normalization ─────────────────────────────

    describe('latency', () => {
        it('should store raw latency value in the fitness vector', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ latency: 2000 }),
                createInteraction({ latency: 3000 }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Raw average latency: (2000 + 3000) / 2 = 2500
            expect(fitness.latency).toBeCloseTo(2500, 1);
        });

        it('should use normalized latency for composite score calculation', () => {
            const calculator = new FitnessCalculator();

            // Fast interactions -> higher composite
            const fastInteractions = [
                createInteraction({ latency: 100, success: true, quality: 0.8 }),
            ];
            const slowInteractions = [
                createInteraction({ latency: 5000, success: true, quality: 0.8 }),
            ];

            const fastFitness = calculator.computeFitness(fastInteractions);
            const slowFitness = calculator.computeFitness(slowInteractions);

            // Fast should have higher composite than slow (same quality, same everything else)
            expect(fastFitness.composite).toBeGreaterThan(slowFitness.composite);
        });
    });

    // ── 8. Cost computation with model pricing ───────────────

    describe('cost computation', () => {
        it('should compute cost per success using model pricing for claude-haiku-3', () => {
            const calculator = new FitnessCalculator();

            // claude-haiku-3 pricing: input $0.25/1M, output $1.25/1M
            const interaction = createInteraction({
                success: true,
                inputTokens: 1000,
                outputTokens: 1000,
                model: 'claude-haiku-3',
            });

            const fitness = calculator.computeFitness([interaction]);

            // Cost = (1000/1_000_000) * 0.25 + (1000/1_000_000) * 1.25
            //      = 0.00025 + 0.00125 = 0.0015
            expect(fitness.costPerSuccess).toBeCloseTo(0.0015, 6);
        });

        it('should compute average cost per successful interaction', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({
                    success: true,
                    inputTokens: 1000,
                    outputTokens: 1000,
                    model: 'claude-haiku-3',
                }),
                createInteraction({
                    success: true,
                    inputTokens: 2000,
                    outputTokens: 2000,
                    model: 'claude-haiku-3',
                }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Cost 1: (1000/1M)*0.25 + (1000/1M)*1.25 = 0.0015
            // Cost 2: (2000/1M)*0.25 + (2000/1M)*1.25 = 0.003
            // Total: 0.0045, avg per success: 0.0045/2 = 0.00225
            expect(fitness.costPerSuccess).toBeCloseTo(0.00225, 6);
        });

        it('should only count successful interactions for cost per success', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({
                    success: true,
                    inputTokens: 1000,
                    outputTokens: 1000,
                    model: 'claude-haiku-3',
                }),
                createInteraction({
                    success: false,
                    inputTokens: 5000,
                    outputTokens: 5000,
                    model: 'claude-haiku-3',
                }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // Only 1 successful: cost = 0.0015 / 1 = 0.0015
            expect(fitness.costPerSuccess).toBeCloseTo(0.0015, 6);
        });

        it('should return 0 cost when all interactions fail', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ success: false, model: 'claude-haiku-3' }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.costPerSuccess).toBe(0);
        });

        it('should support adding custom model pricing', () => {
            const calculator = new FitnessCalculator();

            calculator.addModelPricing('custom-model', {
                inputCostPer1M: 1.0,
                outputCostPer1M: 5.0,
            });

            const interaction = createInteraction({
                success: true,
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
                model: 'custom-model',
            });

            const fitness = calculator.computeFitness([interaction]);

            // Cost = 1.0 + 5.0 = 6.0
            expect(fitness.costPerSuccess).toBeCloseTo(6.0, 2);
        });
    });

    // ── 9. Intervention rate calculation ─────────────────────

    describe('intervention rate', () => {
        it('should compute intervention rate as proportion needing correction', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ interventionNeeded: true }),
                createInteraction({ interventionNeeded: false }),
                createInteraction({ interventionNeeded: false }),
                createInteraction({ interventionNeeded: true }),
            ];

            const fitness = calculator.computeFitness(interactions);

            // 2 out of 4 = 0.5
            expect(fitness.interventionRate).toBeCloseTo(0.5, 5);
        });

        it('should return 0 when no interventions are needed', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ interventionNeeded: false }),
                createInteraction({ interventionNeeded: false }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.interventionRate).toBe(0);
        });

        it('should return 1.0 when all interactions need intervention', () => {
            const calculator = new FitnessCalculator();

            const interactions = [
                createInteraction({ interventionNeeded: true }),
                createInteraction({ interventionNeeded: true }),
            ];

            const fitness = calculator.computeFitness(interactions);
            expect(fitness.interventionRate).toBe(1.0);
        });
    });

    // ── 10. Custom weights ───────────────────────────────────

    describe('custom weights', () => {
        it('should use custom weights for composite calculation', () => {
            const qualityOnlyCalculator = new FitnessCalculator({
                weights: {
                    quality: 1.0,
                    successRate: 0,
                    tokenEfficiency: 0,
                    latency: 0,
                    costPerSuccess: 0,
                    interventionRate: 0,
                },
            });

            const interactions = [
                createInteraction({ success: true, quality: 0.7 }),
            ];

            const fitness = qualityOnlyCalculator.computeFitness(interactions);

            // Composite should be exactly the quality score
            expect(fitness.composite).toBeCloseTo(0.7, 5);
        });

        it('should return default weights when none are configured', () => {
            const calculator = new FitnessCalculator();
            const weights = calculator.getWeights();

            expect(weights.quality).toBeCloseTo(0.30, 5);
            expect(weights.successRate).toBeCloseTo(0.25, 5);
            expect(weights.tokenEfficiency).toBeCloseTo(0.20, 5);
            expect(weights.latency).toBeCloseTo(0.10, 5);
            expect(weights.costPerSuccess).toBeCloseTo(0.10, 5);
            expect(weights.interventionRate).toBeCloseTo(0.05, 5);
        });

        it('should allow updating weights via setWeights', () => {
            const calculator = new FitnessCalculator();

            calculator.setWeights({ quality: 0.5, successRate: 0.5 });

            const weights = calculator.getWeights();
            expect(weights.quality).toBe(0.5);
            expect(weights.successRate).toBe(0.5);
            // Other weights should remain at defaults
            expect(weights.tokenEfficiency).toBeCloseTo(0.20, 5);
        });

        it('should return a copy of weights (no external mutation)', () => {
            const calculator = new FitnessCalculator();

            const weights = calculator.getWeights();
            weights.quality = 999;

            expect(calculator.getWeights().quality).toBeCloseTo(0.30, 5);
        });
    });

    // ── 11. Compare fitness ──────────────────────────────────

    describe('compareFitness', () => {
        it('should return positive when first fitness is better', () => {
            const calculator = new FitnessCalculator();

            const better = createFitness({ composite: 0.9 });
            const worse = createFitness({ composite: 0.6 });

            const result = calculator.compareFitness(better, worse);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeCloseTo(0.3, 5);
        });

        it('should return negative when first fitness is worse', () => {
            const calculator = new FitnessCalculator();

            const worse = createFitness({ composite: 0.4 });
            const better = createFitness({ composite: 0.8 });

            const result = calculator.compareFitness(worse, better);
            expect(result).toBeLessThan(0);
            expect(result).toBeCloseTo(-0.4, 5);
        });

        it('should return zero when fitness vectors are equal', () => {
            const calculator = new FitnessCalculator();

            const f1 = createFitness({ composite: 0.75 });
            const f2 = createFitness({ composite: 0.75 });

            expect(calculator.compareFitness(f1, f2)).toBe(0);
        });
    });

    // ── 12. Meets threshold check ────────────────────────────

    describe('meetsThreshold', () => {
        it('should return true when improvement meets threshold', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.5 });
            const improved = createFitness({ composite: 0.6 }); // 20% improvement

            // 20% improvement >= 10% threshold
            expect(calculator.meetsThreshold(improved, baseline, 0.10)).toBe(true);
        });

        it('should return false when improvement is below threshold', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.5 });
            const slightlyBetter = createFitness({ composite: 0.52 }); // 4% improvement

            // 4% < 10% threshold
            expect(calculator.meetsThreshold(slightlyBetter, baseline, 0.10)).toBe(false);
        });

        it('should return false when fitness is worse than baseline', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.8 });
            const worse = createFitness({ composite: 0.6 }); // -25% "improvement"

            expect(calculator.meetsThreshold(worse, baseline, 0.05)).toBe(false);
        });

        it('should return true when improvement exactly meets threshold', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.5 });
            const improved = createFitness({ composite: 0.55 }); // exactly 10% improvement

            expect(calculator.meetsThreshold(improved, baseline, 0.10)).toBe(true);
        });
    });

    // ── 13. Compute improvement percentage ───────────────────

    describe('computeImprovement', () => {
        it('should compute positive improvement when current is better', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.5 });
            const current = createFitness({ composite: 0.75 });

            // Improvement: (0.75 - 0.5) / 0.5 = 0.5 (50%)
            const improvement = calculator.computeImprovement(baseline, current);
            expect(improvement).toBeCloseTo(0.5, 5);
        });

        it('should compute negative improvement when current is worse', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.8 });
            const current = createFitness({ composite: 0.6 });

            // Improvement: (0.6 - 0.8) / 0.8 = -0.25 (-25%)
            const improvement = calculator.computeImprovement(baseline, current);
            expect(improvement).toBeCloseTo(-0.25, 5);
        });

        it('should return 0 when baseline composite is 0', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0 });
            const current = createFitness({ composite: 0.5 });

            expect(calculator.computeImprovement(baseline, current)).toBe(0);
        });

        it('should return 0 when baseline and current are the same', () => {
            const calculator = new FitnessCalculator();

            const baseline = createFitness({ composite: 0.7 });
            const current = createFitness({ composite: 0.7 });

            expect(calculator.computeImprovement(baseline, current)).toBe(0);
        });
    });

    // ── Confidence based on sample size ──────────────────────

    describe('confidence calculation', () => {
        it('should return 0.5 confidence for < 10 interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 5 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.5);
        });

        it('should return 0.6 confidence for 10-19 interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 15 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.6);
        });

        it('should return 0.7 confidence for 20-49 interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 30 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.7);
        });

        it('should return 0.8 confidence for 50-99 interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 75 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.8);
        });

        it('should return 0.9 confidence for 100-199 interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 150 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.9);
        });

        it('should return 0.95 confidence for 200+ interactions', () => {
            const calculator = new FitnessCalculator();
            const fitness = calculator.computeFitness(
                Array.from({ length: 250 }, () => createInteraction())
            );
            expect(fitness.confidence).toBe(0.95);
        });
    });

    // ── Composite score sanity checks ────────────────────────

    describe('composite score', () => {
        it('should produce composite between 0 and 1 for typical interactions', () => {
            const calculator = new FitnessCalculator();

            const interactions = Array.from({ length: 10 }, () =>
                createInteraction({
                    success: true,
                    quality: 0.8,
                    inputTokens: 500,
                    outputTokens: 300,
                    latency: 1000,
                    model: 'claude-haiku-3',
                    interventionNeeded: false,
                })
            );

            const fitness = calculator.computeFitness(interactions);

            expect(fitness.composite).toBeGreaterThan(0);
            expect(fitness.composite).toBeLessThanOrEqual(1);
        });

        it('should produce higher composite for better performing interactions', () => {
            const calculator = new FitnessCalculator();

            const goodInteractions = Array.from({ length: 10 }, () =>
                createInteraction({
                    success: true,
                    quality: 0.95,
                    inputTokens: 200,
                    outputTokens: 200,
                    latency: 200,
                    model: 'claude-haiku-3',
                    interventionNeeded: false,
                })
            );

            const poorInteractions = Array.from({ length: 10 }, () =>
                createInteraction({
                    success: false,
                    quality: 0.2,
                    inputTokens: 4000,
                    outputTokens: 4000,
                    latency: 4500,
                    model: 'claude-haiku-3',
                    interventionNeeded: true,
                })
            );

            const goodFitness = calculator.computeFitness(goodInteractions);
            const poorFitness = calculator.computeFitness(poorInteractions);

            expect(goodFitness.composite).toBeGreaterThan(poorFitness.composite);
        });
    });
});
