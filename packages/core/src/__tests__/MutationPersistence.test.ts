/**
 * MutationPersistence Integration Tests
 *
 * Verifies the complete mutation lifecycle:
 * - Direct promotion: mutate() → genome.layers updated → saveGenome() called
 * - Canary flow: canary content stored → evaluated → promoted to genome.layers
 * - Rollback safety: storage failure rolls back in-memory state
 * - Rejection: genome.layers unchanged when gates reject
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GSEP } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { GenomeInstance } from '../GSEP.js';

// ─── Mock Adapters ──────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        chat: vi.fn().mockResolvedValue({
            content: 'Mock response from LLM',
            usage: { inputTokens: 50, outputTokens: 100 },
        }),
        stream: vi.fn(),
    } as unknown as LLMAdapter;
}

function createMockStorage(): StorageAdapter {
    const genomes = new Map();
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockImplementation(async (g: any) => {
            genomes.set(g.id, JSON.parse(JSON.stringify(g)));
        }),
        loadGenome: vi.fn().mockImplementation(async (id: string) => {
            const g = genomes.get(id);
            return g ? JSON.parse(JSON.stringify(g)) : null;
        }),
        listGenomes: vi.fn().mockResolvedValue([]),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        recordInteraction: vi.fn().mockResolvedValue(undefined),
        recordFeedback: vi.fn().mockResolvedValue(undefined),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getAnalytics: vi.fn().mockResolvedValue({
            totalInteractions: 0,
            totalMutations: 0,
            avgFitnessImprovement: 0,
            userSatisfaction: 0.7,
        }),
        loadDNA: vi.fn().mockResolvedValue(null),
        saveDNA: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;
}

// ─── Tests ──────────────────────────────────────────────

describe('Mutation Persistence', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;
    let agent: GenomeInstance;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();

        agent = await gsep.createGenome({
            name: 'persistence-test-agent',
            config: {
                autonomous: {
                    continuousEvolution: true,
                    evolveEveryN: 100, // high so it doesn't auto-trigger
                },
                // Low guardrails thresholds so mutations pass easily
                evolutionGuardrails: {
                    minQualityScore: 0.01,
                    minSandboxScore: 0.01,
                    minCompressionScore: 0.01,
                    maxCostPerTask: 10.0,
                    minStabilityWindow: 0,
                    maxRollbackRate: 1.0,
                    gateMode: 'AND',
                },
            },
        });
    });

    describe('Direct Promotion', () => {
        it('should persist promoted mutation to genome.layers and storage', async () => {
            // Get the original layer1 allele
            const genome = (agent as any).genome;
            const originalAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'coding-patterns' && a.status === 'active',
            );
            expect(originalAllele).toBeDefined();
            const originalContent = originalAllele.content;

            // Reset mock counts to track only mutation-related calls
            (storage.saveGenome as any).mockClear();
            (storage.logMutation as any).mockClear();

            // Trigger mutation on coding-patterns gene
            const result = await agent.mutate({
                layer: 1,
                gene: 'coding-patterns',
                candidates: 1,
            });

            // The mutation should have been applied
            expect(result.applied).toBe(true);

            // Verify: old allele is retired
            expect(originalAllele.status).toBe('retired');

            // Verify: new allele exists in genome.layers with different variant
            const newAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'coding-patterns' && a.status === 'active',
            );
            expect(newAllele).toBeDefined();
            expect(newAllele.variant).not.toBe(originalAllele.variant);
            expect(newAllele.parentVariant).toBe(originalAllele.variant);
            expect(newAllele.generation).toBe(1);

            // Verify: saveGenome was called
            expect(storage.saveGenome).toHaveBeenCalled();

            // Verify: logMutation was called with deployed: true
            expect(storage.logMutation).toHaveBeenCalledWith(
                expect.objectContaining({
                    gene: 'coding-patterns',
                    mutationType: 'targeted',
                    deployed: true,
                }),
            );
        });

        it('should persist mutation on layer 2 as well', async () => {
            const genome = (agent as any).genome;
            const originalAllele = genome.layers.layer2.find(
                (a: any) => a.gene === 'communication-style' && a.status === 'active',
            );
            expect(originalAllele).toBeDefined();

            (storage.saveGenome as any).mockClear();

            const result = await agent.mutate({
                layer: 2,
                gene: 'communication-style',
                candidates: 1,
            });

            expect(result.applied).toBe(true);
            expect(originalAllele.status).toBe('retired');

            const newAllele = genome.layers.layer2.find(
                (a: any) => a.gene === 'communication-style' && a.status === 'active',
            );
            expect(newAllele).toBeDefined();
            expect(storage.saveGenome).toHaveBeenCalled();
        });
    });

    describe('Rollback on Storage Failure', () => {
        it('should rollback in-memory state when saveGenome throws', async () => {
            const genome = (agent as any).genome;
            const originalAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'coding-patterns' && a.status === 'active',
            );
            const originalLayerSize = genome.layers.layer1.length;

            // Make saveGenome fail
            (storage.saveGenome as any).mockRejectedValueOnce(new Error('Storage failure'));

            // mutate() should throw (or handle gracefully)
            await expect(
                agent.mutate({ layer: 1, gene: 'coding-patterns', candidates: 1 }),
            ).rejects.toThrow('Storage failure');

            // Verify: original allele is still active (rolled back)
            expect(originalAllele.status).toBe('active');

            // Verify: no new allele was left in genome.layers
            expect(genome.layers.layer1.length).toBe(originalLayerSize);
        });
    });

    describe('Rejection', () => {
        it('should not modify genome.layers when mutation is rejected', async () => {
            // Create a genome with very strict guardrails that will reject mutations
            const strictAgent = await gsep.createGenome({
                name: 'strict-agent',
                config: {
                    evolutionGuardrails: {
                        minQualityScore: 0.99,
                        minSandboxScore: 0.99,
                        minCompressionScore: 0.99,
                        maxCostPerTask: 0.001,
                        minStabilityWindow: 1000,
                        maxRollbackRate: 0.0,
                        gateMode: 'AND',
                    },
                },
            });

            const genome = (strictAgent as any).genome;
            const originalLayer1 = genome.layers.layer1.map((a: any) => ({ ...a }));

            (storage.saveGenome as any).mockClear();
            (storage.logMutation as any).mockClear();

            const result = await strictAgent.mutate({
                layer: 1,
                gene: 'coding-patterns',
                candidates: 1,
            });

            // Mutation should be rejected
            expect(result.applied).toBe(false);

            // Verify: genome.layers unchanged (all alleles still active with same content)
            const currentLayer1 = genome.layers.layer1;
            expect(currentLayer1.length).toBe(originalLayer1.length);
            for (const original of originalLayer1) {
                const current = currentLayer1.find(
                    (a: any) => a.gene === original.gene && a.variant === original.variant,
                );
                expect(current).toBeDefined();
                expect(current.status).toBe('active');
                expect(current.content).toBe(original.content);
            }
        });
    });

    describe('Non-existent Gene', () => {
        it('should handle mutation of non-existent gene gracefully', async () => {
            const result = await agent.mutate({
                layer: 1,
                gene: 'non-existent-gene',
                candidates: 1,
            });

            expect(result.applied).toBe(false);
            expect(result.reason).toContain('No active allele found');
        });
    });

    describe('Lineage Tracking', () => {
        it('should track parent variant and increment generation', async () => {
            const genome = (agent as any).genome;
            const firstAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'tool-usage' && a.status === 'active',
            );
            expect(firstAllele).toBeDefined();

            // First mutation
            await agent.mutate({ layer: 1, gene: 'tool-usage', candidates: 1 });

            const secondAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'tool-usage' && a.status === 'active',
            );
            expect(secondAllele).toBeDefined();
            expect(secondAllele.parentVariant).toBe(firstAllele.variant);
            expect(secondAllele.generation).toBe(1);

            // Second mutation on the new allele
            await agent.mutate({ layer: 1, gene: 'tool-usage', candidates: 1 });

            const thirdAllele = genome.layers.layer1.find(
                (a: any) => a.gene === 'tool-usage' && a.status === 'active',
            );
            expect(thirdAllele).toBeDefined();
            expect(thirdAllele.parentVariant).toBe(secondAllele.variant);
            expect(thirdAllele.generation).toBe(2);
        });
    });
});
