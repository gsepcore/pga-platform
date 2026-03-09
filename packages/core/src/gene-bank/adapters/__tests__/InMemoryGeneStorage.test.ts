/**
 * InMemoryGeneStorage Tests — In-memory storage for Cognitive Genes
 *
 * Tests for store, get, update, delete, search (with filters/sorting),
 * listByTenant, getLineage, recordAdoption, getStats, and clear.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGeneStorage } from '../InMemoryGeneStorage.js';
import type { CognitiveGene } from '../../CognitiveGene.js';
import type { GeneSearchFilters } from '../../GeneBank.js';

// ─── Helpers ─────────────────────────────────────────────

function makeGene(overrides: Partial<CognitiveGene> = {}): CognitiveGene {
    const now = new Date().toISOString();
    return {
        id: 'gene-1',
        version: '1.0.0',
        name: 'Test Gene',
        description: 'A test cognitive gene',
        type: 'tool-usage-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.9,
            tokenEfficiency: 0.15,
            responseQuality: 0.88,
            adoptionCount: 0,
            adoptionPerformance: null,
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
        },
        content: {
            instruction: 'Use structured output for tool calls',
            requiredCapabilities: [],
            applicableContexts: ['coding'],
            contraindications: [],
            metadata: {},
        },
        tenant: {
            tenantId: 'tenant-1',
            createdBy: 'agent-1',
            scope: 'private',
            verified: false,
        },
        createdAt: now,
        updatedAt: now,
        tags: ['coding', 'tools'],
        ...overrides,
    } as CognitiveGene;
}

// ─── Tests ───────────────────────────────────────────────

describe('InMemoryGeneStorage', () => {
    let storage: InMemoryGeneStorage;

    beforeEach(() => {
        storage = new InMemoryGeneStorage();
    });

    // ─── store / get ────────────────────────────────────

    describe('store', () => {
        it('should store a gene and retrieve it by id', async () => {
            const gene = makeGene({ id: 'g1' });
            await storage.store(gene);

            const retrieved = await storage.get('g1');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe('g1');
            expect(retrieved!.name).toBe('Test Gene');
        });

        it('should overwrite gene when storing same id again', async () => {
            await storage.store(makeGene({ id: 'g1', name: 'Version 1' }));
            await storage.store(makeGene({ id: 'g1', name: 'Version 2' }));

            const retrieved = await storage.get('g1');
            expect(retrieved!.name).toBe('Version 2');
        });
    });

    describe('get', () => {
        it('should return null for non-existent gene id', async () => {
            const result = await storage.get('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ─── update ─────────────────────────────────────────

    describe('update', () => {
        it('should update an existing gene', async () => {
            await storage.store(makeGene({ id: 'g1', name: 'Original' }));

            const updated = makeGene({ id: 'g1', name: 'Updated' });
            await storage.update(updated);

            const retrieved = await storage.get('g1');
            expect(retrieved!.name).toBe('Updated');
        });

        it('should throw when updating a non-existent gene', async () => {
            const gene = makeGene({ id: 'nonexistent' });
            await expect(storage.update(gene)).rejects.toThrow('Gene not found: nonexistent');
        });
    });

    // ─── delete ─────────────────────────────────────────

    describe('delete', () => {
        it('should delete an existing gene', async () => {
            await storage.store(makeGene({ id: 'g1' }));
            await storage.delete('g1');

            const retrieved = await storage.get('g1');
            expect(retrieved).toBeNull();
        });

        it('should also clean up adoption records on delete', async () => {
            await storage.store(makeGene({ id: 'g1' }));
            await storage.recordAdoption('g1', 'agent-2', 0.9);

            await storage.delete('g1');

            const stats = storage.getStats();
            expect(stats.totalGenes).toBe(0);
            expect(stats.totalAdoptions).toBe(0);
        });

        it('should not throw when deleting non-existent gene', async () => {
            await expect(storage.delete('nonexistent')).resolves.toBeUndefined();
        });
    });

    // ─── search ─────────────────────────────────────────

    describe('search', () => {
        beforeEach(async () => {
            await storage.store(makeGene({
                id: 'g1', domain: 'coding', type: 'tool-usage-pattern',
                tags: ['coding', 'tools'],
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.95, tokenEfficiency: 0.2, responseQuality: 0.9, adoptionCount: 5, adoptionPerformance: 0.8 },
                tenant: { tenantId: 'tenant-1', createdBy: 'agent-1', scope: 'private', verified: false },
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-10T00:00:00.000Z',
            }));
            await storage.store(makeGene({
                id: 'g2', domain: 'math', type: 'reasoning-pattern',
                tags: ['math', 'logic'],
                fitness: { overallFitness: 0.7, taskSuccessRate: 0.75, tokenEfficiency: 0.1, responseQuality: 0.7, adoptionCount: 10, adoptionPerformance: 0.85 },
                tenant: { tenantId: 'tenant-1', createdBy: 'agent-1', scope: 'tenant', verified: true },
                createdAt: '2026-02-01T00:00:00.000Z',
                updatedAt: '2026-02-05T00:00:00.000Z',
            }));
            await storage.store(makeGene({
                id: 'g3', domain: 'coding', type: 'error-recovery-pattern',
                tags: ['coding', 'errors'],
                fitness: { overallFitness: 0.6, taskSuccessRate: 0.65, tokenEfficiency: 0.05, responseQuality: 0.6, adoptionCount: 2, adoptionPerformance: 0.5 },
                tenant: { tenantId: 'tenant-2', createdBy: 'agent-2', scope: 'marketplace', verified: true },
                createdAt: '2026-03-01T00:00:00.000Z',
                updatedAt: '2026-03-01T00:00:00.000Z',
            }));
        });

        it('should filter by tenantId', async () => {
            const results = await storage.search({ tenantId: 'tenant-1' } as GeneSearchFilters);
            expect(results).toHaveLength(2);
            expect(results.every(g => g.tenant.tenantId === 'tenant-1')).toBe(true);
        });

        it('should filter by type', async () => {
            const results = await storage.search({ type: ['reasoning-pattern'] } as GeneSearchFilters);
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('reasoning-pattern');
        });

        it('should filter by domain', async () => {
            const results = await storage.search({ domain: ['coding'] } as GeneSearchFilters);
            expect(results).toHaveLength(2);
        });

        it('should filter by tags (any matching tag)', async () => {
            const results = await storage.search({ tags: ['math'] } as GeneSearchFilters);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('g2');
        });

        it('should filter by minFitness', async () => {
            const results = await storage.search({ minFitness: 0.8 } as GeneSearchFilters);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('g1');
        });

        it('should sort by fitness descending by default', async () => {
            const results = await storage.search({} as GeneSearchFilters);
            expect(results[0].fitness.overallFitness).toBeGreaterThanOrEqual(results[1].fitness.overallFitness);
        });

        it('should sort by fitness ascending', async () => {
            const results = await storage.search({ sortBy: 'fitness', sortOrder: 'asc' } as GeneSearchFilters);
            expect(results[0].fitness.overallFitness).toBeLessThanOrEqual(results[1].fitness.overallFitness);
        });

        it('should sort by adoptions descending', async () => {
            const results = await storage.search({ sortBy: 'adoptions', sortOrder: 'desc' } as GeneSearchFilters);
            expect(results[0].fitness.adoptionCount).toBeGreaterThanOrEqual(results[1].fitness.adoptionCount);
        });

        it('should sort by createdAt descending', async () => {
            const results = await storage.search({ sortBy: 'createdAt', sortOrder: 'desc' } as GeneSearchFilters);
            expect(new Date(results[0].createdAt).getTime()).toBeGreaterThanOrEqual(
                new Date(results[1].createdAt).getTime()
            );
        });

        it('should sort by updatedAt ascending', async () => {
            const results = await storage.search({ sortBy: 'updatedAt', sortOrder: 'asc' } as GeneSearchFilters);
            expect(new Date(results[0].updatedAt).getTime()).toBeLessThanOrEqual(
                new Date(results[1].updatedAt).getTime()
            );
        });

        it('should apply limit (default 10)', async () => {
            const results = await storage.search({ limit: 2 } as GeneSearchFilters);
            expect(results).toHaveLength(2);
        });

        it('should combine multiple filters', async () => {
            const results = await storage.search({
                tenantId: 'tenant-1',
                domain: ['coding'],
                minFitness: 0.8,
            } as GeneSearchFilters);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('g1');
        });

        it('should return all genes when no filters are applied', async () => {
            const results = await storage.search({} as GeneSearchFilters);
            expect(results).toHaveLength(3);
        });

        it('should return empty array when no genes match filters', async () => {
            const results = await storage.search({ domain: ['philosophy'] } as GeneSearchFilters);
            expect(results).toHaveLength(0);
        });
    });

    // ─── listByTenant ───────────────────────────────────

    describe('listByTenant', () => {
        it('should list all genes for a given tenant', async () => {
            await storage.store(makeGene({ id: 'g1', tenant: { tenantId: 't1', createdBy: 'a1', scope: 'private', verified: false } }));
            await storage.store(makeGene({ id: 'g2', tenant: { tenantId: 't1', createdBy: 'a1', scope: 'tenant', verified: false } }));
            await storage.store(makeGene({ id: 'g3', tenant: { tenantId: 't2', createdBy: 'a2', scope: 'private', verified: false } }));

            const results = await storage.listByTenant('t1');
            expect(results).toHaveLength(2);
        });

        it('should filter by scope when provided', async () => {
            await storage.store(makeGene({ id: 'g1', tenant: { tenantId: 't1', createdBy: 'a1', scope: 'private', verified: false } }));
            await storage.store(makeGene({ id: 'g2', tenant: { tenantId: 't1', createdBy: 'a1', scope: 'tenant', verified: false } }));

            const results = await storage.listByTenant('t1', 'tenant');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('g2');
        });

        it('should return empty array when no genes match tenant', async () => {
            const results = await storage.listByTenant('nonexistent');
            expect(results).toHaveLength(0);
        });
    });

    // ─── getLineage ─────────────────────────────────────

    describe('getLineage', () => {
        it('should return empty array for gene with no parent', async () => {
            await storage.store(makeGene({ id: 'g1', lineage: { parentGeneId: null, generation: 0, ancestors: [], mutationHistory: [] } }));

            const lineage = await storage.getLineage('g1');
            expect(lineage).toHaveLength(0);
        });

        it('should return empty array for non-existent gene', async () => {
            const lineage = await storage.getLineage('nonexistent');
            expect(lineage).toHaveLength(0);
        });

        it('should traverse full lineage chain through parents', async () => {
            await storage.store(makeGene({
                id: 'grandparent',
                lineage: { parentGeneId: null, generation: 0, ancestors: [], mutationHistory: [] },
            }));
            await storage.store(makeGene({
                id: 'parent',
                lineage: { parentGeneId: 'grandparent', generation: 1, ancestors: ['grandparent'], mutationHistory: [] },
            }));
            await storage.store(makeGene({
                id: 'child',
                lineage: { parentGeneId: 'parent', generation: 2, ancestors: ['grandparent', 'parent'], mutationHistory: [] },
            }));

            const lineage = await storage.getLineage('child');
            expect(lineage).toHaveLength(2);
            expect(lineage[0].id).toBe('parent');
            expect(lineage[1].id).toBe('grandparent');
        });

        it('should stop traversal when parent is missing (broken chain)', async () => {
            await storage.store(makeGene({
                id: 'child',
                lineage: { parentGeneId: 'missing-parent', generation: 1, ancestors: ['missing-parent'], mutationHistory: [] },
            }));

            const lineage = await storage.getLineage('child');
            expect(lineage).toHaveLength(0);
        });
    });

    // ─── recordAdoption ─────────────────────────────────

    describe('recordAdoption', () => {
        it('should increment adoptionCount on the gene', async () => {
            await storage.store(makeGene({
                id: 'g1',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.85, tokenEfficiency: 0.1, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null },
            }));

            await storage.recordAdoption('g1', 'agent-2', 0.9);

            const gene = await storage.get('g1');
            expect(gene!.fitness.adoptionCount).toBe(1);
        });

        it('should calculate average adoption performance', async () => {
            await storage.store(makeGene({
                id: 'g1',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.85, tokenEfficiency: 0.1, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null },
            }));

            await storage.recordAdoption('g1', 'agent-2', 0.8);
            await storage.recordAdoption('g1', 'agent-3', 0.6);

            const gene = await storage.get('g1');
            expect(gene!.fitness.adoptionPerformance).toBeCloseTo(0.7);
            expect(gene!.fitness.adoptionCount).toBe(2);
        });

        it('should update the gene updatedAt timestamp', async () => {
            const oldDate = '2026-01-01T00:00:00.000Z';
            await storage.store(makeGene({ id: 'g1', updatedAt: oldDate }));

            await storage.recordAdoption('g1', 'agent-2', 0.9);

            const gene = await storage.get('g1');
            expect(new Date(gene!.updatedAt).getTime()).toBeGreaterThan(new Date(oldDate).getTime());
        });

        it('should not throw when recording adoption for non-existent gene', async () => {
            // The method tracks in adoptions map but gene won't be found for update
            await expect(storage.recordAdoption('nonexistent', 'agent-2', 0.9)).resolves.toBeUndefined();
        });

        it('should track multiple adoptions for the same gene', async () => {
            await storage.store(makeGene({
                id: 'g1',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.85, tokenEfficiency: 0.1, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null },
            }));

            await storage.recordAdoption('g1', 'agent-2', 0.9);
            await storage.recordAdoption('g1', 'agent-3', 0.7);
            await storage.recordAdoption('g1', 'agent-4', 0.8);

            const stats = storage.getStats();
            expect(stats.totalAdoptions).toBe(3);
        });
    });

    // ─── getStats ───────────────────────────────────────

    describe('getStats', () => {
        it('should return zeros when storage is empty', () => {
            const stats = storage.getStats();
            expect(stats.totalGenes).toBe(0);
            expect(stats.totalAdoptions).toBe(0);
        });

        it('should count total genes', async () => {
            await storage.store(makeGene({ id: 'g1' }));
            await storage.store(makeGene({ id: 'g2' }));
            await storage.store(makeGene({ id: 'g3' }));

            const stats = storage.getStats();
            expect(stats.totalGenes).toBe(3);
        });

        it('should count total adoptions across all genes', async () => {
            await storage.store(makeGene({ id: 'g1', fitness: { overallFitness: 0.8, taskSuccessRate: 0.85, tokenEfficiency: 0.1, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null } }));
            await storage.store(makeGene({ id: 'g2', fitness: { overallFitness: 0.7, taskSuccessRate: 0.75, tokenEfficiency: 0.1, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } }));

            await storage.recordAdoption('g1', 'agent-2', 0.9);
            await storage.recordAdoption('g1', 'agent-3', 0.8);
            await storage.recordAdoption('g2', 'agent-4', 0.7);

            const stats = storage.getStats();
            expect(stats.totalAdoptions).toBe(3);
        });
    });

    // ─── clear ──────────────────────────────────────────

    describe('clear', () => {
        it('should remove all genes and adoptions', async () => {
            await storage.store(makeGene({ id: 'g1' }));
            await storage.store(makeGene({ id: 'g2' }));
            await storage.recordAdoption('g1', 'agent-2', 0.9);

            storage.clear();

            const stats = storage.getStats();
            expect(stats.totalGenes).toBe(0);
            expect(stats.totalAdoptions).toBe(0);

            const retrieved = await storage.get('g1');
            expect(retrieved).toBeNull();
        });

        it('should allow storing new genes after clear', async () => {
            await storage.store(makeGene({ id: 'g1' }));
            storage.clear();

            await storage.store(makeGene({ id: 'g2', name: 'New Gene' }));
            const retrieved = await storage.get('g2');
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe('New Gene');
        });
    });
});
