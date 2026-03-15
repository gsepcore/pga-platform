/**
 * SemanticJudge Tests
 *
 * Tests for GSEP's LLM-based semantic validation system:
 * - Auto-pass when no semanticChecks are defined
 * - LLM-based judging with valid JSON response
 * - LLM-based judging with JSON wrapped in markdown code block
 * - Parsing failures (no JSON in LLM response)
 * - Heuristic fallback when LLM throws an error
 * - Heuristic checks: requiresPriorityFlow
 * - Heuristic checks: requiresValidationClause
 * - Heuristic checks: requiresDeterministicTooling
 * - Heuristic checks: requiresConciseDirective
 * - Multiple heuristic violations
 * - Confidence clamping (0-1 range)
 * - batchJudge processes multiple cases sequentially
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticJudge } from '../SemanticJudge.js';
import type { SemanticJudgment } from '../SemanticJudge.js';
import type { SandboxCaseDefinition } from '../SandboxSuites.js';
import type { LLMAdapter, ChatResponse } from '../../interfaces/LLMAdapter.js';

// ─── Test Helpers ────────────────────────────────────────────

function createMockLLM(chatResponse?: Partial<ChatResponse>): LLMAdapter {
    return {
        name: 'mock-provider',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: JSON.stringify({
                passed: true,
                confidence: 0.9,
                reasoning: 'Response meets all requirements',
                violations: [],
            }),
            ...chatResponse,
        }),
    };
}

function createTestCase(overrides?: Partial<SandboxCaseDefinition>): SandboxCaseDefinition {
    return {
        id: 'test-case-1',
        name: 'Test Case',
        description: 'A test case for semantic validation',
        userMessage: 'Test message',
        expectedOutcome: {
            keywords: ['test'],
            minLength: 10,
        },
        difficulty: 'easy',
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────

describe('SemanticJudge', () => {
    let mockLLM: LLMAdapter;
    let judge: SemanticJudge;

    beforeEach(() => {
        mockLLM = createMockLLM();
        judge = new SemanticJudge(mockLLM);
    });

    // ─── judge (no semantic checks) ─────────────────────────

    describe('judge - no semantic checks', () => {
        it('should auto-pass when no semanticChecks are defined', async () => {
            const testCase = createTestCase({ semanticChecks: undefined });

            const result = await judge.judge(testCase, 'any response');

            expect(result.passed).toBe(true);
            expect(result.confidence).toBe(1.0);
            expect(result.reasoning).toBe('No semantic checks required');
            // LLM should NOT be called when no checks
            expect(mockLLM.chat).not.toHaveBeenCalled();
        });
    });

    // ─── judge (LLM-based) ──────────────────────────────────

    describe('judge - LLM-based validation', () => {
        it('should call LLM with correct system and user messages', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            await judge.judge(testCase, 'I will ensure and validate input');

            expect(mockLLM.chat).toHaveBeenCalledTimes(1);
            const calls = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0];
            const messages = calls[0];

            // Should have system + user messages
            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toContain('semantic validator');
            expect(messages[1].role).toBe('user');
            expect(messages[1].content).toContain('Test Case');
        });

        it('should parse valid JSON response from LLM', async () => {
            const mockResponse: ChatResponse = {
                content: JSON.stringify({
                    passed: true,
                    confidence: 0.85,
                    reasoning: 'Response demonstrates proper validation',
                    violations: [],
                }),
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'I check and validate everything');

            expect(result.passed).toBe(true);
            expect(result.confidence).toBe(0.85);
            expect(result.reasoning).toBe('Response demonstrates proper validation');
        });

        it('should parse JSON wrapped in markdown code block', async () => {
            const mockResponse: ChatResponse = {
                content: '```json\n{"passed": false, "confidence": 0.3, "reasoning": "Missing validation", "violations": ["No error handling"]}\n```',
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'Some response without validation');

            expect(result.passed).toBe(false);
            expect(result.confidence).toBe(0.3);
            expect(result.violations).toEqual(['No error handling']);
        });

        it('should handle LLM response with no JSON (parse failure)', async () => {
            const mockResponse: ChatResponse = {
                content: 'This is not JSON at all, just plain text without any braces.',
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'Some response');

            expect(result.passed).toBe(false);
            expect(result.confidence).toBe(0.5);
            expect(result.reasoning).toContain('Failed to parse LLM judgment');
            expect(result.violations).toContain('Judgment parsing failed');
        });

        it('should clamp confidence to 0-1 range', async () => {
            const mockResponse: ChatResponse = {
                content: JSON.stringify({
                    passed: true,
                    confidence: 5.0, // Over 1.0
                    reasoning: 'Very confident',
                }),
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresPriorityFlow: true },
            });

            const result = await judge.judge(testCase, 'First do X, then do Y');

            expect(result.confidence).toBe(1.0);
        });

        it('should clamp negative confidence to 0', async () => {
            const mockResponse: ChatResponse = {
                content: JSON.stringify({
                    passed: false,
                    confidence: -0.5,
                    reasoning: 'Uncertain',
                }),
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresPriorityFlow: true },
            });

            const result = await judge.judge(testCase, 'response');

            expect(result.confidence).toBe(0);
        });

        it('should handle non-array violations gracefully', async () => {
            const mockResponse: ChatResponse = {
                content: JSON.stringify({
                    passed: false,
                    confidence: 0.4,
                    reasoning: 'Has issues',
                    violations: 'not an array',
                }),
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'response');

            expect(result.violations).toBeUndefined();
        });

        it('should handle missing reasoning in LLM response', async () => {
            const mockResponse: ChatResponse = {
                content: JSON.stringify({
                    passed: true,
                    confidence: 0.8,
                }),
            };
            mockLLM = createMockLLM(mockResponse);
            judge = new SemanticJudge(mockLLM);

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'I validate everything');

            expect(result.reasoning).toBe('No reasoning provided');
        });
    });

    // ─── judge (heuristic fallback) ─────────────────────────

    describe('judge - heuristic fallback on LLM error', () => {
        beforeEach(() => {
            mockLLM = {
                name: 'mock-provider',
                model: 'mock-model',
                chat: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
            };
            judge = new SemanticJudge(mockLLM);
        });

        it('should fall back to heuristic when LLM throws', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'I validate and check the input');

            expect(result.passed).toBe(true);
            expect(result.confidence).toBe(0.7);
            expect(result.reasoning).toContain('Heuristic validation passed');
        });

        it('should detect missing priority flow in heuristic mode', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresPriorityFlow: true },
            });

            const result = await judge.judge(testCase, 'Here is some random content with no ordering');

            expect(result.passed).toBe(false);
            expect(result.violations).toContain('Missing priority/ordering flow');

            vi.restoreAllMocks();
        });

        it('should pass priority flow when ordering words are present', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresPriorityFlow: true },
            });

            const result = await judge.judge(testCase, 'First do X, then do Y');

            expect(result.passed).toBe(true);

            vi.restoreAllMocks();
        });

        it('should detect missing validation clause in heuristic mode', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            const result = await judge.judge(testCase, 'Just do the thing without any care');

            expect(result.passed).toBe(false);
            expect(result.violations).toContain('Missing validation/error handling');

            vi.restoreAllMocks();
        });

        it('should detect missing deterministic tooling in heuristic mode', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresDeterministicTooling: true },
            });

            const result = await judge.judge(testCase, 'Something vague and abstract');

            expect(result.passed).toBe(false);
            expect(result.violations).toContain('Missing deterministic tool specification');

            vi.restoreAllMocks();
        });

        it('should pass deterministic tooling when tool words are present', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresDeterministicTooling: true },
            });

            const result = await judge.judge(testCase, 'Use the Read tool to read the file');

            expect(result.passed).toBe(true);

            vi.restoreAllMocks();
        });

        it('should detect verbose response for requiresConciseDirective', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresConciseDirective: true },
            });

            // Response > 500 chars with no bullet structure
            const verboseResponse = 'a'.repeat(600);

            const result = await judge.judge(testCase, verboseResponse);

            expect(result.passed).toBe(false);
            expect(result.violations).toContain('Response not concise or well-structured');

            vi.restoreAllMocks();
        });

        it('should pass concise directive for short responses', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresConciseDirective: true },
            });

            const result = await judge.judge(testCase, 'Short and sweet response');

            expect(result.passed).toBe(true);

            vi.restoreAllMocks();
        });

        it('should pass concise directive for long response with bullet structure', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: { requiresConciseDirective: true },
            });

            // Long but has bullet structure (regex expects [-*\d]\. pattern, e.g. "1.")
            const bulletResponse = '1. Step one\n' + 'a'.repeat(600);

            const result = await judge.judge(testCase, bulletResponse);

            expect(result.passed).toBe(true);

            vi.restoreAllMocks();
        });

        it('should report multiple violations when multiple checks fail', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testCase = createTestCase({
                semanticChecks: {
                    requiresPriorityFlow: true,
                    requiresValidationClause: true,
                    requiresDeterministicTooling: true,
                },
            });

            // Response has none of the required patterns
            const result = await judge.judge(testCase, 'completely blank and vague');

            expect(result.passed).toBe(false);
            expect(result.violations).toBeDefined();
            expect(result.violations!.length).toBeGreaterThanOrEqual(2);

            vi.restoreAllMocks();
        });
    });

    // ─── buildJudgePrompt (indirectly tested) ───────────────

    describe('buildJudgePrompt (via LLM call inspection)', () => {
        it('should include requiresPriorityFlow requirement in prompt', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresPriorityFlow: true },
            });

            await judge.judge(testCase, 'First do X then Y');

            const userMessage = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0][1].content;
            expect(userMessage).toContain('priority/ordering');
        });

        it('should include requiresValidationClause requirement in prompt', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresValidationClause: true },
            });

            await judge.judge(testCase, 'Check the input');

            const userMessage = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0][1].content;
            expect(userMessage).toContain('validation/error handling');
        });

        it('should include requiresDeterministicTooling requirement in prompt', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresDeterministicTooling: true },
            });

            await judge.judge(testCase, 'Use Read tool');

            const userMessage = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0][1].content;
            expect(userMessage).toContain('concrete tools/methods');
        });

        it('should include requiresConciseDirective requirement in prompt', async () => {
            const testCase = createTestCase({
                semanticChecks: { requiresConciseDirective: true },
            });

            await judge.judge(testCase, 'Be brief');

            const userMessage = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0][1].content;
            expect(userMessage).toContain('concise');
        });

        it('should include all requirements when multiple checks are set', async () => {
            const testCase = createTestCase({
                semanticChecks: {
                    requiresPriorityFlow: true,
                    requiresValidationClause: true,
                    requiresDeterministicTooling: true,
                    requiresConciseDirective: true,
                },
            });

            await judge.judge(testCase, 'Some response');

            const userMessage = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0][1].content;
            expect(userMessage).toContain('priority/ordering');
            expect(userMessage).toContain('validation/error handling');
            expect(userMessage).toContain('concrete tools/methods');
            expect(userMessage).toContain('concise');
        });
    });

    // ─── batchJudge ─────────────────────────────────────────

    describe('batchJudge', () => {
        it('should return empty array for empty input', async () => {
            const results = await judge.batchJudge([]);

            expect(results).toEqual([]);
        });

        it('should judge all cases sequentially', async () => {
            const cases = [
                { testCase: createTestCase({ id: 'case-1', semanticChecks: { requiresValidationClause: true } }), response: 'I validate it' },
                { testCase: createTestCase({ id: 'case-2', semanticChecks: { requiresPriorityFlow: true } }), response: 'First then next' },
                { testCase: createTestCase({ id: 'case-3' }), response: 'No checks needed' },
            ];

            const results = await judge.batchJudge(cases);

            expect(results).toHaveLength(3);
            // First two should call LLM, third has no semantic checks
            expect(mockLLM.chat).toHaveBeenCalledTimes(2);
            // Third case should auto-pass
            expect(results[2].passed).toBe(true);
            expect(results[2].confidence).toBe(1.0);
        });

        it('should return correct number of judgments', async () => {
            const cases = Array.from({ length: 5 }, (_, i) => ({
                testCase: createTestCase({
                    id: `batch-${i}`,
                    semanticChecks: { requiresValidationClause: true },
                }),
                response: `I ensure and check everything ${i}`,
            }));

            const results = await judge.batchJudge(cases);

            expect(results).toHaveLength(5);
            expect(mockLLM.chat).toHaveBeenCalledTimes(5);
        });
    });
});
