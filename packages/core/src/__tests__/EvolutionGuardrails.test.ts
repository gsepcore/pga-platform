/**
 * EvolutionGuardrailsManager Tests
 *
 * Tests the 4-gate validation system for mutation promotion:
 * 1. Quality Gate — fitness threshold
 * 2. Sandbox Gate — safety validation
 * 3. Economic Gate — cost efficiency
 * 4. Stability Gate — rollback rate
 *
 * Plus decision logic: promote / canary / reject
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-06
 */

import { describe, it, expect, vi } from 'vitest';
import { EvolutionGuardrailsManager } from '../evaluation/EvolutionGuardrails.js';
import type { MutationCandidate } from '../evaluation/EvolutionGuardrails.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { EconomicMetrics } from '../types/index.js';

// ─── Helpers ─────────────────────────────────────────────

function createMockStorage(): StorageAdapter {
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockResolvedValue(undefined),
        loadGenome: vi.fn().mockResolvedValue(null),
        listGenomes: vi.fn().mockResolvedValue([]),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        recordInteraction: vi.fn().mockResolvedValue(undefined),
        recordFeedback: vi.fn().mockResolvedValue(undefined),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getAnalytics: vi.fn().mockResolvedValue({
            totalInteractions: 50,
            totalMutations: 3,
            avgFitnessImprovement: 0.05,
            userSatisfaction: 0.8,
            topGenes: [],
        }),
        saveUserDNA: vi.fn().mockResolvedValue(undefined),
        loadUserDNA: vi.fn().mockResolvedValue(null),
        saveFact: vi.fn().mockResolvedValue(undefined),
        loadFacts: vi.fn().mockResolvedValue([]),
    } as unknown as StorageAdapter;
}

/** Build a candidate that passes all gates by default */
function passingCandidate(overrides?: Partial<MutationCandidate>): MutationCandidate {
    return {
        layer: 1,
        gene: 'coding',
        variant: 'v1_test',
        content: 'Short content for testing',  // ~25 chars → low tokens → passes economic
        fitness: 0.80,        // > 0.60 → passes quality
        sandboxScore: 0.85,   // > 0.70 → passes sandbox
        sampleCount: 20,      // > 10 → passes stability window
        rollbackCount: 1,     // 1/20 = 5% < 20% → passes stability rate
        ...overrides,
    };
}

const GENOME_ID = 'test-genome-001';

// ─── Tests ───────────────────────────────────────────────

