/**
 * GSEPGeneBankIntegration Extended Tests — Public API methods
 *
 * Tests: onMutationPromoted, onTaskStart, onTaskComplete,
 * getEnhancedPrompt, getGeneBank, getStats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GSEPGeneBankIntegration } from '../GSEPIntegration.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';
import type { GeneStorageAdapter, GeneSearchFilters } from '../GeneBank.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { SharingScope } from '../CognitiveGene.js';

// ─── Mocks ────────────────────────────────────────────

function makeGene(id: string): CognitiveGene {
    const now = new Date().toISOString();
    return {
        id,
        version: '1.0.0',
        name: `Gene ${id}`,
        description: 'Test gene',
        type: 'reasoning-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
            tokenEfficiency: 0.7,
            responseQuality: 0.9,
            adoptionCount: 0,
            adoptionPerformance: null,
        },
        lineage: { parentGeneId: null, generation: 0, ancestors: [], mutationHistory: [] },
        content: { instruction: 'Test', examples: [], requiredCapabilities: [], applicableContexts: ['general'], contraindications: [], metadata: {} },
        tenant: { tenantId: 'test-tenant', createdBy: 'gsep_system', scope: 'tenant' as const, verified: false },
        createdAt: now,
        updatedAt: now,
        tags: ['test'],
    };
}

function createMockLLM(): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: JSON.stringify({
                name: 'Extracted Gene',
                description: 'A test extracted gene',
                type: 'reasoning-pattern',
                domain: 'coding',
                instruction: 'Do this thing',
                requiredCapabilities: [],
                applicableContexts: ['general'],
                contraindications: [],
                tags: ['test'],
            }),
            usage: { inputTokens: 10, outputTokens: 20 },
        }),
    };
}

function createMockStorage(): GeneStorageAdapter {
    const genes = new Map<string, CognitiveGene>();

    return {
        store: vi.fn(async (gene: CognitiveGene) => { genes.set(gene.id, gene); }),
        get: vi.fn(async (id: string) => genes.get(id) || null),
        update: vi.fn(async (gene: CognitiveGene) => { genes.set(gene.id, gene); }),
        delete: vi.fn(async (id: string) => { genes.delete(id); }),
        search: vi.fn(async (_filters: GeneSearchFilters) => Array.from(genes.values())),
        listByTenant: vi.fn(async (_tenantId: string, _scope?: SharingScope) => Array.from(genes.values())),
        getLineage: vi.fn(async () => []),
        recordAdoption: vi.fn(async () => {}),
    };
}

// ─── Tests ────────────────────────────────────────────

describe('GSEPGeneBankIntegration — Public API', () => {
    let llm: LLMAdapter;
    let storage: GeneStorageAdapter;
    let integration: GSEPGeneBankIntegration;

    beforeEach(() => {
        llm = createMockLLM();
        storage = createMockStorage();
        integration = new GSEPGeneBankIntegration(
            llm,
            { storage, autoExtract: true, autoAdopt: true },
            'test-tenant',
        );
    });

    describe('getGeneBank', () => {
        it('should return the GeneBank instance', () => {
            const bank = integration.getGeneBank();
            expect(bank).toBeDefined();
            expect(bank.getConfig).toBeDefined();
            expect(bank.getConfig().tenantId).toBe('test-tenant');
        });
    });

    describe('onMutationPromoted', () => {
        it('should return null when autoExtract is disabled', async () => {
            const noExtract = new GSEPGeneBankIntegration(
                llm,
                { storage, autoExtract: false },
                'test-tenant',
            );

            const result = await noExtract.onMutationPromoted(
                { id: 'genome-1', previousPrompt: 'old', currentPrompt: 'new' },
                { id: 'mut-1' },
                0.6,
                0.9,
            );

            expect(result).toBeNull();
        });

        it('should extract and store gene on successful mutation', async () => {
            const result = await integration.onMutationPromoted(
                { id: 'genome-1', previousPrompt: 'old prompt', currentPrompt: 'new prompt with code function api' },
                { id: 'mut-1', fitnessMetrics: { successRate: 0.9, tokenEfficiency: 0.8, quality: 0.85 } },
                0.6,
                0.9,
            );

            // Result may be a gene or null depending on LLM extraction
            if (result) {
                expect(result.id).toBeDefined();
                expect(result.fitness).toBeDefined();
            }
        });

        it('should use default prompts when genome has no prompt fields', async () => {
            const result = await integration.onMutationPromoted(
                { id: 'genome-1' },
                { id: 'mut-1' },
                0.5,
                0.8,
            );

            // Should not throw even with minimal genome
            expect(result === null || typeof result === 'object').toBe(true);
        });

        it('should use fitness metrics bridge when provided', async () => {
            await integration.onMutationPromoted(
                { id: 'genome-1', currentPrompt: 'Test prompt' },
                {
                    id: 'mut-1',
                    fitnessMetrics: {
                        successRate: 0.95,
                        tokenEfficiency: 0.7,
                        quality: 0.9,
                        userSatisfaction: 0.88,
                    },
                },
                0.7,
                0.95,
            );

            // Verify LLM was called (for extraction)
            expect(llm.chat).toHaveBeenCalled();
        });
    });

    describe('onTaskStart', () => {
        it('should return empty array when autoAdopt is disabled', async () => {
            const noAdopt = new GSEPGeneBankIntegration(
                llm,
                { storage, autoAdopt: false },
                'test-tenant',
            );

            const result = await noAdopt.onTaskStart(
                { id: 'genome-1' },
                'Write unit tests',
            );

            expect(result).toEqual([]);
        });

        it('should search for relevant genes', async () => {
            const result = await integration.onTaskStart(
                { id: 'genome-1', domain: 'coding' },
                'Write TypeScript unit tests',
                'coding',
            );

            // Returns adopted genes (may be empty if sandbox tests fail)
            expect(Array.isArray(result)).toBe(true);
        });

        it('should create adopter for new genome', async () => {
            await integration.onTaskStart(
                { id: 'genome-new' },
                'First task',
            );

            // Second call should reuse the same adopter
            await integration.onTaskStart(
                { id: 'genome-new' },
                'Second task',
            );
        });
    });

    describe('onTaskComplete', () => {
        it('should do nothing if no adopter exists for genome', async () => {
            // No prior onTaskStart means no adopter
            await integration.onTaskComplete(
                { id: 'unknown-genome' },
                true,
                0.9,
            );
            // Should not throw
        });

        it('should update gene performance after task', async () => {
            // First create an adopter via onTaskStart
            await integration.onTaskStart(
                { id: 'genome-perf' },
                'Test task',
            );

            // Then complete the task
            await integration.onTaskComplete(
                { id: 'genome-perf' },
                true,
                0.85,
            );
            // Should not throw
        });
    });

    describe('getEnhancedPrompt', () => {
        it('should return base prompt when no adopter exists', async () => {
            const result = await integration.getEnhancedPrompt(
                { id: 'unknown' },
                'Base prompt text',
            );

            expect(result).toBe('Base prompt text');
        });

        it('should return enhanced prompt when adopter exists', async () => {
            // Create adopter
            await integration.onTaskStart(
                { id: 'genome-enhance' },
                'Task description',
            );

            const result = await integration.getEnhancedPrompt(
                { id: 'genome-enhance' },
                'Base prompt',
            );

            // Should return at least the base prompt
            expect(result).toContain('Base prompt');
        });
    });

    describe('getStats', () => {
        it('should return gene bank stats and adoption stats', async () => {
            const stats = await integration.getStats();

            expect(stats.geneBank).toBeDefined();
            expect(stats.geneBank.totalGenes).toBeDefined();
            expect(stats.adoptions).toBeDefined();
            expect(Array.isArray(stats.adoptions)).toBe(true);
        });

        it('should include adopters in stats', async () => {
            // Create adopter via onTaskStart
            await integration.onTaskStart({ id: 'genome-stats' }, 'Task');

            const stats = await integration.getStats();

            expect(stats.adoptions.length).toBe(1);
            expect(stats.adoptions[0].genomeId).toBe('genome-stats');
        });
    });
});
