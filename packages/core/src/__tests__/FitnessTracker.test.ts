/**
 * FitnessTracker Tests
 *
 * Tests for allele performance tracking, EMA updates, and C4 immune system rollback.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FitnessTracker } from '../core/FitnessTracker.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, GeneAllele } from '../types/index.js';

// ─── Helpers ──────────────────────────────────────────────

function makeAllele(overrides: Partial<GeneAllele> = {}): GeneAllele {
    return {
        gene: 'test-gene',
        variant: 'v1',
        content: 'test content',
        fitness: 0.7,
        sampleCount: 5,
        recentScores: [],
        status: 'active',
        createdAt: new Date(),
        ...overrides,
    };
}

function makeGenome(layer1: GeneAllele[] = [], layer2: GeneAllele[] = []): Genome {
    return {
        id: 'genome-1',
        name: 'test-genome',
        config: {
            enableSandbox: false,
            mutationRate: 'balanced',
        },
        layers: {
            layer0: [makeAllele({ gene: 'identity', variant: 'default', fitness: 1.0 })],
            layer1,
            layer2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function mockStorage(): StorageAdapter {
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockResolvedValue(undefined),
        loadGenome: vi.fn().mockResolvedValue(null),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        listGenomes: vi.fn().mockResolvedValue([]),
        saveDNA: vi.fn().mockResolvedValue(undefined),
        loadDNA: vi.fn().mockResolvedValue(null),
        logInteraction: vi.fn().mockResolvedValue(undefined),
        getInteractions: vi.fn().mockResolvedValue([]),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getMutations: vi.fn().mockResolvedValue([]),
    } as unknown as StorageAdapter;
}

// ─── Tests ────────────────────────────────────────────────

describe('FitnessTracker', () => {
    let storage: StorageAdapter;

    beforeEach(() => {
        storage = mockStorage();
    });

    describe('recordPerformance', () => {
        it('should update allele fitness with EMA', async () => {
            const allele = makeAllele({ fitness: 0.7, sampleCount: 5 });
            const genome = makeGenome([allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'test-gene', 'v1', 0.9);

            // replaceAllele creates a new object in the genome
            const updated = genome.layers.layer1.find(a => a.gene === 'test-gene' && a.variant === 'v1')!;
            // EMA: 0.9 * 0.7 + 0.1 * 0.9 = 0.72
            expect(updated.fitness).toBeCloseTo(0.72, 4);
            expect(updated.sampleCount).toBe(6);
            expect(storage.saveGenome).toHaveBeenCalledOnce();
        });

        it('should append to recentScores window', async () => {
            const allele = makeAllele({ recentScores: [0.5, 0.6] });
            const genome = makeGenome([allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'test-gene', 'v1', 0.8);

            const updated = genome.layers.layer1.find(a => a.gene === 'test-gene' && a.variant === 'v1')!;
            expect(updated.recentScores).toEqual([0.5, 0.6, 0.8]);
        });

        it('should cap recentScores at MAX_RECENT_SCORES (10)', async () => {
            const allele = makeAllele({
                recentScores: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            });
            const genome = makeGenome([allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'test-gene', 'v1', 0.55);

            const updated = genome.layers.layer1.find(a => a.gene === 'test-gene' && a.variant === 'v1')!;
            expect(updated.recentScores!.length).toBe(10);
            expect(updated.recentScores![0]).toBe(0.2); // oldest dropped
            expect(updated.recentScores![9]).toBe(0.55); // newest added
        });

        it('should do nothing for non-existent allele', async () => {
            const genome = makeGenome([makeAllele()]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'non-existent', 'v1', 0.9);

            expect(storage.saveGenome).not.toHaveBeenCalled();
        });

        it('should work on layer 2 alleles', async () => {
            const allele = makeAllele({ gene: 'style', variant: 'casual', fitness: 0.5 });
            const genome = makeGenome([], [allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(2, 'style', 'casual', 1.0);

            const updated = genome.layers.layer2.find(a => a.gene === 'style' && a.variant === 'casual')!;
            // EMA: 0.9 * 0.5 + 0.1 * 1.0 = 0.55
            expect(updated.fitness).toBeCloseTo(0.55, 4);
        });
    });

    describe('C4 Immune System', () => {
        it('should rollback variant with significant fitness drop', async () => {
            const parent = makeAllele({
                gene: 'coding',
                variant: 'default',
                fitness: 0.8,
                status: 'retired',
            });
            const child = makeAllele({
                gene: 'coding',
                variant: 'v2',
                fitness: 0.8,
                parentVariant: 'default',
                // Recent scores show a sharp decline — need 4 so adding 1 more gives 5 (IMMUNE_WINDOW_SIZE)
                recentScores: [0.5, 0.4, 0.3, 0.3],
            });
            const genome = makeGenome([parent, child]);
            const tracker = new FitnessTracker(storage, genome);

            // Score of 0.3 makes window [0.4, 0.3, 0.3, 0.3, 0.3] avg = 0.32
            // After EMA update: fitness ≈ 0.9*0.8 + 0.1*0.3 = 0.75
            // But checkImmune uses the PREVIOUS fitness (0.8) vs window avg (0.32)
            // Drop = 0.8 - 0.32 = 0.48 > 0.2 threshold → rollback
            await tracker.recordPerformance(1, 'coding', 'v2', 0.3);

            // Wait for fire-and-forget immune check
            await new Promise(resolve => setTimeout(resolve, 100));

            // After rollback, the child should be retired and parent reactivated
            const childAfter = genome.layers.layer1.find(a => a.gene === 'coding' && a.variant === 'v2')!;
            expect(childAfter.status).toBe('retired');
            expect(parent.status).toBe('active');
        });

        it('should NOT rollback layer 0 alleles', async () => {
            const allele = makeAllele({
                gene: 'identity',
                variant: 'v1',
                fitness: 0.8,
                recentScores: [0.8, 0.7, 0.5, 0.4],
            });
            const genome: Genome = {
                ...makeGenome(),
                layers: {
                    layer0: [allele],
                    layer1: [],
                    layer2: [],
                },
            };
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(0, 'identity', 'v1', 0.3);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(allele.status).toBe('active');
        });

        it('should NOT rollback default variant', async () => {
            const allele = makeAllele({
                gene: 'coding',
                variant: 'default',
                fitness: 0.8,
                recentScores: [0.8, 0.7, 0.5, 0.4],
            });
            const genome = makeGenome([allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'coding', 'default', 0.3);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(allele.status).toBe('active');
        });

        it('should NOT rollback with insufficient samples', async () => {
            const allele = makeAllele({
                gene: 'coding',
                variant: 'v2',
                fitness: 0.8,
                parentVariant: 'default',
                recentScores: [0.8, 0.3],
            });
            const genome = makeGenome([allele]);
            const tracker = new FitnessTracker(storage, genome);

            await tracker.recordPerformance(1, 'coding', 'v2', 0.2);
            await new Promise(resolve => setTimeout(resolve, 50));

            // Only 3 scores, need 5 for immune window
            expect(allele.status).toBe('active');
        });
    });
});
