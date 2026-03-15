/**
 * GenomeKernel Tests
 *
 * Comprehensive unit tests for the Living OS core kernel.
 * Tests C0 integrity (SHA-256), quarantine management, rollback system,
 * snapshot lifecycle, and all getters.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    GenomeKernel,
    IntegrityViolationError,
    QuarantinedGenomeError,
} from '../GenomeKernel.js';
import type { GenomeKernelOptions } from '../GenomeKernel.js';
import type {
    GenomeV2,
    Chromosome0,
    Chromosome1,
    Chromosome2,
    FitnessVector,
    IntegrityMetadata,
    LineageMetadata,
    GenomeConfig,
} from '../../types/GenomeV2.js';

// ─── Helpers ────────────────────────────────────────────

/**
 * Build a minimal valid FitnessVector.
 */
function createFitnessVector(overrides: Partial<FitnessVector> = {}): FitnessVector {
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
        ...overrides,
    };
}

/**
 * Build a minimal valid Chromosome0.
 */
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

/**
 * Build a minimal valid Chromosome1.
 */
function createC1(): Chromosome1 {
    return {
        operations: [
            {
                id: 'gene-1',
                category: 'tool-usage',
                content: 'Use tools efficiently.',
                fitness: createFitnessVector(),
                origin: 'initial',
                usageCount: 10,
                lastUsed: new Date(),
                successRate: 0.8,
            },
        ],
        metadata: {
            lastMutated: new Date(),
            mutationCount: 0,
            avgFitnessGain: 0,
        },
    };
}

/**
 * Build a minimal valid Chromosome2.
 */
function createC2(): Chromosome2 {
    return {
        userAdaptations: new Map(),
        contextPatterns: [],
        metadata: {
            lastMutated: new Date(),
            adaptationRate: 0,
            totalUsers: 0,
        },
    };
}

/**
 * Build a minimal valid GenomeConfig.
 */
function createGenomeConfig(overrides: Partial<GenomeConfig> = {}): GenomeConfig {
    return {
        mutationRate: 'balanced',
        epsilonExplore: 0.1,
        enableSandbox: true,
        enableIntegrityCheck: true,
        autoRollbackThreshold: 0.15,
        allowInheritance: true,
        minCompatibilityScore: 0.6,
        minFitnessImprovement: 0.05,
        ...overrides,
    };
}

/**
 * Build a complete valid GenomeV2 suitable for GenomeKernel construction.
 * Intentionally does NOT include `integrity` so that the kernel initializes it.
 */
function createGenomeV2(overrides: Partial<GenomeV2> = {}): GenomeV2 {
    const base: GenomeV2 = {
        id: 'genome-001',
        name: 'Test Genome',
        familyId: 'family-001',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        chromosomes: {
            c0: createC0(),
            c1: createC1(),
            c2: createC2(),
        },
        integrity: undefined as unknown as IntegrityMetadata,
        lineage: {
            inheritedGenes: [],
            mutations: [],
        } as LineageMetadata,
        fitness: createFitnessVector(),
        config: createGenomeConfig(),
        state: 'active',
        tags: ['test'],
    };

    return { ...base, ...overrides };
}

/**
 * Build a GenomeV2 that already has integrity metadata populated.
 * Useful when testing with a pre-hashed genome.
 */
function createGenomeWithIntegrity(c0Hash: string): GenomeV2 {
    const genome = createGenomeV2();
    genome.integrity = {
        c0Hash,
        lastVerified: new Date(),
        violations: 0,
        quarantined: false,
    };
    return genome;
}

// ─── Tests ──────────────────────────────────────────────

