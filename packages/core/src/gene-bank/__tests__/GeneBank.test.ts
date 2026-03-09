/**
 * GeneBank Unit Tests
 *
 * Tests for the GeneBank class using InMemoryGeneStorage adapter.
 * Covers CRUD operations, search, adoption tracking, and statistics.
 *
 * @version 0.4.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeneBank } from '../GeneBank.js';
import { InMemoryGeneStorage } from '../adapters/InMemoryGeneStorage.js';
import type { CognitiveGene } from '../CognitiveGene.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const TEST_TENANT_ID = 'tenant-test';
const TEST_AGENT_ID = 'agent-test';

// ============================================================================
// HELPER: Create a valid CognitiveGene for the test tenant
// ============================================================================

function createTestGene(overrides: Partial<CognitiveGene> & Record<string, unknown> = {}): CognitiveGene {
    const now = new Date().toISOString();
    const id = (overrides.id as string) || `gene-${Math.random().toString(36).substring(2, 8)}`;

    return {
        id,
        version: '1.0.0',
        name: (overrides.name as string) || 'Test Gene',
        description: (overrides.description as string) || 'A test gene for bank operations',
        type: (overrides.type as CognitiveGene['type']) || 'reasoning-pattern',
        domain: (overrides.domain as string) || 'coding',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
            tokenEfficiency: 0.7,
            responseQuality: 0.9,
            adoptionCount: 5,
            adoptionPerformance: 0.8,
            ...(overrides.fitness as object || {}),
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
            ...(overrides.lineage as object || {}),
        },
        content: {
            instruction: 'Test instruction',
            examples: [],
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
            ...(overrides.content as object || {}),
        },
        tenant: {
            tenantId: TEST_TENANT_ID,
            createdBy: TEST_AGENT_ID,
            scope: 'tenant' as const,
            verified: false,
            ...(overrides.tenant as object || {}),
        },
        createdAt: now,
        updatedAt: now,
        tags: (overrides.tags as string[]) || ['test'],
    };
}

function createStorage(): InMemoryGeneStorage {
    return new InMemoryGeneStorage();
}

// ============================================================================
// TESTS: GeneBank
// ============================================================================

describe('GeneBank', () => {
    let storage: InMemoryGeneStorage;
    let bank: GeneBank;

    beforeEach(() => {
        storage = createStorage();
        bank = new GeneBank(storage, {
            tenantId: TEST_TENANT_ID,
            agentId: TEST_AGENT_ID,
            minFitnessThreshold: 0.6,
            maxGenesPerAgent: 50,
            enableTHK: true,
        });
    });

    // ========================================================================
    // CRUD: storeGene / getGene
    // ========================================================================

    describe('storeGene and getGene', () => {
        it('should store a gene and retrieve it by ID', async () => {
            const gene = createTestGene({ id: 'gene-store-1' });

            await bank.storeGene(gene);
            const retrieved = await bank.getGene('gene-store-1');

            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe('gene-store-1');
            expect(retrieved!.name).toBe(gene.name);
            expect(retrieved!.type).toBe(gene.type);
            expect(retrieved!.domain).toBe(gene.domain);
        });

        it('should return null for a non-existent gene ID', async () => {
            const retrieved = await bank.getGene('non-existent-id');
            expect(retrieved).toBeNull();
        });

        it('should reject a gene below the fitness threshold', async () => {
            const gene = createTestGene({
                fitness: {
                    overallFitness: 0.3,
                    taskSuccessRate: 0.3,
                    tokenEfficiency: 0.2,
                    responseQuality: 0.3,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });

            await expect(bank.storeGene(gene)).rejects.toThrow('below threshold');
        });

        it('should reject a gene from a different tenant', async () => {
            const gene = createTestGene({
                tenant: {
                    tenantId: 'other-tenant',
                    createdBy: 'other-agent',
                    scope: 'tenant' as const,
                    verified: false,
                },
            });

            await expect(bank.storeGene(gene)).rejects.toThrow('different tenant');
        });
    });

    // ========================================================================
    // updateGene
    // ========================================================================

    describe('updateGene', () => {
        it('should update an existing gene', async () => {
            const gene = createTestGene({ id: 'gene-update-1', name: 'Original Name' });
            await bank.storeGene(gene);

            const updated = { ...gene, name: 'Updated Name', updatedAt: new Date().toISOString() };
            await bank.updateGene(updated);

            const retrieved = await bank.getGene('gene-update-1');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe('Updated Name');
        });

        it('should throw when updating a non-existent gene', async () => {
            const gene = createTestGene({ id: 'gene-not-here' });
            await expect(bank.updateGene(gene)).rejects.toThrow('not found');
        });
    });

    // ========================================================================
    // deleteGene
    // ========================================================================

    describe('deleteGene', () => {
        it('should delete a gene and return null on subsequent get', async () => {
            const gene = createTestGene({ id: 'gene-delete-1' });
            await bank.storeGene(gene);

            await bank.deleteGene('gene-delete-1');

            const retrieved = await bank.getGene('gene-delete-1');
            expect(retrieved).toBeNull();
        });

        it('should throw when deleting a non-existent gene', async () => {
            await expect(bank.deleteGene('nonexistent-gene')).rejects.toThrow('not found');
        });
    });

    // ========================================================================
    // searchGenes
    // ========================================================================

    describe('searchGenes', () => {
        beforeEach(async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-search-coding',
                type: 'reasoning-pattern',
                domain: 'coding',
                tags: ['typescript', 'testing'],
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.85 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-search-math',
                type: 'domain-expertise',
                domain: 'math',
                tags: ['algebra'],
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.7, responseQuality: 0.8, adoptionCount: 3, adoptionPerformance: 0.7 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-search-support',
                type: 'communication-pattern',
                domain: 'customer-support',
                tags: ['empathy'],
                fitness: { overallFitness: 0.75, taskSuccessRate: 0.75, tokenEfficiency: 0.6, responseQuality: 0.75, adoptionCount: 7, adoptionPerformance: 0.8 },
            }));
        });

        it('should search genes by domain', async () => {
            const results = await bank.searchGenes({ domain: ['coding'] });

            expect(results.length).toBe(1);
            expect(results[0].domain).toBe('coding');
        });

        it('should search genes by type', async () => {
            const results = await bank.searchGenes({ type: ['domain-expertise'] });

            expect(results.length).toBe(1);
            expect(results[0].type).toBe('domain-expertise');
        });

        it('should filter genes by minimum fitness', async () => {
            const results = await bank.searchGenes({ minFitness: 0.85 });

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('gene-search-coding');
            expect(results[0].fitness.overallFitness).toBeGreaterThanOrEqual(0.85);
        });
    });

    // ========================================================================
    // findByDomain
    // ========================================================================

    describe('findByDomain', () => {
        it('should return genes matching the domain', async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-find-coding',
                domain: 'coding',
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 5, adoptionPerformance: 0.7 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-find-math',
                domain: 'math',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 3, adoptionPerformance: 0.6 },
            }));

            const results = await bank.findByDomain('coding');

            expect(results.length).toBe(1);
            expect(results.every(g => g.domain === 'coding')).toBe(true);
        });

        it('should respect minFitness parameter', async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-fitness-high',
                domain: 'coding',
                fitness: { overallFitness: 0.95, taskSuccessRate: 0.95, tokenEfficiency: 0.9, responseQuality: 0.95, adoptionCount: 8, adoptionPerformance: 0.85 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-fitness-low',
                domain: 'coding',
                fitness: { overallFitness: 0.65, taskSuccessRate: 0.65, tokenEfficiency: 0.5, responseQuality: 0.65, adoptionCount: 1, adoptionPerformance: 0.5 },
            }));

            const results = await bank.findByDomain('coding', 0.9);

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('gene-fitness-high');
        });
    });

    // ========================================================================
    // findByType
    // ========================================================================

    describe('findByType', () => {
        it('should return genes matching the type', async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-type-tool',
                type: 'tool-usage-pattern',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 4, adoptionPerformance: 0.7 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-type-reasoning',
                type: 'reasoning-pattern',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.7, responseQuality: 0.8, adoptionCount: 2, adoptionPerformance: 0.6 },
            }));

            const results = await bank.findByType('tool-usage-pattern');

            expect(results.length).toBe(1);
            expect(results[0].type).toBe('tool-usage-pattern');
        });
    });

    // ========================================================================
    // getTopGenes
    // ========================================================================

    describe('getTopGenes', () => {
        it('should return genes sorted by fitness descending', async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-top-low',
                fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 1, adoptionPerformance: 0.5 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-top-high',
                fitness: { overallFitness: 0.95, taskSuccessRate: 0.95, tokenEfficiency: 0.9, responseQuality: 0.95, adoptionCount: 10, adoptionPerformance: 0.9 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-top-mid',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            }));

            const results = await bank.getTopGenes(3);

            expect(results.length).toBe(3);
            // Sorted by fitness descending
            expect(results[0].fitness.overallFitness).toBeGreaterThanOrEqual(results[1].fitness.overallFitness);
            expect(results[1].fitness.overallFitness).toBeGreaterThanOrEqual(results[2].fitness.overallFitness);
            expect(results[0].id).toBe('gene-top-high');
        });

        it('should respect the limit parameter', async () => {
            for (let i = 0; i < 5; i++) {
                await bank.storeGene(createTestGene({
                    id: `gene-limit-${i}`,
                    fitness: { overallFitness: 0.7 + i * 0.05, taskSuccessRate: 0.7, tokenEfficiency: 0.6, responseQuality: 0.7, adoptionCount: 2, adoptionPerformance: 0.6 },
                }));
            }

            const results = await bank.getTopGenes(2);

            expect(results.length).toBe(2);
        });
    });

    // ========================================================================
    // getStats
    // ========================================================================

    describe('getStats', () => {
        it('should return correct statistics for stored genes', async () => {
            await bank.storeGene(createTestGene({
                id: 'gene-stat-1',
                type: 'reasoning-pattern',
                domain: 'coding',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.7, responseQuality: 0.8, adoptionCount: 3, adoptionPerformance: 0.7 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-stat-2',
                type: 'tool-usage-pattern',
                domain: 'coding',
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 7, adoptionPerformance: 0.85 },
            }));
            await bank.storeGene(createTestGene({
                id: 'gene-stat-3',
                type: 'reasoning-pattern',
                domain: 'math',
                fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.6, responseQuality: 0.7, adoptionCount: 2, adoptionPerformance: 0.6 },
            }));

            const stats = await bank.getStats();

            expect(stats.totalGenes).toBe(3);
            expect(stats.genesByType['reasoning-pattern']).toBe(2);
            expect(stats.genesByType['tool-usage-pattern']).toBe(1);
            expect(stats.genesByDomain['coding']).toBe(2);
            expect(stats.genesByDomain['math']).toBe(1);
            expect(stats.averageFitness).toBeCloseTo(0.8, 1);
            expect(stats.totalAdoptions).toBe(12); // 3 + 7 + 2
        });

        it('should return zero stats for an empty bank', async () => {
            const stats = await bank.getStats();

            expect(stats.totalGenes).toBe(0);
            expect(stats.averageFitness).toBe(0);
            expect(stats.totalAdoptions).toBe(0);
        });
    });

    // ========================================================================
    // recordAdoption
    // ========================================================================

    describe('recordAdoption', () => {
        it('should track a gene adoption and update adoption count', async () => {
            const gene = createTestGene({
                id: 'gene-adopt-1',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 0, adoptionPerformance: null },
            });
            await bank.storeGene(gene);

            await bank.recordAdoption('gene-adopt-1', 'agent-bob', 0.9);

            const retrieved = await bank.getGene('gene-adopt-1');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.fitness.adoptionCount).toBe(1);
            expect(retrieved!.fitness.adoptionPerformance).toBeCloseTo(0.9, 2);
        });

        it('should calculate average adoption performance across multiple adoptions', async () => {
            const gene = createTestGene({
                id: 'gene-adopt-multi',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 0, adoptionPerformance: null },
            });
            await bank.storeGene(gene);

            await bank.recordAdoption('gene-adopt-multi', 'agent-bob', 0.8);
            await bank.recordAdoption('gene-adopt-multi', 'agent-carol', 0.9);
            await bank.recordAdoption('gene-adopt-multi', 'agent-dave', 1.0);

            const retrieved = await bank.getGene('gene-adopt-multi');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.fitness.adoptionCount).toBe(3);
            expect(retrieved!.fitness.adoptionPerformance).toBeCloseTo(0.9, 2); // (0.8+0.9+1.0)/3
        });
    });

    // ========================================================================
    // Capacity Eviction
    // ========================================================================

    describe('capacity eviction', () => {
        it('should evict lowest fitness gene when capacity is reached', async () => {
            const smallBank = new GeneBank(storage, {
                tenantId: TEST_TENANT_ID,
                agentId: TEST_AGENT_ID,
                minFitnessThreshold: 0.6,
                maxGenesPerAgent: 2,
                enableTHK: true,
            });

            const gene1 = createTestGene({
                id: 'gene-evict-low',
                fitness: { overallFitness: 0.65, taskSuccessRate: 0.65, tokenEfficiency: 0.5, responseQuality: 0.65, adoptionCount: 0, adoptionPerformance: null },
            });
            const gene2 = createTestGene({
                id: 'gene-evict-high',
                fitness: { overallFitness: 0.95, taskSuccessRate: 0.95, tokenEfficiency: 0.9, responseQuality: 0.95, adoptionCount: 10, adoptionPerformance: 0.9 },
            });
            const gene3 = createTestGene({
                id: 'gene-evict-new',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.8 },
            });

            await smallBank.storeGene(gene1);
            await smallBank.storeGene(gene2);

            // This should evict gene1 (lowest fitness)
            await smallBank.storeGene(gene3);

            const evicted = await smallBank.getGene('gene-evict-low');
            const kept = await smallBank.getGene('gene-evict-high');
            const added = await smallBank.getGene('gene-evict-new');

            expect(evicted).toBeNull();
            expect(kept).not.toBeNull();
            expect(added).not.toBeNull();
        });
    });
});
