/**
 * GeneticRecombinator - Comprehensive Unit Tests
 *
 * Covers: recombine(), analyzeCompatibility(), simpleRecombination, intelligentRecombination,
 * parseRecombinationResult, buildRecombinationPrompt, createOffspring, findOriginalGene
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneticRecombinator } from '../GeneticRecombinator.js';
import type { RecombinationParent } from '../GeneticRecombinator.js';
import type { GenomeV2, OperativeGene, FitnessVector } from '../../../types/GenomeV2.js';
import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';

// ─── Helpers ─────────────────────────────────────────────────

function makeFitnessVector(overrides: Partial<FitnessVector> = {}): FitnessVector {
    return {
        quality: 0.8,
        successRate: 0.75,
        tokenEfficiency: 0.7,
        latency: 500,
        costPerSuccess: 0.01,
        interventionRate: 0.05,
        composite: 0.75,
        sampleSize: 100,
        lastUpdated: new Date('2026-01-01'),
        confidence: 0.9,
        ...overrides,
    };
}

function makeOperativeGene(overrides: Partial<OperativeGene> = {}): OperativeGene {
    return {
        id: overrides.id ?? `gene_${Math.random().toString(36).substring(7)}`,
        category: overrides.category ?? 'tool-usage',
        content: overrides.content ?? 'Use tools efficiently and validate results.',
        fitness: overrides.fitness ?? makeFitnessVector(),
        origin: overrides.origin ?? 'mutation',
        usageCount: overrides.usageCount ?? 50,
        lastUsed: overrides.lastUsed ?? new Date('2026-01-15'),
        successRate: overrides.successRate ?? 0.85,
        version: 'version' in overrides ? overrides.version : 1,
        lastModified: overrides.lastModified ?? new Date('2026-01-10'),
        mutationHistory: overrides.mutationHistory ?? [],
        ...(overrides.tokenCount !== undefined ? { tokenCount: overrides.tokenCount } : {}),
        ...(overrides.sourceGeneId !== undefined ? { sourceGeneId: overrides.sourceGeneId } : {}),
    };
}

function makeGenomeV2(overrides: Partial<GenomeV2> & { operations?: OperativeGene[] } = {}): GenomeV2 {
    const operations = overrides.operations ?? [
        makeOperativeGene({ category: 'tool-usage', content: 'Default tool usage gene.' }),
        makeOperativeGene({ category: 'reasoning', content: 'Default reasoning gene.' }),
    ];

    return {
        id: overrides.id ?? `genome_${Math.random().toString(36).substring(7)}`,
        name: overrides.name ?? 'Test Genome',
        familyId: overrides.familyId ?? 'family-1',
        version: overrides.version ?? 1,
        createdAt: overrides.createdAt ?? new Date('2026-01-01'),
        updatedAt: overrides.updatedAt ?? new Date('2026-01-15'),
        chromosomes: overrides.chromosomes ?? {
            c0: {
                identity: { role: 'assistant', purpose: 'help users', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
                attribution: { creator: 'test', copyright: '2026', license: 'MIT' },
                metadata: { version: '2.0.0', createdAt: new Date('2026-01-01') },
            },
            c1: {
                operations,
                metadata: { lastMutated: new Date(), mutationCount: 5, avgFitnessGain: 0.1 },
            },
            c2: {
                userAdaptations: new Map(),
                contextPatterns: [],
                metadata: { lastMutated: new Date(), adaptationRate: 1, totalUsers: 0 },
            },
        },
        integrity: {
            c0Hash: 'abc123',
            lastVerified: new Date(),
            violations: 0,
            quarantined: false,
        },
        lineage: { inheritedGenes: [], mutations: [] },
        fitness: makeFitnessVector(),
        config: {
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
            enableSandbox: true,
            minFitnessImprovement: 0.05,
            enableIntegrityCheck: true,
            autoRollbackThreshold: 0.15,
            allowInheritance: true,
            minCompatibilityScore: 0.6,
        },
        state: overrides.state ?? 'active',
        tags: overrides.tags ?? ['test'],
    };
}

function makeParent(overrides: Partial<RecombinationParent> & { operations?: OperativeGene[]; genomeId?: string } = {}): RecombinationParent {
    return {
        genome: overrides.genome ?? makeGenomeV2({
            id: overrides.genomeId,
            operations: overrides.operations,
        }),
        fitness: overrides.fitness ?? 0.8,
        strengths: overrides.strengths ?? ['tool-usage', 'reasoning'],
    };
}

function makeMockLLM(responseContent: string): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({ content: responseContent }),
    };
}

// ─── Tests ─────────────────────────────────────────────────

describe('GeneticRecombinator', () => {
    let recombinator: GeneticRecombinator;

    beforeEach(() => {
        recombinator = new GeneticRecombinator();
    });

    // ─── Constructor ─────────────────────────────────────────

    describe('constructor', () => {
        it('should create an instance without LLM adapter', () => {
            const r = new GeneticRecombinator();
            expect(r).toBeInstanceOf(GeneticRecombinator);
        });

        it('should create an instance with LLM adapter', () => {
            const llm = makeMockLLM('test');
            const r = new GeneticRecombinator(llm);
            expect(r).toBeInstanceOf(GeneticRecombinator);
        });
    });

    // ─── recombine() ─────────────────────────────────────────

    describe('recombine()', () => {
        it('should throw if fewer than 2 parents are provided', async () => {
            const parent = makeParent();
            await expect(recombinator.recombine([parent])).rejects.toThrow(
                'Need at least 2 parents for recombination',
            );
        });

        it('should throw if 0 parents are provided', async () => {
            await expect(recombinator.recombine([])).rejects.toThrow(
                'Need at least 2 parents for recombination',
            );
        });

        it('should use simpleRecombination when no LLM is provided', async () => {
            const parent1 = makeParent({
                genomeId: 'genome-A',
                fitness: 0.9,
                strengths: ['tool-usage'],
                operations: [
                    makeOperativeGene({ id: 'g1', category: 'tool-usage', content: 'Parent A tool gene' }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'genome-B',
                fitness: 0.7,
                strengths: ['reasoning'],
                operations: [
                    makeOperativeGene({ id: 'g2', category: 'reasoning', content: 'Parent B reasoning gene' }),
                ],
            });

            const result = await recombinator.recombine([parent1, parent2]);

            expect(result).toBeDefined();
            expect(result.offspring).toBeDefined();
            expect(result.inheritanceMap).toBeInstanceOf(Map);
            expect(result.summary).toContain('simple recombination');
            expect(result.expectedImprovement).toBeGreaterThan(0);
        });

        it('should use intelligentRecombination when LLM is provided', async () => {
            const llmResponse = `---GENE:tool-usage---
Use tools with validation and error handling.
[SOURCE: Parent 1]
---END---

---SUMMARY---
Selected best tool-usage from Parent 1.
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorWithLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                genomeId: 'genome-A',
                fitness: 0.9,
                operations: [
                    makeOperativeGene({ id: 'g1', category: 'tool-usage', content: 'Parent A tool gene' }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'genome-B',
                fitness: 0.7,
                operations: [
                    makeOperativeGene({ id: 'g2', category: 'tool-usage', content: 'Parent B tool gene' }),
                ],
            });

            const result = await recombinatorWithLLM.recombine([parent1, parent2]);

            expect(result.summary).toContain('intelligent gene merging');
            expect(llm.chat).toHaveBeenCalledTimes(1);
        });

        it('should sort parents by fitness (best first) before recombination', async () => {
            const lowFitness = makeParent({
                genomeId: 'genome-low',
                fitness: 0.3,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', content: 'Low fitness tool' }),
                ],
            });
            const highFitness = makeParent({
                genomeId: 'genome-high',
                fitness: 0.95,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', content: 'High fitness tool' }),
                ],
            });

            // Pass low first, but the best gene should come from high fitness parent
            const result = await recombinator.recombine([lowFitness, highFitness]);

            // Offspring should use genes from the higher-fitness parent
            expect(result.inheritanceMap.get('tool-usage')).toBe('genome-high');
        });

        it('should handle recombination with exactly 2 parents', async () => {
            const parent1 = makeParent({ genomeId: 'p1', fitness: 0.8 });
            const parent2 = makeParent({ genomeId: 'p2', fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.offspring).toBeDefined();
            expect(result.offspring.id).toContain('offspring_');
        });

        it('should handle recombination with more than 2 parents', async () => {
            const parents = [
                makeParent({ genomeId: 'p1', fitness: 0.9 }),
                makeParent({ genomeId: 'p2', fitness: 0.7 }),
                makeParent({ genomeId: 'p3', fitness: 0.5 }),
            ];

            const result = await recombinator.recombine(parents);
            expect(result.offspring).toBeDefined();
            expect(result.summary).toContain('3 parents');
        });
    });

    // ─── simpleRecombination ─────────────────────────────────

    describe('simpleRecombination (via recombine without LLM)', () => {
        it('should select best gene for each category from highest-fitness parent', async () => {
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.9,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', content: 'Best tool usage from p1' }),
                    makeOperativeGene({ category: 'reasoning', content: 'Best reasoning from p1' }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.5,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', content: 'Worse tool usage from p2' }),
                    makeOperativeGene({ category: 'communication', content: 'Only comm from p2' }),
                ],
            });

            const result = await recombinator.recombine([parent1, parent2]);

            // tool-usage should come from p1 (higher fitness)
            expect(result.inheritanceMap.get('tool-usage')).toBe('p1');
            // reasoning should come from p1 (only p1 has it, but p1 fitness is higher)
            expect(result.inheritanceMap.get('reasoning')).toBe('p1');
            // communication only exists in p2
            expect(result.inheritanceMap.get('communication')).toBe('p2');
        });

        it('should collect all unique gene categories from all parents', async () => {
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.8,
                operations: [
                    makeOperativeGene({ category: 'tool-usage' }),
                    makeOperativeGene({ category: 'reasoning' }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.6,
                operations: [
                    makeOperativeGene({ category: 'communication' }),
                    makeOperativeGene({ category: 'error-handling' }),
                ],
            });

            const result = await recombinator.recombine([parent1, parent2]);

            const categories = [...result.inheritanceMap.keys()];
            expect(categories).toContain('tool-usage');
            expect(categories).toContain('reasoning');
            expect(categories).toContain('communication');
            expect(categories).toContain('error-handling');
            expect(categories.length).toBe(4);
        });

        it('should increment gene version in offspring', async () => {
            const originalVersion = 3;
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.9,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', version: originalVersion }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.5,
                operations: [
                    makeOperativeGene({ category: 'reasoning', version: 1 }),
                ],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            const toolGene = result.offspring.chromosomes.c1.operations.find(
                g => g.category === 'tool-usage',
            );

            expect(toolGene?.version).toBe(originalVersion + 1);
        });

        it('should handle gene with undefined version', async () => {
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.9,
                operations: [
                    makeOperativeGene({ category: 'tool-usage', version: undefined }),
                ],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.5,
                operations: [
                    makeOperativeGene({ category: 'reasoning' }),
                ],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            const toolGene = result.offspring.chromosomes.c1.operations.find(
                g => g.category === 'tool-usage',
            );

            // (undefined ?? 0) + 1 = 1
            expect(toolGene?.version).toBe(1);
        });

        it('should calculate expectedImprovement as 20% of average parent fitness', async () => {
            const parent1 = makeParent({ fitness: 0.8 });
            const parent2 = makeParent({ fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);

            // avgFitness = (0.8 + 0.6) / 2 = 0.7
            // expectedImprovement = 0.7 * 0.2 = 0.14
            expect(result.expectedImprovement).toBeCloseTo(0.14, 5);
        });

        it('should set lastModified on offspring genes to a recent date', async () => {
            const parent1 = makeParent({ fitness: 0.8 });
            const parent2 = makeParent({ fitness: 0.6 });

            const before = new Date();
            const result = await recombinator.recombine([parent1, parent2]);
            const after = new Date();

            for (const gene of result.offspring.chromosomes.c1.operations) {
                expect(gene.lastModified!.getTime()).toBeGreaterThanOrEqual(before.getTime());
                expect(gene.lastModified!.getTime()).toBeLessThanOrEqual(after.getTime());
            }
        });

        it('should produce summary mentioning parent count', async () => {
            const parents = [
                makeParent({ fitness: 0.9 }),
                makeParent({ fitness: 0.7 }),
                makeParent({ fitness: 0.5 }),
                makeParent({ fitness: 0.3 }),
            ];

            const result = await recombinator.recombine(parents);
            expect(result.summary).toContain('4 parents');
        });
    });

    // ─── createOffspring ─────────────────────────────────────

    describe('offspring creation', () => {
        it('should generate a unique offspring ID with "offspring_" prefix', async () => {
            const parent1 = makeParent({ fitness: 0.8 });
            const parent2 = makeParent({ fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.offspring.id).toMatch(/^offspring_\d+_/);
        });

        it('should increment version from template genome', async () => {
            const templateGenome = makeGenomeV2({ version: 5 });
            const parent1 = makeParent({ genome: templateGenome, fitness: 0.9 });
            const parent2 = makeParent({ fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);

            // Template is parent with highest fitness (0.9), so version should be 5 + 1 = 6
            expect(result.offspring.version).toBe(6);
        });

        it('should set createdAt to a recent timestamp', async () => {
            const parent1 = makeParent({ fitness: 0.8 });
            const parent2 = makeParent({ fitness: 0.6 });

            const before = new Date();
            const result = await recombinator.recombine([parent1, parent2]);
            const after = new Date();

            expect(result.offspring.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.offspring.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should preserve template genome C0 and C2 chromosomes', async () => {
            const template = makeGenomeV2();
            const parent1 = makeParent({ genome: template, fitness: 0.9 });
            const parent2 = makeParent({ fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);

            expect(result.offspring.chromosomes.c0).toEqual(template.chromosomes.c0);
        });

        it('should replace C1 operations with recombined genes', async () => {
            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage', content: 'From P1' })],
            });
            const parent2 = makeParent({
                fitness: 0.7,
                operations: [makeOperativeGene({ category: 'reasoning', content: 'From P2' })],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            const categories = result.offspring.chromosomes.c1.operations.map(g => g.category);
            expect(categories).toContain('tool-usage');
            expect(categories).toContain('reasoning');
        });
    });

    // ─── intelligentRecombination (with LLM) ────────────────

    describe('intelligentRecombination (with LLM)', () => {
        it('should call LLM chat with correct prompt structure', async () => {
            const llmResponse = `---GENE:tool-usage---
Merged tool usage approach.
[SOURCE: Merge of Parent 1 & 2]
---END---

---SUMMARY---
Merged best traits.
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                strengths: ['tool mastery'],
                operations: [makeOperativeGene({ category: 'tool-usage', content: 'P1 tool content' })],
            });
            const parent2 = makeParent({
                fitness: 0.7,
                strengths: ['reasoning power'],
                operations: [makeOperativeGene({ category: 'tool-usage', content: 'P2 tool content' })],
            });

            await recombinatorLLM.recombine([parent1, parent2]);

            expect(llm.chat).toHaveBeenCalledTimes(1);
            const callArgs = (llm.chat as ReturnType<typeof vi.fn>).mock.calls[0];
            const messages = callArgs[0];
            // Should have a user message with the prompt
            expect(messages.some((m: { role: string; content: string }) => m.role === 'user')).toBe(true);
        });

        it('should parse multiple genes from LLM response', async () => {
            const llmResponse = `---GENE:tool-usage---
Enhanced tool usage combining both approaches.
[SOURCE: Merge of Parent 1 & 2]
---END---

---GENE:reasoning---
Advanced reasoning from parent 1.
[SOURCE: Parent 1]
---END---

---SUMMARY---
Combined strengths.
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [
                    makeOperativeGene({ id: 'gene-tool-1', category: 'tool-usage', content: 'P1 tool' }),
                    makeOperativeGene({ id: 'gene-reason-1', category: 'reasoning', content: 'P1 reason' }),
                ],
            });
            const parent2 = makeParent({
                fitness: 0.7,
                operations: [
                    makeOperativeGene({ id: 'gene-tool-2', category: 'tool-usage', content: 'P2 tool' }),
                ],
            });

            const result = await recombinatorLLM.recombine([parent1, parent2]);

            expect(result.offspring.chromosomes.c1.operations.length).toBe(2);
            const categories = result.offspring.chromosomes.c1.operations.map(g => g.category);
            expect(categories).toContain('tool-usage');
            expect(categories).toContain('reasoning');
        });

        it('should extract SOURCE annotation and store in inheritanceMap', async () => {
            const llmResponse = `---GENE:tool-usage---
Tool gene content.
[SOURCE: Parent 2]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });
            const parent2 = makeParent({
                fitness: 0.7,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            expect(result.inheritanceMap.get('tool-usage')).toBe('Parent 2');
        });

        it('should default source to "Parent 1" when no SOURCE annotation', async () => {
            const llmResponse = `---GENE:tool-usage---
Tool gene content without source annotation.
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });
            const parent2 = makeParent({ fitness: 0.7 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            expect(result.inheritanceMap.get('tool-usage')).toBe('Parent 1');
        });

        it('should remove SOURCE annotation from gene content', async () => {
            const llmResponse = `---GENE:tool-usage---
Clean tool gene content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });
            const parent2 = makeParent({ fitness: 0.7 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            const toolGene = result.offspring.chromosomes.c1.operations.find(
                g => g.category === 'tool-usage',
            );
            expect(toolGene?.content).toBe('Clean tool gene content.');
            expect(toolGene?.content).not.toContain('[SOURCE:');
        });

        it('should handle LLM response with no valid gene blocks', async () => {
            const llmResponse = `This is just some random text without any gene blocks.`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({ fitness: 0.9 });
            const parent2 = makeParent({ fitness: 0.7 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);

            // Should still return a valid result, just with empty offspring operations
            expect(result.offspring.chromosomes.c1.operations.length).toBe(0);
        });

        it('should use original gene properties when available', async () => {
            const originalGene = makeOperativeGene({
                id: 'original-gene-id',
                category: 'tool-usage',
                usageCount: 42,
                successRate: 0.95,
                version: 7,
            });

            const llmResponse = `---GENE:tool-usage---
Updated tool gene content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [originalGene],
            });
            const parent2 = makeParent({ fitness: 0.7 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            const gene = result.offspring.chromosomes.c1.operations[0];

            expect(gene.id).toBe('original-gene-id');
            expect(gene.usageCount).toBe(42);
            expect(gene.successRate).toBe(0.95);
            expect(gene.version).toBe(8); // 7 + 1
        });

        it('should use default values when original gene is not found', async () => {
            const llmResponse = `---GENE:data-processing---
New data processing gene not in any parent.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });
            const parent2 = makeParent({
                fitness: 0.7,
                operations: [makeOperativeGene({ category: 'reasoning' })],
            });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            const gene = result.offspring.chromosomes.c1.operations.find(
                g => g.category === 'data-processing',
            );

            expect(gene).toBeDefined();
            expect(gene!.id).toMatch(/^gene_data-processing_\d+$/);
            expect(gene!.usageCount).toBe(0);
            expect(gene!.successRate).toBe(0.5);
            expect(gene!.version).toBe(1); // (0 ?? 0) + 1
            expect(gene!.fitness.composite).toBe(0.5);
        });

        it('should add mutation history entry for genetic_recombination', async () => {
            const llmResponse = `---GENE:tool-usage---
Recombined gene content.
[SOURCE: Merge of Parent 1 & 2]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const existingHistory = [
                { operation: 'initial', timestamp: new Date('2026-01-01'), reason: 'Created' },
            ];
            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage', mutationHistory: existingHistory })],
            });
            const parent2 = makeParent({ fitness: 0.7 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);
            const gene = result.offspring.chromosomes.c1.operations[0];

            expect(gene.mutationHistory!.length).toBe(2);
            expect(gene.mutationHistory![1].operation).toBe('genetic_recombination');
            expect(gene.mutationHistory![1].reason).toContain('Merge of Parent 1 & 2');
        });

        it('should cap expectedImprovement at 0.35', async () => {
            const llmResponse = `---GENE:tool-usage---
Content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            // Very high fitness parents to trigger the cap
            const parent1 = makeParent({ fitness: 0.99 });
            const parent2 = makeParent({ fitness: 0.98 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);

            // avgFitness ~= 0.985, * 0.4 = 0.394, capped at 0.35
            expect(result.expectedImprovement).toBeLessThanOrEqual(0.35);
        });

        it('should calculate expectedImprovement as min(0.35, avgFitness * 0.4)', async () => {
            const llmResponse = `---GENE:tool-usage---
Content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({ fitness: 0.5 });
            const parent2 = makeParent({ fitness: 0.5 });

            const result = await recombinatorLLM.recombine([parent1, parent2]);

            // avgFitness = 0.5, * 0.4 = 0.2, min(0.35, 0.2) = 0.2
            expect(result.expectedImprovement).toBeCloseTo(0.2, 5);
        });
    });

    // ─── analyzeCompatibility() ──────────────────────────────

    describe('analyzeCompatibility()', () => {
        it('should return 0.3 for genes in the same category', () => {
            const gene1 = makeOperativeGene({ category: 'tool-usage' });
            const gene2 = makeOperativeGene({ category: 'tool-usage' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.3);
        });

        it('should return 0.9 for complementary categories: tool-usage + reasoning', () => {
            const gene1 = makeOperativeGene({ category: 'tool-usage' });
            const gene2 = makeOperativeGene({ category: 'reasoning' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.9 for complementary categories: tool-usage + error-handling', () => {
            const gene1 = makeOperativeGene({ category: 'tool-usage' });
            const gene2 = makeOperativeGene({ category: 'error-handling' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.9 for complementary categories: reasoning + tool-usage', () => {
            const gene1 = makeOperativeGene({ category: 'reasoning' });
            const gene2 = makeOperativeGene({ category: 'tool-usage' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.9 for complementary categories: reasoning + data-processing', () => {
            const gene1 = makeOperativeGene({ category: 'reasoning' });
            const gene2 = makeOperativeGene({ category: 'data-processing' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.9 for complementary categories: communication + reasoning', () => {
            const gene1 = makeOperativeGene({ category: 'communication' });
            const gene2 = makeOperativeGene({ category: 'reasoning' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.9 for complementary categories: communication + coding-patterns', () => {
            const gene1 = makeOperativeGene({ category: 'communication' });
            const gene2 = makeOperativeGene({ category: 'coding-patterns' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);
        });

        it('should return 0.6 for non-complementary, different categories', () => {
            const gene1 = makeOperativeGene({ category: 'tool-usage' });
            const gene2 = makeOperativeGene({ category: 'communication' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.6);
        });

        it('should return 0.6 for data-processing + error-handling (no complementary mapping)', () => {
            const gene1 = makeOperativeGene({ category: 'data-processing' });
            const gene2 = makeOperativeGene({ category: 'error-handling' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.6);
        });

        it('should return 0.6 for error-handling + communication (not defined as complementary)', () => {
            const gene1 = makeOperativeGene({ category: 'error-handling' });
            const gene2 = makeOperativeGene({ category: 'communication' });

            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.6);
        });

        it('should be directional: complementary only if gene1.category maps to gene2.category', () => {
            // communication -> reasoning is complementary
            const gene1 = makeOperativeGene({ category: 'communication' });
            const gene2 = makeOperativeGene({ category: 'reasoning' });
            expect(recombinator.analyzeCompatibility(gene1, gene2)).toBe(0.9);

            // reasoning -> communication is NOT listed as complementary
            expect(recombinator.analyzeCompatibility(gene2, gene1)).toBe(0.6);
        });
    });

    // ─── buildRecombinationPrompt (tested indirectly through LLM calls) ───

    describe('buildRecombinationPrompt (via LLM call inspection)', () => {
        it('should include parent fitness percentages in prompt', async () => {
            const llmResponse = `---GENE:tool-usage---
Content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.85,
                strengths: ['fast'],
                operations: [makeOperativeGene({ category: 'tool-usage', content: 'tool gene' })],
            });
            const parent2 = makeParent({
                fitness: 0.65,
                strengths: ['accurate'],
                operations: [makeOperativeGene({ category: 'tool-usage', content: 'tool gene 2' })],
            });

            await recombinatorLLM.recombine([parent1, parent2]);

            const callArgs = (llm.chat as ReturnType<typeof vi.fn>).mock.calls[0];
            const userMessage = callArgs[0].find((m: { role: string }) => m.role === 'user');
            const prompt = userMessage.content;

            expect(prompt).toContain('85%');
            expect(prompt).toContain('65%');
            expect(prompt).toContain('fast');
            expect(prompt).toContain('accurate');
            expect(prompt).toContain('PARENT 1');
            expect(prompt).toContain('PARENT 2');
        });

        it('should truncate gene content to 200 chars in prompt', async () => {
            const longContent = 'A'.repeat(300);
            const llmResponse = `---GENE:tool-usage---
Content.
[SOURCE: Parent 1]
---END---`;

            const llm = makeMockLLM(llmResponse);
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({
                fitness: 0.9,
                operations: [makeOperativeGene({ category: 'tool-usage', content: longContent })],
            });
            const parent2 = makeParent({ fitness: 0.7 });

            await recombinatorLLM.recombine([parent1, parent2]);

            const callArgs = (llm.chat as ReturnType<typeof vi.fn>).mock.calls[0];
            const userMessage = callArgs[0].find((m: { role: string }) => m.role === 'user');
            const prompt = userMessage.content;

            // The content should be truncated: substring(0, 200) + '...'
            // So we should NOT see the full 300 char string
            expect(prompt).not.toContain(longContent);
        });
    });

    // ─── Edge cases ──────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle parents with no genes at all', async () => {
            const parent1 = makeParent({
                fitness: 0.8,
                operations: [],
            });
            const parent2 = makeParent({
                fitness: 0.6,
                operations: [],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.offspring.chromosomes.c1.operations.length).toBe(0);
            expect(result.inheritanceMap.size).toBe(0);
        });

        it('should handle parents with identical genes', async () => {
            const sharedGene = makeOperativeGene({ id: 'shared', category: 'tool-usage', content: 'Same content' });
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.8,
                operations: [{ ...sharedGene }],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.6,
                operations: [{ ...sharedGene }],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.offspring.chromosomes.c1.operations.length).toBe(1);
            // Should pick from higher fitness parent
            expect(result.inheritanceMap.get('tool-usage')).toBe('p1');
        });

        it('should handle parents with equal fitness', async () => {
            const parent1 = makeParent({
                genomeId: 'p1',
                fitness: 0.75,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });
            const parent2 = makeParent({
                genomeId: 'p2',
                fitness: 0.75,
                operations: [makeOperativeGene({ category: 'tool-usage' })],
            });

            const result = await recombinator.recombine([parent1, parent2]);
            // Should not crash, one of them is selected
            expect(result.offspring.chromosomes.c1.operations.length).toBe(1);
        });

        it('should handle parents with very low fitness (near zero)', async () => {
            const parent1 = makeParent({ fitness: 0.01 });
            const parent2 = makeParent({ fitness: 0.02 });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.expectedImprovement).toBeCloseTo(0.015 * 0.2, 5);
        });

        it('should handle LLM adapter that rejects', async () => {
            const llm: LLMAdapter = {
                name: 'failing',
                model: 'fail-model',
                chat: vi.fn().mockRejectedValue(new Error('LLM API error')),
            };
            const recombinatorLLM = new GeneticRecombinator(llm);

            const parent1 = makeParent({ fitness: 0.8 });
            const parent2 = makeParent({ fitness: 0.6 });

            await expect(recombinatorLLM.recombine([parent1, parent2])).rejects.toThrow('LLM API error');
        });

        it('should preserve template genome tags and state', async () => {
            const template = makeGenomeV2({ tags: ['production', 'v2'], state: 'active' });
            const parent1 = makeParent({ genome: template, fitness: 0.9 });
            const parent2 = makeParent({ fitness: 0.6 });

            const result = await recombinator.recombine([parent1, parent2]);
            expect(result.offspring.tags).toEqual(['production', 'v2']);
            expect(result.offspring.state).toBe('active');
        });

        it('should use highest-fitness parent as template for offspring', async () => {
            const genomeA = makeGenomeV2({ id: 'genome-A', name: 'Alpha', version: 10 });
            const genomeB = makeGenomeV2({ id: 'genome-B', name: 'Beta', version: 3 });

            const parent1 = makeParent({ genome: genomeA, fitness: 0.5 });
            const parent2 = makeParent({ genome: genomeB, fitness: 0.95 });

            const result = await recombinator.recombine([parent1, parent2]);

            // Parent2 has higher fitness, so it should be sorted first and used as template
            expect(result.offspring.name).toBe('Beta');
            expect(result.offspring.version).toBe(4); // 3 + 1
        });
    });
});