describe('EvolutionGuardrailsManager', () => {

    // ── Gate 1: Quality ──────────────────────────────────

    describe('Quality Gate', () => {
        it('passes when fitness >= threshold (0.60)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ fitness: 0.65 }),
                GENOME_ID,
            );
            expect(result.gates.quality.passed).toBe(true);
            expect(result.gates.quality.score).toBe(0.65);
        });

        it('fails when fitness < threshold', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ fitness: 0.50 }),
                GENOME_ID,
            );
            expect(result.gates.quality.passed).toBe(false);
            expect(result.gates.quality.score).toBe(0.50);
            expect(result.gates.quality.threshold).toBe(0.60);
        });

        it('passes at exact threshold boundary', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ fitness: 0.60 }),
                GENOME_ID,
            );
            expect(result.gates.quality.passed).toBe(true);
        });

        it('respects custom threshold', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage(), {
                minQualityScore: 0.90,
                minSandboxScore: 0.70,
                minCompressionScore: 0.65,
                maxCostPerTask: 0.10,
                minStabilityWindow: 10,
                maxRollbackRate: 0.20,
                gateMode: 'AND',
            });
            const result = await manager.evaluateCandidate(
                passingCandidate({ fitness: 0.85 }),
                GENOME_ID,
            );
            expect(result.gates.quality.passed).toBe(false);
            expect(result.gates.quality.threshold).toBe(0.90);
        });
    });

    // ── Gate 2: Sandbox ──────────────────────────────────

    describe('Sandbox Gate', () => {
        it('passes when sandboxScore >= threshold (0.70)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sandboxScore: 0.75 }),
                GENOME_ID,
            );
            expect(result.gates.sandbox.passed).toBe(true);
        });

        it('fails when sandboxScore < threshold', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sandboxScore: 0.50 }),
                GENOME_ID,
            );
            expect(result.gates.sandbox.passed).toBe(false);
        });

        it('fails when sandboxScore is undefined (defaults to 0)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sandboxScore: undefined }),
                GENOME_ID,
            );
            expect(result.gates.sandbox.passed).toBe(false);
            expect(result.gates.sandbox.score).toBe(0);
        });
    });

    // ── Gate 3: Economic ─────────────────────────────────

    describe('Economic Gate', () => {
        it('passes when economicMetrics are provided and within thresholds', async () => {
            const metrics: EconomicMetrics = {
                tokensPerSuccess: 400,
                compressionScore: 0.80,
                costPerTask: 0.05,
                costPerSuccess: 0.06,
                avgLatencyMs: 1500,
                p95LatencyMs: 2200,
                valuePerDollar: 15,
            };
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ economicMetrics: metrics }),
                GENOME_ID,
            );
            expect(result.gates.economic.passed).toBe(true);
        });

        it('fails when cost exceeds threshold', async () => {
            const metrics: EconomicMetrics = {
                tokensPerSuccess: 400,
                compressionScore: 0.80,
                costPerTask: 0.50,  // > $0.10
                costPerSuccess: 0.60,
                avgLatencyMs: 1500,
                p95LatencyMs: 2200,
                valuePerDollar: 2,
            };
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ economicMetrics: metrics }),
                GENOME_ID,
            );
            expect(result.gates.economic.passed).toBe(false);
        });

        it('fails when compression score is below threshold', async () => {
            const metrics: EconomicMetrics = {
                tokensPerSuccess: 1800,
                compressionScore: 0.20,  // < 0.65
                costPerTask: 0.05,
                costPerSuccess: 0.06,
                avgLatencyMs: 1500,
                p95LatencyMs: 2200,
                valuePerDollar: 15,
            };
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ economicMetrics: metrics }),
                GENOME_ID,
            );
            expect(result.gates.economic.passed).toBe(false);
        });

        it('estimates economics from content length when no metrics provided', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            // Short content → low token estimate → good compression
            const result = await manager.evaluateCandidate(
                passingCandidate({ content: 'x'.repeat(100), economicMetrics: undefined }),
                GENOME_ID,
            );
            // With 100 chars / 4 = 25 tokens, cost = 25/1000 * 0.003 = 0.000075
            // compressionScore = max(0, min(1, 1 - (31.25 - 500)/1500)) = 1.0
            expect(result.gates.economic.passed).toBe(true);
        });

        it('fails with very long content when no metrics provided', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            // 40000 chars → 10000 tokens → tokensPerSuccess = 10000/0.8 = 12500
            // compressionScore = max(0, min(1, 1 - (12500 - 500)/1500)) = 0
            const result = await manager.evaluateCandidate(
                passingCandidate({ content: 'x'.repeat(40000), economicMetrics: undefined }),
                GENOME_ID,
            );
            expect(result.gates.economic.passed).toBe(false);
        });
    });

    // ── Gate 4: Stability ────────────────────────────────

    describe('Stability Gate', () => {
        it('passes with enough samples and low rollback rate', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sampleCount: 20, rollbackCount: 2 }),  // 10% rollback
                GENOME_ID,
            );
            expect(result.gates.stability.passed).toBe(true);
        });

        it('fails when sample count < minimum (10)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sampleCount: 5, rollbackCount: 0 }),
                GENOME_ID,
            );
            expect(result.gates.stability.passed).toBe(false);
        });

        it('fails when rollback rate > threshold (20%)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sampleCount: 20, rollbackCount: 8 }),  // 40% rollback
                GENOME_ID,
            );
            expect(result.gates.stability.passed).toBe(false);
        });

        it('passes at exact rollback boundary (20%)', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sampleCount: 10, rollbackCount: 2 }),  // exactly 20%
                GENOME_ID,
            );
            expect(result.gates.stability.passed).toBe(true);
        });

        it('handles zero sampleCount without division error', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate({ sampleCount: 0, rollbackCount: 0 }),
                GENOME_ID,
            );
            expect(result.gates.stability.passed).toBe(false);
            expect(result.gates.stability.score).toBe(0);
        });
    });

    // ── Decision Logic (AND mode) ────────────────────────

    describe('Decision Logic — AND mode', () => {
        it('promotes when all 4 gates pass', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate(),
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('promote');
            expect(result.passed).toBe(true);
            expect(result.reason).toContain('All gates passed');
        });

        it('canary when 3/4 gates pass', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            // Fail only sandbox
            const result = await manager.evaluateCandidate(
                passingCandidate({ sandboxScore: 0.30 }),
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('canary');
            expect(result.passed).toBe(false);
            expect(result.reason).toContain('3/4');
        });

        it('rejects when 2/4 gates pass', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            // Fail quality + sandbox
            const result = await manager.evaluateCandidate(
                passingCandidate({ fitness: 0.30, sandboxScore: 0.30 }),
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('reject');
            expect(result.passed).toBe(false);
            expect(result.reason).toContain('Failed gates');
        });

        it('rejects when all gates fail', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                {
                    layer: 1,
                    gene: 'coding',
                    variant: 'v1_bad',
                    content: 'x'.repeat(40000),  // fail economic
                    fitness: 0.10,               // fail quality
                    sandboxScore: 0.10,          // fail sandbox
                    sampleCount: 2,              // fail stability
                    rollbackCount: 1,
                },
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('reject');
            expect(result.passed).toBe(false);
        });

        it('includes all gate results in response', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const result = await manager.evaluateCandidate(
                passingCandidate(),
                GENOME_ID,
            );
            expect(result.gates.quality).toBeDefined();
            expect(result.gates.sandbox).toBeDefined();
            expect(result.gates.economic).toBeDefined();
            expect(result.gates.stability).toBeDefined();

            // Each gate has score and threshold
            for (const gate of Object.values(result.gates)) {
                expect(gate).toHaveProperty('passed');
                expect(gate).toHaveProperty('score');
                expect(gate).toHaveProperty('threshold');
            }
        });
    });

    // ── Decision Logic (OR mode) ─────────────────────────

    describe('Decision Logic — OR mode', () => {
        it('promotes when at least 1 gate passes', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage(), {
                minQualityScore: 0.60,
                minSandboxScore: 0.70,
                minCompressionScore: 0.65,
                maxCostPerTask: 0.10,
                minStabilityWindow: 10,
                maxRollbackRate: 0.20,
                gateMode: 'OR',
            });
            // Only quality passes, rest fail
            const result = await manager.evaluateCandidate(
                passingCandidate({
                    fitness: 0.80,
                    sandboxScore: 0.10,
                    sampleCount: 2,
                }),
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('promote');
            expect(result.passed).toBe(true);
        });

        it('rejects when all gates fail in OR mode', async () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage(), {
                minQualityScore: 0.60,
                minSandboxScore: 0.70,
                minCompressionScore: 0.65,
                maxCostPerTask: 0.10,
                minStabilityWindow: 10,
                maxRollbackRate: 0.20,
                gateMode: 'OR',
            });
            const result = await manager.evaluateCandidate(
                {
                    layer: 1,
                    gene: 'coding',
                    variant: 'v1_bad',
                    content: 'x'.repeat(40000),
                    fitness: 0.10,
                    sandboxScore: 0.10,
                    sampleCount: 2,
                    rollbackCount: 1,
                },
                GENOME_ID,
            );
            expect(result.finalDecision).toBe('reject');
            expect(result.passed).toBe(false);
            expect(result.reason).toBe('All gates failed');
        });
    });

    // ── Configuration ────────────────────────────────────

    describe('Configuration', () => {
        it('uses default guardrails when none provided', () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const config = manager.getGuardrails();
            expect(config.minQualityScore).toBe(0.60);
            expect(config.minSandboxScore).toBe(0.70);
            expect(config.minCompressionScore).toBe(0.65);
            expect(config.maxCostPerTask).toBe(0.10);
            expect(config.minStabilityWindow).toBe(10);
            expect(config.maxRollbackRate).toBe(0.20);
            expect(config.gateMode).toBe('AND');
        });

        it('merges custom guardrails with defaults', () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage(), {
                minQualityScore: 0.90,
            } as any);
            const config = manager.getGuardrails();
            expect(config.minQualityScore).toBe(0.90);
            expect(config.minSandboxScore).toBe(0.70);  // default preserved
        });

        it('updates guardrails dynamically', () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            manager.updateGuardrails({ minQualityScore: 0.95 });
            const config = manager.getGuardrails();
            expect(config.minQualityScore).toBe(0.95);
        });

        it('generates human-readable report', () => {
            const manager = new EvolutionGuardrailsManager(createMockStorage());
            const report = manager.getGuardrailsReport();
            expect(report).toContain('Evolution Guardrails');
            expect(report).toContain('Quality Gate');
            expect(report).toContain('Sandbox Gate');
            expect(report).toContain('Economic Gate');
            expect(report).toContain('Stability Gate');
            expect(report).toContain('60%');
            expect(report).toContain('AND');
        });
    });
});
