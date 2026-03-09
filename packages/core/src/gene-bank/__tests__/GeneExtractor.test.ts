/**
 * GeneExtractor Unit Tests
 *
 * Tests the gene extraction pipeline that analyzes successful prompt mutations
 * and extracts reusable Cognitive Genes via LLM analysis.
 *
 * @version 0.4.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneExtractor, MutationContext } from '../GeneExtractor.js';
import type { TenantInfo } from '../CognitiveGene.js';

// ============================================================================
// MOCKS
// ============================================================================

function createMockLLM() {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn(),
    };
}

function createValidLLMResponse(overrides?: Record<string, unknown>) {
    const data = {
        canExtract: true,
        confidence: 0.85,
        geneType: 'reasoning-pattern',
        name: 'Chain-of-Thought Decomposition',
        description: 'Breaks complex problems into sequential reasoning steps',
        instruction: 'When facing a complex problem, decompose it into smaller sub-problems and solve each sequentially.',
        examples: [
            {
                scenario: 'Multi-step math problem',
                expectedBehavior: 'Break into individual operations and solve step by step',
            },
        ],
        requiredCapabilities: ['reasoning'],
        applicableContexts: ['complex-tasks', 'problem-solving'],
        contraindications: ['simple-lookups', 'trivial-questions'],
        reasoning: 'The mutation improved fitness by introducing step-by-step decomposition.',
        ...overrides,
    };

    return {
        content: JSON.stringify(data),
        usage: { inputTokens: 500, outputTokens: 200 },
    };
}

function createMockMutationContext(overrides?: Partial<MutationContext>): MutationContext {
    return {
        mutationId: 'mut-001',
        originalPrompt: 'You are a helpful assistant.',
        mutatedPrompt: 'You are a helpful assistant. Break complex problems into steps.',
        parentFitness: 0.6,
        mutatedFitness: 0.85,
        taskContext: 'General problem solving',
        domain: 'reasoning',
        metrics: {
            taskSuccessRate: 0.88,
            tokenEfficiency: 0.75,
            responseQuality: 0.82,
            userSatisfaction: 0.9,
        },
        ...overrides,
    };
}

function createMockTenantInfo(overrides?: Partial<TenantInfo>): TenantInfo {
    return {
        tenantId: 'tenant-test-001',
        createdBy: 'agent-test-001',
        scope: 'tenant',
        verified: false,
        ...overrides,
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('GeneExtractor', () => {
    let mockLLM: ReturnType<typeof createMockLLM>;
    let extractor: GeneExtractor;
    let tenantInfo: TenantInfo;

    beforeEach(() => {
        mockLLM = createMockLLM();
        extractor = new GeneExtractor(mockLLM as any);
        tenantInfo = createMockTenantInfo();
    });

    // ========================================================================
    // SUCCESSFUL EXTRACTION
    // ========================================================================

    describe('extractGene — successful extraction', () => {
        it('should return success with a valid gene when LLM returns extractable response', async () => {
            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(true);
            expect(result.gene).not.toBeNull();
            expect(result.confidence).toBe(0.85);
            expect(result.gene!.name).toBe('Chain-of-Thought Decomposition');
            expect(result.gene!.type).toBe('reasoning-pattern');
            expect(result.gene!.domain).toBe('reasoning');
            expect(result.gene!.tenant.tenantId).toBe('tenant-test-001');
            expect(result.gene!.content.instruction).toContain('decompose');
            expect(result.metadata.sourceMutationId).toBe('mut-001');
            expect(result.metadata.extractionMethod).toBe('llm-analysis');
            expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('should call LLM chat with correct options from config', async () => {
            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const context = createMockMutationContext();
            await extractor.extractGene(context, tenantInfo);

            expect(mockLLM.chat).toHaveBeenCalledTimes(1);

            const [messages, options] = mockLLM.chat.mock.calls[0];
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('user');
            expect(messages[0].content).toContain('Gene Extraction AI');
            expect(options.maxTokens).toBe(2000);
            expect(options.temperature).toBe(0.3);
        });
    });

    // ========================================================================
    // canExtract = false
    // ========================================================================

    describe('extractGene — canExtract false', () => {
        it('should return failure when LLM says gene cannot be extracted', async () => {
            mockLLM.chat.mockResolvedValue(
                createValidLLMResponse({
                    canExtract: false,
                    confidence: 0.3,
                    reasoning: 'The mutation is too specific to generalize.',
                })
            );

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toBe('The mutation is too specific to generalize.');
            expect(result.confidence).toBe(0.3);
            expect(result.metadata.extractionMethod).toBe('llm-analysis');
        });
    });

    // ========================================================================
    // LOW CONFIDENCE
    // ========================================================================

    describe('extractGene — low confidence', () => {
        it('should return failure when confidence is below minConfidence threshold', async () => {
            // Default minConfidence is 0.6
            mockLLM.chat.mockResolvedValue(
                createValidLLMResponse({
                    canExtract: true,
                    confidence: 0.4,
                })
            );

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toContain('Confidence');
            expect(result.reason).toContain('0.4');
            expect(result.reason).toContain('0.6');
            expect(result.confidence).toBe(0.4);
        });
    });

    // ========================================================================
    // LOW FITNESS (below minFitnessThreshold)
    // ========================================================================

    describe('extractGene — low fitness genome', () => {
        it('should return failure when mutated fitness is below minFitnessThreshold', async () => {
            // Default minFitnessThreshold is 0.7
            const context = createMockMutationContext({
                mutatedFitness: 0.5,
                parentFitness: 0.3,
            });

            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toContain('Fitness');
            expect(result.reason).toContain('0.5');
            expect(result.reason).toContain('0.7');
            expect(result.confidence).toBe(0);
            expect(result.metadata.extractionMethod).toBe('threshold-check');
            // LLM should NOT be called when fitness is too low
            expect(mockLLM.chat).not.toHaveBeenCalled();
        });

        it('should return failure when fitness gain is below minFitnessGain', async () => {
            // Default minFitnessGain is 0.1
            const context = createMockMutationContext({
                mutatedFitness: 0.75,
                parentFitness: 0.72, // gain = 0.03, below 0.1
            });

            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toContain('gain');
            expect(result.confidence).toBe(0);
            expect(result.metadata.extractionMethod).toBe('threshold-check');
            expect(mockLLM.chat).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // BATCH EXTRACTION
    // ========================================================================

    describe('extractBatch', () => {
        it('should process multiple mutation contexts and return results for each', async () => {
            // First call succeeds, second is below fitness threshold (no LLM call)
            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const contexts: MutationContext[] = [
                createMockMutationContext({ mutationId: 'mut-batch-1' }),
                createMockMutationContext({
                    mutationId: 'mut-batch-2',
                    mutatedFitness: 0.5, // below threshold
                    parentFitness: 0.3,
                }),
                createMockMutationContext({ mutationId: 'mut-batch-3' }),
            ];

            const results = await extractor.extractBatch(contexts, tenantInfo);

            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[0].metadata.sourceMutationId).toBe('mut-batch-1');
            expect(results[1].success).toBe(false);
            expect(results[1].metadata.sourceMutationId).toBe('mut-batch-2');
            expect(results[2].success).toBe(true);
            expect(results[2].metadata.sourceMutationId).toBe('mut-batch-3');
            // LLM should only be called for contexts that pass threshold checks
            expect(mockLLM.chat).toHaveBeenCalledTimes(2);
        });

        it('should return empty array for empty input', async () => {
            const results = await extractor.extractBatch([], tenantInfo);

            expect(results).toHaveLength(0);
            expect(mockLLM.chat).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    describe('getConfig', () => {
        it('should return the current configuration with defaults', () => {
            const config = extractor.getConfig();

            expect(config.minFitnessThreshold).toBe(0.7);
            expect(config.minFitnessGain).toBe(0.1);
            expect(config.minConfidence).toBe(0.6);
            expect(config.autoExtract).toBe(true);
            expect(config.maxTokens).toBe(2000);
            expect(config.temperature).toBe(0.3);
        });

        it('should return a copy, not a reference to internal config', () => {
            const config1 = extractor.getConfig();
            const config2 = extractor.getConfig();

            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);
        });
    });

    describe('updateConfig', () => {
        it('should update individual config values while preserving others', () => {
            extractor.updateConfig({ minFitnessThreshold: 0.5, minConfidence: 0.8 });

            const config = extractor.getConfig();
            expect(config.minFitnessThreshold).toBe(0.5);
            expect(config.minConfidence).toBe(0.8);
            // Other values remain at defaults
            expect(config.minFitnessGain).toBe(0.1);
            expect(config.temperature).toBe(0.3);
        });

        it('should affect subsequent extraction behavior', async () => {
            // Lower the fitness threshold so a low-fitness context passes
            extractor.updateConfig({ minFitnessThreshold: 0.4, minFitnessGain: 0.01 });

            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const context = createMockMutationContext({
                mutatedFitness: 0.5,
                parentFitness: 0.45,
            });

            const result = await extractor.extractGene(context, tenantInfo);

            // With lowered threshold, the LLM is called and extraction succeeds
            expect(result.success).toBe(true);
            expect(mockLLM.chat).toHaveBeenCalledTimes(1);
        });
    });

    // ========================================================================
    // CUSTOM CONFIG IN CONSTRUCTOR
    // ========================================================================

    describe('constructor with custom config', () => {
        it('should accept partial config overrides', () => {
            const custom = new GeneExtractor(mockLLM as any, {
                minFitnessThreshold: 0.5,
                temperature: 0.1,
            });

            const config = custom.getConfig();
            expect(config.minFitnessThreshold).toBe(0.5);
            expect(config.temperature).toBe(0.1);
            // Defaults preserved
            expect(config.minFitnessGain).toBe(0.1);
            expect(config.minConfidence).toBe(0.6);
        });
    });

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    describe('extractGene — error handling', () => {
        it('should handle LLM chat errors gracefully', async () => {
            mockLLM.chat.mockRejectedValue(new Error('LLM service unavailable'));

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toBe('LLM service unavailable');
            expect(result.confidence).toBe(0);
            expect(result.metadata.extractionMethod).toBe('error');
        });

        it('should handle malformed LLM JSON response gracefully', async () => {
            mockLLM.chat.mockResolvedValue({
                content: 'This is not valid JSON at all',
                usage: { inputTokens: 100, outputTokens: 50 },
            });

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toContain('Failed to parse extraction response');
            expect(result.confidence).toBe(0);
            expect(result.metadata.extractionMethod).toBe('error');
        });

        it('should handle LLM response with invalid schema gracefully', async () => {
            mockLLM.chat.mockResolvedValue({
                content: JSON.stringify({
                    canExtract: true,
                    // Missing required fields like geneType, name, etc.
                    confidence: 0.9,
                }),
                usage: { inputTokens: 100, outputTokens: 50 },
            });

            const context = createMockMutationContext();
            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(false);
            expect(result.gene).toBeNull();
            expect(result.reason).toContain('Failed to parse extraction response');
            expect(result.metadata.extractionMethod).toBe('error');
        });
    });

    // ========================================================================
    // GENE STRUCTURE VALIDATION
    // ========================================================================

    describe('extracted gene structure', () => {
        it('should produce a well-formed CognitiveGene with correct lineage and fitness', async () => {
            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const context = createMockMutationContext({
                mutationId: 'mut-lineage-test',
                parentFitness: 0.6,
                mutatedFitness: 0.85,
                domain: 'coding',
            });

            const result = await extractor.extractGene(context, tenantInfo);

            expect(result.success).toBe(true);
            const gene = result.gene!;

            // ID format
            expect(gene.id).toContain('gene_tenant-test-001_reasoning-pattern');

            // Version
            expect(gene.version).toBe('1.0.0');

            // Fitness
            expect(gene.fitness.overallFitness).toBe(0.85);
            expect(gene.fitness.taskSuccessRate).toBe(0.88);
            expect(gene.fitness.adoptionCount).toBe(0);
            expect(gene.fitness.adoptionPerformance).toBeNull();

            // Lineage
            expect(gene.lineage.generation).toBe(0);
            expect(gene.lineage.parentGeneId).toBeNull();
            expect(gene.lineage.mutationHistory).toHaveLength(1);
            expect(gene.lineage.mutationHistory[0].change).toContain('mut-lineage-test');
            expect(gene.lineage.mutationHistory[0].fitnessGain).toBeCloseTo(0.25, 2);

            // Content
            expect(gene.content.examples).toHaveLength(1);
            expect(gene.content.requiredCapabilities).toContain('reasoning');
            expect(gene.content.contraindications).toContain('simple-lookups');

            // Tags
            expect(gene.tags).toContain('coding');
            expect(gene.tags).toContain('reasoning-pattern');
            expect(gene.tags).toContain('extracted');

            // Timestamps
            expect(gene.createdAt).toBeDefined();
            expect(gene.updatedAt).toBeDefined();
        });
    });

    // ========================================================================
    // METRICS COLLECTOR INTEGRATION
    // ========================================================================

    describe('metrics collector integration', () => {
        it('should call metricsCollector.logAudit on successful extraction', async () => {
            const mockMetrics = { logAudit: vi.fn() };
            const extractorWithMetrics = new GeneExtractor(
                mockLLM as any,
                undefined,
                mockMetrics as any
            );

            mockLLM.chat.mockResolvedValue(createValidLLMResponse());

            const context = createMockMutationContext();
            await extractorWithMetrics.extractGene(context, tenantInfo);

            expect(mockMetrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    component: 'GeneExtractor',
                    operation: 'extractGene',
                })
            );
        });

        it('should call metricsCollector.logAudit on extraction error', async () => {
            const mockMetrics = { logAudit: vi.fn() };
            const extractorWithMetrics = new GeneExtractor(
                mockLLM as any,
                undefined,
                mockMetrics as any
            );

            mockLLM.chat.mockRejectedValue(new Error('Connection timeout'));

            const context = createMockMutationContext();
            await extractorWithMetrics.extractGene(context, tenantInfo);

            expect(mockMetrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    component: 'GeneExtractor',
                    operation: 'extractGene',
                })
            );
        });
    });
});
