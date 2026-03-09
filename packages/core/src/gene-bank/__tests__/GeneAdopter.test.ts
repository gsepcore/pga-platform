/**
 * GeneAdopter Unit Tests
 *
 * Tests for the GeneAdopter class covering:
 * - Gene adoption via direct geneId
 * - Gene adoption via matchContext
 * - Sandbox testing during adoption
 * - Concurrent adoption limits
 * - Already-adopted gene detection
 * - Auto-adopt for high-confidence genes
 * - Gene integration (prompt building)
 * - Gene removal and status management
 * - Performance tracking and degradation detection
 * - Configuration management
 * - Error handling
 *
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneAdopter } from '../GeneAdopter.js';
import type { AdoptionRequest } from '../GeneAdopter.js';
import type { GeneBank } from '../GeneBank.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { LLMAdapter, ChatResponse } from '../../interfaces/LLMAdapter.js';
import type { MetricsCollector } from '../../monitoring/MetricsCollector.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const TEST_AGENT_ID = 'agent-adopter-001';

// ============================================================================
// HELPER: Create a valid CognitiveGene
// ============================================================================

function createTestGene(overrides: Partial<CognitiveGene> = {}): CognitiveGene {
    const now = new Date().toISOString();
    const id = (overrides as Record<string, unknown>).id as string || `gene-${Math.random().toString(36).substring(2, 8)}`;
    return {
        id,
        version: '1.0.0',
        name: 'Adopter Test Gene',
        description: 'Gene for adoption testing',
        type: 'reasoning-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.9,
            taskSuccessRate: 0.88,
            tokenEfficiency: 0.7,
            responseQuality: 0.92,
            adoptionCount: 5,
            adoptionPerformance: 0.8,
            ...(overrides.fitness as object || {}),
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
        },
        content: {
            instruction: 'Always verify your assumptions before proceeding.',
            examples: [
                { scenario: 'debugging', expectedBehavior: 'Check inputs first' },
            ],
            requiredCapabilities: [],
            applicableContexts: ['coding'],
            contraindications: ['Do not use in creative writing'],
            metadata: {},
            ...(overrides.content as object || {}),
        },
        tenant: {
            tenantId: 'tenant-test',
            createdBy: 'agent-test',
            scope: 'tenant' as const,
            verified: false,
        },
        createdAt: now,
        updatedAt: now,
        tags: ['test'],
        ...overrides,
    } as CognitiveGene;
}

// ============================================================================
// HELPER: Create mocks
// ============================================================================

function createMockGeneBank(): GeneBank {
    return {
        getGene: vi.fn(),
        updateGene: vi.fn(),
        storeGene: vi.fn(),
        searchGenes: vi.fn().mockResolvedValue([]),
        getTenantGenes: vi.fn().mockResolvedValue([]),
        recordAdoption: vi.fn(),
        canAutoAdopt: vi.fn().mockReturnValue(true),
        getConfig: vi.fn().mockReturnValue({ agentId: TEST_AGENT_ID }),
    } as unknown as GeneBank;
}

function createMockLLM(): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: 'Mock LLM response with correct answer',
        } as ChatResponse),
    };
}

function createMockMetrics(): MetricsCollector {
    return {
        logAudit: vi.fn(),
    } as unknown as MetricsCollector;
}

// ============================================================================
// TESTS
// ============================================================================

describe('GeneAdopter', () => {
    let geneBank: GeneBank;
    let llm: LLMAdapter;
    let metrics: MetricsCollector;
    let adopter: GeneAdopter;

    beforeEach(() => {
        vi.restoreAllMocks();
        geneBank = createMockGeneBank();
        llm = createMockLLM();
        metrics = createMockMetrics();
        adopter = new GeneAdopter(geneBank, llm, {
            agentId: TEST_AGENT_ID,
            requireSandboxTest: false, // Disabled by default for simpler tests
        }, metrics);
    });

    // ========================================================================
    // Constructor & Config
    // ========================================================================

    describe('constructor', () => {
        it('should parse and store config', () => {
            const config = adopter.getConfig();
            expect(config.agentId).toBe(TEST_AGENT_ID);
            expect(config.requireSandboxTest).toBe(false);
            expect(config.maxConcurrentAdoptions).toBe(3);
            expect(config.autoAdopt).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const a = adopter.getConfig();
            const b = adopter.getConfig();
            expect(a).toEqual(b);
            expect(a).not.toBe(b);
        });
    });

    describe('updateConfig', () => {
        it('should update config partially', () => {
            adopter.updateConfig({ maxConcurrentAdoptions: 5 });
            expect(adopter.getConfig().maxConcurrentAdoptions).toBe(5);
            expect(adopter.getConfig().agentId).toBe(TEST_AGENT_ID);
        });

        it('should validate via Zod schema', () => {
            expect(() => adopter.updateConfig({ maxConcurrentAdoptions: -1 })).toThrow();
        });
    });

    // ========================================================================
    // adoptGene - direct geneId
    // ========================================================================

    describe('adoptGene with geneId', () => {
        it('should adopt a gene successfully by ID', async () => {
            const gene = createTestGene({ id: 'gene-direct-001' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await adopter.adoptGene({ geneId: 'gene-direct-001' });

            expect(result.success).toBe(true);
            expect(result.geneId).toBe('gene-direct-001');
            expect(result.agentId).toBe(TEST_AGENT_ID);
            expect(result.integrated).toBe(true);
        });

        it('should fail when gene is not found', async () => {
            vi.mocked(geneBank.getGene).mockResolvedValue(null);

            const result = await adopter.adoptGene({ geneId: 'nonexistent' });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Gene not found');
        });

        it('should fail when neither geneId nor matchContext provided', async () => {
            const result = await adopter.adoptGene({});

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Must provide either geneId or matchContext');
        });

        it('should fail when gene is already adopted', async () => {
            const gene = createTestGene({ id: 'gene-dup' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            // First adoption
            await adopter.adoptGene({ geneId: 'gene-dup' });

            // Second adoption should fail
            const result = await adopter.adoptGene({ geneId: 'gene-dup' });
            expect(result.success).toBe(false);
            expect(result.reason).toContain('already adopted');
        });

        it('should fail when max concurrent adoptions reached', async () => {
            // Adopt 3 genes (max)
            for (let i = 0; i < 3; i++) {
                const gene = createTestGene({ id: `gene-concurrent-${i}` });
                vi.mocked(geneBank.getGene).mockResolvedValue(gene);
                await adopter.adoptGene({ geneId: `gene-concurrent-${i}` });
            }

            // 4th should fail
            const gene4 = createTestGene({ id: 'gene-concurrent-3' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene4);
            const result = await adopter.adoptGene({ geneId: 'gene-concurrent-3' });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Maximum concurrent adoptions');
        });

        it('should record adoption in gene bank when trackPerformance enabled', async () => {
            const gene = createTestGene({ id: 'gene-tracked' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const trackingAdopter = new GeneAdopter(geneBank, llm, {
                agentId: TEST_AGENT_ID,
                requireSandboxTest: false,
                trackPerformance: true,
            });

            await trackingAdopter.adoptGene({ geneId: 'gene-tracked' });

            expect(geneBank.recordAdoption).toHaveBeenCalledWith(
                'gene-tracked',
                TEST_AGENT_ID,
                expect.any(Number)
            );
        });

        it('should log audit on successful adoption', async () => {
            const gene = createTestGene({ id: 'gene-audit' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            await adopter.adoptGene({ geneId: 'gene-audit' });

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    component: 'GeneAdopter',
                    operation: 'adoptGene',
                })
            );
        });

        it('should handle exceptions and return failed result', async () => {
            vi.mocked(geneBank.getGene).mockRejectedValue(new Error('DB crashed'));

            const result = await adopter.adoptGene({ geneId: 'gene-crash' });

            expect(result.success).toBe(false);
            expect(result.reason).toBe('DB crashed');
        });

        it('should log audit on error', async () => {
            vi.mocked(geneBank.getGene).mockRejectedValue(new Error('timeout'));

            await adopter.adoptGene({ geneId: 'gene-err' });

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    component: 'GeneAdopter',
                    operation: 'adoptGene',
                })
            );
        });
    });

    // ========================================================================
    // adoptGene - with matchContext
    // ========================================================================

    describe('adoptGene with matchContext', () => {
        it('should find and adopt a gene via context matching', async () => {
            const gene = createTestGene({ id: 'gene-matched' });
            vi.mocked(geneBank.getTenantGenes).mockResolvedValue([gene]);

            const result = await adopter.adoptGene({
                matchContext: { task: 'coding task', domain: 'coding' },
            });

            expect(result.success).toBe(true);
            expect(result.geneId).toBe('gene-matched');
        });

        it('should fail when no matching gene found', async () => {
            // Return empty candidates so matcher finds nothing
            vi.mocked(geneBank.getTenantGenes).mockResolvedValue([]);

            const result = await adopter.adoptGene({
                matchContext: { task: 'obscure task', domain: 'unknown-domain' },
            });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('No matching gene found');
        });
    });

    // ========================================================================
    // adoptGene - with sandbox testing
    // ========================================================================

    describe('adoptGene with sandbox testing', () => {
        let sandboxAdopter: GeneAdopter;

        beforeEach(() => {
            sandboxAdopter = new GeneAdopter(geneBank, llm, {
                agentId: TEST_AGENT_ID,
                requireSandboxTest: true,
            }, metrics);
        });

        it('should require test cases when sandbox is enabled', async () => {
            const gene = createTestGene({ id: 'gene-no-tests' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await sandboxAdopter.adoptGene({ geneId: 'gene-no-tests' });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Test cases required');
        });

        it('should require non-empty test cases when sandbox is enabled', async () => {
            const gene = createTestGene({ id: 'gene-empty-tests' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await sandboxAdopter.adoptGene({
                geneId: 'gene-empty-tests',
                testCases: [],
            });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Test cases required');
        });

        it('should pass sandbox and adopt when tests succeed', async () => {
            vi.mocked(llm.chat).mockResolvedValue({
                content: 'The answer is correct',
            } as ChatResponse);

            const gene = createTestGene({ id: 'gene-sandbox-pass' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await sandboxAdopter.adoptGene({
                geneId: 'gene-sandbox-pass',
                testCases: [
                    {
                        id: 'tc-1',
                        description: 'test',
                        input: 'test question',
                        successCriteria: () => true,
                    },
                ],
            });

            expect(result.success).toBe(true);
            expect(result.sandboxResults?.passed).toBe(true);
        });

        it('should reject adoption when sandbox test fails', async () => {
            vi.mocked(llm.chat).mockResolvedValue({
                content: 'wrong answer',
            } as ChatResponse);

            // Use strict tester that always fails
            const gene = createTestGene({ id: 'gene-sandbox-fail' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await sandboxAdopter.adoptGene({
                geneId: 'gene-sandbox-fail',
                testCases: [
                    {
                        id: 'tc-1',
                        description: 'test',
                        input: 'test',
                        successCriteria: () => false,
                    },
                    {
                        id: 'tc-2',
                        description: 'test2',
                        input: 'test',
                        successCriteria: () => false,
                    },
                ],
            });

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Sandbox test failed');
        });

        it('should skip sandbox when skipSandbox flag is set', async () => {
            const gene = createTestGene({ id: 'gene-skip-sandbox' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const result = await sandboxAdopter.adoptGene({
                geneId: 'gene-skip-sandbox',
                skipSandbox: true,
            });

            expect(result.success).toBe(true);
            // LLM should not have been called since sandbox was skipped
            expect(llm.chat).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // autoAdoptForTask
    // ========================================================================

    describe('autoAdoptForTask', () => {
        it('should return empty array when autoAdopt is disabled', async () => {
            const results = await adopter.autoAdoptForTask(
                { task: 'test', domain: 'coding' },
                [{ id: 'tc-1', description: 'test', input: 'test' }]
            );

            expect(results).toEqual([]);
        });

        it('should auto-adopt high-confidence genes', async () => {
            const autoAdopter = new GeneAdopter(geneBank, llm, {
                agentId: TEST_AGENT_ID,
                autoAdopt: true,
                autoAdoptMinConfidence: 0.5,
                requireSandboxTest: false,
            });

            const gene = createTestGene({ id: 'gene-auto' });
            vi.mocked(geneBank.getTenantGenes).mockResolvedValue([gene]);
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const results = await autoAdopter.autoAdoptForTask(
                { task: 'coding task', domain: 'coding' },
                [{ id: 'tc-1', description: 'test', input: 'test' }]
            );

            expect(results.length).toBeGreaterThanOrEqual(1);
        });

        it('should stop when canAutoAdopt returns false', async () => {
            vi.mocked(geneBank.canAutoAdopt).mockReturnValue(false);

            const autoAdopter = new GeneAdopter(geneBank, llm, {
                agentId: TEST_AGENT_ID,
                autoAdopt: true,
                autoAdoptMinConfidence: 0.5,
                requireSandboxTest: false,
            });

            const gene = createTestGene({ id: 'gene-blocked' });
            vi.mocked(geneBank.getTenantGenes).mockResolvedValue([gene]);

            const results = await autoAdopter.autoAdoptForTask(
                { task: 'coding task', domain: 'coding' },
                [{ id: 'tc-1', description: 'test', input: 'test' }]
            );

            expect(results).toEqual([]);
        });
    });

    // ========================================================================
    // buildEnhancedPrompt
    // ========================================================================

    describe('buildEnhancedPrompt', () => {
        it('should return base prompt when no genes are adopted', () => {
            const result = adopter.buildEnhancedPrompt('Base prompt');
            expect(result).toBe('Base prompt');
        });

        it('should include adopted gene instructions in prompt', async () => {
            const gene = createTestGene({ id: 'gene-prompt' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-prompt' });

            const result = adopter.buildEnhancedPrompt('Base prompt');

            expect(result).toContain('Base prompt');
            expect(result).toContain('Adopted Cognitive Genes');
            expect(result).toContain('Always verify your assumptions');
        });

        it('should include examples and contraindications from gene content', async () => {
            const gene = createTestGene({ id: 'gene-full-content' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-full-content' });

            const result = adopter.buildEnhancedPrompt('Base prompt');

            expect(result).toContain('Examples:');
            expect(result).toContain('debugging');
            expect(result).toContain('Avoid:');
            expect(result).toContain('creative writing');
        });

        it('should not include content from removed genes', async () => {
            const gene = createTestGene({ id: 'gene-removed' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-removed' });

            await adopter.removeGene('gene-removed');

            const result = adopter.buildEnhancedPrompt('Base prompt');
            expect(result).toBe('Base prompt');
        });
    });

    // ========================================================================
    // Gene management
    // ========================================================================

    describe('removeGene', () => {
        it('should remove an adopted gene and return true', async () => {
            const gene = createTestGene({ id: 'gene-to-remove' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-to-remove' });

            const removed = await adopter.removeGene('gene-to-remove');

            expect(removed).toBe(true);
            expect(adopter.getGeneStatus('gene-to-remove')).toBeNull();
        });

        it('should return false when gene is not adopted', async () => {
            const removed = await adopter.removeGene('nonexistent');
            expect(removed).toBe(false);
        });
    });

    describe('getGeneStatus', () => {
        it('should return status of adopted gene', async () => {
            const gene = createTestGene({ id: 'gene-status' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-status' });

            const status = adopter.getGeneStatus('gene-status');

            expect(status).not.toBeNull();
            expect(status!.geneId).toBe('gene-status');
            expect(status!.status).toBe('active');
            expect(status!.performance.tasksCompleted).toBe(0);
        });

        it('should return null for non-adopted gene', () => {
            const status = adopter.getGeneStatus('unknown');
            expect(status).toBeNull();
        });
    });

    describe('getAdoptedGenes', () => {
        it('should return all adopted genes', async () => {
            const gene1 = createTestGene({ id: 'gene-list-1' });
            const gene2 = createTestGene({ id: 'gene-list-2' });
            vi.mocked(geneBank.getGene)
                .mockResolvedValueOnce(gene1)
                .mockResolvedValueOnce(gene2);

            await adopter.adoptGene({ geneId: 'gene-list-1' });
            await adopter.adoptGene({ geneId: 'gene-list-2' });

            const adopted = adopter.getAdoptedGenes();

            expect(adopted).toHaveLength(2);
        });

        it('should return empty array when no genes adopted', () => {
            expect(adopter.getAdoptedGenes()).toEqual([]);
        });
    });

    // ========================================================================
    // updateGenePerformance
    // ========================================================================

    describe('updateGenePerformance', () => {
        it('should update performance metrics on successful task', async () => {
            const gene = createTestGene({ id: 'gene-perf' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-perf' });

            adopter.updateGenePerformance('gene-perf', true, 0.9);

            const status = adopter.getGeneStatus('gene-perf');
            expect(status!.performance.tasksCompleted).toBe(1);
            expect(status!.performance.successRate).toBe(1);
            expect(status!.performance.averageFitness).toBe(0.9);
        });

        it('should compute running average for performance', async () => {
            const gene = createTestGene({ id: 'gene-avg' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-avg' });

            adopter.updateGenePerformance('gene-avg', true, 0.8);
            adopter.updateGenePerformance('gene-avg', false, 0.4);

            const status = adopter.getGeneStatus('gene-avg');
            expect(status!.performance.tasksCompleted).toBe(2);
            expect(status!.performance.successRate).toBe(0.5);
            expect(status!.performance.averageFitness).toBeCloseTo(0.6);
        });

        it('should mark gene as failed after 10+ tasks with low success rate', async () => {
            const gene = createTestGene({ id: 'gene-degrade' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-degrade' });

            // 10 failures -> success rate = 0
            for (let i = 0; i < 10; i++) {
                adopter.updateGenePerformance('gene-degrade', false, 0.1);
            }

            const status = adopter.getGeneStatus('gene-degrade');
            expect(status!.status).toBe('failed');
            expect(status!.issues).toContain('Low success rate detected');
        });

        it('should not update performance for non-active gene', async () => {
            const gene = createTestGene({ id: 'gene-inactive' });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-inactive' });

            // Mark as failed
            for (let i = 0; i < 10; i++) {
                adopter.updateGenePerformance('gene-inactive', false, 0.1);
            }

            // Try updating again - should be a no-op since status is 'failed'
            adopter.updateGenePerformance('gene-inactive', true, 1.0);

            const status = adopter.getGeneStatus('gene-inactive');
            // tasksCompleted should be 10 (not 11) because failed genes are not updated
            expect(status!.performance.tasksCompleted).toBe(10);
        });

        it('should do nothing for non-existent gene', () => {
            // Should not throw
            adopter.updateGenePerformance('no-such-gene', true, 1.0);
        });
    });

    // ========================================================================
    // Integration: integrateGene builds correct content
    // ========================================================================

    describe('gene integration content', () => {
        it('should integrate gene with empty examples and contraindications', async () => {
            const gene = createTestGene({
                id: 'gene-minimal',
                content: {
                    instruction: 'Minimal instruction',
                    examples: [],
                    requiredCapabilities: [],
                    applicableContexts: [],
                    contraindications: [],
                    metadata: {},
                },
            });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);
            await adopter.adoptGene({ geneId: 'gene-minimal' });

            const prompt = adopter.buildEnhancedPrompt('Base');
            expect(prompt).toContain('Minimal instruction');
            expect(prompt).not.toContain('Examples:');
            expect(prompt).not.toContain('Avoid:');
        });
    });
});
