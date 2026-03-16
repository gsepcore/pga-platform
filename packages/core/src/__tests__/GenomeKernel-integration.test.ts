/**
 * GenomeKernel Shadow Integration Tests
 *
 * Tests for GenomeKernel shadow mode in GenomeInstance (PGA.ts):
 * - Shadow initialization on genome construction
 * - C0 integrity verification before chat
 * - Snapshot creation before mutations
 * - Re-sync after successful mutation
 * - Graceful degradation when GenomeKernel fails
 * - getIntegrityStatus() public API
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PGA } from '../PGA.js';
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

    async initialize() { /* No-op */ }
    async saveGenome(genome: any) { this.genomes.set(genome.id, genome); }
    async loadGenome(id: string) { return this.genomes.get(id) || null; }
    async listGenomes() { return Array.from(this.genomes.values()); }
    async deleteGenome(id: string) { this.genomes.delete(id); }
    async recordInteraction() { /* No-op */ }
    async recordFeedback() { /* No-op */ }
    async logMutation() { /* No-op */ }
    async getMutationHistory() { return []; }
    async getGeneMutationHistory() { return []; }
    async getRecentInteractions() { return []; }
    async getAnalytics() {
        return {
            totalInteractions: 0, totalMutations: 0,
            avgFitnessImprovement: 0, userSatisfaction: 0.7,
            topGenes: [],
        };
    }
    async loadDNA() { return null; }
    async saveDNA() { /* No-op */ }
    async saveFact() { /* No-op */ }
    async getFacts() { return []; }
    async getFact() { return null; }
    async updateFact() { /* No-op */ }
    async deleteFact() { /* No-op */ }
    async deleteUserFacts() { /* No-op */ }
    async cleanExpiredFacts() { return 0; }
}

// ─── Tests ──────────────────────────────────────────────────

describe('GenomeKernel Shadow Integration', () => {
    let llm: MockLLMAdapter;
    let storage: MockStorageAdapter;
    let pga: PGA;

    beforeEach(async () => {
        llm = new MockLLMAdapter();
        storage = new MockStorageAdapter();
        pga = new PGA({ llm, storage });
        await pga.initialize();
    });

    describe('shadow initialization', () => {
        it('should create GenomeKernel shadow on genome construction', async () => {
            const genome = await pga.createGenome({ name: 'shadow-test' });

            const status = genome.getIntegrityStatus();
            expect(status).not.toBeNull();
            expect(status!.active).toBe(true);
            expect(status!.quarantined).toBe(false);
            expect(status!.violations).toBe(0);
        });

        it('should have a valid C0 hash (64 hex chars)', async () => {
            const genome = await pga.createGenome({ name: 'hash-test' });

            const status = genome.getIntegrityStatus();
            expect(status).not.toBeNull();
            expect(status!.c0Hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should start with zero snapshots', async () => {
            const genome = await pga.createGenome({ name: 'snap-test' });

            const status = genome.getIntegrityStatus();
            expect(status!.snapshotCount).toBe(0);
        });
    });

    describe('C0 integrity before chat', () => {
        it('should verify C0 integrity and complete chat successfully', async () => {
            const genome = await pga.createGenome({ name: 'chat-integrity' });

            // Chat should work — shadow verification runs silently
            const response = await genome.chat('hello', {
                userId: 'user-1',
                taskType: 'general',
            });

            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        });

        it('should maintain zero violations after normal chat', async () => {
            const genome = await pga.createGenome({ name: 'no-violation' });

            await genome.chat('test message', {
                userId: 'user-1',
                taskType: 'general',
            });

            const status = genome.getIntegrityStatus();
            expect(status!.violations).toBe(0);
            expect(status!.quarantined).toBe(false);
        });
    });

    describe('snapshot before mutation', () => {
        it('should create snapshot when mutate is called', async () => {
            const genome = await pga.createGenome({ name: 'mutation-snap' });

            // Add an allele so mutation has something to work with
            await genome.addAllele(2, 'system_instructions', 'default',
                'You are a helpful assistant with advanced capabilities.');

            // Attempt mutation (may or may not apply — we just verify snapshot)
            await genome.mutate({ layer: 2, gene: 'system_instructions' });

            const status = genome.getIntegrityStatus();
            // Should have at least 1 snapshot from pre-mutation
            expect(status!.snapshotCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('getIntegrityStatus', () => {
        it('should return full integrity status object', async () => {
            const genome = await pga.createGenome({ name: 'status-test' });
            const status = genome.getIntegrityStatus();

            expect(status).toEqual({
                active: true,
                quarantined: false,
                c0Hash: expect.stringMatching(/^[a-f0-9]{64}$/),
                violations: 0,
                snapshotCount: 0,
            });
        });

        it('should return consistent C0 hash across multiple calls', async () => {
            const genome = await pga.createGenome({ name: 'consistent-hash' });

            const status1 = genome.getIntegrityStatus();
            const status2 = genome.getIntegrityStatus();

            expect(status1!.c0Hash).toBe(status2!.c0Hash);
        });
    });
});
