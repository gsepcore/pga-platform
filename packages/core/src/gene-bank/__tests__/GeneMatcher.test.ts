/**
 * GeneMatcher Unit Tests
 *
 * Tests for the GeneMatcher class which finds and ranks
 * relevant Cognitive Genes based on context, domain, fitness,
 * and compatibility.
 *
 * @version 0.4.0
 */

import { describe, it, expect } from 'vitest';
import { GeneMatcher } from '../GeneMatcher.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { MatchContext } from '../GeneMatcher.js';

// ============================================================================
// HELPER: Create a test CognitiveGene with sensible defaults
// ============================================================================

function createTestGene(overrides: Partial<CognitiveGene> & Record<string, unknown> = {}): CognitiveGene {
    const now = new Date().toISOString();

    return {
        id: (overrides.id as string) || 'gene-test-1',
        version: '1.0.0',
        name: (overrides.name as string) || 'Test Gene',
        description: (overrides.description as string) || 'A test gene for matching',
        type: (overrides.type as CognitiveGene['type']) || 'reasoning-pattern',
        domain: (overrides.domain as string) || 'coding',
        fitness: {
            overallFitness: 0.85,
            taskSuccessRate: 0.87,
            tokenEfficiency: 0.7,
            responseQuality: 0.9,
            adoptionCount: 5,
            adoptionPerformance: 0.8,
            ...(overrides.fitness as object || {}),
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
            ...(overrides.lineage as object || {}),
        },
        content: {
            instruction: 'Test instruction for matching',
            examples: [],
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
            ...(overrides.content as object || {}),
        },
        tenant: {
            tenantId: 'tenant-1',
            createdBy: 'agent-1',
            scope: 'tenant' as const,
            verified: false,
            ...(overrides.tenant as object || {}),
        },
        createdAt: now,
        updatedAt: now,
        tags: (overrides.tags as string[]) || ['test'],
    };
}

// ============================================================================
// TESTS: GeneMatcher
// ============================================================================

