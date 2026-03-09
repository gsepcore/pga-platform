/**
 * ModelRouter Tests
 *
 * Tests for multi-model routing, cost optimization strategies,
 * performance tracking, and analytics.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelRouter } from '../ModelRouter.js';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';
import type { TaskClassification } from '../ModelRouter.js';

// ─── Mock Storage Adapter ──────────────────────────────────────

function createMockStorage(): StorageAdapter {
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockResolvedValue(undefined),
        loadGenome: vi.fn().mockResolvedValue(null),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        listGenomes: vi.fn().mockResolvedValue([]),
        saveDNA: vi.fn().mockResolvedValue(undefined),
        loadDNA: vi.fn().mockResolvedValue(null),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getMutationHistory: vi.fn().mockResolvedValue([]),
        getGeneMutationHistory: vi.fn().mockResolvedValue([]),
        recordInteraction: vi.fn().mockResolvedValue(undefined),
        getRecentInteractions: vi.fn().mockResolvedValue([]),
        recordFeedback: vi.fn().mockResolvedValue(undefined),
        getAnalytics: vi.fn().mockResolvedValue({
            totalMutations: 0,
            totalInteractions: 0,
            avgFitnessImprovement: 0,
            userSatisfaction: 0,
            topGenes: [],
        }),
        saveFact: vi.fn().mockResolvedValue(undefined),
        getFacts: vi.fn().mockResolvedValue([]),
        getFact: vi.fn().mockResolvedValue(null),
        updateFact: vi.fn().mockResolvedValue(undefined),
        deleteFact: vi.fn().mockResolvedValue(undefined),
        deleteUserFacts: vi.fn().mockResolvedValue(undefined),
        cleanExpiredFacts: vi.fn().mockResolvedValue(0),
    };
}

describe('ModelRouter', () => {
    let mockStorage: StorageAdapter;

    beforeEach(() => {
        mockStorage = createMockStorage();
    });

    // ─── Basic Routing ─────────────────────────────────────────

    describe('routeTask', () => {
        it('should route simple/trivial tasks to a basic-tier model', async () => {
            const router = new ModelRouter(mockStorage, { strategy: 'balanced' });

            const decision = await router.routeTask({
                userMessage: 'hi',
            });

            // Trivial messages route to basic tier
            const availableModels = ModelRouter.getAvailableModels();
            const basicModelIds = availableModels
                .filter((m) => m.tier === 'basic')
                .map((m) => m.id);

            expect(basicModelIds).toContain(decision.selectedModel);
            expect(decision.reason).toContain('Trivial');
            expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
            expect(decision.confidence).toBeGreaterThan(0);
            expect(decision.alternatives).toBeDefined();
        });

        it('should route expert-level tasks to advanced or expert models', async () => {
            const router = new ModelRouter(mockStorage, { strategy: 'balanced' });

            const decision = await router.routeTask({
                userMessage:
                    'Implement a distributed system architecture with fault tolerance and horizontal scaling',
            });

            const availableModels = ModelRouter.getAvailableModels();
            const advancedOrExpertIds = availableModels
                .filter((m) => m.tier === 'advanced' || m.tier === 'expert')
                .map((m) => m.id);

            expect(advancedOrExpertIds).toContain(decision.selectedModel);
            expect(decision.reason).toContain('Expert');
        });

        it('should return alternatives in the routing decision', async () => {
            const router = new ModelRouter(mockStorage);

            const decision = await router.routeTask({
                userMessage: 'Explain how recursion works',
            });

            expect(Array.isArray(decision.alternatives)).toBe(true);
            // Each alternative should have model, cost, and score
            for (const alt of decision.alternatives) {
                expect(alt.model).toBeDefined();
                expect(typeof alt.cost).toBe('number');
                expect(typeof alt.score).toBe('number');
            }
        });

        it('should route with an explicit classification override', async () => {
            const router = new ModelRouter(mockStorage, { strategy: 'balanced' });

            const explicitClassification: TaskClassification = {
                complexity: 'expert',
                risk: 'critical',
                requiresReasoning: true,
                requiresCreativity: false,
                requiresSpeed: false,
                estimatedTokens: 500,
            };

            const decision = await router.routeTask({
                userMessage: 'Do something',
                classification: explicitClassification,
            });

            // Expert complexity allows expert + advanced tiers
            const eligibleModels = ModelRouter.getAvailableModels()
                .filter((m) => m.tier === 'expert' || m.tier === 'advanced')
                .map((m) => m.id);

            expect(eligibleModels).toContain(decision.selectedModel);
        });
    });

    // ─── Strategy Behavior ─────────────────────────────────────

    describe('strategy: cost-optimized', () => {
        it('should prefer cheaper models when using cost-optimized strategy', async () => {
            const router = new ModelRouter(mockStorage, {
                strategy: 'cost-optimized',
            });

            // Use a moderate task so all models are candidates
            const decision = await router.routeTask({
                userMessage: 'How do I sort an array in JavaScript?',
            });

            // Cost-optimized should pick a lower-cost model
            const selectedSpec = ModelRouter.getAvailableModels().find(
                (m) => m.id === decision.selectedModel,
            );
            expect(selectedSpec).toBeDefined();
            // The selected model should not be the most expensive one
            expect(selectedSpec!.inputCostPer1M).toBeLessThan(15.0);
        });
    });

    describe('strategy: performance-optimized', () => {
        it('should prefer higher-capability models', async () => {
            const router = new ModelRouter(mockStorage, {
                strategy: 'performance-optimized',
            });

            // Moderate task that exposes all models as candidates
            const decision = await router.routeTask({
                userMessage: 'How do I sort an array in JavaScript?',
            });

            // Performance-optimized picks the highest-scored model
            expect(decision.selectedModel).toBeDefined();
            expect(decision.confidence).toBeGreaterThan(0);
            // The top model by score should be selected
            if (decision.alternatives.length > 1) {
                const topScore = decision.alternatives[0].score;
                expect(decision.confidence).toBeGreaterThanOrEqual(
                    topScore - 0.001,
                );
            }
        });
    });

    describe('strategy: balanced', () => {
        it('should select the model with best value (score / cost)', async () => {
            const router = new ModelRouter(mockStorage, {
                strategy: 'balanced',
            });

            const decision = await router.routeTask({
                userMessage: 'Write a function to calculate fibonacci numbers',
            });

            expect(decision.selectedModel).toBeDefined();
            expect(decision.estimatedCost).toBeGreaterThan(0);
            expect(decision.confidence).toBeGreaterThan(0);
            expect(decision.reason).toContain('Balanced');
        });
    });

    // ─── Performance Tracking ──────────────────────────────────

    describe('recordPerformance', () => {
        it('should track model performance metrics across multiple recordings', () => {
            const router = new ModelRouter(mockStorage);

            router.recordPerformance('claude-sonnet-4.5', {
                success: true,
                cost: 0.05,
                latency: 1200,
            });

            router.recordPerformance('claude-sonnet-4.5', {
                success: true,
                cost: 0.04,
                latency: 1100,
            });

            router.recordPerformance('claude-sonnet-4.5', {
                success: false,
                cost: 0.06,
                latency: 2000,
            });

            const analytics = router.getRoutingAnalytics();
            const sonnetPerf = analytics.modelPerformance['claude-sonnet-4.5'];

            expect(sonnetPerf).toBeDefined();
            expect(sonnetPerf.samples).toBe(3);
            expect(sonnetPerf.successRate).toBeGreaterThan(0);
            expect(sonnetPerf.successRate).toBeLessThan(1);
            expect(sonnetPerf.avgCost).toBeGreaterThan(0);
            expect(sonnetPerf.avgLatency).toBeGreaterThan(0);
        });

        it('should track performance independently for different models', () => {
            const router = new ModelRouter(mockStorage);

            router.recordPerformance('claude-haiku-4.5', {
                success: true,
                cost: 0.01,
                latency: 500,
            });

            router.recordPerformance('claude-opus-4.6', {
                success: true,
                cost: 0.10,
                latency: 2500,
            });

            const analytics = router.getRoutingAnalytics();
            expect(Object.keys(analytics.modelPerformance).length).toBe(2);
            expect(analytics.modelPerformance['claude-haiku-4.5']).toBeDefined();
            expect(analytics.modelPerformance['claude-opus-4.6']).toBeDefined();
        });
    });

    // ─── Analytics ─────────────────────────────────────────────

    describe('getRoutingAnalytics', () => {
        it('should return correct totals and strategy', () => {
            const router = new ModelRouter(mockStorage, {
                strategy: 'cost-optimized',
            });

            router.recordPerformance('claude-haiku-4.5', {
                success: true,
                cost: 0.01,
                latency: 400,
            });
            router.recordPerformance('claude-haiku-4.5', {
                success: true,
                cost: 0.02,
                latency: 500,
            });
            router.recordPerformance('claude-sonnet-4.5', {
                success: false,
                cost: 0.05,
                latency: 1500,
            });

            const analytics = router.getRoutingAnalytics();
            expect(analytics.totalRoutings).toBe(3);
            expect(analytics.strategy).toBe('cost-optimized');
        });

        it('should return empty performance when no recordings exist', () => {
            const router = new ModelRouter(mockStorage);

            const analytics = router.getRoutingAnalytics();
            expect(analytics.totalRoutings).toBe(0);
            expect(Object.keys(analytics.modelPerformance).length).toBe(0);
            expect(analytics.strategy).toBe('balanced'); // default
        });
    });

    // ─── Static getAvailableModels ─────────────────────────────

    describe('getAvailableModels', () => {
        it('should return a static list of pre-defined model specs', () => {
            const models = ModelRouter.getAvailableModels();

            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBe(5);

            // Check known model IDs
            const ids = models.map((m) => m.id);
            expect(ids).toContain('claude-haiku-4.5');
            expect(ids).toContain('claude-sonnet-4.5');
            expect(ids).toContain('claude-opus-4.6');
            expect(ids).toContain('gpt-4-turbo');
            expect(ids).toContain('gpt-3.5-turbo');
        });

        it('should include complete specs for each model', () => {
            const models = ModelRouter.getAvailableModels();

            for (const model of models) {
                expect(model.id).toBeDefined();
                expect(model.name).toBeDefined();
                expect(['anthropic', 'openai', 'google']).toContain(model.provider);
                expect(['basic', 'advanced', 'expert']).toContain(model.tier);
                expect(model.inputCostPer1M).toBeGreaterThan(0);
                expect(model.outputCostPer1M).toBeGreaterThan(0);
                expect(model.maxContextTokens).toBeGreaterThan(0);
                expect(model.capabilities.reasoning).toBeGreaterThanOrEqual(0);
                expect(model.capabilities.reasoning).toBeLessThanOrEqual(1);
                expect(model.capabilities.creativity).toBeGreaterThanOrEqual(0);
                expect(model.capabilities.creativity).toBeLessThanOrEqual(1);
                expect(model.capabilities.speed).toBeGreaterThanOrEqual(0);
                expect(model.capabilities.speed).toBeLessThanOrEqual(1);
                expect(model.capabilities.accuracy).toBeGreaterThanOrEqual(0);
                expect(model.capabilities.accuracy).toBeLessThanOrEqual(1);
                expect(model.avgLatencyMs).toBeGreaterThan(0);
            }
        });
    });

    // ─── Config Defaults ───────────────────────────────────────

    describe('configuration', () => {
        it('should default to balanced strategy when no config is provided', () => {
            const router = new ModelRouter(mockStorage);

            const analytics = router.getRoutingAnalytics();
            expect(analytics.strategy).toBe('balanced');
        });

        it('should respect the strategy provided in config', () => {
            const router = new ModelRouter(mockStorage, {
                strategy: 'performance-optimized',
            });

            const analytics = router.getRoutingAnalytics();
            expect(analytics.strategy).toBe('performance-optimized');
        });
    });
});
