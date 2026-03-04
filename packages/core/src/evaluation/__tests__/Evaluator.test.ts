import { describe, it, expect } from 'vitest';
import {
  Evaluator,
  type EvaluationTask,
  type EvaluatableGenome,
} from '../Evaluator';
import { BENCHMARK_SUITES, getBenchmarkSuite } from '../BenchmarkSuites';
import type { ChatResponse } from '../../interfaces/LLMAdapter';

class FakeGenome implements EvaluatableGenome {
  constructor(private responseText: string, private usage?: { inputTokens: number; outputTokens: number }) {}

  async chatWithMetrics(): Promise<ChatResponse> {
    return {
      content: this.responseText,
      usage: this.usage,
    };
  }
}

const TASKS: EvaluationTask[] = [
  {
    id: 't1',
    name: 'Simple task',
    description: 'Simple validation task',
    userMessage: 'Please provide a safe deterministic step-by-step answer.',
    expectedOutcome: {
      keywords: ['safe', 'step'],
      minLength: 10,
    },
    difficulty: 'easy',
  },
];

describe('Evaluator', () => {
  it('handles compare with zero baseline metrics without Infinity/NaN', async () => {
    const evaluator = new Evaluator();

    const withPGA = new FakeGenome('safe step deterministic answer', { inputTokens: 0, outputTokens: 0 });
    const withoutPGA = new FakeGenome('', { inputTokens: 0, outputTokens: 0 });

    const comparison = await evaluator.compare(withPGA, withoutPGA, TASKS, 'u1');

    expect(Number.isFinite(comparison.improvements.tokenEfficiency)).toBe(true);
    expect(Number.isFinite(comparison.improvements.responseTime)).toBe(true);
    expect(Number.isFinite(comparison.improvements.qualityScore)).toBe(true);
  });

  it('supports compareWithSuite using a versioned benchmark suite', async () => {
    const evaluator = new Evaluator();
    const suite = getBenchmarkSuite('core-coding-v1');

    const withPGA = new FakeGenome('safe first step: test and validate, deterministic tool plan.');
    const withoutPGA = new FakeGenome('generic response');

    const comparison = await evaluator.compareWithSuite(withPGA, withoutPGA, suite, 'u2');

    expect(comparison.withPGA.totalTasks).toBe(suite.tasks.length);
    expect(comparison.withoutPGA.totalTasks).toBe(suite.tasks.length);
  });

  it('loads benchmark suites from external fixtures and falls back to general suite', () => {
    const unknown = getBenchmarkSuite('unknown-suite-id');
    expect(unknown.id).toBe('core-general-v1');
    expect(unknown.tasks.length).toBeGreaterThan(0);
    expect(BENCHMARK_SUITES['core-coding-v1'].tasks.length).toBeLessThan(unknown.tasks.length);
  });

});
