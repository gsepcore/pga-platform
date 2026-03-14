/**
 * Living Agent Integration Tests
 *
 * Tests that all 3 living agent systems (EnhancedSelfModel,
 * PurposeSurvival, StrategicAutonomy) work correctly when
 * initialized together via GSEP config flags.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect, vi } from 'vitest';
import { PGA } from '../PGA.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';

// ─── Helpers ────────────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        chat: vi.fn().mockResolvedValue({ content: 'Test response from LLM' }),
    } as unknown as LLMAdapter;
}

function createMockStorage(): StorageAdapter {
    const genomes = new Map<string, unknown>();
    return {
        saveGenome: vi.fn().mockImplementation(async (id: string, genome: unknown) => {
            genomes.set(id, genome);
        }),
        loadGenome: vi.fn().mockImplementation(async (id: string) => {
            return genomes.get(id) ?? null;
        }),
        listGenomes: vi.fn().mockResolvedValue([]),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;
}

function createGenomeWithAutonomous(pga: PGA, name: string, autonomous: AutonomousConfig) {
    return pga.createGenome({ name, config: { autonomous } });
}

// ─── Tests ──────────────────────────────────────────────

describe('Living Agent Integration', () => {
    describe('initialization with all 3 systems', () => {
        it('should initialize with all living agent flags enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'test-living-agent', {
                enableEnhancedSelfModel: true,
                enablePurposeSurvival: true,
                enableStrategicAutonomy: true,
                agentPurpose: 'Expert coding assistant',
            });
            expect(genome).toBeDefined();
        });

        it('should work without any living agent flags', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await pga.createGenome({ name: 'test-basic-agent' });
            expect(genome).toBeDefined();
        });

        it('should work with only some flags enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'test-partial-agent', {
                enableEnhancedSelfModel: true,
                enablePurposeSurvival: false,
                enableStrategicAutonomy: false,
            });
            expect(genome).toBeDefined();
        });
    });

    describe('public API methods', () => {
        it('getIntegratedHealth() should return health when enhanced self-model enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'health-test', {
                enableEnhancedSelfModel: true,
                agentPurpose: 'Test assistant',
            });
            const health = genome.getIntegratedHealth();

            expect(health).not.toBeNull();
            expect(health!.score).toBeGreaterThan(0);
            expect(health!.label).toBeDefined();
        });

        it('getIntegratedHealth() should return null without enhanced self-model', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await pga.createGenome({ name: 'no-health-test' });
            const health = genome.getIntegratedHealth();

            expect(health).toBeNull();
        });

        it('getOperatingMode() should return mode when survival enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'mode-test', {
                enableEnhancedSelfModel: true,
                enablePurposeSurvival: true,
                agentPurpose: 'Test agent',
            });
            const mode = genome.getOperatingMode();

            expect(mode).not.toBeNull();
            expect(['thriving', 'stable', 'stressed', 'survival', 'critical']).toContain(mode);
        });

        it('getOperatingMode() should return null without survival', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await pga.createGenome({ name: 'no-mode-test' });
            const mode = genome.getOperatingMode();

            expect(mode).toBeNull();
        });

        it('getCapabilities() should return empty array by default', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'cap-test', {
                enableEnhancedSelfModel: true,
                agentPurpose: 'Test',
            });
            const caps = genome.getCapabilities();

            expect(caps).toEqual([]);
        });

        it('getTrajectories() should return empty array before snapshots', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'traj-test', {
                enableEnhancedSelfModel: true,
                agentPurpose: 'Test',
            });
            const trajectories = genome.getTrajectories();

            expect(trajectories).toEqual([]);
        });

        it('getEvolutionPriorities() should return empty array without drift', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'prio-test', {
                enableStrategicAutonomy: true,
                agentPurpose: 'Test',
            });
            const priorities = genome.getEvolutionPriorities();

            expect(priorities).toEqual([]);
        });

        it('getAgentVitals() should return vitals when all systems enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'vitals-test', {
                enableEnhancedSelfModel: true,
                enablePurposeSurvival: true,
                enableStrategicAutonomy: true,
                agentPurpose: 'Expert coding assistant',
            });
            const vitals = genome.getAgentVitals();

            expect(vitals).not.toBeNull();
            expect(vitals!.mode).toBeDefined();
            expect(vitals!.health).toBeDefined();
            expect(vitals!.purpose).toBe('Expert coding assistant');
            expect(vitals!.strategy).toBeDefined();
        });

        it('getAgentVitals() should return null without both systems', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await pga.createGenome({ name: 'no-vitals-test' });
            const vitals = genome.getAgentVitals();

            expect(vitals).toBeNull();
        });

        it('getSurvivalStrategy() should return strategy when enabled', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'strategy-test', {
                enableEnhancedSelfModel: true,
                enablePurposeSurvival: true,
                agentPurpose: 'Test',
            });
            const strategy = genome.getSurvivalStrategy();

            expect(strategy).not.toBeNull();
            expect(strategy!.mutationPolicy).toBeDefined();
        });
    });

    describe('graceful fallbacks', () => {
        it('should handle enablePurposeSurvival without enableEnhancedSelfModel gracefully', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'partial-test', {
                enablePurposeSurvival: true,
                agentPurpose: 'Test',
            });
            expect(genome).toBeDefined();

            const mode = genome.getOperatingMode();
            expect(mode).not.toBeNull();
        });

        it('should handle enableStrategicAutonomy without other systems', async () => {
            const pga = new PGA({
                llm: createMockLLM(),
                storage: createMockStorage(),
            });

            const genome = await createGenomeWithAutonomous(pga, 'autonomous-only', {
                enableStrategicAutonomy: true,
                agentPurpose: 'Independent assistant',
            });
            expect(genome).toBeDefined();
        });
    });
});
