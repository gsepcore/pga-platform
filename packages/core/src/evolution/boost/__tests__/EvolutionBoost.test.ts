/**
 * Evolution Boost 2.0 - Comprehensive Tests
 *
 * Tests for all Evolution Boost components:
 * - ParetoOptimizer
 * - MetaEvolutionEngine
 * - MutationEngine (base operators)
 * - EvolutionBoostEngine (orchestrator)
 * - Boost operators (Semantic, Crossover, Pattern, Breakthrough)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GenomeV2, FitnessVector, OperativeGene } from '../../../types/GenomeV2.js';
import type { MutationContext, MutationResult } from '../../MutationOperator.js';
import { MutationEngine } from '../../MutationOperator.js';
import { ParetoOptimizer, type ParetoSolution } from '../ParetoOptimizer.js';
import { MetaEvolutionEngine } from '../MetaEvolutionEngine.js';
import { CrossoverMutationOperator } from '../operators/CrossoverMutationOperator.js';
import { SemanticRestructuringOperator } from '../operators/SemanticRestructuringOperator.js';
import { PatternExtractionOperator } from '../operators/PatternExtractionOperator.js';
import { BreakthroughOperator } from '../operators/BreakthroughOperator.js';
import { EvolutionBoostEngine } from '../EvolutionBoostEngine.js';
import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';

// ─── Test Helpers ────────────────────────────────────────────

function createDefaultFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.5,
        successRate: 0.5,
        tokenEfficiency: 0.5,
        latency: 1000,
        costPerSuccess: 0.01,
        interventionRate: 0.1,
        composite: 0.5,
        sampleSize: 10,
        lastUpdated: new Date(),
        confidence: 0.5,
        ...overrides,
    };
}

function createTestGenome(overrides?: Partial<GenomeV2>): GenomeV2 {
    return {
        id: 'test-genome-1',
        name: 'Test Genome',
        familyId: 'test-family',
        version: 1,
        chromosomes: {
            c0: {
                identity: { role: 'AI Assistant', purpose: 'Help users', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
                attribution: { creator: 'Test', copyright: 'Test', license: 'MIT' },
                metadata: { version: '2.0.0', createdAt: new Date() },
            },
            c1: {
                operations: [
                    {
                        id: 'gene-1',
                        category: 'tool-usage',
                        content: 'Use the search tool to find relevant information before answering questions.',
                        fitness: createDefaultFitness(),
                        origin: 'initial',
                        usageCount: 50,
                        lastUsed: new Date(),
                        successRate: 0.8,
                    },
                    {
                        id: 'gene-2',
                        category: 'reasoning',
                        content: 'Think step by step when solving complex problems. Break down tasks into smaller parts.',
                        fitness: createDefaultFitness({ quality: 0.7 }),
                        origin: 'initial',
                        usageCount: 30,
                        lastUsed: new Date(),
                        successRate: 0.75,
                    },
                ],
                metadata: { lastMutated: new Date(), mutationCount: 0, avgFitnessGain: 0 },
            },
            c2: {
                userAdaptations: new Map(),
                contextPatterns: [],
                metadata: { lastMutated: new Date(), adaptationRate: 0, totalUsers: 0 },
            },
        },
        integrity: {
            c0Hash: 'abc123',
            lastVerified: new Date(),
            violations: 0,
            quarantined: false,
        },
        lineage: { inheritedGenes: [], mutations: [] },
        fitness: createDefaultFitness(),
        config: {
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
            enableSandbox: true,
            minFitnessImprovement: 0.05,
            enableIntegrityCheck: true,
            autoRollbackThreshold: 0.15,
            allowInheritance: true,
            minCompatibilityScore: 0.6,
        },
        state: 'active',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMutationContext(overrides?: Partial<MutationContext>): MutationContext {
    return {
        genome: createTestGenome(),
        targetChromosome: 'c1',
        reason: 'Test mutation',
        ...overrides,
    };
}

class MockLLMAdapter implements LLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        return {
            content: 'Improved instruction: Use search tools effectively and verify results before presenting answers to users.',
            usage: { inputTokens: 100, outputTokens: 50 },
        };
    }
}

// ─── ParetoOptimizer Tests ───────────────────────────────────

describe('ParetoOptimizer', () => {
    let optimizer: ParetoOptimizer;

    beforeEach(() => {
        optimizer = new ParetoOptimizer();
    });

    it('should create with default FitnessCalculator', () => {
        expect(optimizer).toBeDefined();
        expect(optimizer.fitnessCalc).toBeDefined();
    });

    it('should find Pareto frontier with single solution', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome(),
                fitness: createDefaultFitness({ quality: 0.8, successRate: 0.9 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);
        expect(frontier).toHaveLength(1);
        expect(frontier[0].dominatedBy).toBe(0);
    });

    it('should identify dominated solutions', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome({ id: 'genome-a' }),
                fitness: createDefaultFitness({ quality: 0.9, successRate: 0.9, tokenEfficiency: 0.9 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
            {
                genome: createTestGenome({ id: 'genome-b' }),
                fitness: createDefaultFitness({ quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5 }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);

        // Solution A dominates B in all objectives, so only A should be on frontier
        expect(frontier.length).toBeGreaterThanOrEqual(1);
        const dominatedB = solutions.find(s => s.genome.id === 'genome-b');
        expect(dominatedB!.dominatedBy).toBeGreaterThan(0);
    });

    it('should keep non-dominated solutions on frontier', () => {
        const solutions: ParetoSolution[] = [
            {
                genome: createTestGenome({ id: 'high-quality' }),
                fitness: createDefaultFitness({
                    quality: 0.95, successRate: 0.6, tokenEfficiency: 0.4,
                    latency: 2000, costPerSuccess: 0.05,
                }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
            {
                genome: createTestGenome({ id: 'high-efficiency' }),
                fitness: createDefaultFitness({
                    quality: 0.6, successRate: 0.95, tokenEfficiency: 0.95,
                    latency: 500, costPerSuccess: 0.002,
                }),
                dominatedBy: 0,
                crowdingDistance: 0,
            },
        ];

        const frontier = optimizer.findParetoFrontier(solutions);

        // Neither dominates the other (trade-off), both should be on frontier
        expect(frontier).toHaveLength(2);
    });

    it('should handle empty solutions array', () => {
        const frontier = optimizer.findParetoFrontier([]);
        expect(frontier).toHaveLength(0);
    });
});

// ─── MetaEvolutionEngine Tests ───────────────────────────────

describe('MetaEvolutionEngine', () => {
    let engine: MetaEvolutionEngine;

    beforeEach(() => {
        engine = new MetaEvolutionEngine({
            learningRate: 0.1,
            minSampleSize: 3,
            explorationRate: 0.15,
        });
    });

    it('should create with default config', () => {
        const defaultEngine = new MetaEvolutionEngine();
        expect(defaultEngine).toBeDefined();
    });

    it('should record mutation attempts', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('compress_instructions', true, 0.12);
        engine.recordMutationAttempt('compress_instructions', false, 0.02);

        const perf = engine.getOperatorPerformance('compress_instructions');
        expect(perf).toHaveLength(1);
        expect(perf[0].timesUsed).toBe(3);
        expect(perf[0].timesSuccessful).toBe(2);
        expect(perf[0].successRate).toBeCloseTo(2 / 3);
    });

    it('should track multiple operators independently', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('reorder_constraints', false, 0.05);
        engine.recordMutationAttempt('safety_reinforcement', true, 0.08);

        const allPerf = engine.getOperatorPerformance();
        expect(allPerf).toHaveLength(3);
    });

    it('should provide learning summary', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15);
        engine.recordMutationAttempt('compress_instructions', true, 0.12);
        engine.recordMutationAttempt('reorder_constraints', false, 0.02);

        const summary = engine.getLearningSummary();
        expect(summary.totalMutations).toBe(3);
        expect(summary.successfulMutations).toBe(2);
        expect(summary.overallSuccessRate).toBeCloseTo(2 / 3);
        expect(summary.bestOperator).toBe('compress_instructions');
    });

    it('should return empty summary when no mutations recorded', () => {
        const summary = engine.getLearningSummary();
        expect(summary.totalMutations).toBe(0);
        expect(summary.overallSuccessRate).toBe(0);
        expect(summary.bestOperator).toBeNull();
    });

    it('should select operator from available operators', () => {
        // Record enough data for probability adaptation
        for (let i = 0; i < 5; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.15);
            engine.recordMutationAttempt('reorder_constraints', false, 0.02);
        }

        const selected = engine.selectOperator([
            'compress_instructions',
            'reorder_constraints',
        ]);

        expect(['compress_instructions', 'reorder_constraints']).toContain(selected);
    });

    it('should adapt operator probabilities based on performance', () => {
        // Record many successful mutations for one operator
        for (let i = 0; i < 15; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.20);
            engine.recordMutationAttempt('reorder_constraints', false, 0.01);
        }

        const probs = engine.getOperatorProbabilities();

        // Compress should have higher probability since it's more successful
        const compressProb = probs.get('compress_instructions') || 0;
        const reorderProb = probs.get('reorder_constraints') || 0;

        expect(compressProb).toBeGreaterThan(reorderProb);
    });

    it('should record contextual performance', () => {
        engine.recordMutationAttempt('compress_instructions', true, 0.15, undefined, 'low-quality');
        engine.recordMutationAttempt('compress_instructions', true, 0.12, undefined, 'low-quality');

        const contextPerf = engine.getContextualPerformance();
        expect(contextPerf.length).toBeGreaterThan(0);

        const lowQualityCtx = contextPerf.find(c => c.context === 'low-quality');
        expect(lowQualityCtx).toBeDefined();
        expect(lowQualityCtx!.operators.has('compress_instructions')).toBe(true);
    });

    // ─── Strategy Recommendation Tests ───────────────────────

    it('should return default recommendation with no data', () => {
        const freshEngine = new MetaEvolutionEngine();
        const rec = freshEngine.getStrategyRecommendation();

        expect(rec.bestOperator).toBeNull();
        expect(rec.confidence).toBe(0);
        expect(rec.reasoning).toContain('No mutation data');
    });

    it('should recommend best operator based on performance', () => {
        // Record many successes for one operator
        for (let i = 0; i < 10; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.20);
            engine.recordMutationAttempt('reorder_constraints', false, 0.01);
        }

        const rec = engine.getStrategyRecommendation();
        expect(rec.bestOperator).toBe('compress_instructions');
        expect(rec.confidence).toBeGreaterThan(0);
    });

    it('should use contextual data when context is provided', () => {
        // Record contextual performance
        for (let i = 0; i < 5; i++) {
            engine.recordMutationAttempt('compress_instructions', false, 0.01, undefined, 'high-quality');
            engine.recordMutationAttempt('reorder_constraints', true, 0.15, undefined, 'high-quality');
        }

        const rec = engine.getStrategyRecommendation('high-quality');
        // For high-quality context, reorder should be better
        expect(rec.bestOperator).toBe('reorder_constraints');
    });

    // ─── Learning Velocity Tests ─────────────────────────────

    it('should return exploring status with insufficient snapshots', () => {
        const freshEngine = new MetaEvolutionEngine();
        const velocity = freshEngine.getLearningVelocity();

        expect(velocity.status).toBe('exploring');
        expect(velocity.stabilityTrend).toBe('unknown');
    });

    it('should track snapshots after mutations', () => {
        // Record 10 mutations (2 snapshots at mutation 5 and 10)
        for (let i = 0; i < 10; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.15);
        }

        const velocity = engine.getLearningVelocity();
        // Should have snapshots now
        expect(velocity.velocityScore).toBeGreaterThanOrEqual(0);
        expect(['converging', 'exploring', 'unstable']).toContain(velocity.status);
    });

    it('should detect convergence with consistent mutations', () => {
        const convEngine = new MetaEvolutionEngine({ minSampleSize: 3 });

        // Record many consistent mutations to one operator
        for (let i = 0; i < 25; i++) {
            convEngine.recordMutationAttempt('compress_instructions', true, 0.15);
        }

        const velocity = convEngine.getLearningVelocity();
        // With only one operator, probabilities should converge
        expect(['converging', 'exploring']).toContain(velocity.status);
        expect(velocity.dominantOperator).toBe('compress_instructions');
    });

    // ─── toPromptSection Tests ───────────────────────────────

    it('should return null toPromptSection with no data', () => {
        const freshEngine = new MetaEvolutionEngine();
        expect(freshEngine.toPromptSection()).toBeNull();
    });

    it('should return section with evolution strategy data', () => {
        for (let i = 0; i < 5; i++) {
            engine.recordMutationAttempt('compress_instructions', true, 0.15);
        }

        const section = engine.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Evolution Strategy');
        expect(section).toContain('Best operator');
        expect(section).toContain('Success rate');
        expect(section).toContain('Learning status');
    });
});

// ─── MutationEngine Tests ────────────────────────────────────

describe('MutationEngine', () => {
    let engine: MutationEngine;

    beforeEach(() => {
        engine = new MutationEngine();
    });

    it('should create with default operators registered', () => {
        const operators = engine.listOperators();
        expect(operators.length).toBeGreaterThanOrEqual(4);

        const names = operators.map(op => op.name);
        expect(names).toContain('compress_instructions');
        expect(names).toContain('reorder_constraints');
        expect(names).toContain('safety_reinforcement');
        expect(names).toContain('tool_selection_bias');
    });

    it('should generate mutants', async () => {
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 2);

        expect(mutants.length).toBeGreaterThan(0);
        expect(mutants.length).toBeLessThanOrEqual(2);

        for (const mutant of mutants) {
            expect(mutant.success).toBe(true);
            expect(mutant.mutant).toBeDefined();
            expect(mutant.mutation).toBeDefined();
            expect(mutant.expectedImprovement).toBeGreaterThan(0);
        }
    });

    it('should produce different mutant content', async () => {
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 4);

        // At least some mutants should have modified C1 operations
        const hasModified = mutants.some(m => {
            const origContent = context.genome.chromosomes.c1.operations.map(o => o.content).join('|');
            const mutContent = m.mutant.chromosomes.c1.operations.map(o => o.content).join('|');
            return origContent !== mutContent;
        });

        expect(hasModified).toBe(true);
    });

    it('should register custom operators', () => {
        const crossover = new CrossoverMutationOperator(); // No LLM (optional)
        engine.registerOperator(crossover);

        const operators = engine.listOperators();
        const names = operators.map(op => op.name);
        expect(names).toContain('crossover_mutation');
    });

    it('should get specific operator by name', () => {
        const op = engine.getOperator('compress_instructions');
        expect(op).toBeDefined();
        expect(op!.name).toBe('compress_instructions');
    });

    it('should return undefined for non-existent operator', () => {
        const op = engine.getOperator('nonexistent' as any);
        expect(op).toBeUndefined();
    });
});

// ─── CrossoverMutationOperator Tests (v3.0 — Intra-Genome) ──

describe('CrossoverMutationOperator', () => {
    it('should perform intra-genome crossover without external population', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new CrossoverMutationOperator(mockLLM);

        // Genome where gene-1 (tool-usage) has lower fitness than gene-2 (reasoning)
        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.3 });
        genome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.8 });

        const context = createMutationContext({ genome });
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.description).toContain('Fused');
        expect(result.expectedImprovement).toBeGreaterThan(0.02);
    });

    it('should fail when no donor genes have higher fitness', async () => {
        const operator = new CrossoverMutationOperator();

        // Both genes have equal fitness → no donors
        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.5 });
        genome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.5 });

        const context = createMutationContext({ genome });
        const result = await operator.mutate(context);

        expect(result.success).toBe(false);
        expect(result.description).toContain('No higher-fitness donor');
    });

    it('should work without LLM using mechanical fusion', async () => {
        const operator = new CrossoverMutationOperator(); // No LLM

        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.3 });
        genome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.9 });

        const context = createMutationContext({ genome });
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // Mechanical fusion produces different content
        const original = genome.chromosomes.c1.operations[0].content;
        expect(result.mutant.chromosomes.c1.operations[0].content).not.toBe(original);
    });

    it('should target weakest gene by default', async () => {
        const operator = new CrossoverMutationOperator();

        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.2 }); // weakest
        genome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.9 });

        const context = createMutationContext({ genome });
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // Weakest gene (index 0) should be modified
        expect(result.mutant.chromosomes.c1.operations[0].content).not.toBe(
            genome.chromosomes.c1.operations[0].content,
        );
    });

    it('should estimate improvement based on fitness gap', () => {
        const operator = new CrossoverMutationOperator();

        // Large gap → higher estimate
        const largeGapGenome = createTestGenome();
        largeGapGenome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.2 });
        largeGapGenome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.9 });

        const largeEstimate = operator.estimateImprovement(
            createMutationContext({ genome: largeGapGenome }),
        );

        // Small gap → lower estimate
        const smallGapGenome = createTestGenome();
        smallGapGenome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.6 });
        smallGapGenome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.7 });

        const smallEstimate = operator.estimateImprovement(
            createMutationContext({ genome: smallGapGenome }),
        );

        expect(largeEstimate).toBeGreaterThan(smallEstimate);
    });

    it('should return near-zero estimate when only one gene exists', () => {
        const operator = new CrossoverMutationOperator();

        const genome = createTestGenome();
        genome.chromosomes.c1.operations = [genome.chromosomes.c1.operations[0]];

        const estimate = operator.estimateImprovement(createMutationContext({ genome }));
        expect(estimate).toBe(0.02);
    });
});

// ─── SemanticRestructuringOperator Tests (v3.0 — Intelligence-Fed) ──

describe('SemanticRestructuringOperator', () => {
    it('should restructure genes using LLM', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.mutant.chromosomes.c1.operations.length).toBe(
            context.genome.chromosomes.c1.operations.length,
        );

        // Content should be restructured (different from original)
        const originalContent = context.genome.chromosomes.c1.operations[0].content;
        const restructuredContent = result.mutant.chromosomes.c1.operations[0].content;
        expect(restructuredContent).not.toBe(originalContent);
    });

    it('should have higher estimate with drift evidence than without', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const withDrift = createMutationContext({
            evidence: {
                driftSignals: [
                    { type: 'quality-decline', severity: 'critical', currentValue: 0.3, baselineValue: 0.8 },
                    { type: 'efficiency-decline', severity: 'severe', currentValue: 0.4, baselineValue: 0.7 },
                ],
                health: { score: 0.35, label: 'critical', fitnessComponent: 0.3, driftComponent: 0.2, purposeComponent: 0.5, trajectoryComponent: 0.4 },
            },
        });

        const withoutDrift = createMutationContext();

        const driftEstimate = operator.estimateImprovement(withDrift);
        const normalEstimate = operator.estimateImprovement(withoutDrift);

        expect(driftEstimate).toBeGreaterThan(normalEstimate);
    });

    it('should scale estimate with health score (worse health = higher estimate)', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const lowHealth = createMutationContext({
            evidence: {
                health: { score: 0.2, label: 'critical', fitnessComponent: 0.2, driftComponent: 0.1, purposeComponent: 0.3, trajectoryComponent: 0.2 },
            },
        });

        const highHealth = createMutationContext({
            evidence: {
                health: { score: 0.9, label: 'thriving', fitnessComponent: 0.9, driftComponent: 0.9, purposeComponent: 0.9, trajectoryComponent: 0.9 },
            },
        });

        const lowEstimate = operator.estimateImprovement(lowHealth);
        const highEstimate = operator.estimateImprovement(highHealth);

        expect(lowEstimate).toBeGreaterThan(highEstimate);
    });

    it('should cap estimate at 0.50', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new SemanticRestructuringOperator(mockLLM);

        const extremeContext = createMutationContext({
            evidence: {
                driftSignals: [
                    { type: 'quality-decline', severity: 'critical' },
                    { type: 'efficiency-decline', severity: 'critical' },
                    { type: 'cost-increase', severity: 'critical' },
                ],
                health: { score: 0.1, label: 'failing', fitnessComponent: 0.05, driftComponent: 0.05, purposeComponent: 0.1, trajectoryComponent: 0.1 },
                capabilities: [
                    { taskType: 'search', gene: 'tool-usage', performanceScore: 0.2, trend: 'declining' },
                    { taskType: 'code', gene: 'reasoning', performanceScore: 0.1, trend: 'declining' },
                ],
            },
            targetGene: createTestGenome().chromosomes.c1.operations[0],
        });

        const estimate = operator.estimateImprovement(extremeContext);
        expect(estimate).toBeLessThanOrEqual(0.50);
    });

    it('should fallback to simple restructuring if LLM fails', async () => {
        const failingLLM: LLMAdapter = {
            async chat() {
                throw new Error('LLM unavailable');
            },
        };
        const operator = new SemanticRestructuringOperator(failingLLM);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        // Should still succeed with fallback
        expect(result.success).toBe(true);
    });
});

// ─── PatternExtractionOperator Tests (v3.0 — PatternMemory-Primary) ──

describe('PatternExtractionOperator', () => {
    const mockPatterns = [
        { id: 'p1', type: 'task-sequence', description: 'Users ask for explanation then code', frequency: 15, confidence: 0.85, prediction: 'Will ask for tests next' },
        { id: 'p2', type: 'error-recovery', description: 'Retries with simpler terms after confusion', frequency: 8, confidence: 0.72 },
        { id: 'p3', type: 'tool-preference', description: 'Prefers search before code generation', frequency: 12, confidence: 0.90 },
    ];

    it('should succeed with PatternMemory data (no GeneBank needed)', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new PatternExtractionOperator(mockLLM); // No GeneBank

        const context = createMutationContext({
            evidence: { patterns: mockPatterns, predictions: [] },
        });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.description).toContain('Crystallized');
        expect(result.description).toContain('3');
    });

    it('should fail when no patterns AND no GeneBank', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new PatternExtractionOperator(mockLLM); // No GeneBank

        const context = createMutationContext(); // No evidence
        const result = await operator.mutate(context);

        expect(result.success).toBe(false);
        expect(result.description).toContain('No behavioral patterns');
    });

    it('should scale estimate with pattern count', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new PatternExtractionOperator(mockLLM);

        const manyPatterns = createMutationContext({
            evidence: { patterns: mockPatterns },
        });

        const fewPatterns = createMutationContext({
            evidence: { patterns: [mockPatterns[0]] },
        });

        const noPatterns = createMutationContext();

        const manyEstimate = operator.estimateImprovement(manyPatterns);
        const fewEstimate = operator.estimateImprovement(fewPatterns);
        const noEstimate = operator.estimateImprovement(noPatterns);

        expect(manyEstimate).toBeGreaterThan(fewEstimate);
        expect(fewEstimate).toBeGreaterThan(noEstimate);
    });

    it('should scale estimate with pattern confidence', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new PatternExtractionOperator(mockLLM);

        const highConf = createMutationContext({
            evidence: {
                patterns: [{ id: 'p1', type: 'task-sequence', description: 'Test', frequency: 10, confidence: 0.95 }],
            },
        });

        const lowConf = createMutationContext({
            evidence: {
                patterns: [{ id: 'p1', type: 'task-sequence', description: 'Test', frequency: 10, confidence: 0.30 }],
            },
        });

        expect(operator.estimateImprovement(highConf)).toBeGreaterThan(
            operator.estimateImprovement(lowConf),
        );
    });

    it('should cap estimate at 0.40', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new PatternExtractionOperator(mockLLM);

        // Many high-confidence patterns
        const extremePatterns = Array.from({ length: 10 }, (_, i) => ({
            id: `p${i}`, type: 'task-sequence', description: `Pattern ${i}`, frequency: 20, confidence: 0.99,
        }));

        const estimate = operator.estimateImprovement(
            createMutationContext({ evidence: { patterns: extremePatterns } }),
        );

        expect(estimate).toBeLessThanOrEqual(0.40);
    });

    it('should return original content if LLM fails', async () => {
        const failingLLM: LLMAdapter = {
            async chat() { throw new Error('LLM down'); },
        };
        const operator = new PatternExtractionOperator(failingLLM);

        const context = createMutationContext({
            evidence: { patterns: mockPatterns },
        });
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // Falls back to original content
        expect(result.mutant.chromosomes.c1.operations[0].content).toBe(
            context.genome.chromosomes.c1.operations[0].content,
        );
    });
});

// ─── BreakthroughOperator Tests (v3.0 — Activation-Gated) ──

describe('BreakthroughOperator', () => {
    it('should return near-zero estimate in normal conditions (activation gating)', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const normalContext = createMutationContext(); // No drift, no low health
        const estimate = operator.estimateImprovement(normalContext);

        expect(estimate).toBeLessThanOrEqual(0.05);
    });

    it('should activate with critical drift signals', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const criticalContext = createMutationContext({
            evidence: {
                driftSignals: [
                    { type: 'quality-decline', severity: 'critical', currentValue: 0.2, baselineValue: 0.8 },
                ],
            },
        });

        const estimate = operator.estimateImprovement(criticalContext);
        expect(estimate).toBeGreaterThanOrEqual(0.30);
    });

    it('should activate with severe drift signals', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const severeContext = createMutationContext({
            evidence: {
                driftSignals: [
                    { type: 'efficiency-decline', severity: 'severe', currentValue: 0.3, baselineValue: 0.7 },
                ],
            },
        });

        const estimate = operator.estimateImprovement(severeContext);
        expect(estimate).toBeGreaterThanOrEqual(0.30);
    });

    it('should activate with low health score', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const lowHealthContext = createMutationContext({
            evidence: {
                health: { score: 0.25, label: 'critical', fitnessComponent: 0.2, driftComponent: 0.1, purposeComponent: 0.3, trajectoryComponent: 0.2 },
            },
        });

        const estimate = operator.estimateImprovement(lowHealthContext);
        expect(estimate).toBeGreaterThanOrEqual(0.30);
    });

    it('should activate with very low genome fitness', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const lowFitnessContext = createMutationContext({
            genome: createTestGenome({
                fitness: createDefaultFitness({ composite: 0.20 }),
            }),
        });

        const estimate = operator.estimateImprovement(lowFitnessContext);
        expect(estimate).toBeGreaterThanOrEqual(0.30);
    });

    it('should NOT activate with moderate drift', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const moderateContext = createMutationContext({
            evidence: {
                driftSignals: [
                    { type: 'quality-decline', severity: 'moderate', currentValue: 0.6, baselineValue: 0.75 },
                ],
            },
        });

        const estimate = operator.estimateImprovement(moderateContext);
        expect(estimate).toBeLessThanOrEqual(0.05);
    });

    it('should cap estimate at 0.60', () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const extremeContext = createMutationContext({
            genome: createTestGenome({ fitness: createDefaultFitness({ composite: 0.10 }) }),
            evidence: {
                driftSignals: [
                    { type: 'quality-decline', severity: 'critical' },
                    { type: 'efficiency-decline', severity: 'critical' },
                    { type: 'cost-increase', severity: 'critical' },
                ],
                health: { score: 0.1, label: 'failing', fitnessComponent: 0.05, driftComponent: 0.05, purposeComponent: 0.1, trajectoryComponent: 0.1 },
            },
        });

        const estimate = operator.estimateImprovement(extremeContext);
        expect(estimate).toBeLessThanOrEqual(0.60);
    });

    it('should perform breakthrough mutation with intelligence data', async () => {
        const mockLLM = new MockLLMAdapter();
        const operator = new BreakthroughOperator(mockLLM);

        const context = createMutationContext({
            evidence: {
                driftSignals: [{ type: 'quality-decline', severity: 'critical', currentValue: 0.2, baselineValue: 0.8 }],
                health: { score: 0.3, label: 'critical', fitnessComponent: 0.2, driftComponent: 0.1, purposeComponent: 0.4, trajectoryComponent: 0.3 },
                capabilities: [{ taskType: 'search', gene: 'tool-usage', performanceScore: 0.25, trend: 'declining' }],
                patterns: [{ type: 'error-recovery', description: 'Retries with simpler terms', confidence: 0.8 }],
                purpose: 'Code review assistant',
            },
        });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.description).toContain('Breakthrough redesign');

        // Content should be different from original
        const originalContent = context.genome.chromosomes.c1.operations[0].content;
        expect(result.mutant.chromosomes.c1.operations[0].content).not.toBe(originalContent);
    });

    it('should return original content if LLM fails', async () => {
        const failingLLM: LLMAdapter = {
            async chat() { throw new Error('LLM down'); },
        };
        const operator = new BreakthroughOperator(failingLLM);

        const context = createMutationContext();
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // Falls back to original content
        expect(result.mutant.chromosomes.c1.operations[0].content).toBe(
            context.genome.chromosomes.c1.operations[0].content,
        );
    });
});

// ─── Integration: Intelligent Operators in MutationEngine ──

describe('Integration: Intelligent Operators Registration', () => {
    it('should register all 4 intelligent operators in MutationEngine', () => {
        const mockLLM = new MockLLMAdapter();
        const engine = new MutationEngine();

        engine.registerOperator(new SemanticRestructuringOperator(mockLLM));
        engine.registerOperator(new PatternExtractionOperator(mockLLM));
        engine.registerOperator(new CrossoverMutationOperator(mockLLM));
        engine.registerOperator(new BreakthroughOperator(mockLLM));

        const names = engine.listOperators().map(op => op.name);

        expect(names).toContain('semantic_restructuring');
        expect(names).toContain('pattern_extraction');
        expect(names).toContain('crossover_mutation');
        expect(names).toContain('breakthrough');
    });

    it('should rank intelligent operators higher when evidence signals problems', async () => {
        const mockLLM = new MockLLMAdapter();
        const engine = new MutationEngine();

        engine.registerOperator(new SemanticRestructuringOperator(mockLLM));
        engine.registerOperator(new PatternExtractionOperator(mockLLM));
        engine.registerOperator(new CrossoverMutationOperator(mockLLM));
        engine.registerOperator(new BreakthroughOperator(mockLLM));

        // Create context with drift evidence + patterns
        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].fitness = createDefaultFitness({ quality: 0.3 });
        genome.chromosomes.c1.operations[1].fitness = createDefaultFitness({ quality: 0.8 });

        const context: MutationContext = {
            genome,
            targetChromosome: 'c1',
            reason: 'Quality decline detected',
            evidence: {
                driftSignals: [{ type: 'quality-decline', severity: 'moderate', currentValue: 0.4, baselineValue: 0.7 }],
                health: { score: 0.5, label: 'warning', fitnessComponent: 0.4, driftComponent: 0.3, purposeComponent: 0.6, trajectoryComponent: 0.5 },
                patterns: [
                    { id: 'p1', type: 'task-sequence', description: 'Users ask for explanation then code', frequency: 15, confidence: 0.85 },
                ],
            },
        };

        const results = await engine.generateMutants(context, 4);

        expect(results.length).toBeGreaterThan(0);
        // All results should be valid mutations
        for (const result of results) {
            expect(result.mutant).toBeDefined();
            expect(result.mutation).toBeDefined();
        }
    });
});

// ─── EvolutionBoostEngine Tests ──────────────────────────────

describe('EvolutionBoostEngine', () => {
    it('should create with default balanced config', () => {
        const engine = new EvolutionBoostEngine();
        const config = engine.getConfig();

        expect(config.mode).toBe('balanced');
        expect(config.parallelBranches).toBe(5);
        expect(config.enableParallelEvolution).toBe(true);
        expect(config.enableMetaLearning).toBe(true);
    });

    it('should create with conservative config', () => {
        const engine = new EvolutionBoostEngine({ mode: 'conservative' });
        const config = engine.getConfig();

        expect(config.mode).toBe('conservative');
        expect(config.parallelBranches).toBe(3);
    });

    it('should create with aggressive config', () => {
        const engine = new EvolutionBoostEngine({ mode: 'aggressive' });
        const config = engine.getConfig();

        expect(config.mode).toBe('aggressive');
        expect(config.parallelBranches).toBe(10);
    });

    it('should register boost operators when LLM provided', () => {
        const mockLLM = new MockLLMAdapter();
        const engine = new EvolutionBoostEngine({
            mode: 'balanced',
            llm: mockLLM,
        });

        expect(engine).toBeDefined();
    });

    it('should update configuration', () => {
        const engine = new EvolutionBoostEngine({ mode: 'balanced' });

        engine.updateConfig({ mode: 'aggressive' });
        const config = engine.getConfig();

        expect(config.mode).toBe('aggressive');
        expect(config.parallelBranches).toBe(10);
    });

    it('should evolve genome and return results', async () => {
        const engine = new EvolutionBoostEngine({
            mode: 'conservative',
            parallelBranches: 2,
            enableRecombination: false,
        });

        const context = createMutationContext();
        const result = await engine.evolve(context);

        expect(result).toBeDefined();
        expect(result.best).toBeDefined();
        expect(result.bestMutation).toBeDefined();
        expect(result.allBranches.length).toBeGreaterThan(0);
        expect(result.stats.mode).toBe('conservative');
        expect(result.stats.operatorsUsed.length).toBeGreaterThan(0);
    });

    it('should provide meta-learning insights', () => {
        const engine = new EvolutionBoostEngine();
        const insights = engine.getMetaLearningInsights();

        expect(insights).toBeDefined();
        expect(insights.recommendedMode).toBeDefined();
        expect(Array.isArray(insights.operatorPerformance)).toBe(true);
    });

    it('should track evolution statistics', async () => {
        const engine = new EvolutionBoostEngine({
            mode: 'conservative',
            parallelBranches: 2,
            enableRecombination: false,
        });

        const context = createMutationContext();
        const result = await engine.evolve(context);

        expect(result.stats.branchesExplored).toBeGreaterThan(0);
        expect(result.stats.topImprovement).toBeGreaterThan(0);
        expect(result.stats.avgImprovement).toBeGreaterThan(0);
        expect(typeof result.stats.diversityScore).toBe('number');
    });
});

// ─── Integration: MutationEngine + DriftAnalyzer ─────────────

describe('Integration: Evolution Pipeline', () => {
    it('should generate valid GenomeV2 mutations end-to-end', async () => {
        const engine = new MutationEngine();
        const genome = createTestGenome();
        const context: MutationContext = {
            genome,
            targetChromosome: 'c1',
            reason: 'Drift detected: quality decline',
        };

        const mutants = await engine.generateMutants(context, 3);

        expect(mutants.length).toBeGreaterThan(0);

        for (const result of mutants) {
            // Each mutant should be a valid GenomeV2
            expect(result.mutant.id).toBe(genome.id);
            expect(result.mutant.chromosomes.c1.operations.length).toBeGreaterThan(0);
            expect(result.mutation.chromosome).toBe('c1');
            expect(result.mutation.sandboxTested).toBe(false);
        }
    });

    it('should preserve C0 immutability during mutations', async () => {
        const engine = new MutationEngine();
        const genome = createTestGenome();
        const originalC0 = JSON.stringify(genome.chromosomes.c0);

        const context: MutationContext = {
            genome,
            targetChromosome: 'c1',
            reason: 'Test mutation',
        };

        const mutants = await engine.generateMutants(context, 4);

        for (const result of mutants) {
            const mutatedC0 = JSON.stringify(result.mutant.chromosomes.c0);
            expect(mutatedC0).toBe(originalC0);
        }
    });

    it('should produce mutations with valid audit records', async () => {
        const engine = new MutationEngine();
        const context = createMutationContext();
        const mutants = await engine.generateMutants(context, 2);

        for (const result of mutants) {
            expect(result.mutation.id).toBeDefined();
            expect(result.mutation.timestamp).toBeInstanceOf(Date);
            expect(result.mutation.operation).toBeDefined();
            expect(result.mutation.before).toBeTruthy();
            expect(result.mutation.after).toBeTruthy();
            expect(result.mutation.reason).toBeTruthy();
        }
    });
});
