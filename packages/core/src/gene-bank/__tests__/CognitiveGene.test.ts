/**
 * CognitiveGene — Helper Function Tests
 *
 * Covers: createGeneId, meetsMinimumFitness, calculateFitnessDelta,
 * isMarketplaceReady, and Zod schema validation.
 *
 * Target: boost function coverage from 25% to 100%.
 */

import { describe, it, expect } from 'vitest';
import {
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,
    CognitiveGeneSchema,
    type CognitiveGene,
} from '../CognitiveGene.js';

// ─── Helpers ───────────────────────────────────────────────

function makeGene(overrides: Partial<CognitiveGene> & Record<string, unknown> = {}): CognitiveGene {
    const now = new Date().toISOString();
    return {
        id: 'gene-1',
        version: '1.0.0',
        name: 'Test Gene',
        description: 'A test gene',
        type: 'reasoning-pattern',
        domain: 'coding',
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
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
            ...(overrides.content as object || {}),
        },
        tenant: {
            tenantId: 'tenant-1',
            createdBy: 'agent-1',
            scope: 'private' as const,
            verified: false,
            ...(overrides.tenant as object || {}),
        },
        createdAt: now,
        updatedAt: now,
        tags: ['test'],
        ...overrides,
    } as CognitiveGene;
}

// ─── Tests ─────────────────────────────────────────────────

describe('CognitiveGene helpers', () => {

    // ─── createGeneId ──────────────────────────────────────

    describe('createGeneId', () => {
        it('should create a gene ID with correct prefix', () => {
            const id = createGeneId('my-tenant', 'reasoning-pattern');
            expect(id).toMatch(/^gene_my-tenant_reasoning-pattern_\d+_[a-z0-9]+$/);
        });

        it('should include tenant ID', () => {
            const id = createGeneId('acme-corp', 'tool-usage-pattern');
            expect(id).toContain('acme-corp');
        });

        it('should include gene type', () => {
            const id = createGeneId('t1', 'error-recovery-pattern');
            expect(id).toContain('error-recovery-pattern');
        });

        it('should create unique IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 50; i++) {
                ids.add(createGeneId('t1', 'reasoning-pattern'));
            }
            expect(ids.size).toBe(50);
        });
    });

    // ─── meetsMinimumFitness ───────────────────────────────

    describe('meetsMinimumFitness', () => {
        it('should return true when both fitness and success rate meet threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(true);
        });

        it('should return false when overallFitness is below threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.5, taskSuccessRate: 0.9, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(false);
        });

        it('should return false when taskSuccessRate is below threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.9, taskSuccessRate: 0.4, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(false);
        });

        it('should use default threshold of 0.6', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene)).toBe(true);
        });

        it('should return true at exact threshold', () => {
            const gene = makeGene({ fitness: { overallFitness: 0.6, taskSuccessRate: 0.6, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(meetsMinimumFitness(gene, 0.6)).toBe(true);
        });
    });

    // ─── calculateFitnessDelta ─────────────────────────────

    describe('calculateFitnessDelta', () => {
        it('should return child fitness when no parent', () => {
            const child = makeGene({ fitness: { overallFitness: 0.75, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, null)).toBe(0.75);
        });

        it('should return positive delta when child is better', () => {
            const parent = makeGene({ fitness: { overallFitness: 0.7, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            const child = makeGene({ fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, parent)).toBeCloseTo(0.2, 2);
        });

        it('should return negative delta when child is worse', () => {
            const parent = makeGene({ fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            const child = makeGene({ fitness: { overallFitness: 0.6, taskSuccessRate: 0.6, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, parent)).toBeCloseTo(-0.3, 2);
        });

        it('should return zero when same fitness', () => {
            const parent = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            const child = makeGene({ fitness: { overallFitness: 0.8, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            expect(calculateFitnessDelta(child, parent)).toBe(0);
        });
    });

    // ─── isMarketplaceReady ────────────────────────────────

    describe('isMarketplaceReady', () => {
        it('should return true for marketplace-ready gene', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: true },
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 10, adoptionPerformance: 0.8 },
            });
            expect(isMarketplaceReady(gene)).toBe(true);
        });

        it('should return false when scope is not marketplace', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'tenant' as const, verified: true },
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.8 },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false when not verified', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: false },
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.8 },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false when fitness below 0.8', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: true },
                fitness: { overallFitness: 0.75, taskSuccessRate: 0.75, tokenEfficiency: 0.6, responseQuality: 0.75, adoptionCount: 10, adoptionPerformance: 0.8 },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false when adoption count below 5', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: true },
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 3, adoptionPerformance: 0.8 },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false when adoption performance below 0.7', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: true },
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: 0.5 },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });

        it('should return false when adoption performance is null', () => {
            const gene = makeGene({
                tenant: { tenantId: 't1', createdBy: 'a1', scope: 'marketplace' as const, verified: true },
                fitness: { overallFitness: 0.9, taskSuccessRate: 0.9, tokenEfficiency: 0.8, responseQuality: 0.9, adoptionCount: 10, adoptionPerformance: null },
            });
            expect(isMarketplaceReady(gene)).toBe(false);
        });
    });

    // ─── Schema Validation ─────────────────────────────────

    describe('CognitiveGeneSchema', () => {
        it('should validate a correct gene', () => {
            const gene = makeGene();
            const result = CognitiveGeneSchema.safeParse(gene);
            expect(result.success).toBe(true);
        });

        it('should reject gene with invalid type', () => {
            const gene = makeGene();
            (gene as Record<string, unknown>).type = 'invalid-type';
            const result = CognitiveGeneSchema.safeParse(gene);
            expect(result.success).toBe(false);
        });

        it('should reject gene with fitness out of range', () => {
            const gene = makeGene({ fitness: { overallFitness: 2.0, taskSuccessRate: 0.8, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null } });
            const result = CognitiveGeneSchema.safeParse(gene);
            expect(result.success).toBe(false);
        });
    });
});
