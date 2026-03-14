/**
 * CanaryDeployment Tests
 *
 * Tests for GSEP's canary deployment system:
 * - Starting canary deployments with correct defaults
 * - Hash-based traffic routing (shouldUseCanary)
 * - Request metric recording and EMA calculations
 * - Canary evaluation decisions (continue, ramp-up, promote, rollback)
 * - Promotion and rollback lifecycle
 * - Active deployment tracking and reporting
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    CanaryDeploymentManager,
    type CanaryDeployment,
    type CanaryConfig,
} from '../CanaryDeployment.js';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';
import type { GeneAllele } from '../../types/index.js';

// ─── Mock Storage Adapter ────────────────────────────────────

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

// ─── Mock Gene Alleles ──────────────────────────────────────

function createStableAllele(): GeneAllele {
    return {
        gene: 'test-gene',
        variant: 'v1-stable',
        content: 'Stable content for testing.',
        fitness: 0.8,
        status: 'active' as const,
        createdAt: new Date(),
    };
}

function createCanaryAllele(): GeneAllele {
    return {
        gene: 'test-gene',
        variant: 'v2-canary',
        content: 'Canary content for testing.',
        fitness: 0.82,
        status: 'active' as const,
        createdAt: new Date(),
    };
}

// ─── Helper: start a canary and return deployment + manager ──

async function startTestCanary(
    configOverrides?: Partial<CanaryConfig>,
): Promise<{ manager: CanaryDeploymentManager; deployment: CanaryDeployment; storage: StorageAdapter }> {
    const storage = createMockStorage();
    const manager = new CanaryDeploymentManager(storage, configOverrides);
    const deployment = await manager.startCanary({
        genomeId: 'genome-1',
        layer: 1,
        gene: 'test-gene',
        stableAllele: createStableAllele(),
        canaryAllele: createCanaryAllele(),
    });
    return { manager, deployment, storage };
}

// ─── Start Canary ───────────────────────────────────────────

describe('CanaryDeploymentManager - startCanary', () => {
    it('should create a deployment with correct initial fields', async () => {
        const { deployment, storage } = await startTestCanary();

        expect(deployment.id).toContain('canary_genome-1_test-gene_');
        expect(deployment.genomeId).toBe('genome-1');
        expect(deployment.layer).toBe(1);
        expect(deployment.gene).toBe('test-gene');
        expect(deployment.stableVariant).toBe('v1-stable');
        expect(deployment.canaryVariant).toBe('v2-canary');
        expect(deployment.trafficPercent).toBe(5);
        expect(deployment.targetPercent).toBe(5);
        expect(deployment.status).toBe('active');
        expect(deployment.startedAt).toBeInstanceOf(Date);

        // Metrics initialized at zero
        expect(deployment.metrics.stable.requests).toBe(0);
        expect(deployment.metrics.stable.errors).toBe(0);
        expect(deployment.metrics.stable.avgLatencyMs).toBe(0);
        expect(deployment.metrics.stable.avgFitness).toBe(0.5);
        expect(deployment.metrics.stable.successRate).toBe(1.0);
        expect(deployment.metrics.canary.requests).toBe(0);

        // Should log the mutation start
        expect(storage.logMutation).toHaveBeenCalledOnce();
        expect(storage.logMutation).toHaveBeenCalledWith(
            expect.objectContaining({
                genomeId: 'genome-1',
                variant: 'v2-canary',
                deployed: false,
            }),
        );
    });

    it('should accept custom initial traffic percent config', async () => {
        const { deployment } = await startTestCanary({ initialTrafficPercent: 10 });

        expect(deployment.trafficPercent).toBe(10);
        expect(deployment.targetPercent).toBe(10);
    });
});

// ─── Traffic Routing ────────────────────────────────────────

describe('CanaryDeploymentManager - shouldUseCanary', () => {
    it('should route some users to canary based on hash', async () => {
        const { manager, deployment } = await startTestCanary();

        // Try many user IDs, at least some should hit canary (5% traffic)
        let canaryCount = 0;
        const totalUsers = 1000;
        for (let i = 0; i < totalUsers; i++) {
            if (manager.shouldUseCanary(deployment.id, `user-${i}`)) {
                canaryCount++;
            }
        }

        // With 5% traffic, expect roughly 50 users on canary.
        // Allow a wide range since it is hash-based, not random.
        expect(canaryCount).toBeGreaterThan(0);
        expect(canaryCount).toBeLessThan(totalUsers);
    });

    it('should be deterministic for the same userId', async () => {
        const { manager, deployment } = await startTestCanary();

        const result1 = manager.shouldUseCanary(deployment.id, 'consistent-user-123');
        const result2 = manager.shouldUseCanary(deployment.id, 'consistent-user-123');

        expect(result1).toBe(result2);
    });

    it('should return false for unknown deployment id', async () => {
        const { manager } = await startTestCanary();

        const result = manager.shouldUseCanary('nonexistent-id', 'user-1');

        expect(result).toBe(false);
    });

    it('should return false after deployment is promoted', async () => {
        const { manager, deployment } = await startTestCanary();

        await manager.promote(deployment.id);
        const result = manager.shouldUseCanary(deployment.id, 'user-1');

        expect(result).toBe(false);
    });
});

// ─── Record Requests ────────────────────────────────────────

describe('CanaryDeploymentManager - recordRequest', () => {
    it('should update metrics for stable variant', async () => {
        const { manager, deployment } = await startTestCanary();

        manager.recordRequest(deployment.id, 'stable', {
            success: true,
            latencyMs: 200,
            fitness: 0.85,
        });

        const updated = manager.getDeployment(deployment.id)!;
        expect(updated.metrics.stable.requests).toBe(1);
        expect(updated.metrics.stable.errors).toBe(0);
        expect(updated.metrics.stable.successRate).toBe(1.0);
    });

    it('should update metrics for canary variant', async () => {
        const { manager, deployment } = await startTestCanary();

        manager.recordRequest(deployment.id, 'canary', {
            success: true,
            latencyMs: 150,
            fitness: 0.9,
        });

        const updated = manager.getDeployment(deployment.id)!;
        expect(updated.metrics.canary.requests).toBe(1);
        expect(updated.metrics.canary.errors).toBe(0);
        expect(updated.metrics.canary.successRate).toBe(1.0);
    });

    it('should track errors correctly', async () => {
        const { manager, deployment } = await startTestCanary();

        manager.recordRequest(deployment.id, 'canary', {
            success: false,
            latencyMs: 500,
        });

        const updated = manager.getDeployment(deployment.id)!;
        expect(updated.metrics.canary.requests).toBe(1);
        expect(updated.metrics.canary.errors).toBe(1);
        expect(updated.metrics.canary.successRate).toBe(0);
    });

    it('should accumulate multiple requests', async () => {
        const { manager, deployment } = await startTestCanary();

        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'canary', {
                success: i < 8, // 80% success
                latencyMs: 100 + i * 10,
                fitness: 0.7 + i * 0.01,
            });
        }

        const updated = manager.getDeployment(deployment.id)!;
        expect(updated.metrics.canary.requests).toBe(10);
        expect(updated.metrics.canary.errors).toBe(2);
        expect(updated.metrics.canary.successRate).toBe(0.8);
    });

    it('should silently ignore requests for unknown deployment', async () => {
        const { manager } = await startTestCanary();

        // Should not throw
        manager.recordRequest('nonexistent-id', 'canary', {
            success: true,
            latencyMs: 100,
        });
    });
});

// ─── Evaluate Canary ────────────────────────────────────────

describe('CanaryDeploymentManager - evaluateCanary', () => {
    it('should return continue when canary has insufficient samples', async () => {
        const { manager, deployment } = await startTestCanary({ minSampleSize: 50 });

        // Record only 10 canary requests (below minSampleSize of 50)
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'canary', {
                success: true,
                latencyMs: 100,
                fitness: 0.85,
            });
        }

        const decision = await manager.evaluateCanary(deployment.id);

        expect(decision.action).toBe('continue');
        expect(decision.reason).toContain('Insufficient samples');
        expect(decision.reason).toContain('10');
        expect(decision.reason).toContain('50');
    });

    it('should return ramp-up when canary performs as well as stable', async () => {
        const { manager, deployment } = await startTestCanary({ minSampleSize: 5 });

        // Record stable metrics
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'stable', {
                success: true,
                latencyMs: 200,
                fitness: 0.8,
            });
        }

        // Record canary metrics (same or better)
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'canary', {
                success: true,
                latencyMs: 180,
                fitness: 0.85,
            });
        }

        const decision = await manager.evaluateCanary(deployment.id);

        expect(decision.action).toBe('ramp-up');
        expect(decision.reason).toContain('performing as well or better');
        expect(decision.comparison).toBeDefined();
        expect(decision.comparison.fitnessDelta).toBeGreaterThanOrEqual(0);
    });

    it('should return rollback when canary error rate exceeds threshold', async () => {
        const { manager, deployment } = await startTestCanary({
            minSampleSize: 5,
            maxErrorRateIncrease: 0.10,
            autoRollback: true,
        });

        // Stable: 100% success
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'stable', {
                success: true,
                latencyMs: 200,
                fitness: 0.8,
            });
        }

        // Canary: 50% failure rate (way above 10% threshold)
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'canary', {
                success: i < 5,
                latencyMs: 200,
                fitness: 0.5,
            });
        }

        const decision = await manager.evaluateCanary(deployment.id);

        expect(decision.action).toBe('rollback');
        expect(decision.reason).toContain('Error rate increased');
        expect(decision.recommendation).toContain('worse than stable');
    });

    it('should return rollback when canary latency exceeds threshold', async () => {
        const { manager, deployment } = await startTestCanary({
            minSampleSize: 5,
            maxLatencyIncrease: 500,
            autoRollback: true,
        });

        // Stable: low latency
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'stable', {
                success: true,
                latencyMs: 100,
                fitness: 0.8,
            });
        }

        // Canary: very high latency (EMA will climb well above stable + 500ms)
        for (let i = 0; i < 10; i++) {
            manager.recordRequest(deployment.id, 'canary', {
                success: true,
                latencyMs: 5000,
                fitness: 0.8,
            });
        }

        const decision = await manager.evaluateCanary(deployment.id);

        expect(decision.action).toBe('rollback');
        expect(decision.reason).toContain('Latency increased');
        expect(decision.recommendation).toContain('too slow');
    });

    it('should throw for unknown deployment id', async () => {
        const { manager } = await startTestCanary();

        await expect(manager.evaluateCanary('nonexistent-id')).rejects.toThrow(
            'Canary deployment not found',
        );
    });
});

// ─── Promote ────────────────────────────────────────────────

describe('CanaryDeploymentManager - promote', () => {
    it('should change status to complete and remove from active deployments', async () => {
        const { manager, deployment, storage } = await startTestCanary();

        await manager.promote(deployment.id);

        // Should be removed from active deployments
        const retrieved = manager.getDeployment(deployment.id);
        expect(retrieved).toBeUndefined();

        // Should log promotion
        expect(storage.logMutation).toHaveBeenCalledTimes(2); // start + promote
        const promoteCall = (storage.logMutation as any).mock.calls[1][0];
        expect(promoteCall.deployed).toBe(true);
        expect(promoteCall.reason).toContain('promoted to stable');
    });

    it('should throw for unknown deployment id', async () => {
        const { manager } = await startTestCanary();

        await expect(manager.promote('nonexistent-id')).rejects.toThrow(
            'Canary deployment not found',
        );
    });
});

// ─── Rollback ───────────────────────────────────────────────

describe('CanaryDeploymentManager - rollback', () => {
    it('should change status to rolled-back and remove from active deployments', async () => {
        const { manager, deployment, storage } = await startTestCanary();

        await manager.rollback(deployment.id, 'Error rate too high');

        // Should be removed from active deployments
        const retrieved = manager.getDeployment(deployment.id);
        expect(retrieved).toBeUndefined();

        // Should log rollback
        expect(storage.logMutation).toHaveBeenCalledTimes(2); // start + rollback
        const rollbackCall = (storage.logMutation as any).mock.calls[1][0];
        expect(rollbackCall.mutationType).toBe('rollback');
        expect(rollbackCall.deployed).toBe(true);
        expect(rollbackCall.reason).toContain('Error rate too high');
    });

    it('should throw for unknown deployment id', async () => {
        const { manager } = await startTestCanary();

        await expect(manager.rollback('nonexistent-id', 'test')).rejects.toThrow(
            'Canary deployment not found',
        );
    });
});

// ─── Ramp Up ────────────────────────────────────────────────

describe('CanaryDeploymentManager - rampUp', () => {
    it('should increase traffic to the next ramp step', async () => {
        const { manager, deployment, storage } = await startTestCanary({
            initialTrafficPercent: 5,
            rampUpSteps: [25, 50, 100],
        });

        expect(deployment.trafficPercent).toBe(5);

        await manager.rampUp(deployment.id);

        const updated = manager.getDeployment(deployment.id)!;
        expect(updated.trafficPercent).toBe(25);
        expect(updated.targetPercent).toBe(25);
        expect(updated.lastRampAt).toBeInstanceOf(Date);
    });

    it('should progress through all ramp steps', async () => {
        const { manager, deployment } = await startTestCanary({
            initialTrafficPercent: 5,
            rampUpSteps: [25, 50, 100],
        });

        await manager.rampUp(deployment.id); // 5 -> 25
        expect(manager.getDeployment(deployment.id)!.trafficPercent).toBe(25);

        await manager.rampUp(deployment.id); // 25 -> 50
        expect(manager.getDeployment(deployment.id)!.trafficPercent).toBe(50);

        await manager.rampUp(deployment.id); // 50 -> 100
        const final = manager.getDeployment(deployment.id)!;
        expect(final.trafficPercent).toBe(100);
        expect(final.status).toBe('ramping'); // Set to ramping at 100%
    });
});

// ─── Active Deployments ─────────────────────────────────────

describe('CanaryDeploymentManager - getActiveDeployments', () => {
    it('should return empty array when no deployments exist', () => {
        const storage = createMockStorage();
        const manager = new CanaryDeploymentManager(storage);

        expect(manager.getActiveDeployments()).toEqual([]);
    });

    it('should track multiple active deployments', async () => {
        const storage = createMockStorage();
        const manager = new CanaryDeploymentManager(storage);

        await manager.startCanary({
            genomeId: 'genome-1',
            layer: 1,
            gene: 'gene-a',
            stableAllele: createStableAllele(),
            canaryAllele: createCanaryAllele(),
        });

        await manager.startCanary({
            genomeId: 'genome-2',
            layer: 1,
            gene: 'gene-b',
            stableAllele: { ...createStableAllele(), gene: 'gene-b', variant: 'v1-stable-b' },
            canaryAllele: { ...createCanaryAllele(), gene: 'gene-b', variant: 'v2-canary-b' },
        });

        const active = manager.getActiveDeployments();
        expect(active.length).toBe(2);
        expect(active.map(d => d.genomeId)).toContain('genome-1');
        expect(active.map(d => d.genomeId)).toContain('genome-2');
    });

    it('should decrease count after promotion', async () => {
        const storage = createMockStorage();
        const manager = new CanaryDeploymentManager(storage);

        const dep1 = await manager.startCanary({
            genomeId: 'genome-1',
            layer: 1,
            gene: 'gene-a',
            stableAllele: createStableAllele(),
            canaryAllele: createCanaryAllele(),
        });

        await manager.startCanary({
            genomeId: 'genome-2',
            layer: 1,
            gene: 'gene-b',
            stableAllele: { ...createStableAllele(), gene: 'gene-b', variant: 'v1-stable-b' },
            canaryAllele: { ...createCanaryAllele(), gene: 'gene-b', variant: 'v2-canary-b' },
        });

        expect(manager.getActiveDeployments().length).toBe(2);

        await manager.promote(dep1.id);
        expect(manager.getActiveDeployments().length).toBe(1);
    });
});

// ─── Canary Report ──────────────────────────────────────────

describe('CanaryDeploymentManager - getCanaryReport', () => {
    it('should return a formatted report string with deployment details', async () => {
        const { manager, deployment } = await startTestCanary();

        // Record some metrics
        for (let i = 0; i < 5; i++) {
            manager.recordRequest(deployment.id, 'stable', {
                success: true,
                latencyMs: 150,
                fitness: 0.8,
            });
            manager.recordRequest(deployment.id, 'canary', {
                success: true,
                latencyMs: 130,
                fitness: 0.85,
            });
        }

        const report = manager.getCanaryReport(deployment.id);

        expect(report).toContain('Canary Deployment Report');
        expect(report).toContain(deployment.id);
        expect(report).toContain('test-gene');
        expect(report).toContain('active');
        expect(report).toContain('5%');
        expect(report).toContain('v1-stable');
        expect(report).toContain('v2-canary');
        expect(report).toContain('Requests:');
        expect(report).toContain('Success Rate:');
        expect(report).toContain('Avg Latency:');
        expect(report).toContain('Avg Fitness:');
    });

    it('should return not-found message for unknown deployment', async () => {
        const { manager } = await startTestCanary();

        const report = manager.getCanaryReport('nonexistent-id');

        expect(report).toContain('not found');
    });
});
