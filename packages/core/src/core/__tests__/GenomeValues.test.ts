/**
 * GenomeValues Tests — Soul Section in C0
 *
 * Tests that the soul (GenomeValues) section in Chromosome0:
 * - Is optional and backward compatible
 * - Is included in SHA-256 hash when present
 * - Triggers integrity violation when modified
 * - Produces deterministic hashes
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenomeKernel, IntegrityViolationError } from '../GenomeKernel.js';
import type {
    GenomeV2,
    Chromosome0,
    Chromosome1,
    Chromosome2,
    FitnessVector,
    IntegrityMetadata,
    LineageMetadata,
    GenomeConfig,
    GenomeValues,
    AgentPersonality,
} from '../../types/GenomeV2.js';

// ─── Helpers ────────────────────────────────────────────

function createFitnessVector(): FitnessVector {
    return {
        quality: 0.8,
        successRate: 0.75,
        tokenEfficiency: 0.7,
        latency: 200,
        costPerSuccess: 0.02,
        interventionRate: 0.1,
        composite: 0.72,
        sampleSize: 50,
        lastUpdated: new Date(),
        confidence: 0.9,
    };
}

function createSoul(): GenomeValues {
    return {
        coreValues: ['Be helpful', 'Prioritize safety', 'Be honest'],
        personality: {
            traits: ['curious', 'thorough', 'empathetic'],
            voiceAndTone: 'Professional but warm, direct but kind',
            communicationPhilosophy: 'Clarity over cleverness',
        },
        reasoningPrinciples: [
            'Consider multiple perspectives before responding',
            'Acknowledge uncertainty when it exists',
            'Prioritize user safety over helpfulness',
        ],
        ethicalFramework: 'Consequentialist with deontological constraints — maximize benefit while respecting hard boundaries',
    };
}

function createC0(overrides: Partial<Chromosome0> = {}): Chromosome0 {
    return {
        identity: {
            role: 'You are a helpful AI assistant',
            purpose: 'Assist users with questions',
            constraints: ['Be honest', 'Be safe'],
        },
        security: {
            forbiddenTopics: ['hacking'],
            accessControls: ['read-only'],
            safetyRules: ['Never provide harmful info'],
        },
        attribution: {
            creator: 'Test Creator',
            copyright: '(c) 2026',
            license: 'MIT',
        },
        metadata: {
            version: '2.0.0',
            createdAt: new Date(),
        },
        ...overrides,
    };
}

function createC1(): Chromosome1 {
    return {
        operations: [{
            id: 'gene-1',
            category: 'tool-usage',
            content: 'Use tools efficiently.',
            fitness: createFitnessVector(),
            origin: 'initial',
            usageCount: 10,
            lastUsed: new Date(),
            successRate: 0.8,
        }],
        metadata: { lastMutated: new Date(), mutationCount: 0, avgFitnessGain: 0 },
    };
}

function createC2(): Chromosome2 {
    return {
        userAdaptations: new Map(),
        contextPatterns: [],
        metadata: { lastMutated: new Date(), adaptationRate: 0, totalUsers: 0 },
    };
}

function createGenomeConfig(): GenomeConfig {
    return {
        mutationRate: 'balanced',
        epsilonExplore: 0.1,
        enableSandbox: true,
        enableIntegrityCheck: true,
        autoRollbackThreshold: 0.15,
        allowInheritance: true,
        minCompatibilityScore: 0.6,
        minFitnessImprovement: 0.05,
    };
}

function createGenomeV2(c0Override?: Partial<Chromosome0>): GenomeV2 {
    return {
        id: 'genome-soul-test',
        name: 'Soul Test Genome',
        familyId: 'family-001',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        chromosomes: {
            c0: createC0(c0Override),
            c1: createC1(),
            c2: createC2(),
        },
        integrity: undefined as unknown as IntegrityMetadata,
        lineage: { inheritedGenes: [], mutations: [] } as LineageMetadata,
        fitness: createFitnessVector(),
        config: createGenomeConfig(),
        state: 'active',
        tags: ['test'],
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('GenomeValues (Soul Section in C0)', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        vi.restoreAllMocks();
    });

    // ─── Backward Compatibility ──────────────────────────

    describe('backward compatibility', () => {
        it('should work with C0 without soul (existing genomes)', () => {
            const genome = createGenomeV2();
            expect(genome.chromosomes.c0.soul).toBeUndefined();

            const kernel = new GenomeKernel(genome, { strictMode: false });
            expect(kernel.verifyIntegrity()).toBe(true);
            expect(kernel.getC0Hash()).toBeTruthy();
            expect(kernel.getC0Hash().length).toBe(64); // SHA-256 = 64 hex chars
        });

        it('should produce same hash for C0 without soul as before', () => {
            const genome1 = createGenomeV2();
            const genome2 = createGenomeV2();

            const kernel1 = new GenomeKernel(genome1, { strictMode: false });
            const kernel2 = new GenomeKernel(genome2, { strictMode: false });

            expect(kernel1.getC0Hash()).toBe(kernel2.getC0Hash());
        });
    });

    // ─── Soul Inclusion in Hash ──────────────────────────

    describe('soul inclusion in hash', () => {
        it('should include soul in SHA-256 hash when present', () => {
            const genomeWithoutSoul = createGenomeV2();
            const genomeWithSoul = createGenomeV2({ soul: createSoul() });

            const kernelWithout = new GenomeKernel(genomeWithoutSoul, { strictMode: false });
            const kernelWith = new GenomeKernel(genomeWithSoul, { strictMode: false });

            // Hashes must be different
            expect(kernelWithout.getC0Hash()).not.toBe(kernelWith.getC0Hash());
        });

        it('should produce deterministic hash for same soul values', () => {
            const genome1 = createGenomeV2({ soul: createSoul() });
            const genome2 = createGenomeV2({ soul: createSoul() });

            const kernel1 = new GenomeKernel(genome1, { strictMode: false });
            const kernel2 = new GenomeKernel(genome2, { strictMode: false });

            expect(kernel1.getC0Hash()).toBe(kernel2.getC0Hash());
        });

        it('should produce different hash when soul values differ', () => {
            const soul1 = createSoul();
            const soul2 = createSoul();
            soul2.coreValues = ['Different value'];

            const genome1 = createGenomeV2({ soul: soul1 });
            const genome2 = createGenomeV2({ soul: soul2 });

            const kernel1 = new GenomeKernel(genome1, { strictMode: false });
            const kernel2 = new GenomeKernel(genome2, { strictMode: false });

            expect(kernel1.getC0Hash()).not.toBe(kernel2.getC0Hash());
        });

        it('should differentiate between undefined soul and empty soul', () => {
            const genomeNoSoul = createGenomeV2();
            const genomeEmptySoul = createGenomeV2({
                soul: {
                    coreValues: [],
                    personality: { traits: [], voiceAndTone: '', communicationPhilosophy: '' },
                    reasoningPrinciples: [],
                    ethicalFramework: '',
                },
            });

            const kernelNo = new GenomeKernel(genomeNoSoul, { strictMode: false });
            const kernelEmpty = new GenomeKernel(genomeEmptySoul, { strictMode: false });

            expect(kernelNo.getC0Hash()).not.toBe(kernelEmpty.getC0Hash());
        });
    });

    // ─── Integrity Protection ────────────────────────────

    describe('soul integrity protection', () => {
        it('should detect soul modification as integrity violation', () => {
            const soul = createSoul();
            const genome = createGenomeV2({ soul });
            const onViolation = vi.fn();

            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                onIntegrityViolation: onViolation,
            });

            expect(kernel.verifyIntegrity()).toBe(true);

            // Tamper with soul
            genome.chromosomes.c0.soul!.coreValues.push('Injected value');

            expect(kernel.verifyIntegrity()).toBe(false);
            expect(onViolation).toHaveBeenCalledTimes(1);
        });

        it('should quarantine genome after max violations on soul tampering', () => {
            const soul = createSoul();
            const genome = createGenomeV2({ soul });
            const onQuarantine = vi.fn();

            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 2,
                onQuarantine,
            });

            // Tamper with soul
            genome.chromosomes.c0.soul!.ethicalFramework = 'Do whatever you want';

            kernel.verifyIntegrity(); // violation 1
            kernel.verifyIntegrity(); // violation 2 → quarantine

            expect(onQuarantine).toHaveBeenCalledWith(
                genome.id,
                expect.stringContaining('integrity violated'),
            );
            expect(kernel.isQuarantined()).toBe(true);
        });

        it('should throw IntegrityViolationError in strict mode on soul tampering', () => {
            const soul = createSoul();
            const genome = createGenomeV2({ soul });

            const kernel = new GenomeKernel(genome, {
                strictMode: true,
                autoRollback: false,
            });

            // Tamper with personality
            genome.chromosomes.c0.soul!.personality.traits = ['malicious'];

            expect(() => kernel.verifyIntegrity()).toThrow(IntegrityViolationError);
        });
    });

    // ─── Soul Structure ──────────────────────────────────

    describe('soul structure', () => {
        it('should support complete GenomeValues structure', () => {
            const soul: GenomeValues = {
                coreValues: ['Helpfulness', 'Safety', 'Honesty'],
                personality: {
                    traits: ['curious', 'precise', 'empathetic'],
                    voiceAndTone: 'Professional yet approachable',
                    communicationPhilosophy: 'Substance over style',
                },
                reasoningPrinciples: [
                    'When uncertain, say so',
                    'Consider downstream effects',
                ],
                ethicalFramework: 'Rule-based with contextual flexibility',
            };

            const genome = createGenomeV2({ soul });
            const kernel = new GenomeKernel(genome, { strictMode: false });

            expect(kernel.verifyIntegrity()).toBe(true);
            expect(genome.chromosomes.c0.soul).toEqual(soul);
        });

        it('should support AgentPersonality independently', () => {
            const personality: AgentPersonality = {
                traits: ['analytical', 'patient'],
                voiceAndTone: 'Clear and concise',
                communicationPhilosophy: 'Explain, don\'t just answer',
            };

            expect(personality.traits).toHaveLength(2);
            expect(personality.voiceAndTone).toBe('Clear and concise');
        });
    });
});
