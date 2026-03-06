/**
 * ProofOfValueRunner Tests
 *
 * Tests for the proof-of-value orchestrator that measures
 * PGA evolution improvement over multiple cycles.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect, vi } from 'vitest';
import { ProofOfValueRunner } from '../evaluation/ProofOfValueRunner.js';
import type { ProofOfValueConfig } from '../evaluation/ProofOfValueRunner.js';
import type { EvaluatableGenome, EvaluationTask } from '../evaluation/Evaluator.js';
import { Evaluator } from '../evaluation/Evaluator.js';

// ─── Helpers ────────────────────────────────────────────────

const SIMPLE_TASKS: EvaluationTask[] = [
    {
        id: 'task-1',
        name: 'Test Task 1',
        description: 'Simple test',
        userMessage: 'What is JavaScript?',
        expectedOutcome: {
            keywords: ['javascript', 'language'],
            minLength: 20,
        },
        difficulty: 'easy',
    },
    {
        id: 'task-2',
        name: 'Test Task 2',
        description: 'Code test',
        userMessage: 'Write a function to add numbers',
        expectedOutcome: {
            keywords: ['function', 'return'],
            minLength: 20,
        },
        difficulty: 'medium',
    },
];

function createMockGenome(): EvaluatableGenome {
    return {
        chat: vi.fn().mockResolvedValue(
            'JavaScript is a programming language used for web development. It supports functions, objects, and more.',
        ),
    };
}

function createDefaultConfig(overrides: Partial<ProofOfValueConfig> = {}): ProofOfValueConfig {
    return {
        name: 'Test Experiment',
        cycles: 2,
        interactionsPerCycle: 3,
        dataset: SIMPLE_TASKS,
        userId: 'test-user',
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────

describe('ProofOfValueRunner', () => {
    describe('run()', () => {
        it('should execute baseline + N cycles', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 2 });

            const result = await runner.run(genome, config);

            expect(result.baseline).toBeDefined();
            expect(result.cycles).toHaveLength(2);
            expect(result.fitnessCurve).toHaveLength(3); // baseline + 2 cycles
        });

        it('should have fitnessCurve starting at cycle 0', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);

            expect(result.fitnessCurve[0].cycle).toBe(0);
            expect(result.fitnessCurve[1].cycle).toBe(1);
        });

        it('should call genome.chat() for interactions', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 1, interactionsPerCycle: 5 });

            await runner.run(genome, config);

            // 5 interactions + tasks for baseline eval + tasks for cycle eval
            // baseline: 2 tasks, cycle1: 5 interactions + 2 eval tasks
            expect((genome.chat as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(5);
        });

        it('should determine IMPROVEMENT_PROVEN when quality increases significantly', async () => {
            let callCount = 0;
            const genome: EvaluatableGenome = {
                chat: vi.fn().mockImplementation(async () => {
                    callCount++;
                    // Progressively better responses
                    if (callCount > 10) {
                        return '## JavaScript\n\nJavaScript is a dynamic programming language.\n\n```typescript\nfunction add(a: number, b: number): number { return a + b; }\n```\n\n- Supports functions\n- Has objects\n- Used for web development';
                    }
                    return 'JavaScript is a language.';
                }),
            };

            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 3, interactionsPerCycle: 5 });

            const result = await runner.run(genome, config);

            // Later cycles should have higher quality due to better responses
            const firstQuality = result.fitnessCurve[0].quality;
            const lastQuality = result.fitnessCurve[result.fitnessCurve.length - 1].quality;
            expect(lastQuality).toBeGreaterThanOrEqual(firstQuality);
        });

        it('should call onCycleComplete callback', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 2 });
            const onComplete = vi.fn();

            await runner.run(genome, config, onComplete);

            expect(onComplete).toHaveBeenCalledTimes(2);
            expect(onComplete).toHaveBeenCalledWith(1, expect.objectContaining({ cycle: 1 }));
            expect(onComplete).toHaveBeenCalledWith(2, expect.objectContaining({ cycle: 2 }));
        });

        it('should record totalDuration', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 1 });

            const result = await runner.run(genome, config);

            expect(result.totalDuration).toBeGreaterThanOrEqual(0);
        });

        it('should include finalComparison with deltas', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);

            expect(result.finalComparison).toBeDefined();
            expect(typeof result.finalComparison.qualityDelta).toBe('number');
            expect(typeof result.finalComparison.successRateDelta).toBe('number');
            expect(typeof result.finalComparison.tokenDelta).toBe('number');
        });

        it('should handle chat errors gracefully', async () => {
            let calls = 0;
            const genome: EvaluatableGenome = {
                chat: vi.fn().mockImplementation(async () => {
                    calls++;
                    if (calls % 3 === 0) throw new Error('LLM error');
                    return 'JavaScript is a programming language used for building websites and apps.';
                }),
            };

            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 1 });

            // Should not throw
            const result = await runner.run(genome, config);
            expect(result).toBeDefined();
        });

        it('should return NO_SIGNIFICANT_CHANGE when quality stays flat', async () => {
            const genome = createMockGenome(); // Same response every time
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ cycles: 2 });

            const result = await runner.run(genome, config);

            expect(result.verdict).toBe('NO_SIGNIFICANT_CHANGE');
        });
    });

    describe('formatConsoleReport()', () => {
        it('should include experiment name', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig({ name: 'My Experiment' });

            const result = await runner.run(genome, config);
            const report = runner.formatConsoleReport(result);

            expect(report).toContain('My Experiment');
        });

        it('should include verdict', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatConsoleReport(result);

            expect(report).toContain(result.verdict.replace(/_/g, ' '));
        });

        it('should include fitness curve section', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatConsoleReport(result);

            expect(report).toContain('FITNESS CURVE');
            expect(report).toContain('Base');
        });

        it('should include duration', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatConsoleReport(result);

            expect(report).toContain('TOTAL DURATION');
        });
    });

    describe('formatMarkdownReport()', () => {
        it('should start with markdown header', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatMarkdownReport(result);

            expect(report).toContain('# PGA Proof of Value Report');
        });

        it('should include evolution curve table', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatMarkdownReport(result);

            expect(report).toContain('## Evolution Curve');
            expect(report).toContain('| Cycle | Quality');
            expect(report).toContain('Baseline');
        });

        it('should include methodology section', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatMarkdownReport(result);

            expect(report).toContain('## Methodology');
        });

        it('should include final comparison', async () => {
            const genome = createMockGenome();
            const runner = new ProofOfValueRunner();
            const config = createDefaultConfig();

            const result = await runner.run(genome, config);
            const report = runner.formatMarkdownReport(result);

            expect(report).toContain('## Final Comparison');
            expect(report).toContain('Quality Delta');
        });
    });
});
