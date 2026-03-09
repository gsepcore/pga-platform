/**
 * InMemoryStorageAdapter Tests — Full StorageAdapter in-memory implementation
 *
 * Tests for genome CRUD, user DNA, mutations, interactions, feedback,
 * analytics, semantic facts, and gene registry operations.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageAdapter } from '../InMemoryStorageAdapter.js';
import type { Genome, UserDNA, MutationLog, GeneRegistryEntry } from '../../types/index.js';
import type { SemanticFact } from '../../memory/LayeredMemory.js';

// ─── Helpers ─────────────────────────────────────────────

function makeGenome(overrides: Partial<Genome> = {}): Genome {
    return {
        id: 'genome-1',
        name: 'Test Genome',
        config: {
            enableSandbox: false,
            mutationRate: 'balanced',
        },
        layers: {
            layer0: [],
            layer1: [],
            layer2: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function makeUserDNA(overrides: Partial<UserDNA> = {}): UserDNA {
    return {
        userId: 'user-1',
        genomeId: 'genome-1',
        traits: {
            communicationStyle: 'technical',
            verbosity: 'balanced',
            tone: 'professional',
            preferredTools: ['vitest'],
            preferredFormats: ['typescript'],
            preferredLanguage: 'en',
            domainExpertise: { coding: 0.8 },
            taskSuccessRates: { coding: 0.9 },
            peakProductivityHours: [9, 10, 11],
            averageTurnsToSuccess: 3,
            retryPatterns: {},
            adaptationRate: 0.5,
            stabilityScore: 0.7,
        },
        confidence: { communicationStyle: 0.8 },
        generation: 1,
        lastEvolved: new Date(),
        ...overrides,
    };
}

function makeMutation(overrides: Partial<MutationLog> = {}): MutationLog {
    return {
        genomeId: 'genome-1',
        gene: 'test-gene',
        variant: 'v1',
        mutationType: 'targeted',
        parentVariant: null,
        deployed: false,
        createdAt: new Date(),
        ...overrides,
    };
}

function makeFact(overrides: Partial<SemanticFact> = {}): SemanticFact {
    return {
        id: 'fact-1',
        fact: 'User is an engineer',
        category: 'profile',
        confidence: 0.9,
        sourceTurn: 1,
        extractedAt: new Date(),
        expiry: null,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function makeRegistryEntry(overrides: Partial<GeneRegistryEntry> = {}): GeneRegistryEntry {
    return {
        id: 'entry-1',
        familyId: 'family-1',
        gene: 'test-gene',
        variant: 'v1',
        content: 'Gene content',
        layer: 1,
        fitness: 0.85,
        sampleCount: 100,
        successRate: 0.9,
        metadata: {
            sourceGenomeId: 'genome-1',
            sourceVersion: 1,
            publishedBy: 'agent-1',
        },
        createdAt: new Date(),
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────

describe('InMemoryStorageAdapter', () => {
    let adapter: InMemoryStorageAdapter;

    beforeEach(() => {
        adapter = new InMemoryStorageAdapter();
    });

    // ─── initialize ─────────────────────────────────────

    describe('initialize', () => {
        it('should resolve without error (no-op)', async () => {
            await expect(adapter.initialize()).resolves.toBeUndefined();
        });
    });

    // ─── Genome Operations ──────────────────────────────

    describe('Genome Operations', () => {
        it('should save and load a genome by id', async () => {
            const genome = makeGenome({ id: 'g1', name: 'Alpha' });
            await adapter.saveGenome(genome);

            const loaded = await adapter.loadGenome('g1');
            expect(loaded).not.toBeNull();
            expect(loaded!.name).toBe('Alpha');
        });

        it('should return null for non-existent genome', async () => {
            const result = await adapter.loadGenome('nonexistent');
            expect(result).toBeNull();
        });

        it('should return a deep clone of saved genome (no reference sharing)', async () => {
            const genome = makeGenome({ id: 'g1' });
            await adapter.saveGenome(genome);

            const loaded = await adapter.loadGenome('g1');
            loaded!.name = 'Modified';

            const reloaded = await adapter.loadGenome('g1');
            expect(reloaded!.name).toBe('Test Genome'); // original unchanged
        });

        it('should overwrite genome on re-save with same id', async () => {
            await adapter.saveGenome(makeGenome({ id: 'g1', name: 'v1' }));
            await adapter.saveGenome(makeGenome({ id: 'g1', name: 'v2' }));

            const loaded = await adapter.loadGenome('g1');
            expect(loaded!.name).toBe('v2');
        });

        it('should delete a genome', async () => {
            await adapter.saveGenome(makeGenome({ id: 'g1' }));
            await adapter.deleteGenome('g1');

            const loaded = await adapter.loadGenome('g1');
            expect(loaded).toBeNull();
        });

        it('should not throw when deleting non-existent genome', async () => {
            await expect(adapter.deleteGenome('nonexistent')).resolves.toBeUndefined();
        });

        it('should list all saved genomes', async () => {
            await adapter.saveGenome(makeGenome({ id: 'g1' }));
            await adapter.saveGenome(makeGenome({ id: 'g2' }));
            await adapter.saveGenome(makeGenome({ id: 'g3' }));

            const list = await adapter.listGenomes();
            expect(list).toHaveLength(3);
        });

        it('should return empty array when no genomes exist', async () => {
            const list = await adapter.listGenomes();
            expect(list).toHaveLength(0);
        });

        it('should return deep clones from listGenomes', async () => {
            await adapter.saveGenome(makeGenome({ id: 'g1', name: 'Original' }));

            const list = await adapter.listGenomes();
            list[0].name = 'Tampered';

            const reList = await adapter.listGenomes();
            expect(reList[0].name).toBe('Original');
        });
    });

    // ─── User DNA ───────────────────────────────────────

    describe('User DNA', () => {
        it('should save and load user DNA', async () => {
            const dna = makeUserDNA();
            await adapter.saveDNA('user-1', 'genome-1', dna);

            const loaded = await adapter.loadDNA('user-1', 'genome-1');
            expect(loaded).not.toBeNull();
            expect(loaded!.userId).toBe('user-1');
        });

        it('should return null for non-existent user DNA', async () => {
            const result = await adapter.loadDNA('no-user', 'no-genome');
            expect(result).toBeNull();
        });

        it('should isolate DNA by userId:genomeId key', async () => {
            await adapter.saveDNA('user-1', 'genome-1', makeUserDNA({ userId: 'user-1' }));
            await adapter.saveDNA('user-2', 'genome-1', makeUserDNA({ userId: 'user-2' }));

            const dna1 = await adapter.loadDNA('user-1', 'genome-1');
            const dna2 = await adapter.loadDNA('user-2', 'genome-1');

            expect(dna1!.userId).toBe('user-1');
            expect(dna2!.userId).toBe('user-2');
        });

        it('should return a deep clone (no reference sharing)', async () => {
            await adapter.saveDNA('user-1', 'genome-1', makeUserDNA());
            const loaded = await adapter.loadDNA('user-1', 'genome-1');
            loaded!.generation = 999;

            const reloaded = await adapter.loadDNA('user-1', 'genome-1');
            expect(reloaded!.generation).toBe(1);
        });
    });

    // ─── Mutations ──────────────────────────────────────

    describe('Mutations', () => {
        it('should log and retrieve mutation history for a genome', async () => {
            await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'gene-a' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'gene-b' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g2', gene: 'gene-c' }));

            const history = await adapter.getMutationHistory('g1');
            expect(history).toHaveLength(2);
        });

        it('should respect the limit parameter on getMutationHistory', async () => {
            for (let i = 0; i < 10; i++) {
                await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: `gene-${i}` }));
            }

            const history = await adapter.getMutationHistory('g1', 3);
            expect(history).toHaveLength(3);
        });

        it('should return the LAST N mutations (tail of list)', async () => {
            for (let i = 0; i < 5; i++) {
                await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: `gene-${i}` }));
            }

            const history = await adapter.getMutationHistory('g1', 2);
            expect(history[0].gene).toBe('gene-3');
            expect(history[1].gene).toBe('gene-4');
        });

        it('should filter gene mutation history by gene name', async () => {
            await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'alpha' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'beta' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'alpha' }));

            const history = await adapter.getGeneMutationHistory('g1', 'alpha');
            expect(history).toHaveLength(2);
            expect(history.every(m => m.gene === 'alpha')).toBe(true);
        });

        it('should respect limit on getGeneMutationHistory', async () => {
            for (let i = 0; i < 10; i++) {
                await adapter.logMutation(makeMutation({ genomeId: 'g1', gene: 'alpha' }));
            }

            const history = await adapter.getGeneMutationHistory('g1', 'alpha', 3);
            expect(history).toHaveLength(3);
        });
    });

    // ─── Interactions ───────────────────────────────────

    describe('Interactions', () => {
        it('should record and retrieve interactions', async () => {
            await adapter.recordInteraction({
                genomeId: 'g1',
                userId: 'u1',
                userMessage: 'Hello',
                assistantResponse: 'Hi!',
                toolCalls: [],
                timestamp: new Date(),
            });

            const recent = await adapter.getRecentInteractions('g1', 'u1');
            expect(recent).toHaveLength(1);
        });

        it('should filter interactions by genomeId and userId', async () => {
            await adapter.recordInteraction({
                genomeId: 'g1', userId: 'u1', userMessage: 'a', assistantResponse: 'b',
                toolCalls: [], timestamp: new Date(),
            });
            await adapter.recordInteraction({
                genomeId: 'g2', userId: 'u1', userMessage: 'c', assistantResponse: 'd',
                toolCalls: [], timestamp: new Date(),
            });
            await adapter.recordInteraction({
                genomeId: 'g1', userId: 'u2', userMessage: 'e', assistantResponse: 'f',
                toolCalls: [], timestamp: new Date(),
            });

            const g1u1 = await adapter.getRecentInteractions('g1', 'u1');
            expect(g1u1).toHaveLength(1);

            const g1u2 = await adapter.getRecentInteractions('g1', 'u2');
            expect(g1u2).toHaveLength(1);
        });

        it('should respect the limit parameter', async () => {
            for (let i = 0; i < 30; i++) {
                await adapter.recordInteraction({
                    genomeId: 'g1', userId: 'u1', userMessage: `msg-${i}`, assistantResponse: `resp-${i}`,
                    toolCalls: [], timestamp: new Date(),
                });
            }

            const recent = await adapter.getRecentInteractions('g1', 'u1', 5);
            expect(recent).toHaveLength(5);
        });

        it('should return the LAST N interactions', async () => {
            for (let i = 0; i < 10; i++) {
                await adapter.recordInteraction({
                    genomeId: 'g1', userId: 'u1', userMessage: `msg-${i}`, assistantResponse: `resp-${i}`,
                    toolCalls: [], timestamp: new Date(),
                });
            }

            const recent = await adapter.getRecentInteractions('g1', 'u1', 3) as Array<Record<string, unknown>>;
            expect(recent[0].userMessage).toBe('msg-7');
        });
    });

    // ─── Feedback ───────────────────────────────────────

    describe('Feedback', () => {
        it('should record feedback without error', async () => {
            await expect(
                adapter.recordFeedback({
                    genomeId: 'g1',
                    userId: 'u1',
                    gene: 'gene-a',
                    sentiment: 'positive',
                    timestamp: new Date(),
                })
            ).resolves.toBeUndefined();
        });
    });

    // ─── Analytics ──────────────────────────────────────

    describe('Analytics', () => {
        it('should return zeros for genome with no data', async () => {
            const analytics = await adapter.getAnalytics('g1');
            expect(analytics.totalMutations).toBe(0);
            expect(analytics.totalInteractions).toBe(0);
            expect(analytics.avgFitnessImprovement).toBe(0);
            expect(analytics.userSatisfaction).toBe(0.7);
            expect(analytics.topGenes).toEqual([]);
        });

        it('should count mutations and interactions for specified genome', async () => {
            await adapter.logMutation(makeMutation({ genomeId: 'g1' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g1' }));
            await adapter.logMutation(makeMutation({ genomeId: 'g2' }));
            await adapter.recordInteraction({
                genomeId: 'g1', userId: 'u1', userMessage: 'a', assistantResponse: 'b',
                toolCalls: [], timestamp: new Date(),
            });

            const analytics = await adapter.getAnalytics('g1');
            expect(analytics.totalMutations).toBe(2);
            expect(analytics.totalInteractions).toBe(1);
        });

        it('should compute avgFitnessImprovement from fitnessDelta values', async () => {
            await adapter.logMutation(makeMutation({ genomeId: 'g1', fitnessDelta: 0.1 }));
            await adapter.logMutation(makeMutation({ genomeId: 'g1', fitnessDelta: 0.3 }));

            const analytics = await adapter.getAnalytics('g1');
            expect(analytics.avgFitnessImprovement).toBeCloseTo(0.2);
        });

        it('should handle mutations without fitnessDelta (treating as 0)', async () => {
            await adapter.logMutation(makeMutation({ genomeId: 'g1' }));

            const analytics = await adapter.getAnalytics('g1');
            expect(analytics.avgFitnessImprovement).toBe(0);
        });
    });

    // ─── Semantic Facts ─────────────────────────────────

    describe('Semantic Facts', () => {
        it('should save and retrieve a fact', async () => {
            const fact = makeFact({ id: 'f1' });
            await adapter.saveFact(fact, 'u1', 'g1');

            const facts = await adapter.getFacts('u1', 'g1');
            expect(facts).toHaveLength(1);
            expect(facts[0].fact).toBe('User is an engineer');
        });

        it('should return a deep clone of facts', async () => {
            await adapter.saveFact(makeFact({ id: 'f1' }), 'u1', 'g1');

            const facts = await adapter.getFacts('u1', 'g1');
            facts[0].fact = 'Tampered';

            const reFacts = await adapter.getFacts('u1', 'g1');
            expect(reFacts[0].fact).toBe('User is an engineer');
        });

        it('should not duplicate factId in index when saving same fact twice', async () => {
            const fact = makeFact({ id: 'f1' });
            await adapter.saveFact(fact, 'u1', 'g1');
            await adapter.saveFact(fact, 'u1', 'g1');

            const facts = await adapter.getFacts('u1', 'g1');
            expect(facts).toHaveLength(1);
        });

        it('should filter expired facts by default (includeExpired=false)', async () => {
            const pastDate = new Date(Date.now() - 100000);
            const futureDate = new Date(Date.now() + 100000);

            await adapter.saveFact(makeFact({ id: 'expired', expiry: pastDate }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'active', expiry: futureDate }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'no-expiry', expiry: null }), 'u1', 'g1');

            const facts = await adapter.getFacts('u1', 'g1', false);
            expect(facts).toHaveLength(2); // active + no-expiry
            expect(facts.map(f => f.id).sort()).toEqual(['active', 'no-expiry']);
        });

        it('should include expired facts when includeExpired=true', async () => {
            const pastDate = new Date(Date.now() - 100000);
            await adapter.saveFact(makeFact({ id: 'expired', expiry: pastDate }), 'u1', 'g1');

            const facts = await adapter.getFacts('u1', 'g1', true);
            expect(facts).toHaveLength(1);
            expect(facts[0].id).toBe('expired');
        });

        it('should get a specific fact by id', async () => {
            await adapter.saveFact(makeFact({ id: 'f42' }), 'u1', 'g1');

            const fact = await adapter.getFact('f42');
            expect(fact).not.toBeNull();
            expect(fact!.id).toBe('f42');
        });

        it('should return null for non-existent fact id', async () => {
            const fact = await adapter.getFact('nonexistent');
            expect(fact).toBeNull();
        });

        it('should update an existing fact', async () => {
            await adapter.saveFact(makeFact({ id: 'f1', confidence: 0.5 }), 'u1', 'g1');

            await adapter.updateFact('f1', { confidence: 0.99, verified: true });

            const fact = await adapter.getFact('f1');
            expect(fact!.confidence).toBe(0.99);
            expect(fact!.verified).toBe(true);
        });

        it('should be a no-op when updating a non-existent fact', async () => {
            // Should not throw
            await expect(adapter.updateFact('nonexistent', { confidence: 0.5 })).resolves.toBeUndefined();
        });

        it('should delete a specific fact and clean up the index', async () => {
            await adapter.saveFact(makeFact({ id: 'f1' }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'f2' }), 'u1', 'g1');

            await adapter.deleteFact('f1');

            const fact = await adapter.getFact('f1');
            expect(fact).toBeNull();

            const facts = await adapter.getFacts('u1', 'g1');
            expect(facts).toHaveLength(1);
            expect(facts[0].id).toBe('f2');
        });

        it('should delete all facts for a user:genome pair', async () => {
            await adapter.saveFact(makeFact({ id: 'f1' }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'f2' }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'f3' }), 'u2', 'g1'); // different user

            await adapter.deleteUserFacts('u1', 'g1');

            const u1Facts = await adapter.getFacts('u1', 'g1');
            expect(u1Facts).toHaveLength(0);

            // Other user's facts should remain
            const u2Facts = await adapter.getFacts('u2', 'g1');
            expect(u2Facts).toHaveLength(1);
        });

        it('should clean expired facts and return count', async () => {
            const pastDate = new Date(Date.now() - 100000);
            const futureDate = new Date(Date.now() + 100000);

            await adapter.saveFact(makeFact({ id: 'expired1', expiry: pastDate }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'expired2', expiry: pastDate }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'active', expiry: futureDate }), 'u1', 'g1');
            await adapter.saveFact(makeFact({ id: 'no-expiry', expiry: null }), 'u1', 'g1');

            const cleaned = await adapter.cleanExpiredFacts('u1', 'g1');
            expect(cleaned).toBe(2);

            const remaining = await adapter.getFacts('u1', 'g1');
            expect(remaining).toHaveLength(2);
        });

        it('should return 0 when no expired facts exist', async () => {
            await adapter.saveFact(makeFact({ id: 'f1', expiry: null }), 'u1', 'g1');

            const cleaned = await adapter.cleanExpiredFacts('u1', 'g1');
            expect(cleaned).toBe(0);
        });

        it('should return 0 when no facts exist for user:genome', async () => {
            const cleaned = await adapter.cleanExpiredFacts('nobody', 'g1');
            expect(cleaned).toBe(0);
        });
    });

    // ─── Gene Registry ──────────────────────────────────

    describe('Gene Registry', () => {
        it('should save and query gene registry entries by familyId', async () => {
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e1', familyId: 'f1' }));
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e2', familyId: 'f2' }));

            const results = await adapter.queryGeneRegistry('f1');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('e1');
        });

        it('should filter by gene name when provided', async () => {
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e1', familyId: 'f1', gene: 'alpha' }));
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e2', familyId: 'f1', gene: 'beta' }));

            const results = await adapter.queryGeneRegistry('f1', 'alpha');
            expect(results).toHaveLength(1);
            expect(results[0].gene).toBe('alpha');
        });

        it('should filter by minFitness', async () => {
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e1', familyId: 'f1', fitness: 0.3 }));
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e2', familyId: 'f1', fitness: 0.9 }));

            const results = await adapter.queryGeneRegistry('f1', undefined, 0.5);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('e2');
        });

        it('should return best registry gene (highest fitness)', async () => {
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e1', familyId: 'f1', gene: 'alpha', fitness: 0.7 }));
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e2', familyId: 'f1', gene: 'alpha', fitness: 0.95 }));
            await adapter.saveToGeneRegistry(makeRegistryEntry({ id: 'e3', familyId: 'f1', gene: 'alpha', fitness: 0.6 }));

            const best = await adapter.getBestRegistryGene('f1', 'alpha');
            expect(best).not.toBeNull();
            expect(best!.id).toBe('e2');
            expect(best!.fitness).toBe(0.95);
        });

        it('should return null when no matching registry entries exist', async () => {
            const best = await adapter.getBestRegistryGene('nonexistent', 'alpha');
            expect(best).toBeNull();
        });
    });
});
