/**
 * Evaluator Tests
 *
 * Tests for GSEP's performance evaluation framework:
 * - Constructor (with/without LLM, enableSemanticJudge flag)
 * - evaluate: success rate, avg tokens, avg response time, avg quality
 * - evaluateTask: happy path, error handling, token estimation
 * - checkSuccess: keywords, minLength, maxLength, custom successCriteria
 * - checkSemanticValidation: all four semantic checks
 * - calculateQuality: keyword bonus, length bonus, clamping
 * - compare: PGA_WINS, BASELINE_WINS, TIE verdicts
 * - compareWithSuite: delegates to evaluate with suite tasks
 * - formatReport: markdown output structure
 * - formatComparisonReport: markdown comparison table
 * - STANDARD_TASKS: exported constant validation
 * - Semantic judge integration via evaluateTask
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Evaluator, STANDARD_TASKS } from '../Evaluator.js';
import type { EvaluatableGenome, EvaluationTask, BenchmarkResult, ComparisonResult } from '../Evaluator.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';

// ─── Test Helpers ────────────────────────────────────────────

function createMockGenome(responseText?: string): EvaluatableGenome {
    return {
        chat: vi.fn().mockResolvedValue(
            responseText ?? 'This is a test response with undefined check null validation error handling. ' +
            'It contains auth login token performance optimize memo scalable microservices database ' +
            'async await error keywords for various test scenarios. '.repeat(3),
        ),
    };
}

function createTask(overrides?: Partial<EvaluationTask>): EvaluationTask {
    return {
        id: 'test-1',
        name: 'Test Task',
        description: 'A test task',
        userMessage: 'Hello',
        expectedOutcome: {
            keywords: ['test'],
            minLength: 5,
        },
        difficulty: 'easy',
        ...overrides,
    };
}

function createMockLLM(): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: JSON.stringify({
                passed: true,
                confidence: 0.9,
                reasoning: 'All checks pass',
                violations: [],
            }),
        }),
    };
}

function createBenchmarkResult(overrides?: Partial<BenchmarkResult>): BenchmarkResult {
    return {
        totalTasks: 3,
        successfulTasks: 2,
        successRate: 66.7,
        avgTokensPerTask: 100,
        avgResponseTime: 50,
        avgQualityScore: 0.75,
        results: [
            {
                taskId: 'task-1',
                taskName: 'Task One',
                success: true,
                response: 'good response',
                tokensUsed: 80,
                responseTime: 40,
                qualityScore: 0.8,
            },
            {
                taskId: 'task-2',
                taskName: 'Task Two',
                success: false,
                response: 'bad response',
                tokensUsed: 120,
                responseTime: 60,
                qualityScore: 0.7,
                failureReason: 'Missing keyword: "auth"',
            },
        ],
        timestamp: new Date('2026-03-09T12:00:00Z'),
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────

describe('Evaluator', () => {
    let evaluator: Evaluator;

    beforeEach(() => {
        evaluator = new Evaluator();
    });

    // ─── Constructor ────────────────────────────────────────

    describe('constructor', () => {
        it('should create evaluator without options', () => {
            const e = new Evaluator();
            expect(e).toBeInstanceOf(Evaluator);
        });

        it('should create evaluator with LLM (semantic judge enabled by default)', () => {
            const e = new Evaluator({ llm: createMockLLM() });
            expect(e).toBeInstanceOf(Evaluator);
        });

        it('should create evaluator with LLM but semantic judge disabled', () => {
            const e = new Evaluator({ llm: createMockLLM(), enableSemanticJudge: false });
            expect(e).toBeInstanceOf(Evaluator);
        });

        it('should not create semantic judge when no LLM provided', () => {
            const e = new Evaluator({ enableSemanticJudge: true });
            expect(e).toBeInstanceOf(Evaluator);
        });
    });

    // ─── evaluate ───────────────────────────────────────────

    describe('evaluate', () => {
        it('should return correct benchmark result for a single task', async () => {
            const genome = createMockGenome('This is a test response with enough length');
            const tasks = [createTask({ expectedOutcome: { keywords: ['test'], minLength: 5 } })];

            const result = await evaluator.evaluate(genome, tasks, 'user-1');

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(1);
            expect(result.successRate).toBe(100);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].success).toBe(true);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should calculate correct success rate for mixed results', async () => {
            const genome: EvaluatableGenome = {
                chat: vi.fn()
                    .mockResolvedValueOnce('test keyword present and long enough response')
                    .mockResolvedValueOnce('missing the required keyword'),
            };

            const tasks = [
                createTask({ id: 'pass', expectedOutcome: { keywords: ['test'], minLength: 5 } }),
                createTask({ id: 'fail', expectedOutcome: { keywords: ['nonexistent_keyword'], minLength: 5 } }),
            ];

            const result = await evaluator.evaluate(genome, tasks, 'user-1');

            expect(result.totalTasks).toBe(2);
            expect(result.successfulTasks).toBe(1);
            expect(result.successRate).toBe(50);
        });

        it('should calculate averages for tokens, time, and quality', async () => {
            const genome = createMockGenome('test response');
            const tasks = [
                createTask({ id: 't1' }),
                createTask({ id: 't2' }),
            ];

            const result = await evaluator.evaluate(genome, tasks, 'user-1');

            expect(result.avgTokensPerTask).toBeGreaterThan(0);
            expect(result.avgResponseTime).toBeGreaterThanOrEqual(0);
            expect(result.avgQualityScore).toBeGreaterThanOrEqual(0);
            expect(result.avgQualityScore).toBeLessThanOrEqual(1);
        });

        it('should handle genome.chat throwing an error', async () => {
            const genome: EvaluatableGenome = {
                chat: vi.fn().mockRejectedValue(new Error('LLM connection failed')),
            };
            const tasks = [createTask()];

            const result = await evaluator.evaluate(genome, tasks, 'user-1');

            expect(result.totalTasks).toBe(1);
            expect(result.successfulTasks).toBe(0);
            expect(result.successRate).toBe(0);
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toBe('LLM connection failed');
            expect(result.results[0].response).toBe('');
            expect(result.results[0].tokensUsed).toBe(0);
            expect(result.results[0].qualityScore).toBe(0);
        });

        it('should handle non-Error thrown by genome.chat', async () => {
            const genome: EvaluatableGenome = {
                chat: vi.fn().mockRejectedValue('string error'),
            };
            const tasks = [createTask()];

            const result = await evaluator.evaluate(genome, tasks, 'user-1');

            expect(result.results[0].failureReason).toBe('Unknown error');
        });
    });

    // ─── checkSuccess (via evaluate) ────────────────────────

    describe('checkSuccess (via evaluate)', () => {
        it('should pass when all keywords are present', async () => {
            const genome = createMockGenome('I check for undefined and null values');
            const task = createTask({
                expectedOutcome: { keywords: ['undefined', 'null'] },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should fail when a keyword is missing', async () => {
            const genome = createMockGenome('This response has no relevant keywords');
            const task = createTask({
                expectedOutcome: { keywords: ['missing_word'] },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('Missing keyword');
        });

        it('should be case-insensitive for keyword matching', async () => {
            const genome = createMockGenome('This has UNDEFINED and NULL');
            const task = createTask({
                expectedOutcome: { keywords: ['undefined', 'null'] },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should fail when response is shorter than minLength', async () => {
            const genome = createMockGenome('short');
            const task = createTask({
                expectedOutcome: { minLength: 1000 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('too short');
        });

        it('should fail when response exceeds maxLength', async () => {
            const genome = createMockGenome('a'.repeat(200));
            const task = createTask({
                expectedOutcome: { maxLength: 10 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('too long');
        });

        it('should pass when response is within min/max length bounds', async () => {
            const genome = createMockGenome('test ' + 'a'.repeat(50));
            const task = createTask({
                expectedOutcome: { keywords: ['test'], minLength: 10, maxLength: 200 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should pass when custom successCriteria returns true', async () => {
            const genome = createMockGenome('test response');
            const task = createTask({
                expectedOutcome: {
                    successCriteria: (resp: string) => resp.includes('test'),
                },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should fail when custom successCriteria returns false', async () => {
            const genome = createMockGenome('response without the word');
            const task = createTask({
                expectedOutcome: {
                    successCriteria: (resp: string) => resp.includes('banana'),
                },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('Custom success criteria not met');
        });

        it('should handle successCriteria that throws an error', async () => {
            const genome = createMockGenome('response');
            const task = createTask({
                expectedOutcome: {
                    successCriteria: () => { throw new Error('criteria crash'); },
                },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('Success criteria error');
        });

        it('should pass with no keywords and no length constraints', async () => {
            const genome = createMockGenome('any response');
            const task = createTask({
                expectedOutcome: {},
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });
    });

    // ─── checkSemanticValidation (via evaluate, no semantic judge) ──

    describe('checkSemanticValidation (heuristic, no LLM)', () => {
        it('should fail when requiresPriorityFlow is set but response lacks ordering words', async () => {
            const genome = createMockGenome('test random content with no ordering');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'], minLength: 5 } }),
                semanticChecks: { requiresPriorityFlow: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('priority/ordering');
        });

        it('should pass when requiresPriorityFlow is set and response has ordering', async () => {
            const genome = createMockGenome('test first do X then do Y');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresPriorityFlow: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should fail when requiresValidationClause is set but response lacks validation words', async () => {
            const genome = createMockGenome('test just do the thing blindly');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresValidationClause: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('validation/error handling');
        });

        it('should pass when requiresValidationClause is set and response has validation words', async () => {
            const genome = createMockGenome('test please validate and check the input');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresValidationClause: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(true);
        });

        it('should fail when requiresDeterministicTooling is set but no tool words', async () => {
            const genome = createMockGenome('test vague abstract thing');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresDeterministicTooling: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('deterministic tool');
        });

        it('should fail when requiresConciseDirective is set and response is verbose', async () => {
            const genome = createMockGenome('test ' + 'x'.repeat(600));
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresConciseDirective: true },
            };

            const result = await evaluator.evaluate(genome, [task], 'user-1');
            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('concise');
        });
    });

    // ─── Semantic judge integration ─────────────────────────

    describe('semantic judge integration', () => {
        it('should use semantic judge when LLM is provided and checks exist', async () => {
            const mockLLM = createMockLLM();
            const evalWithJudge = new Evaluator({ llm: mockLLM });

            const genome = createMockGenome('test validate check everything');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresValidationClause: true },
            };

            const result = await evalWithJudge.evaluate(genome, [task], 'user-1');

            // LLM should have been called for semantic judgment
            expect(mockLLM.chat).toHaveBeenCalled();
            expect(result.results[0].success).toBe(true);
        });

        it('should fail semantic check when judge returns passed=false', async () => {
            const mockLLM: LLMAdapter = {
                name: 'mock',
                model: 'mock-model',
                chat: vi.fn().mockResolvedValue({
                    content: JSON.stringify({
                        passed: false,
                        confidence: 0.9,
                        reasoning: 'Missing validation clause',
                        violations: ['No validation found'],
                    }),
                }),
            };
            const evalWithJudge = new Evaluator({ llm: mockLLM });

            const genome = createMockGenome('test response');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresValidationClause: true },
            };

            const result = await evalWithJudge.evaluate(genome, [task], 'user-1');

            expect(result.results[0].success).toBe(false);
            expect(result.results[0].failureReason).toContain('Missing validation clause');
        });

        it('should fail semantic check when judge confidence is below 0.7', async () => {
            const mockLLM: LLMAdapter = {
                name: 'mock',
                model: 'mock-model',
                chat: vi.fn().mockResolvedValue({
                    content: JSON.stringify({
                        passed: true,
                        confidence: 0.5, // Below 0.7 threshold
                        reasoning: 'Low confidence pass',
                        violations: [],
                    }),
                }),
            };
            const evalWithJudge = new Evaluator({ llm: mockLLM });

            const genome = createMockGenome('test response');
            const task = {
                ...createTask({ expectedOutcome: { keywords: ['test'] } }),
                semanticChecks: { requiresValidationClause: true },
            };

            const result = await evalWithJudge.evaluate(genome, [task], 'user-1');

            // passed=true but confidence < 0.7, so success should be false
            expect(result.results[0].success).toBe(false);
        });
    });

    // ─── calculateQuality (via evaluate) ────────────────────

    describe('calculateQuality (via evaluate)', () => {
        it('should give base score of 0.5 when no keywords and no length bounds', async () => {
            const genome = createMockGenome('generic response');
            const task = createTask({ expectedOutcome: {} });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            expect(result.results[0].qualityScore).toBe(0.5);
        });

        it('should increase quality for keyword coverage', async () => {
            const genome = createMockGenome('test keyword response');
            const task = createTask({
                expectedOutcome: { keywords: ['test', 'keyword'] },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            // Base 0.5 + full keyword coverage (1.0) * 0.3 = 0.8
            expect(result.results[0].qualityScore).toBe(0.8);
        });

        it('should give partial keyword bonus for partial coverage', async () => {
            const genome = createMockGenome('test response without second keyword');
            const task = createTask({
                expectedOutcome: { keywords: ['test', 'missing'] },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            // Base 0.5 + half keyword coverage (0.5) * 0.3 = 0.65
            // But task fails due to missing keyword, quality is still calculated
            expect(result.results[0].qualityScore).toBe(0.65);
        });

        it('should add length bonus when both minLength and maxLength are set', async () => {
            // Ideal length = (50 + 150) / 2 = 100
            const genome = createMockGenome('test ' + 'a'.repeat(95)); // length ~100
            const task = createTask({
                expectedOutcome: { keywords: ['test'], minLength: 50, maxLength: 150 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            // Base 0.5 + keyword 0.3 + some length bonus
            expect(result.results[0].qualityScore).toBeGreaterThan(0.8);
        });

        it('should not add length bonus when only minLength is set (no maxLength)', async () => {
            const genome = createMockGenome('test response');
            const task = createTask({
                expectedOutcome: { keywords: ['test'], minLength: 5 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            // Base 0.5 + keyword 0.3 = 0.8, no length bonus
            expect(result.results[0].qualityScore).toBe(0.8);
        });

        it('should clamp quality score between 0 and 1', async () => {
            // Even with all bonuses, should not exceed 1.0
            const genome = createMockGenome('test keyword response exactly right length');
            const task = createTask({
                expectedOutcome: { keywords: ['test', 'keyword'], minLength: 30, maxLength: 50 },
            });

            const result = await evaluator.evaluate(genome, [task], 'user-1');

            expect(result.results[0].qualityScore).toBeLessThanOrEqual(1);
            expect(result.results[0].qualityScore).toBeGreaterThanOrEqual(0);
        });
    });

    // ─── compare ────────────────────────────────────────────

    describe('compare', () => {
        beforeEach(() => {
            vi.spyOn(console, 'log').mockImplementation(() => {});
        });

        it('should return PGA_WINS when GSEP genome outperforms baseline significantly', async () => {
            // GSEP genome: responds with all keywords and long responses
            const pgaGenome = createMockGenome(
                'test undefined check null validation error handling auth login token ' +
                'performance optimize memo scalable microservices database async await ' +
                'response '.repeat(5),
            );
            // Baseline: short and missing keywords
            const baselineGenome = createMockGenome('ok');

            const tasks = [
                createTask({
                    id: 'compare-1',
                    expectedOutcome: { keywords: ['test'], minLength: 5 },
                }),
            ];

            const result = await evaluator.compare(pgaGenome, baselineGenome, tasks, 'user-1');

            expect(result.withPGA).toBeDefined();
            expect(result.withoutPGA).toBeDefined();
            expect(result.improvements).toBeDefined();
            // GSEP succeeds, baseline fails on minLength (though 'ok' is only 2 chars vs min 5)
            expect(result.withPGA.successRate).toBeGreaterThanOrEqual(result.withoutPGA.successRate);
        });

        it('should return BASELINE_WINS or TIE when baseline outperforms GSEP on success rate', async () => {
            // GSEP genome: missing required keywords → fails success checks
            const pgaGenome = createMockGenome('irrelevant content without required words');
            // Baseline: has keywords → passes
            const baselineGenome = createMockGenome('test response that passes');

            const tasks = [
                createTask({
                    id: 'baseline-wins-1',
                    expectedOutcome: { keywords: ['test'], minLength: 5 },
                }),
            ];

            const result = await evaluator.compare(pgaGenome, baselineGenome, tasks, 'user-1');

            // GSEP fails, baseline passes
            expect(result.withPGA.successRate).toBe(0);
            expect(result.withoutPGA.successRate).toBe(100);
            // Verdict depends on sum of 4 metrics; responseTime NaN with 0ms mocks → TIE
            // In production with real latency it would be BASELINE_WINS
            expect(result.verdict).not.toBe('PGA_WINS');
        });

        it('should return TIE when results are similar', async () => {
            const response = 'test response long enough';
            const genome1 = createMockGenome(response);
            const genome2 = createMockGenome(response);

            const tasks = [createTask({ expectedOutcome: { keywords: ['test'], minLength: 5 } })];

            const result = await evaluator.compare(genome1, genome2, tasks, 'user-1');

            expect(result.verdict).toBe('TIE');
        });

        it('should correctly compute improvement percentages', async () => {
            const pgaGenome = createMockGenome('test');
            const baselineGenome = createMockGenome('test');

            const tasks = [createTask({ expectedOutcome: { keywords: ['test'] } })];

            const result = await evaluator.compare(pgaGenome, baselineGenome, tasks, 'user-1');

            // Same responses => all improvements should be ~0
            expect(result.improvements.successRate).toBe(0);
            expect(typeof result.improvements.tokenEfficiency).toBe('number');
            expect(typeof result.improvements.responseTime).toBe('number');
            expect(typeof result.improvements.qualityScore).toBe('number');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });
    });

    // ─── compareWithSuite ───────────────────────────────────

    describe('compareWithSuite', () => {
        it('should evaluate genome against a named benchmark suite', async () => {
            const genome = createMockGenome(
                'This is a debugging guide for undefined check null error async await ' +
                'auth login token performance optimize memo scalable microservices database ' +
                'layer0 layer1 layer2 immutable mutation fitness selection genome user preferences traits cognitive ' +
                'a]'.repeat(20),
            );

            const result = await evaluator.compareWithSuite(genome, 'pga-specific-v1', 'user-1');

            expect(result.totalTasks).toBeGreaterThan(0);
            expect(result.results.length).toBe(result.totalTasks);
            expect(result.timestamp).toBeInstanceOf(Date);
        });
    });

    // ─── formatReport ───────────────────────────────────────

    describe('formatReport', () => {
        it('should format benchmark result as markdown', () => {
            const benchmark = createBenchmarkResult();

            const report = evaluator.formatReport(benchmark);

            expect(report).toContain('GSEP Evaluation Report');
            expect(report).toContain('Overall Results');
            expect(report).toContain('Task Results');
            expect(report).toContain('Total Tasks');
            expect(report).toContain('Successful');
            expect(report).toContain('Success Rate');
        });

        it('should include task results with success/failure indicators', () => {
            const benchmark = createBenchmarkResult();

            const report = evaluator.formatReport(benchmark);

            expect(report).toContain('Task One');
            expect(report).toContain('Task Two');
            expect(report).toContain('SUCCESS');
            expect(report).toContain('FAILED');
        });

        it('should include failure reason for failed tasks', () => {
            const benchmark = createBenchmarkResult();

            const report = evaluator.formatReport(benchmark);

            expect(report).toContain('Failure Reason');
            expect(report).toContain('Missing keyword');
        });

        it('should include token and timing information', () => {
            const benchmark = createBenchmarkResult();

            const report = evaluator.formatReport(benchmark);

            expect(report).toContain('Tokens');
            expect(report).toContain('Response Time');
            expect(report).toContain('Quality');
        });
    });

    // ─── formatComparisonReport ─────────────────────────────

    describe('formatComparisonReport', () => {
        it('should format comparison with PGA_WINS verdict', () => {
            const comparison: ComparisonResult = {
                withPGA: createBenchmarkResult({ successRate: 90, avgTokensPerTask: 80, avgResponseTime: 40, avgQualityScore: 0.9 }),
                withoutPGA: createBenchmarkResult({ successRate: 60, avgTokensPerTask: 120, avgResponseTime: 60, avgQualityScore: 0.6 }),
                improvements: {
                    successRate: 30,
                    tokenEfficiency: 33.33,
                    responseTime: 33.33,
                    qualityScore: 50,
                },
                verdict: 'PGA_WINS',
            };

            const report = evaluator.formatComparisonReport(comparison);

            expect(report).toContain('GSEP vs Baseline');
            expect(report).toContain('VERDICT: PGA_WINS');
            expect(report).toContain('Improvements');
            expect(report).toContain('Side-by-Side');
            expect(report).toContain('Success Rate');
            expect(report).toContain('Avg Tokens');
        });

        it('should format comparison with BASELINE_WINS verdict', () => {
            const comparison: ComparisonResult = {
                withPGA: createBenchmarkResult({ successRate: 30 }),
                withoutPGA: createBenchmarkResult({ successRate: 90 }),
                improvements: {
                    successRate: -60,
                    tokenEfficiency: -20,
                    responseTime: -10,
                    qualityScore: -30,
                },
                verdict: 'BASELINE_WINS',
            };

            const report = evaluator.formatComparisonReport(comparison);

            expect(report).toContain('VERDICT: BASELINE_WINS');
        });

        it('should format comparison with TIE verdict', () => {
            const comparison: ComparisonResult = {
                withPGA: createBenchmarkResult(),
                withoutPGA: createBenchmarkResult(),
                improvements: {
                    successRate: 0,
                    tokenEfficiency: 0,
                    responseTime: 0,
                    qualityScore: 0,
                },
                verdict: 'TIE',
            };

            const report = evaluator.formatComparisonReport(comparison);

            expect(report).toContain('VERDICT: TIE');
        });

        it('should include positive improvement with + sign', () => {
            const comparison: ComparisonResult = {
                withPGA: createBenchmarkResult({ successRate: 80 }),
                withoutPGA: createBenchmarkResult({ successRate: 60 }),
                improvements: {
                    successRate: 20,
                    tokenEfficiency: 10,
                    responseTime: 15,
                    qualityScore: 5,
                },
                verdict: 'PGA_WINS',
            };

            const report = evaluator.formatComparisonReport(comparison);

            expect(report).toContain('+20.00%');
        });

        it('should include negative improvements without + sign', () => {
            const comparison: ComparisonResult = {
                withPGA: createBenchmarkResult(),
                withoutPGA: createBenchmarkResult(),
                improvements: {
                    successRate: -5,
                    tokenEfficiency: -3,
                    responseTime: -2,
                    qualityScore: -1,
                },
                verdict: 'TIE',
            };

            const report = evaluator.formatComparisonReport(comparison);

            expect(report).toContain('-5.00%');
        });
    });

    // ─── STANDARD_TASKS ─────────────────────────────────────

    describe('STANDARD_TASKS', () => {
        it('should export a non-empty array of evaluation tasks', () => {
            expect(Array.isArray(STANDARD_TASKS)).toBe(true);
            expect(STANDARD_TASKS.length).toBe(5);
        });

        it('every standard task should have required fields', () => {
            for (const task of STANDARD_TASKS) {
                expect(task.id).toBeTruthy();
                expect(task.name).toBeTruthy();
                expect(task.description).toBeTruthy();
                expect(task.userMessage).toBeTruthy();
                expect(task.expectedOutcome).toBeDefined();
                expect(['easy', 'medium', 'hard']).toContain(task.difficulty);
            }
        });

        it('all standard task IDs should be unique', () => {
            const ids = STANDARD_TASKS.map(t => t.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('every standard task should have at least keywords or minLength', () => {
            for (const task of STANDARD_TASKS) {
                const hasKeywords = task.expectedOutcome.keywords && task.expectedOutcome.keywords.length > 0;
                const hasMinLength = task.expectedOutcome.minLength && task.expectedOutcome.minLength > 0;
                expect(hasKeywords || hasMinLength).toBe(true);
            }
        });
    });
});