describe('GeneMatcher', () => {
    // ========================================================================
    // Constructor / Defaults
    // ========================================================================

    describe('constructor', () => {
        it('should create matcher with default configuration', () => {
            const matcher = new GeneMatcher();
            const config = matcher.getConfig();

            expect(config.minFitness).toBe(0.7);
            expect(config.minMatchScore).toBe(0.5);
            expect(config.maxResults).toBe(10);
            expect(config.fitnessWeight).toBe(0.4);
            expect(config.domainWeight).toBe(0.3);
            expect(config.typeWeight).toBe(0.2);
            expect(config.adoptionWeight).toBe(0.1);
        });

        it('should accept partial config overrides', () => {
            const matcher = new GeneMatcher({ minFitness: 0.5, maxResults: 5 });
            const config = matcher.getConfig();

            expect(config.minFitness).toBe(0.5);
            expect(config.maxResults).toBe(5);
            // Other defaults remain
            expect(config.fitnessWeight).toBe(0.4);
        });
    });

    // ========================================================================
    // findMatches
    // ========================================================================

    describe('findMatches', () => {
        it('should return empty array when candidates list is empty', async () => {
            const matcher = new GeneMatcher();
            const context: MatchContext = {
                task: 'Write unit tests',
                domain: 'coding',
            };

            const results = await matcher.findMatches(context, []);

            expect(results).toEqual([]);
        });

        it('should return a single matching gene', async () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({ domain: 'coding' });
            const context: MatchContext = {
                task: 'Write code',
                domain: 'coding',
            };

            const results = await matcher.findMatches(context, [gene]);

            expect(results.length).toBe(1);
            expect(results[0].gene.id).toBe(gene.id);
            expect(results[0].matchScore).toBeGreaterThan(0);
            expect(results[0].scoreBreakdown).toBeDefined();
        });

        it('should sort multiple genes by match score in descending order', async () => {
            const matcher = new GeneMatcher();

            const geneLow = createTestGene({
                id: 'gene-low',
                domain: 'math',
                fitness: { overallFitness: 0.72, taskSuccessRate: 0.7, tokenEfficiency: 0.5, responseQuality: 0.7, adoptionCount: 1, adoptionPerformance: 0.5 },
            });
            const geneHigh = createTestGene({
                id: 'gene-high',
                domain: 'coding',
                fitness: { overallFitness: 0.95, taskSuccessRate: 0.95, tokenEfficiency: 0.9, responseQuality: 0.95, adoptionCount: 15, adoptionPerformance: 0.9 },
            });
            const geneMid = createTestGene({
                id: 'gene-mid',
                domain: 'coding',
                fitness: { overallFitness: 0.80, taskSuccessRate: 0.8, tokenEfficiency: 0.7, responseQuality: 0.8, adoptionCount: 3, adoptionPerformance: 0.6 },
            });

            const context: MatchContext = {
                task: 'Write TypeScript',
                domain: 'coding',
            };

            const results = await matcher.findMatches(context, [geneLow, geneHigh, geneMid]);

            // Results should be in descending match score order
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore);
            }
        });

        it('should filter out genes below the minFitness threshold', async () => {
            const matcher = new GeneMatcher({ minFitness: 0.8 });

            const geneAbove = createTestGene({
                id: 'gene-above',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.8, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.8 },
            });
            const geneBelow = createTestGene({
                id: 'gene-below',
                fitness: { overallFitness: 0.6, taskSuccessRate: 0.6, tokenEfficiency: 0.5, responseQuality: 0.6, adoptionCount: 2, adoptionPerformance: 0.5 },
            });

            const context: MatchContext = { task: 'Test', domain: 'coding' };
            const results = await matcher.findMatches(context, [geneAbove, geneBelow]);

            expect(results.length).toBe(1);
            expect(results[0].gene.id).toBe('gene-above');
        });

        it('should boost score for genes matching the domain exactly', async () => {
            const matcher = new GeneMatcher();

            const sameIdenticalFitness = {
                overallFitness: 0.85,
                taskSuccessRate: 0.85,
                tokenEfficiency: 0.7,
                responseQuality: 0.85,
                adoptionCount: 5,
                adoptionPerformance: 0.7,
            };

            const geneSameDomain = createTestGene({
                id: 'gene-same-domain',
                domain: 'coding',
                fitness: sameIdenticalFitness,
            });
            const geneDiffDomain = createTestGene({
                id: 'gene-diff-domain',
                domain: 'cooking',
                fitness: sameIdenticalFitness,
            });

            const context: MatchContext = { task: 'Write code', domain: 'coding' };
            const results = await matcher.findMatches(context, [geneSameDomain, geneDiffDomain]);

            // The gene with a matching domain should score higher
            const sameDomainResult = results.find(r => r.gene.id === 'gene-same-domain');
            const diffDomainResult = results.find(r => r.gene.id === 'gene-diff-domain');

            expect(sameDomainResult).toBeDefined();
            expect(diffDomainResult).toBeDefined();
            expect(sameDomainResult!.matchScore).toBeGreaterThan(diffDomainResult!.matchScore);
            expect(sameDomainResult!.scoreBreakdown.domainScore).toBe(1.0);
        });

        it('should respect preferredTypes when scoring type match', async () => {
            const matcher = new GeneMatcher();

            const baseFitness = {
                overallFitness: 0.85,
                taskSuccessRate: 0.85,
                tokenEfficiency: 0.7,
                responseQuality: 0.85,
                adoptionCount: 5,
                adoptionPerformance: 0.7,
            };

            const genePreferred = createTestGene({
                id: 'gene-preferred',
                type: 'tool-usage-pattern',
                domain: 'coding',
                fitness: baseFitness,
            });
            const geneOther = createTestGene({
                id: 'gene-other',
                type: 'communication-pattern',
                domain: 'coding',
                fitness: baseFitness,
            });

            const context: MatchContext = {
                task: 'Use tools',
                domain: 'coding',
                preferredTypes: ['tool-usage-pattern'],
            };

            const results = await matcher.findMatches(context, [genePreferred, geneOther]);

            const preferredResult = results.find(r => r.gene.id === 'gene-preferred');
            const otherResult = results.find(r => r.gene.id === 'gene-other');

            expect(preferredResult).toBeDefined();
            expect(preferredResult!.scoreBreakdown.typeScore).toBe(1.0);

            if (otherResult) {
                expect(otherResult.scoreBreakdown.typeScore).toBe(0.0);
            }
        });

        it('should limit results to maxResults', async () => {
            const matcher = new GeneMatcher({ maxResults: 2, minFitness: 0.5, minMatchScore: 0.0 });

            const candidates: CognitiveGene[] = [];
            for (let i = 0; i < 5; i++) {
                candidates.push(createTestGene({
                    id: `gene-${i}`,
                    domain: 'coding',
                    fitness: {
                        overallFitness: 0.7 + i * 0.05,
                        taskSuccessRate: 0.7,
                        tokenEfficiency: 0.7,
                        responseQuality: 0.7,
                        adoptionCount: 5,
                        adoptionPerformance: 0.7,
                    },
                }));
            }

            const context: MatchContext = { task: 'Test', domain: 'coding' };
            const results = await matcher.findMatches(context, candidates);

            expect(results.length).toBe(2);
        });

        it('should filter results below minMatchScore', async () => {
            // Set a high minMatchScore to exclude most genes
            const matcher = new GeneMatcher({ minMatchScore: 0.99, minFitness: 0.5 });

            const gene = createTestGene({
                domain: 'unrelated-domain',
                fitness: { overallFitness: 0.6, taskSuccessRate: 0.6, tokenEfficiency: 0.5, responseQuality: 0.6, adoptionCount: 0, adoptionPerformance: null },
            });

            const context: MatchContext = {
                task: 'Something',
                domain: 'completely-different',
            };

            const results = await matcher.findMatches(context, [gene]);

            expect(results.length).toBe(0);
        });

        it('should boost genes with high adoption count (>10)', async () => {
            // Use domainBoost: 1.0 so scores don't cap at 1.0 from domain boost
            const noDomainBoostMatcher = new GeneMatcher({ domainBoost: 1.0 });

            const baseFitness = {
                taskSuccessRate: 0.85,
                tokenEfficiency: 0.7,
                responseQuality: 0.85,
            };

            const geneHighAdoption = createTestGene({
                id: 'gene-high-adoption',
                domain: 'coding',
                fitness: {
                    ...baseFitness,
                    overallFitness: 0.80,
                    adoptionCount: 15,
                    adoptionPerformance: 0.85,
                },
            });

            const geneLowAdoption = createTestGene({
                id: 'gene-low-adoption',
                domain: 'coding',
                fitness: {
                    ...baseFitness,
                    overallFitness: 0.80,
                    adoptionCount: 2,
                    adoptionPerformance: 0.85,
                },
            });

            const context: MatchContext = { task: 'Code', domain: 'coding' };
            const results = await noDomainBoostMatcher.findMatches(context, [geneHighAdoption, geneLowAdoption]);

            const highAdoptionResult = results.find(r => r.gene.id === 'gene-high-adoption');
            const lowAdoptionResult = results.find(r => r.gene.id === 'gene-low-adoption');

            expect(highAdoptionResult).toBeDefined();
            expect(lowAdoptionResult).toBeDefined();

            // High adoption gene gets a boost multiplier
            expect(highAdoptionResult!.matchScore).toBeGreaterThan(lowAdoptionResult!.matchScore);
        });

        it('should include scoreBreakdown, reason, and confidence in results', async () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({ domain: 'coding' });
            const context: MatchContext = { task: 'Write code', domain: 'coding' };

            const results = await matcher.findMatches(context, [gene]);

            expect(results.length).toBe(1);
            const result = results[0];

            expect(result.scoreBreakdown).toHaveProperty('fitnessScore');
            expect(result.scoreBreakdown).toHaveProperty('domainScore');
            expect(result.scoreBreakdown).toHaveProperty('typeScore');
            expect(result.scoreBreakdown).toHaveProperty('adoptionScore');
            expect(typeof result.reason).toBe('string');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    // ========================================================================
    // findBestMatch
    // ========================================================================

    describe('findBestMatch', () => {
        it('should return the top-ranked gene', async () => {
            // Use domainBoost: 1.0 so scores don't cap at 1.0
            const noDomainBoostMatcher = new GeneMatcher({ domainBoost: 1.0 });

            const geneA = createTestGene({
                id: 'gene-a',
                domain: 'coding',
                fitness: { overallFitness: 0.75, taskSuccessRate: 0.75, tokenEfficiency: 0.7, responseQuality: 0.75, adoptionCount: 2, adoptionPerformance: 0.5 },
            });
            const geneB = createTestGene({
                id: 'gene-b',
                domain: 'coding',
                fitness: { overallFitness: 0.95, taskSuccessRate: 0.95, tokenEfficiency: 0.9, responseQuality: 0.95, adoptionCount: 12, adoptionPerformance: 0.9 },
            });

            const context: MatchContext = { task: 'Build feature', domain: 'coding' };
            const best = await noDomainBoostMatcher.findBestMatch(context, [geneA, geneB]);

            expect(best).not.toBeNull();
            expect(best!.gene.id).toBe('gene-b');
        });

        it('should return null when no candidates match', async () => {
            const matcher = new GeneMatcher({ minFitness: 0.99 });

            const gene = createTestGene({
                fitness: { overallFitness: 0.5, taskSuccessRate: 0.5, tokenEfficiency: 0.5, responseQuality: 0.5, adoptionCount: 0, adoptionPerformance: null },
            });

            const context: MatchContext = { task: 'Test', domain: 'coding' };
            const best = await matcher.findBestMatch(context, [gene]);

            expect(best).toBeNull();
        });

        it('should return null when candidates array is empty', async () => {
            const matcher = new GeneMatcher();
            const context: MatchContext = { task: 'Test', domain: 'coding' };
            const best = await matcher.findBestMatch(context, []);

            expect(best).toBeNull();
        });
    });

    // ========================================================================
    // findByDomain
    // ========================================================================

    describe('findByDomain', () => {
        it('should return genes matching the domain', async () => {
            const matcher = new GeneMatcher();

            const geneCoding = createTestGene({
                id: 'gene-coding',
                domain: 'coding',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            });
            const geneMath = createTestGene({
                id: 'gene-math',
                domain: 'math',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            });

            const results = await matcher.findByDomain('coding', [geneCoding, geneMath]);

            // The coding gene should rank higher due to domain match
            expect(results.length).toBeGreaterThanOrEqual(1);

            const codingResult = results.find(r => r.gene.id === 'gene-coding');
            expect(codingResult).toBeDefined();
            expect(codingResult!.scoreBreakdown.domainScore).toBe(1.0);
        });

        it('should support partial domain matching', async () => {
            const matcher = new GeneMatcher();

            const gene = createTestGene({
                id: 'gene-python-coding',
                domain: 'python-coding',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            });

            const results = await matcher.findByDomain('coding', [gene]);

            expect(results.length).toBe(1);
            // Partial match gives 0.7 domain score
            expect(results[0].scoreBreakdown.domainScore).toBe(0.7);
        });
    });

    // ========================================================================
    // findByType
    // ========================================================================

    describe('findByType', () => {
        it('should return genes matching the specified type', async () => {
            const matcher = new GeneMatcher();

            const geneReasoning = createTestGene({
                id: 'gene-reasoning',
                type: 'reasoning-pattern',
                domain: 'coding',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            });
            const geneTool = createTestGene({
                id: 'gene-tool',
                type: 'tool-usage-pattern',
                domain: 'coding',
                fitness: { overallFitness: 0.85, taskSuccessRate: 0.85, tokenEfficiency: 0.7, responseQuality: 0.85, adoptionCount: 5, adoptionPerformance: 0.7 },
            });

            const results = await matcher.findByType('reasoning-pattern', [geneReasoning, geneTool]);

            // The reasoning gene should have a higher type score
            const reasoningResult = results.find(r => r.gene.id === 'gene-reasoning');
            const toolResult = results.find(r => r.gene.id === 'gene-tool');

            expect(reasoningResult).toBeDefined();
            expect(reasoningResult!.scoreBreakdown.typeScore).toBe(1.0);

            if (toolResult) {
                expect(toolResult.scoreBreakdown.typeScore).toBe(0.0);
            }
        });
    });

    // ========================================================================
    // checkCompatibility
    // ========================================================================

    describe('checkCompatibility', () => {
        it('should return compatible when agent has all required capabilities', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Use code analysis tools',
                    requiredCapabilities: ['code-analysis', 'file-access'],
                    applicableContexts: ['general'],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkCompatibility(gene, ['code-analysis', 'file-access', 'web-search']);

            expect(result.compatible).toBe(true);
            expect(result.missingCapabilities).toEqual([]);
            expect(result.reason).toContain('All required capabilities available');
        });

        it('should return incompatible with missing capabilities listed', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Use advanced tools',
                    requiredCapabilities: ['code-analysis', 'file-access', 'database-query'],
                    applicableContexts: ['general'],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkCompatibility(gene, ['code-analysis']);

            expect(result.compatible).toBe(false);
            expect(result.missingCapabilities).toContain('file-access');
            expect(result.missingCapabilities).toContain('database-query');
            expect(result.missingCapabilities.length).toBe(2);
            expect(result.reason).toContain('Missing capabilities');
        });

        it('should return compatible when gene requires no capabilities', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Simple pattern',
                    requiredCapabilities: [],
                    applicableContexts: ['general'],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkCompatibility(gene, []);

            expect(result.compatible).toBe(true);
            expect(result.missingCapabilities).toEqual([]);
        });
    });

    // ========================================================================
    // checkApplicability
    // ========================================================================

    describe('checkApplicability', () => {
        it('should return applicable when context matches an applicable context', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Coding pattern',
                    requiredCapabilities: [],
                    applicableContexts: ['coding', 'debugging'],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkApplicability(gene, 'I am coding a new feature');

            expect(result.applicable).toBe(true);
            expect(result.reason).toContain('matches applicable contexts');
        });

        it('should return not applicable when context does not match', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Cooking pattern',
                    requiredCapabilities: [],
                    applicableContexts: ['cooking', 'baking'],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkApplicability(gene, 'I am writing unit tests');

            expect(result.applicable).toBe(false);
            expect(result.reason).toContain('does not match');
        });

        it('should return not applicable when context matches a contraindication', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Pattern with limits',
                    requiredCapabilities: [],
                    applicableContexts: ['general'],
                    contraindications: ['production', 'sensitive-data'],
                    metadata: {},
                },
            });

            const result = matcher.checkApplicability(gene, 'This is a production deployment');

            expect(result.applicable).toBe(false);
            expect(result.reason).toContain('contraindication');
        });

        it('should return generally applicable when no specific contexts are defined', () => {
            const matcher = new GeneMatcher();
            const gene = createTestGene({
                content: {
                    instruction: 'Universal pattern',
                    requiredCapabilities: [],
                    applicableContexts: [],
                    contraindications: [],
                    metadata: {},
                },
            });

            const result = matcher.checkApplicability(gene, 'Any context at all');

            expect(result.applicable).toBe(true);
            expect(result.reason).toContain('Generally applicable');
        });
    });

    // ========================================================================
    // updateConfig
    // ========================================================================

    describe('updateConfig', () => {
        it('should update configuration', () => {
            const matcher = new GeneMatcher();

            matcher.updateConfig({ minFitness: 0.9, maxResults: 3 });

            const config = matcher.getConfig();
            expect(config.minFitness).toBe(0.9);
            expect(config.maxResults).toBe(3);
        });
    });
});
