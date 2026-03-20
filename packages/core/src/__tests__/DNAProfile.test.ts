/**
 * DNAProfile Tests
 *
 * Tests for user cognitive profile building, trait extraction, and DNA evolution.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DNAProfile } from '../core/DNAProfile.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Interaction, UserDNA } from '../types/index.js';

// ─── Helpers ──────────────────────────────────────────────

function mockStorage(dna?: UserDNA | null): StorageAdapter {
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockResolvedValue(undefined),
        loadGenome: vi.fn().mockResolvedValue(null),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        listGenomes: vi.fn().mockResolvedValue([]),
        saveDNA: vi.fn().mockResolvedValue(undefined),
        loadDNA: vi.fn().mockResolvedValue(dna ?? null),
        logInteraction: vi.fn().mockResolvedValue(undefined),
        getInteractions: vi.fn().mockResolvedValue([]),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getMutations: vi.fn().mockResolvedValue([]),
    } as unknown as StorageAdapter;
}

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
    return {
        genomeId: 'genome-1',
        userId: 'user-1',
        userMessage: 'Hello, can you help me?',
        assistantResponse: 'Of course! I would be happy to assist you with that.',
        toolCalls: [],
        timestamp: new Date(),
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────

describe('DNAProfile', () => {
    let storage: StorageAdapter;

    beforeEach(() => {
        storage = mockStorage();
    });

    describe('getDNA', () => {
        it('should return existing DNA from storage', async () => {
            const existingDNA: UserDNA = {
                userId: 'user-1',
                genomeId: 'genome-1',
                traits: {
                    communicationStyle: 'technical',
                    verbosity: 'detailed',
                    tone: 'friendly',
                    preferredTools: ['read', 'edit'],
                    preferredFormats: [],
                    preferredLanguage: 'en',
                    domainExpertise: { typescript: 0.8 },
                    taskSuccessRates: {},
                    peakProductivityHours: [10, 14],
                    averageTurnsToSuccess: 3,
                    retryPatterns: {},
                    adaptationRate: 0.6,
                    stabilityScore: 0.7,
                },
                confidence: { communicationStyle: 0.5 },
                generation: 5,
                lastEvolved: new Date(),
            };
            storage = mockStorage(existingDNA);
            const profile = new DNAProfile(storage);

            const dna = await profile.getDNA('user-1', 'genome-1');

            expect(dna).toBe(existingDNA);
            expect(storage.loadDNA).toHaveBeenCalledWith('user-1', 'genome-1');
        });

        it('should create default DNA when none exists', async () => {
            const profile = new DNAProfile(storage);

            const dna = await profile.getDNA('user-1', 'genome-1');

            expect(dna.userId).toBe('user-1');
            expect(dna.genomeId).toBe('genome-1');
            expect(dna.generation).toBe(0);
            expect(dna.traits.communicationStyle).toBe('formal');
            expect(dna.traits.verbosity).toBe('balanced');
            expect(dna.traits.adaptationRate).toBe(0.5);
        });
    });

    describe('updateDNA', () => {
        it('should increment generation on update', async () => {
            const profile = new DNAProfile(storage);

            const dna = await profile.updateDNA('user-1', 'genome-1', makeInteraction());

            expect(dna.generation).toBe(1);
            expect(storage.saveDNA).toHaveBeenCalledOnce();
        });

        it('should detect formal communication style', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'Would you kindly assist me with this task?',
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.communicationStyle).toBe('formal');
        });

        it('should detect technical communication style', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'I need to refactor this class and update the interface',
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.communicationStyle).toBe('technical');
        });

        it('should detect casual communication style', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'hey yo can you fix this cool thing',
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.communicationStyle).toBe('casual');
        });

        it('should update tool preferences from interaction', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                toolCalls: [
                    { name: 'read', args: {}, success: true },
                    { name: 'edit', args: {}, success: true },
                    { name: 'read', args: {}, success: true },
                ],
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.preferredTools).toContain('read');
            expect(dna.traits.preferredTools).toContain('edit');
            // read appears twice so it should be first
            expect(dna.traits.preferredTools[0]).toBe('read');
        });

        it('should update task success rates', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                taskType: 'coding',
                score: 0.9,
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.taskSuccessRates['coding']).toBeGreaterThan(0);
        });

        it('should track peak productivity hours for high-score interactions', async () => {
            const profile = new DNAProfile(storage);
            const timestamp = new Date();
            timestamp.setHours(14, 0, 0, 0);

            const interaction = makeInteraction({
                score: 0.9,
                timestamp,
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.peakProductivityHours).toContain(14);
        });

        it('should NOT track peak hours for low-score interactions', async () => {
            const profile = new DNAProfile(storage);
            const timestamp = new Date();
            timestamp.setHours(3, 0, 0, 0);

            const interaction = makeInteraction({
                score: 0.4,
                timestamp,
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.peakProductivityHours).not.toContain(3);
        });

        it('should increase confidence for detected traits', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'Please implement the class method',
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            // communicationStyle detected as 'technical' (has 'class')
            expect(dna.confidence['communicationStyle']).toBeGreaterThan(0);
        });
    });

    describe('exportDNA', () => {
        it('should return JSON string of user DNA', async () => {
            const profile = new DNAProfile(storage);
            const json = await profile.exportDNA('user-1', 'genome-1');
            const parsed = JSON.parse(json);

            expect(parsed.userId).toBe('user-1');
            expect(parsed.traits).toBeDefined();
            expect(parsed.confidence).toBeDefined();
        });
    });

    describe('verbosity detection', () => {
        it('should detect terse responses', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'What is TypeScript?',
                assistantResponse: 'A typed superset of JS.',
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.verbosity).toBe('terse');
        });

        it('should detect detailed responses', async () => {
            const profile = new DNAProfile(storage);
            const interaction = makeInteraction({
                userMessage: 'Hi',
                assistantResponse: 'A'.repeat(100),
            });

            const dna = await profile.updateDNA('user-1', 'genome-1', interaction);

            expect(dna.traits.verbosity).toBe('detailed');
        });
    });
});
