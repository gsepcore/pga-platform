/**
 * GSEP Core Tests
 *
 * Tests for the main PGA class with integrated monitoring
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-28
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GSEP } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Mock Implementations ───────────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        return {
            content: `Mock response to: ${messages[messages.length - 1].content}`,
            usage: { inputTokens: 100, outputTokens: 200 },
        };
    }
}

class MockStorageAdapter implements StorageAdapter {
    private genomes: Map<string, any> = new Map();

    async initialize() {
        // No-op for testing
    }

    async saveGenome(genome: any) {
        this.genomes.set(genome.id, genome);
    }

    async loadGenome(id: string) {
        return this.genomes.get(id) || null;
    }

    async listGenomes() {
        return Array.from(this.genomes.values());
    }

    async deleteGenome(id: string) {
        this.genomes.delete(id);
    }

    async recordInteraction(interaction: any) {
        // No-op
    }

    async recordFeedback(feedback: any) {
        // No-op
    }

    async logMutation(log: any) {
        // No-op
    }

    async getAnalytics(genomeId: string) {
        return {
            totalInteractions: 10,
            totalMutations: 2,
            avgFitnessImprovement: 0.05,
            userSatisfaction: 0.75,
        };
    }

    async loadDNA(userId: string, genomeId: string) {
        return null;
    }

    async saveDNA(userId: string, genomeId: string, dna: any) {
        // No-op
    }
}

// ─── Test Suite ─────────────────────────────────────────────

describe('GSEP', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageAdapter;

    beforeEach(() => {
        llm = new MockLLMAdapter();
        storage = new MockStorageAdapter();
    });

    describe('validation', () => {
        it('should throw descriptive error when LLM adapter is missing', () => {
            expect(() => new GSEP({
                llm: undefined as any,
                storage,
            })).toThrow('[GSEP] LLM adapter is required');
        });

        it('should throw descriptive error when LLM adapter is null', () => {
            expect(() => new GSEP({
                llm: null as any,
                storage,
            })).toThrow('[GSEP] LLM adapter is required');
        });

        it('should throw descriptive error when storage adapter is missing', () => {
            expect(() => new GSEP({
                llm,
                storage: undefined as any,
            })).toThrow('[GSEP] Storage adapter is required');
        });

        it('should include actionable instructions in error message', () => {
            try {
                new GSEP({ llm: undefined as any, storage });
                expect.unreachable('Should have thrown');
            } catch (e) {
                const msg = (e as Error).message;
                expect(msg).toContain('ClaudeAdapter');
                expect(msg).toContain('@gsep/adapters-llm-anthropic');
                expect(msg).toContain('gsep doctor');
            }
        });

        it('should succeed with valid LLM and storage', () => {
            expect(() => new GSEP({ llm, storage })).not.toThrow();
        });
    });

    describe('initialization', () => {
        it('should initialize GSEP with default monitoring config', async () => {
            const gsep = new GSEP({
                llm,
                storage,
            });

            await gsep.initialize();

            const metrics = gsep.getMetrics();
            expect(metrics).toBeDefined();
        });

        it('should initialize GSEP with custom monitoring config', async () => {
            const gsep = new GSEP({
                llm,
                storage,
                monitoring: {
                    enabled: true,
                    enableCostTracking: true,
                    alertThresholds: {
                        maxCostPerHour: 50,
                        maxErrorRate: 0.1,
                    },
                },
            });

            await gsep.initialize();

            const metrics = gsep.getMetrics();
            expect(metrics).toBeDefined();
        });

        it('should start dashboard if enabled', async () => {
            const gsep = new GSEP({
                llm,
                storage,
                dashboard: {
                    enabled: true,
                    refreshInterval: 5000,
                },
            });

            await gsep.initialize();

            const dashboard = gsep.getDashboard();
            expect(dashboard).toBeDefined();

            gsep.shutdown();
        });

        it('should not start dashboard if disabled', async () => {
            const gsep = new GSEP({
                llm,
                storage,
                dashboard: {
                    enabled: false,
                },
            });

            await gsep.initialize();

            const dashboard = gsep.getDashboard();
            expect(dashboard).toBeUndefined();
        });

        it('should log initialization to audit', async () => {
            const gsep = new GSEP({
                llm,
                storage,
            });

            await gsep.initialize();

            const metrics = gsep.getMetrics();
            const logs = metrics.getAuditLogs(10);

            const initLog = logs.find(l => l.operation === 'initialize');
            expect(initLog).toBeDefined();
            expect(initLog?.level).toBe('info');
            expect(initLog?.component).toBe('gsep');
        });
    });

    describe('genome management', () => {
        it('should create a genome', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const genome = await gsep.createGenome({
                name: 'test-genome',
            });

            expect(genome).toBeDefined();
            expect(genome.name).toBe('test-genome');
            expect(genome.id).toBeDefined();
        });

        it('should load an existing genome', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const created = await gsep.createGenome({
                name: 'test-genome',
            });

            const loaded = await gsep.loadGenome(created.id);

            expect(loaded).toBeDefined();
            expect(loaded?.id).toBe(created.id);
        });

        it('should list all genomes', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            await gsep.createGenome({ name: 'genome-1' });
            await gsep.createGenome({ name: 'genome-2' });

            const genomes = await gsep.listGenomes();

            expect(genomes.length).toBe(2);
        });

        it('should delete a genome', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const genome = await gsep.createGenome({ name: 'test-genome' });

            await gsep.deleteGenome(genome.id);

            const loaded = await gsep.loadGenome(genome.id);
            expect(loaded).toBeNull();
        });
    });

    describe('metrics', () => {
        it('should provide access to metrics collector', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const metrics = gsep.getMetrics();

            expect(metrics).toBeDefined();
            expect(typeof metrics.recordRequest).toBe('function');
            expect(typeof metrics.getPerformanceMetrics).toBe('function');
        });

        it('should export metrics', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const exported = gsep.exportMetrics();

            expect(exported).toBeDefined();
            expect(exported.performance).toBeDefined();
            expect(exported.cost).toBeDefined();
            expect(exported.health).toBeDefined();
            expect(exported.alerts).toBeDefined();
            expect(exported.auditLogs).toBeDefined();
        });

        it('should get active alerts', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const alerts = gsep.getAlerts();

            expect(Array.isArray(alerts)).toBe(true);
        });

        it('should get health status', async () => {
            const gsep = new GSEP({ llm, storage });
            await gsep.initialize();

            const health = gsep.getHealthStatus();

            expect(health).toBeDefined();
            expect(health.status).toMatch(/healthy|degraded|unhealthy/);
            expect(health.components).toBeDefined();
            expect(health.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('shutdown', () => {
        it('should shutdown gracefully', async () => {
            const gsep = new GSEP({
                llm,
                storage,
                dashboard: { enabled: true },
            });

            await gsep.initialize();

            gsep.shutdown();

            const metrics = gsep.getMetrics();
            const logs = metrics.getAuditLogs(10);

            const shutdownLog = logs.find(l => l.operation === 'shutdown');
            expect(shutdownLog).toBeDefined();
        });

        it('should stop dashboard on shutdown', async () => {
            const gsep = new GSEP({
                llm,
                storage,
                dashboard: { enabled: true },
            });

            await gsep.initialize();

            const dashboard = gsep.getDashboard();
            const stopSpy = vi.spyOn(dashboard!, 'stop');

            gsep.shutdown();

            expect(stopSpy).toHaveBeenCalled();
        });
    });
});