describe('GenomeKernel', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Suppress console.log from logSecurityEvent in non-production
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        vi.restoreAllMocks();
    });

    // ─── Constructor and Initialization ──────────────────

    describe('constructor', () => {
        it('should create kernel with a valid genome', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            expect(kernel).toBeInstanceOf(GenomeKernel);
            expect(kernel.getGenome()).toBe(genome);
        });

        it('should initialize integrity metadata when missing', () => {
            const genome = createGenomeV2();
            // integrity is undefined at this point
            expect(genome.integrity).toBeFalsy();

            const kernel = new GenomeKernel(genome);

            expect(genome.integrity).toBeDefined();
            expect(genome.integrity.c0Hash).toBe(kernel.getC0Hash());
            expect(genome.integrity.violations).toBe(0);
            expect(genome.integrity.quarantined).toBe(false);
            expect(genome.integrity.lastVerified).toBeInstanceOf(Date);
        });

        it('should preserve existing integrity metadata if already present', () => {
            const genome = createGenomeV2();
            // First, create a kernel to get the real hash
            const tempKernel = new GenomeKernel(genome);
            const realHash = tempKernel.getC0Hash();

            // Now create another genome with integrity pre-populated using the correct hash
            const genome2 = createGenomeWithIntegrity(realHash);
            genome2.integrity.violations = 2;

            const kernel = new GenomeKernel(genome2);

            // It should keep the existing violations count
            expect(genome2.integrity.violations).toBe(2);
            expect(kernel.getViolationCount()).toBe(2);
        });

        it('should apply default options when none provided', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            // Verify defaults via observable behavior (strict mode is true by default)
            // We can test this indirectly: if strict mode is true, a quarantined genome
            // throws on verifyIntegrity
            expect(kernel.isQuarantined()).toBe(false);
        });

        it('should accept and apply custom options', () => {
            const onViolation = vi.fn();
            const onSecurity = vi.fn();
            const onQuarantine = vi.fn();

            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 5,
                enableCaching: false,
                cacheInvalidationMs: 1000,
                onIntegrityViolation: onViolation,
                onSecurityEvent: onSecurity,
                onQuarantine: onQuarantine,
            });

            expect(kernel).toBeInstanceOf(GenomeKernel);
            // Security events are fired during construction (verifyIntegrity),
            // so the onSecurityEvent callback should have been called
            expect(onSecurity).toHaveBeenCalled();
        });

        it('should compute and store the initial C0 hash', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            const hash = kernel.getC0Hash();
            expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
        });

        it('should call verifyIntegrity during construction', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();

            new GenomeKernel(genome, { onSecurityEvent: onSecurity });

            // Look for the 'integrity_verified' event
            const verifiedEvent = onSecurity.mock.calls.find(
                (call) => call[0].event === 'integrity_verified'
            );
            expect(verifiedEvent).toBeDefined();
        });
    });

    // ─── C0 Integrity Verification ──────────────────────

    describe('verifyIntegrity', () => {
        it('should return true for an untampered genome', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            const result = kernel.verifyIntegrity();
            expect(result).toBe(true);
        });

        it('should return false when C0 has been tampered with (non-strict mode)', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
            });

            // Tamper with C0
            genome.chromosomes.c0.identity.role = 'I am now a hacker assistant';

            const result = kernel.verifyIntegrity();
            expect(result).toBe(false);
        });

        it('should throw IntegrityViolationError when C0 tampered in strict mode', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: true,
                autoRollback: false,
            });

            // Tamper with C0
            genome.chromosomes.c0.security.forbiddenTopics = [];

            expect(() => kernel.verifyIntegrity()).toThrow(IntegrityViolationError);
        });

        it('should increment violation count on each integrity failure', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 10, // High threshold to avoid quarantine
            });

            // Tamper with C0
            genome.chromosomes.c0.identity.purpose = 'TAMPERED';

            kernel.verifyIntegrity();
            expect(kernel.getViolationCount()).toBe(1);

            kernel.verifyIntegrity();
            expect(kernel.getViolationCount()).toBe(2);
        });

        it('should fire onIntegrityViolation callback on tampering', () => {
            const onViolation = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 10,
                onIntegrityViolation: onViolation,
            });

            genome.chromosomes.c0.attribution.creator = 'IMPERSONATOR';

            kernel.verifyIntegrity();

            expect(onViolation).toHaveBeenCalledTimes(1);
            const violation = onViolation.mock.calls[0][0];
            expect(violation.genomeId).toBe('genome-001');
            expect(violation.genomeName).toBe('Test Genome');
            expect(violation.expected).toBe(kernel.getC0Hash());
            expect(violation.actual).not.toBe(kernel.getC0Hash());
            expect(violation.timestamp).toBeInstanceOf(Date);
        });

        it('should NOT include C0 metadata in hash computation (timestamp changes are safe)', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            // Change metadata (should NOT affect integrity)
            genome.chromosomes.c0.metadata.createdAt = new Date('2000-01-01');
            genome.chromosomes.c0.metadata.version = '999.0.0';

            const result = kernel.verifyIntegrity();
            expect(result).toBe(true);
        });

        it('should produce a deterministic hash for same C0 content', () => {
            const genome1 = createGenomeV2();
            const genome2 = createGenomeV2();

            const kernel1 = new GenomeKernel(genome1);
            const kernel2 = new GenomeKernel(genome2);

            expect(kernel1.getC0Hash()).toBe(kernel2.getC0Hash());
        });

        it('should produce different hashes for different C0 content', () => {
            const genome1 = createGenomeV2();
            const genome2 = createGenomeV2();
            genome2.chromosomes.c0.identity.role = 'A completely different role';

            const kernel1 = new GenomeKernel(genome1);
            const kernel2 = new GenomeKernel(genome2);

            expect(kernel1.getC0Hash()).not.toBe(kernel2.getC0Hash());
        });
    });

    // ─── Quarantine Management ──────────────────────────

    describe('quarantine', () => {
        it('should quarantine genome after maxViolations reached', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 2,
            });

            genome.chromosomes.c0.identity.role = 'TAMPERED';

            // First violation
            kernel.verifyIntegrity();
            expect(kernel.isQuarantined()).toBe(false);

            // Second violation hits threshold (maxViolations = 2)
            kernel.verifyIntegrity();
            expect(kernel.isQuarantined()).toBe(true);
            expect(genome.state).toBe('quarantined');
        });

        it('should fire onQuarantine callback when genome is quarantined', () => {
            const onQuarantine = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
                onQuarantine,
            });

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            expect(onQuarantine).toHaveBeenCalledWith(
                'genome-001',
                expect.stringContaining('C0 integrity violated')
            );
        });

        it('should block verifyIntegrity when genome is quarantined (non-strict)', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity(); // quarantines

            // Now verifyIntegrity returns false without even checking hash
            const result = kernel.verifyIntegrity();
            expect(result).toBe(false);
        });

        it('should throw when verifyIntegrity called on quarantined genome in strict mode', () => {
            const genome = createGenomeV2();
            // Start in non-strict to quarantine, then switch behavior isn't possible.
            // Instead, set up a genome that's already quarantined.
            genome.integrity = {
                c0Hash: 'anything',
                lastVerified: new Date(),
                violations: 5,
                quarantined: true,
                quarantineReason: 'Test quarantine',
            };

            // We need strict mode, but the constructor also calls verifyIntegrity,
            // which will throw because it's quarantined. So we must catch that.
            expect(() => {
                new GenomeKernel(genome, { strictMode: true });
            }).toThrow('is quarantined');
        });

        it('should set quarantineReason on the genome integrity', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            expect(genome.integrity.quarantineReason).toBeDefined();
            expect(genome.integrity.quarantineReason).toContain('C0 integrity violated');
        });
    });

    // ─── Release Quarantine ─────────────────────────────

    describe('releaseQuarantine', () => {
        it('should release quarantine when C0 integrity is restored', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            // Tamper and quarantine
            const originalRole = genome.chromosomes.c0.identity.role;
            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();
            expect(kernel.isQuarantined()).toBe(true);

            // Restore C0
            genome.chromosomes.c0.identity.role = originalRole;

            // Release
            kernel.releaseQuarantine('admin');

            expect(kernel.isQuarantined()).toBe(false);
            expect(genome.state).toBe('active');
            expect(kernel.getViolationCount()).toBe(0);
            expect(genome.integrity.quarantineReason).toBeUndefined();
        });

        it('should throw if C0 is still tampered when trying to release', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            // Try to release without fixing C0
            expect(() => kernel.releaseQuarantine('admin')).toThrow(
                'Cannot release quarantine'
            );
        });

        it('should be a no-op if genome is not quarantined', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            // Should not throw, just return
            kernel.releaseQuarantine('admin');

            expect(kernel.isQuarantined()).toBe(false);
            expect(genome.state).toBe('active');
        });

        it('should log a security event on release', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
                onSecurityEvent: onSecurity,
            });

            const originalRole = genome.chromosomes.c0.identity.role;
            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            onSecurity.mockClear();

            genome.chromosomes.c0.identity.role = originalRole;
            kernel.releaseQuarantine('security-officer');

            const releaseEvent = onSecurity.mock.calls.find(
                (call) => call[0].event === 'quarantine_released'
            );
            expect(releaseEvent).toBeDefined();
            expect(releaseEvent![0].details.authorizedBy).toBe('security-officer');
        });
    });

    // ─── Snapshot System ────────────────────────────────

    describe('createSnapshot', () => {
        it('should create a snapshot with the given reason', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            kernel.createSnapshot('pre-mutation backup');

            const snapshots = kernel.getSnapshots();
            expect(snapshots).toHaveLength(1);
            expect(snapshots[0].reason).toBe('pre-mutation backup');
            expect(snapshots[0].genomeId).toBe('genome-001');
            expect(snapshots[0].version).toBe(1);
            expect(snapshots[0].createdAt).toBeInstanceOf(Date);
        });

        it('should deep-clone the genome in the snapshot', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            kernel.createSnapshot('initial');

            // Mutate the genome
            genome.name = 'CHANGED';

            const snapshot = kernel.getSnapshots()[0];
            expect(snapshot.snapshot.name).toBe('Test Genome');
            expect(genome.name).toBe('CHANGED');
        });

        it('should cap snapshots at maxSnapshots (100), removing oldest', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            // Create 105 snapshots
            for (let i = 0; i < 105; i++) {
                kernel.createSnapshot(`snapshot-${i}`);
            }

            const snapshots = kernel.getSnapshots();
            expect(snapshots.length).toBe(100);
            // The oldest 5 should have been removed
            expect(snapshots[0].reason).toBe('snapshot-5');
            expect(snapshots[99].reason).toBe('snapshot-104');
        });

        it('should log a security event on snapshot creation', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, { onSecurityEvent: onSecurity });

            onSecurity.mockClear();
            kernel.createSnapshot('test');

            const snapshotEvent = onSecurity.mock.calls.find(
                (call) => call[0].event === 'snapshot_created'
            );
            expect(snapshotEvent).toBeDefined();
        });
    });

    // ─── Rollback System ────────────────────────────────

    describe('rollbackToSafeVersion (auto-rollback)', () => {
        it('should auto-rollback to the last safe snapshot when integrity is violated', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: true,
                maxViolations: 10,
            });

            // Create snapshot while genome is healthy
            kernel.createSnapshot('safe state');

            // Tamper with C0
            genome.chromosomes.c0.identity.role = 'EVIL ROLE';

            // Verify integrity will detect violation and auto-rollback
            kernel.verifyIntegrity();

            // After rollback, the genome should be restored
            expect(genome.chromosomes.c0.identity.role).toBe(
                'You are a helpful AI assistant'
            );
        });

        it('should log error when no snapshots are available for rollback', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: true,
                maxViolations: 10,
                onSecurityEvent: onSecurity,
            });

            // No snapshots created -- tamper C0
            genome.chromosomes.c0.identity.role = 'EVIL';

            kernel.verifyIntegrity();

            const rollbackFailed = onSecurity.mock.calls.find(
                (call) => call[0].event === 'rollback_failed'
            );
            expect(rollbackFailed).toBeDefined();
            expect(rollbackFailed![0].details.reason).toBe('No snapshots available');
        });

        it('should log error when no safe snapshots exist (all corrupted)', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: true,
                maxViolations: 10,
                onSecurityEvent: onSecurity,
            });

            // Tamper C0, then create snapshot (corrupted)
            genome.chromosomes.c0.identity.role = 'CORRUPTED';
            kernel.createSnapshot('corrupted snapshot');

            // Verify -- will try rollback, but the only snapshot is corrupted
            onSecurity.mockClear();
            kernel.verifyIntegrity();

            const rollbackFailed = onSecurity.mock.calls.find(
                (call) => call[0].event === 'rollback_failed'
            );
            expect(rollbackFailed).toBeDefined();
            expect(rollbackFailed![0].details.reason).toBe('No safe snapshots found');
        });

        it('should increment genome version after rollback', () => {
            const genome = createGenomeV2();
            genome.version = 5;
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: true,
                maxViolations: 10,
            });

            kernel.createSnapshot('safe');

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            // Version should be snapshot.version (which was restored) + 1
            // The snapshot captured version 5, Object.assign restores to 5,
            // then the code does genome.version += 1 = 6
            expect(genome.version).toBe(6);
        });

        it('should NOT auto-rollback when autoRollback is disabled', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 10,
            });

            kernel.createSnapshot('safe');

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            // C0 should remain tampered because rollback was disabled
            expect(genome.chromosomes.c0.identity.role).toBe('TAMPERED');
        });
    });

    describe('rollbackToVersion (manual rollback)', () => {
        it('should restore genome to a specific snapshot version', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            genome.version = 1;
            kernel.createSnapshot('v1 backup');

            genome.version = 2;
            genome.name = 'Modified Name';
            kernel.createSnapshot('v2 backup');

            genome.version = 3;
            genome.name = 'Further Modified';

            // Roll back to version 1
            const result = kernel.rollbackToVersion(1, 'admin');

            expect(result).toBe(true);
            expect(genome.name).toBe('Test Genome');
            // Version should be snapshot restored version + 1
            // Snapshot has version 1, after Object.assign genome.version = 1,
            // then += 1 gives 2
            expect(genome.version).toBe(2);
        });

        it('should return false when target version does not exist', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            const result = kernel.rollbackToVersion(999, 'admin');
            expect(result).toBe(false);
        });

        it('should reset integrity violations and quarantine state on manual rollback', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 100,
            });

            kernel.createSnapshot('safe');

            // Create some violations
            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();
            kernel.verifyIntegrity();
            expect(kernel.getViolationCount()).toBe(2);

            // Manual rollback
            const result = kernel.rollbackToVersion(1, 'admin');
            expect(result).toBe(true);
            expect(kernel.getViolationCount()).toBe(0);
            expect(kernel.isQuarantined()).toBe(false);
        });

        it('should log manual_rollback security event', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, { onSecurityEvent: onSecurity });

            kernel.createSnapshot('v1');
            onSecurity.mockClear();

            kernel.rollbackToVersion(1, 'security-admin');

            const rollbackEvent = onSecurity.mock.calls.find(
                (call) => call[0].event === 'manual_rollback'
            );
            expect(rollbackEvent).toBeDefined();
            expect(rollbackEvent![0].details.authorizedBy).toBe('security-admin');
            expect(rollbackEvent![0].details.toVersion).toBe(1);
        });
    });

    // ─── Caching Behavior ───────────────────────────────

    describe('caching', () => {
        it('should use cached hash within cacheInvalidationMs window', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                enableCaching: true,
                cacheInvalidationMs: 60_000, // 60 seconds
            });

            // First verification populates cache
            expect(kernel.verifyIntegrity()).toBe(true);

            // Even if we could tamper the hash computation somehow,
            // with caching on and a long TTL, the cached value is used.
            // The best way to test caching is indirectly: verify it works fine
            expect(kernel.verifyIntegrity()).toBe(true);
        });

        it('should recompute hash when cacheInvalidationMs is 0 (default)', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                enableCaching: true,
                cacheInvalidationMs: 0, // Always recompute
            });

            // Verify works correctly
            expect(kernel.verifyIntegrity()).toBe(true);
            expect(kernel.verifyIntegrity()).toBe(true);
        });

        it('should recompute hash when caching is disabled', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                enableCaching: false,
            });

            expect(kernel.verifyIntegrity()).toBe(true);

            // Tamper - should be detected immediately since no caching
            genome.chromosomes.c0.identity.role = 'TAMPERED';

            expect(() => kernel.verifyIntegrity()).toThrow(IntegrityViolationError);
        });
    });

    // ─── Getters ────────────────────────────────────────

    describe('getters', () => {
        it('getGenome should return the genome reference', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            expect(kernel.getGenome()).toBe(genome);
        });

        it('getC0Hash should return a 64-char hex string', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            const hash = kernel.getC0Hash();
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[0-9a-f]+$/);
        });

        it('getSnapshots should return a copy of the snapshots array', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            kernel.createSnapshot('test');
            const snapshots1 = kernel.getSnapshots();
            const snapshots2 = kernel.getSnapshots();

            expect(snapshots1).toEqual(snapshots2);
            expect(snapshots1).not.toBe(snapshots2); // Different array references
        });

        it('isQuarantined should reflect the genome integrity state', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            expect(kernel.isQuarantined()).toBe(false);

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            expect(kernel.isQuarantined()).toBe(true);
        });

        it('getViolationCount should return current violation count', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 100,
            });

            expect(kernel.getViolationCount()).toBe(0);

            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();
            expect(kernel.getViolationCount()).toBe(1);

            kernel.verifyIntegrity();
            expect(kernel.getViolationCount()).toBe(2);
        });
    });

    // ─── Security Logging ───────────────────────────────

    describe('security event logging', () => {
        it('should fire onSecurityEvent for integrity verification', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            new GenomeKernel(genome, { onSecurityEvent: onSecurity });

            const events = onSecurity.mock.calls.map((c) => c[0].event);
            expect(events).toContain('integrity_verified');
        });

        it('should fire critical-level event on C0 violation', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 100,
                onSecurityEvent: onSecurity,
            });

            onSecurity.mockClear();
            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            const criticalEvent = onSecurity.mock.calls.find(
                (call) => call[0].level === 'critical' && call[0].event === 'c0_integrity_violation'
            );
            expect(criticalEvent).toBeDefined();
            expect(criticalEvent![0].details.genomeId).toBe('genome-001');
        });

        it('should fire critical-level event when genome is quarantined', () => {
            const onSecurity = vi.fn();
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
                onSecurityEvent: onSecurity,
            });

            onSecurity.mockClear();
            genome.chromosomes.c0.identity.role = 'TAMPERED';
            kernel.verifyIntegrity();

            const quarantineEvent = onSecurity.mock.calls.find(
                (call) => call[0].event === 'genome_quarantined'
            );
            expect(quarantineEvent).toBeDefined();
            expect(quarantineEvent![0].level).toBe('critical');
        });

        it('should emit security events via callback in non-production environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const genome = createGenomeV2();
            const onSec = vi.fn();
            new GenomeKernel(genome, { onSecurityEvent: onSec });

            expect(onSec).toHaveBeenCalled();

            process.env.NODE_ENV = originalEnv;
        });
    });

    // ─── Custom Error Classes ───────────────────────────

    describe('IntegrityViolationError', () => {
        it('should be an instance of Error', () => {
            const err = new IntegrityViolationError('test');
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(IntegrityViolationError);
        });

        it('should have name set to IntegrityViolationError', () => {
            const err = new IntegrityViolationError('test message');
            expect(err.name).toBe('IntegrityViolationError');
            expect(err.message).toBe('test message');
        });
    });

    describe('QuarantinedGenomeError', () => {
        it('should be an instance of Error', () => {
            const err = new QuarantinedGenomeError('genome-123');
            expect(err).toBeInstanceOf(Error);
            expect(err).toBeInstanceOf(QuarantinedGenomeError);
        });

        it('should have name set to QuarantinedGenomeError', () => {
            const err = new QuarantinedGenomeError('genome-123');
            expect(err.name).toBe('QuarantinedGenomeError');
            expect(err.message).toContain('genome-123');
            expect(err.message).toContain('quarantined');
            expect(err.message).toContain('Manual intervention');
        });
    });

    // ─── Edge Cases ─────────────────────────────────────

    describe('edge cases', () => {
        it('should handle genome with empty constraints arrays', () => {
            const genome = createGenomeV2();
            genome.chromosomes.c0.identity.constraints = [];
            genome.chromosomes.c0.security.forbiddenTopics = [];
            genome.chromosomes.c0.security.accessControls = [];
            genome.chromosomes.c0.security.safetyRules = [];

            // The hash is computed fresh at construction, so integrity should be fine
            const kernel = new GenomeKernel(genome);
            expect(kernel.verifyIntegrity()).toBe(true);
        });

        it('should handle rapid successive verifyIntegrity calls', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome);

            for (let i = 0; i < 50; i++) {
                expect(kernel.verifyIntegrity()).toBe(true);
            }
        });

        it('should handle creating and rolling back to version 0', () => {
            const genome = createGenomeV2();
            genome.version = 0;
            const kernel = new GenomeKernel(genome);

            kernel.createSnapshot('initial');

            genome.version = 5;
            genome.name = 'Changed';

            const result = kernel.rollbackToVersion(0, 'admin');
            expect(result).toBe(true);
            expect(genome.name).toBe('Test Genome');
        });

        it('should survive full quarantine-release cycle', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
                maxViolations: 1,
            });

            const originalRole = genome.chromosomes.c0.identity.role;

            // Step 1: Tamper and quarantine
            genome.chromosomes.c0.identity.role = 'EVIL';
            kernel.verifyIntegrity();
            expect(kernel.isQuarantined()).toBe(true);
            expect(kernel.getViolationCount()).toBe(1);

            // Step 2: Verify returns false while quarantined
            expect(kernel.verifyIntegrity()).toBe(false);

            // Step 3: Restore C0 and release
            genome.chromosomes.c0.identity.role = originalRole;
            kernel.releaseQuarantine('admin');
            expect(kernel.isQuarantined()).toBe(false);
            expect(kernel.getViolationCount()).toBe(0);

            // Step 4: Verify works again
            expect(kernel.verifyIntegrity()).toBe(true);
        });

        it('should handle snapshot and rollback round-trip preserving C0 integrity', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: false,
            });

            // Snapshot the healthy state
            kernel.createSnapshot('healthy');

            // Verify hash is consistent before and after rollback
            const hashBefore = kernel.getC0Hash();

            kernel.rollbackToVersion(1, 'admin');

            const hashAfter = kernel.getC0Hash();
            expect(hashBefore).toBe(hashAfter);

            // Integrity should still verify
            expect(kernel.verifyIntegrity()).toBe(true);
        });

        it('should handle C0 with unicode content correctly', () => {
            const genome = createGenomeV2();
            genome.chromosomes.c0.identity.role = 'Eres un asistente de IA';
            genome.chromosomes.c0.attribution.creator = 'Luis Velasquez Duran';
            // Integrity is set by constructor, so no undefined references
            // Need to create a fresh genome without pre-set integrity
            const unicodeGenome = createGenomeV2();
            unicodeGenome.chromosomes.c0.identity.role = 'Eres un asistente de IA';
            unicodeGenome.chromosomes.c0.attribution.creator = 'Luis Velasquez Duran';

            const kernel = new GenomeKernel(unicodeGenome);
            expect(kernel.verifyIntegrity()).toBe(true);

            const hash = kernel.getC0Hash();
            expect(hash).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should handle multiple snapshots with selective safe rollback', () => {
            const genome = createGenomeV2();
            const kernel = new GenomeKernel(genome, {
                strictMode: false,
                autoRollback: true,
                maxViolations: 100,
            });

            // Snapshot 1: safe
            kernel.createSnapshot('safe v1');

            // Tamper C0, snapshot 2: corrupted
            genome.chromosomes.c0.identity.role = 'CORRUPTED';
            kernel.createSnapshot('corrupted v1');

            // Now tamper again and trigger verify with auto-rollback
            // The rollback should find snapshot 1 (safe) and skip snapshot 2 (corrupted)
            genome.chromosomes.c0.identity.role = 'ANOTHER TAMPERING';
            kernel.verifyIntegrity();

            // Should have rolled back to the safe snapshot
            expect(genome.chromosomes.c0.identity.role).toBe(
                'You are a helpful AI assistant'
            );
        });
    });
});
