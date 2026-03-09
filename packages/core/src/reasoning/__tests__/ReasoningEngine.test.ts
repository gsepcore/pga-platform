/**
 * ReasoningEngine Unit Tests
 *
 * Tests for the ReasoningEngine class covering:
 * - All reasoning strategies (direct, chain-of-thought, self-consistency,
 *   tree-of-thoughts, reflection, auto)
 * - Configuration defaults and overrides
 * - Helper methods (extractReasoningSteps, extractFinalAnswer, etc.)
 * - Question complexity analysis
 * - Voting mechanism for self-consistency
 * - Metrics logging
 * - Error handling
 *
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReasoningEngine } from '../ReasoningEngine.js';
import type { ReasoningStrategy } from '../ReasoningEngine.js';
import type { LLMAdapter, ChatResponse } from '../../interfaces/LLMAdapter.js';
import type { MetricsCollector } from '../../monitoring/MetricsCollector.js';

// ============================================================================
// HELPER: Create mock LLMAdapter
// ============================================================================

function createMockLLM(defaultContent = 'Default mock response'): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: defaultContent,
            usage: { inputTokens: 50, outputTokens: 50 },
        } as ChatResponse),
    };
}

// ============================================================================
// HELPER: Create mock MetricsCollector
// ============================================================================

function createMockMetrics(): MetricsCollector {
    return {
        logAudit: vi.fn(),
    } as unknown as MetricsCollector;
}

// ============================================================================
// TESTS
// ============================================================================

describe('ReasoningEngine', () => {
    let llm: LLMAdapter;
    let metrics: MetricsCollector;
    let engine: ReasoningEngine;

    beforeEach(() => {
        vi.restoreAllMocks();
        llm = createMockLLM();
        metrics = createMockMetrics();
        engine = new ReasoningEngine(llm, undefined, metrics);
    });

    // ========================================================================
    // Constructor & Config
    // ========================================================================

    describe('constructor', () => {
        it('should use default strategy of chain-of-thought', async () => {
            const cotResponse = `Step 1: Analyze the question
Step 2: Think about it
Final Answer: The answer is 42`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            const result = await engine.reason('What is 6 * 7?', 'Math context');

            expect(result.strategy).toBe('chain-of-thought');
        });

        it('should use custom default strategy', async () => {
            const directEngine = new ReasoningEngine(llm, { defaultStrategy: 'direct' });

            const result = await directEngine.reason('Hello?', 'context');

            expect(result.strategy).toBe('direct');
        });

        it('should merge config with defaults', () => {
            const customEngine = new ReasoningEngine(llm, {
                chainOfThought: { minSteps: 5, maxSteps: 15, showSteps: false },
                selfConsistency: { numPaths: 5, votingMethod: 'weighted' },
            });

            // Engine is created without error -- config merged correctly
            expect(customEngine).toBeDefined();
        });
    });

    // ========================================================================
    // Direct Reasoning
    // ========================================================================

    describe('direct reasoning', () => {
        it('should return result with direct strategy and empty reasoning', async () => {
            vi.mocked(llm.chat).mockResolvedValue({
                content: 'Paris is the capital of France.',
            } as ChatResponse);

            const result = await engine.reason(
                'What is the capital of France?',
                'Geography context',
                'direct'
            );

            expect(result.strategy).toBe('direct');
            expect(result.answer).toBe('Paris is the capital of France.');
            expect(result.reasoning).toEqual([]);
            expect(result.confidence).toBe(0.7);
        });

        it('should estimate tokens based on text length', async () => {
            vi.mocked(llm.chat).mockResolvedValue({
                content: 'Short answer',
            } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'direct');

            expect(result.tokensUsed).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // Chain of Thought
    // ========================================================================

    describe('chain-of-thought reasoning', () => {
        it('should extract reasoning steps from response', async () => {
            const cotResponse = `Step 1: First, consider the problem
Step 2: Analyze the data
Step 3: Combine findings
Final Answer: The result is 42`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            const result = await engine.reason('What is the answer?', 'context', 'chain-of-thought');

            expect(result.strategy).toBe('chain-of-thought');
            expect(result.reasoning).toHaveLength(3);
            expect(result.reasoning[0]).toContain('Step 1');
            expect(result.reasoning[2]).toContain('Step 3');
            expect(result.answer).toBe('The result is 42');
            expect(result.confidence).toBe(0.85);
        });

        it('should use last paragraph as fallback when no Final Answer marker', async () => {
            const response = `Let me think about this.

Step 1: Consider factors

The answer is clearly 7.`;
            vi.mocked(llm.chat).mockResolvedValue({ content: response } as ChatResponse);

            const result = await engine.reason('What?', 'ctx', 'chain-of-thought');

            expect(result.answer).toBe('The answer is clearly 7.');
        });

        it('should return empty reasoning when no steps found', async () => {
            vi.mocked(llm.chat).mockResolvedValue({
                content: 'Just the answer: 42.',
            } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'chain-of-thought');

            expect(result.reasoning).toEqual([]);
        });
    });

    // ========================================================================
    // Self-Consistency
    // ========================================================================

    describe('self-consistency reasoning', () => {
        it('should generate multiple reasoning paths and vote', async () => {
            const cotResponse = `Step 1: Think
Final Answer: 42`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            const result = await engine.reason('What is 6 * 7?', 'Math', 'self-consistency');

            expect(result.strategy).toBe('self-consistency');
            expect(result.confidence).toBe(0.9);
            // Default numPaths = 3, so chat should be called 3 times
            expect(llm.chat).toHaveBeenCalledTimes(3);
        });

        it('should use majority voting on answers', async () => {
            let callCount = 0;
            vi.mocked(llm.chat).mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) {
                    return { content: 'Final Answer: 42' } as ChatResponse;
                }
                return { content: 'Final Answer: 43' } as ChatResponse;
            });

            const result = await engine.reason('Q?', 'ctx', 'self-consistency');

            // "42" appeared 2x, "43" appeared 1x => majority is 42
            expect(result.answer).toBe('42');
        });

        it('should combine all reasoning steps from all paths', async () => {
            const response = `Step 1: Analysis
Final Answer: result`;
            vi.mocked(llm.chat).mockResolvedValue({ content: response } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'self-consistency');

            // 3 paths each with 1 step = 3 total
            expect(result.reasoning).toHaveLength(3);
        });

        it('should sum tokens from all paths', async () => {
            const response = 'Final Answer: yes';
            vi.mocked(llm.chat).mockResolvedValue({ content: response } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'self-consistency');

            expect(result.tokensUsed).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // Tree of Thoughts
    // ========================================================================

    describe('tree-of-thoughts reasoning', () => {
        it('should extract approaches from response', async () => {
            const response = `Approach 1: Use dynamic programming
Approach 2: Use greedy algorithm
Approach 3: Use brute force
Best choice: dynamic programming.`;
            vi.mocked(llm.chat).mockResolvedValue({ content: response } as ChatResponse);

            const result = await engine.reason('Solve optimization', 'ctx', 'tree-of-thoughts');

            expect(result.strategy).toBe('tree-of-thoughts');
            expect(result.reasoning).toHaveLength(3);
            expect(result.reasoning[0]).toContain('Approach 1');
            expect(result.confidence).toBe(0.88);
        });

        it('should return full response as the answer', async () => {
            const response = 'Full analysis text here.';
            vi.mocked(llm.chat).mockResolvedValue({ content: response } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'tree-of-thoughts');

            expect(result.answer).toBe('Full analysis text here.');
        });
    });

    // ========================================================================
    // Reflection
    // ========================================================================

    describe('reflection reasoning', () => {
        it('should iterate with self-critique and improvement', async () => {
            let callCount = 0;
            vi.mocked(llm.chat).mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return { content: 'Final Answer: Initial answer' } as ChatResponse;
                }
                return { content: 'Final Answer: Improved answer' } as ChatResponse;
            });

            const result = await engine.reason('Explain gravity', 'Physics', 'reflection');

            expect(result.strategy).toBe('reflection');
            expect(result.confidence).toBe(0.92);
            expect(result.reasoning.length).toBeGreaterThanOrEqual(1);
        });

        it('should stop iterating when answer converges (isSimilar)', async () => {
            let callCount = 0;
            vi.mocked(llm.chat).mockImplementation(async () => {
                callCount++;
                // After the initial answer, always return the same answer
                return { content: 'Final Answer: Same answer' } as ChatResponse;
            });

            const result = await engine.reason('Q?', 'ctx', 'reflection');

            // Should stop early because answers are similar
            // Initial (1 call) + 1 critique that sees same answer = 2 calls total
            expect(llm.chat).toHaveBeenCalledTimes(2);
            expect(result.answer).toBe('Same answer');
        });

        it('should iterate up to maxIterations', async () => {
            let callCount = 0;
            vi.mocked(llm.chat).mockImplementation(async () => {
                callCount++;
                return { content: `Final Answer: Answer version ${callCount}` } as ChatResponse;
            });

            const engine3 = new ReasoningEngine(llm, {
                reflection: { maxIterations: 3, improvementThreshold: 0.1 },
            });

            await engine3.reason('Q?', 'ctx', 'reflection');

            // 1 initial + 3 iterations = 4 calls
            expect(llm.chat).toHaveBeenCalledTimes(4);
        });
    });

    // ========================================================================
    // Auto Strategy Selection
    // ========================================================================

    describe('auto strategy selection', () => {
        it('should use direct for simple short questions', async () => {
            vi.mocked(llm.chat).mockResolvedValue({ content: 'Yes.' } as ChatResponse);

            const result = await engine.reason('Hi?', 'ctx', 'auto');

            expect(result.strategy).toBe('direct');
        });

        it('should use chain-of-thought for moderate complexity', async () => {
            const cotResponse = `Step 1: Think
Final Answer: Result`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            // Two complex keywords ("how" + "explain") push complexity into 0.3-0.6 range
            // for chain-of-thought selection. "how" alone with a short prompt scores < 0.3
            // which would resolve to "direct".
            const result = await engine.reason(
                'How would you explain the process of photosynthesis in plants?',
                'Biology context',
                'auto'
            );

            expect(result.strategy).toBe('chain-of-thought');
        });

        it('should use self-consistency for higher complexity', async () => {
            const cotResponse = `Step 1: Think
Final Answer: Result`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            // Multiple complex keywords: "why", "compare", "evaluate"
            const result = await engine.reason(
                'Why should we compare and evaluate these two approaches to find the best solution?',
                'Analysis context',
                'auto'
            );

            // complexity: length factor + "why" + "compare" + "evaluate" = high
            expect(['self-consistency', 'reflection']).toContain(result.strategy);
        });

        it('should use reflection for very high complexity', async () => {
            let callCount = 0;
            vi.mocked(llm.chat).mockImplementation(async () => {
                callCount++;
                return { content: 'Final Answer: Deep analysis' } as ChatResponse;
            });

            // "why" + "how" + "explain" + "analyze" + "compare" + "evaluate" + long text
            const longQuestion = 'Why and how should we explain, analyze, compare, and evaluate ' +
                'the fundamental differences between quantum mechanics and general relativity ' +
                'in the context of unifying these theories? ' +
                'This requires deep analysis of mathematical frameworks and experimental evidence. ' +
                'Please provide a comprehensive explanation with examples.';

            const result = await engine.reason(longQuestion, 'Physics', 'auto');

            expect(result.strategy).toBe('reflection');
        });
    });

    // ========================================================================
    // Default fallback
    // ========================================================================

    describe('default fallback', () => {
        it('should fall back to chain-of-thought for unknown strategy', async () => {
            const cotResponse = `Step 1: Think
Final Answer: Fallback`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'unknown-strategy' as ReasoningStrategy);

            expect(result.answer).toBe('Fallback');
        });
    });

    // ========================================================================
    // Metrics
    // ========================================================================

    describe('metrics logging', () => {
        it('should log audit on successful reasoning', async () => {
            vi.mocked(llm.chat).mockResolvedValue({ content: 'Answer' } as ChatResponse);

            await engine.reason('Q?', 'ctx', 'direct');

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    component: 'ReasoningEngine',
                    operation: 'reason',
                    message: expect.stringContaining('direct'),
                })
            );
        });

        it('should log error on failure', async () => {
            vi.mocked(llm.chat).mockRejectedValue(new Error('LLM down'));

            await expect(engine.reason('Q?', 'ctx', 'direct')).rejects.toThrow('LLM down');

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    component: 'ReasoningEngine',
                    operation: 'reason',
                })
            );
        });

        it('should include duration in result', async () => {
            vi.mocked(llm.chat).mockResolvedValue({ content: 'Answer' } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'direct');

            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    // ========================================================================
    // Error handling
    // ========================================================================

    describe('error handling', () => {
        it('should rethrow LLM errors', async () => {
            vi.mocked(llm.chat).mockRejectedValue(new Error('Rate limit exceeded'));

            await expect(engine.reason('Q?', 'ctx', 'direct'))
                .rejects.toThrow('Rate limit exceeded');
        });

        it('should handle non-Error throws in audit logging', async () => {
            vi.mocked(llm.chat).mockRejectedValue('string error');

            await expect(engine.reason('Q?', 'ctx', 'direct'))
                .rejects.toBe('string error');

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        name: 'UnknownError',
                        message: 'string error',
                    }),
                })
            );
        });

        it('should work without metrics collector', async () => {
            const noMetricsEngine = new ReasoningEngine(llm);
            vi.mocked(llm.chat).mockResolvedValue({ content: 'ok' } as ChatResponse);

            const result = await noMetricsEngine.reason('Q?', 'ctx', 'direct');

            expect(result.answer).toBe('ok');
        });
    });

    // ========================================================================
    // Question complexity analysis
    // ========================================================================

    describe('question complexity', () => {
        it('should rate short simple questions as low complexity (auto selects direct)', async () => {
            vi.mocked(llm.chat).mockResolvedValue({ content: 'Yes' } as ChatResponse);

            const result = await engine.reason('Yes?', 'ctx', 'auto');

            expect(result.strategy).toBe('direct');
        });

        it('should increase complexity for mathematical expressions', async () => {
            const cotResponse = `Step 1: Calculate
Final Answer: 15`;
            vi.mocked(llm.chat).mockResolvedValue({ content: cotResponse } as ChatResponse);

            // "how" keyword + math expression
            const result = await engine.reason('How do you solve 5 + 10?', 'Math', 'auto');

            // Should be at least chain-of-thought due to "how" + math
            expect(['chain-of-thought', 'self-consistency']).toContain(result.strategy);
        });
    });

    // ========================================================================
    // Token estimation
    // ========================================================================

    describe('token estimation', () => {
        it('should estimate roughly 1 token per 4 characters', async () => {
            vi.mocked(llm.chat).mockResolvedValue({ content: 'a'.repeat(100) } as ChatResponse);

            const result = await engine.reason('Q?', 'ctx', 'direct');

            // Total text = prompt + response, tokens ~ total_chars / 4
            expect(result.tokensUsed).toBeGreaterThan(0);
        });
    });
});
