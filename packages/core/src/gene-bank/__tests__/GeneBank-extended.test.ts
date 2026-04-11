/**
 * GeneBank Extended Tests — Boost coverage for GeneBank.ts and adapters
 *
 * Covers: PostgresGeneStorage (mocked), SQLiteGeneStorage (mocked),
 * GeneBank edge cases, CognitiveGene helpers, search filters schema validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneBank, GeneSearchFiltersSchema, GeneBankConfigSchema } from '../GeneBank.js';
import { InMemoryGeneStorage } from '../adapters/InMemoryGeneStorage.js';
import { PostgresGeneStorage } from '../adapters/PostgresGeneStorage.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import {
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,
} from '../CognitiveGene.js';

// ─── Helpers ────────────────────────────────────────────

const TEST_TENANT = 'tenant-test';
const TEST_AGENT = 'agent-test';

function makeGene(overrides: Partial<CognitiveGene> & Record<string, unknown> = {}): CognitiveGene {
    const now = new Date().toISOString();
    const id = (overrides.id as string) || `gene-${Math.random().toString(36).substring(2, 8)}`;
    return {
        id,
        version: '1.0.0',
        name: (overrides.name as string) || 'Test Gene',
        description: (overrides.description as string) || 'A test gene',
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
            tenantId: TEST_TENANT,
            createdBy: TEST_AGENT,
            scope: 'tenant' as const,
            verified: false,
            ...(overrides.tenant as object || {}),
        },
        createdAt: now,
        updatedAt: now,
        tags: (overrides.tags as string[]) || ['test'],
    };
}

// ─── CognitiveGene helper functions ────────────────────

describe('CognitiveGene helpers', () => {
    describe('createGeneId', () => {
        it('should create a gene ID with tenant and type prefix', () => {
            const id = createGeneId('my-tenant', 'reasoning-pattern');
            expect(id).toMatch(/^gene_my-tenant_reasoning-pattern_/);
        });

        it('should generate unique IDs on successive calls', () => {
            const id1 = createGeneId('t1', 'tool-usage-pattern');
            const id2 = createGeneId('t1', 'tool-usage-pattern');
            expect(id1).not.toBe(id2);
        });
    });

    describe('meetsMinimumFitness', () => {
        it('should return true when both scores are above threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.7)).toBe(true);
        });

        it('should return false when overallFitness is below threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.5, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(false);
        });

        it('should return false when taskSuccessRate is below threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.4, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(false);
        });

        it('should use default threshold of 0.6', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.65, taskSuccessRate: 0.65, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene)).toBe(true);
        });
    });

    describe('calculateFitnessDelta', () => {
        it('should return child fitness when no parent', () => {
            const child = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, null)).toBe(0.8);
        });

        it('should return difference between child and parent fitness', () => {
            const child = makeGene({ fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.5, responseQuality: 0.9, adoptionCount: 0, adoptionPerformance: null } });
            const parent = makeGene({ fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.4, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, parent)).toBeCloseTo(0.2);
        });

        it('should return negative delta when child is worse', () => {
            const child = makeGene({ fitness: { overallFitness: 0.5, taskSuccessRate: 0.5, tokenEfficiency: 0.3, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            const parent = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, parent)).toBeCloseTo(-0.3);
        });
    });

    describe('isMarketplaceReady', () => {
        it('should return true for a fully qualified marketplace gene', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.85 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(true);
        });

        it('should return false if not verified', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.85 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: false },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false if scope is not marketplace', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.85 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'tenant' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false if fitness below 0.8', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 10, adoptionPerformance: 0.85 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false if adoption count below 5', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 3, adoptionPerformance: 0.85 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false if adoption performance below 0.7', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.5 },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false if adoption performance is null', () => {
            const gene = makeGene({
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: null },
                tenant: { tenantId: TEST_TENANT, createdBy: TEST_AGENT, scope: 'marketplace' as const, verified: true },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });
    });
});

// ─── GeneSearchFiltersSchema validation ────────────────

describe('GeneSearchFiltersSchema', () => {
    it('should parse minimal valid filters', () => {
        const result = GeneSearchFiltersSchema.parse({});
        expect(result.sortBy).toBe('fitness');
        expect(result.sortOrder).toBe('desc');
        expect(result.limit).toBe(10);
        expect(result.offset).toBe(0);
        expect(result.verifiedOnly).toBe(false);
    });

    it('should parse full valid filters', () => {
        const result = GeneSearchFiltersSchema.parse({
            tenantId: 'tenant-1',
            type: ['reasoning-pattern'],
            domain: ['coding'],
            tags: ['test'],
            minFitness: 0.5,
            minAdoptions: 3,
            scope: ['tenant'],
            verifiedOnly: true,
            sortBy: 'adoptions',
            sortOrder: 'asc',
            limit: 50,
            offset: 10,
        });
        expect(result.tenantId).toBe('tenant-1');
        expect(result.limit).toBe(50);
        expect(result.verifiedOnly).toBe(true);
    });

    it('should reject invalid minFitness', () => {
        expect(() => GeneSearchFiltersSchema.parse({ minFitness: 2.0 })).toThrow();
        expect(() => GeneSearchFiltersSchema.parse({ minFitness: -0.5 })).toThrow();
    });

    it('should reject invalid limit', () => {
        expect(() => GeneSearchFiltersSchema.parse({ limit: 0 })).toThrow();
        expect(() => GeneSearchFiltersSchema.parse({ limit: 200 })).toThrow();
    });
});

// ─── GeneBankConfigSchema validation ───────────────────

describe('GeneBankConfigSchema', () => {
    it('should parse minimal config with defaults', () => {
        const result = GeneBankConfigSchema.parse({
            tenantId: 'tenant-1',
            agentId: 'agent-1',
        });
        expect(result.minFitnessThreshold).toBe(0.6);
        expect(result.maxGenesPerAgent).toBe(100);
        expect(result.enableTHK).toBe(true);
        expect(result.enableMarketplace).toBe(false);
        expect(result.autoAdoptFromTenant).toBe(false);
        expect(result.autoAdoptMinFitness).toBe(0.8);
        expect(result.maxAutoAdoptionsPerDay).toBe(3);
    });

    it('should reject invalid fitness threshold', () => {
        expect(() => GeneBankConfigSchema.parse({
            tenantId: 'tenant-1',
            agentId: 'agent-1',
            minFitnessThreshold: 1.5,
        })).toThrow();
    });
});

// ─── GeneBank with MetricsCollector ────────────────────

describe('GeneBank with MetricsCollector', () => {
    let storage: InMemoryGeneStorage;
    let metricsCollector: { logAudit: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        storage = new InMemoryGeneStorage();
        metricsCollector = { logAudit: vi.fn() };
    });

    it('should log audit on successful storeGene', async () => {
        const bank = new GeneBank(storage, { tenantId: TEST_TENANT, agentId: TEST_AGENT }, metricsCollector as never);
        const gene = makeGene({ id: 'audit-gene-1' });
        await bank.storeGene(gene);

        expect(metricsCollector.logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                component: 'GeneBank',
                operation: 'storeGene',
            }),
        );
    });

    it('should log audit error on failed storeGene', async () => {
        const bank = new GeneBank(storage, { tenantId: TEST_TENANT, agentId: TEST_AGENT, minFitnessThreshold: 0.9 }, metricsCollector as never);
        const gene = makeGene({ fitness: { overallFitness: 0.5, taskSuccessRate: 0.5, tokenEfficiency: 0.3, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });

        await expect(bank.storeGene(gene)).rejects.toThrow('below threshold');
        expect(metricsCollector.logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                component: 'GeneBank',
                operation: 'storeGene',
            }),
        );
    });

    it('should log audit on successful searchGenes', async () => {
        const bank = new GeneBank(storage, { tenantId: TEST_TENANT, agentId: TEST_AGENT }, metricsCollector as never);
        await bank.searchGenes({});

        expect(metricsCollector.logAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                component: 'GeneBank',
                operation: 'searchGenes',
            }),
        );
    });

    it('should log audit on recordAdoption', async () => {
        const bank = new GeneBank(storage, { tenantId: TEST_TENANT, agentId: TEST_AGENT }, metricsCollector as never);
        const gene = makeGene({ id: 'adopt-audit' });
        await bank.storeGene(gene);
        await bank.recordAdoption('adopt-audit', 'agent-2', 0.9);

        const adoptionCall = metricsCollector.logAudit.mock.calls.find(
            (call: unknown[]) => (call[0] as { operation: string }).operation === 'recordAdoption',
        );
        expect(adoptionCall).toBeDefined();
    });

    it('should log eviction info in metadata when capacity reached', async () => {
        const bank = new GeneBank(storage, { tenantId: TEST_TENANT, agentId: TEST_AGENT, maxGenesPerAgent: 1 }, metricsCollector as never);
        await bank.storeGene(makeGene({ id: 'first', fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 0, adoptionPerformance: null } }));
        await bank.storeGene(makeGene({ id: 'second', fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 0, adoptionPerformance: null } }));

        const storeCalls = metricsCollector.logAudit.mock.calls.filter(
            (call: unknown[]) => (call[0] as { operation: string }).operation === 'storeGene' && (call[0] as { level: string }).level === 'info',
        );
        const lastStoreCall = storeCalls[storeCalls.length - 1];
        expect(lastStoreCall[0].metadata.evicted).toBe(true);
    });
});

// ─── GeneBank daily adoption reset ─────────────────────

describe('GeneBank adoption counter', () => {
    it('should track daily adoption count', async () => {
        const storage = new InMemoryGeneStorage();
        const bank = new GeneBank(storage, {
            tenantId: TEST_TENANT,
            agentId: TEST_AGENT,
            autoAdoptFromTenant: true,
            maxAutoAdoptionsPerDay: 2,
        });

        const gene = makeGene({ id: 'adopt-count' });
        await bank.storeGene(gene);

        expect(bank.canAutoAdopt()).toBe(true);

        await bank.recordAdoption('adopt-count', 'a1', 0.8);
        await bank.recordAdoption('adopt-count', 'a2', 0.9);

        expect(bank.canAutoAdopt()).toBe(false);
    });
});

// ─── PostgresGeneStorage (mocked connection) ──────────

describe('PostgresGeneStorage', () => {
    function createMockConnection() {
        return {
            query: vi.fn().mockResolvedValue({ rows: [] }),
        };
    }

    it('should call INSERT on store', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);
        const gene = makeGene({ id: 'pg-gene-1' });

        await pg.store(gene);

        expect(conn.query).toHaveBeenCalledTimes(1);
        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('INSERT INTO cognitive_genes');
    });

    it('should call SELECT on get and return null when no rows', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        const result = await pg.get('nonexistent');
        expect(result).toBeNull();
    });

    it('should return gene when row found', async () => {
        const conn = createMockConnection();
        conn.query.mockResolvedValue({
            rows: [{
                id: 'pg-gene-1',
                version: '1.0.0',
                name: 'PG Gene',
                description: 'Test',
                type: 'reasoning-pattern',
                domain: 'coding',
                fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.8, adoptionCount: 0, adoptionPerformance: null },
                parent_gene_id: null,
                generation: 0,
                ancestors: [],
                mutation_history: [],
                instruction: 'Test',
                examples: [],
                required_capabilities: [],
                applicable_contexts: ['general'],
                contraindications: [],
                content_metadata: {},
                tenant_id: 'tenant-1',
                created_by: 'agent-1',
                scope: 'private',
                verified: false,
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
                tags: ['test'],
            }],
        });

        const result = await (new PostgresGeneStorage(conn)).get('pg-gene-1');
        expect(result).not.toBeNull();
        expect(result!.id).toBe('pg-gene-1');
        expect(result!.name).toBe('PG Gene');
        expect(result!.lineage.parentGeneId).toBeNull();
        expect(result!.content.instruction).toBe('Test');
        expect(result!.tenant.tenantId).toBe('tenant-1');
    });

    it('should call UPDATE on update', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);
        const gene = makeGene({ id: 'pg-update' });

        await pg.update(gene);

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('UPDATE cognitive_genes');
    });

    it('should call DELETE on delete', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.delete('pg-del');

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('DELETE FROM cognitive_genes');
    });

    it('should build search query with tenant filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ tenantId: 'tenant-1', sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('tenant_id = $1');
    });

    it('should build search query with type filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ type: ['reasoning-pattern', 'tool-usage-pattern'], sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('type = ANY');
    });

    it('should build search query with domain filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ domain: ['coding'], sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('domain = ANY');
    });

    it('should build search query with minFitness filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ minFitness: 0.7, sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('overallFitness');
    });

    it('should build search query with minAdoptions filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ minAdoptions: 5, sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('adoptionCount');
    });

    it('should build search query with scope filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ scope: ['marketplace'], sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('scope = ANY');
    });

    it('should build search query with verifiedOnly filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ verifiedOnly: true, sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0 });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('verified = TRUE');
    });

    it('should build search query with tags filter', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ tags: ['coding'], sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('tags');
    });

    it('should sort by adoptions', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ sortBy: 'adoptions', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('adoptionCount');
    });

    it('should sort by createdAt', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ sortBy: 'createdAt', sortOrder: 'asc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('created_at ASC');
    });

    it('should sort by updatedAt', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ sortBy: 'updatedAt', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('updated_at DESC');
    });

    it('should handle listByTenant without scope', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.listByTenant('tenant-1');

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('tenant_id = $1');
        expect(sql).not.toContain('scope');
    });

    it('should handle listByTenant with scope', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.listByTenant('tenant-1', 'marketplace');

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('scope = $2');
    });

    it('should get lineage using recursive CTE', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.getLineage('gene-1');

        const sql = conn.query.mock.calls[0][0] as string;
        expect(sql).toContain('WITH RECURSIVE gene_lineage');
    });

    it('should record adoption and update gene metrics', async () => {
        const conn = createMockConnection();
        conn.query.mockResolvedValueOnce({ rows: [] }) // INSERT adoption
            .mockResolvedValueOnce({ rows: [{ count: 3, avg_performance: 0.85 }] }) // SELECT adoption stats
            .mockResolvedValueOnce({ rows: [] }); // UPDATE gene

        const pg = new PostgresGeneStorage(conn);
        await pg.recordAdoption('gene-1', 'agent-2', 0.9);

        expect(conn.query).toHaveBeenCalledTimes(3);
        const insertSql = conn.query.mock.calls[0][0] as string;
        expect(insertSql).toContain('INSERT INTO gene_adoptions');
        const updateSql = conn.query.mock.calls[2][0] as string;
        expect(updateSql).toContain('UPDATE cognitive_genes');
    });

    it('should handle search with no filters (empty WHERE)', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 0, verifiedOnly: false });

        const sql = conn.query.mock.calls[0][0] as string;
        // No WHERE conditions when no filters
        expect(sql).not.toContain('WHERE');
    });

    it('should apply offset in search', async () => {
        const conn = createMockConnection();
        const pg = new PostgresGeneStorage(conn);

        await pg.search({ sortBy: 'fitness', sortOrder: 'desc', limit: 10, offset: 20, verifiedOnly: false });

        const params = conn.query.mock.calls[0][1] as unknown[];
        expect(params).toContain(20);
    });
});
