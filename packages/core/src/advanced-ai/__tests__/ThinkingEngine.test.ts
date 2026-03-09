/**
 * ThinkingEngine Tests
 *
 * Tests for chain-of-thought reasoning, self-reflection,
 * meta-learning pattern tracking, best practices / anti-patterns,
 * and pattern lifecycle management.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThinkingEngine } from '../ThinkingEngine.js';

describe('ThinkingEngine', () => {
    let engine: ThinkingEngine;

    beforeEach(() => {
        engine = new ThinkingEngine();
    });

    // ─── Chain-of-Thought ──────────────────────────────────────

    describe('chainOfThought', () => {
        it('should return steps, a final answer, and confidence', async () => {
            const result = await engine.chainOfThought('How do I sort an array?');

            expect(result.steps).toBeDefined();
            expect(result.steps.length).toBeGreaterThan(0);
            expect(result.finalAnswer).toBeDefined();
            expect(typeof result.finalAnswer).toBe('string');
            expect(result.overallConfidence).toBeGreaterThan(0);
            expect(result.overallConfidence).toBeLessThanOrEqual(1);
            expect(result.reflectionScore).toBeGreaterThan(0);
            expect(result.timeThinking).toBeGreaterThanOrEqual(0);

            // Each step should have the correct shape
            for (const step of result.steps) {
                expect(step.step).toBeGreaterThan(0);
                expect(typeof step.thought).toBe('string');
                expect(typeof step.reasoning).toBe('string');
                expect(step.confidence).toBeGreaterThan(0);
                expect(step.confidence).toBeLessThanOrEqual(1);
            }
        });

        it('should include the problem text in the final answer', async () => {
            const problem = 'Implement binary search';
            const result = await engine.chainOfThought(problem);

            expect(result.finalAnswer).toContain(problem);
        });

        it('should accept and process an optional context parameter', async () => {
            const context = { language: 'TypeScript', framework: 'React' };
            const result = await engine.chainOfThought(
                'How do I manage state?',
                context,
            );

            // Should still produce valid output with context provided
            expect(result.steps.length).toBeGreaterThan(0);
            expect(result.finalAnswer).toBeDefined();
            expect(result.overallConfidence).toBeGreaterThan(0);
        });

        it('should compute overallConfidence as the mean of step confidences', async () => {
            const result = await engine.chainOfThought('Test problem');

            const expectedMean =
                result.steps.reduce((sum, s) => sum + s.confidence, 0) /
                result.steps.length;

            expect(result.overallConfidence).toBeCloseTo(expectedMean, 10);
        });

        it('should include alternatives in at least one step', async () => {
            const result = await engine.chainOfThought('Choose the best approach');

            const stepsWithAlternatives = result.steps.filter(
                (s) => s.alternatives && s.alternatives.length > 0,
            );

            expect(stepsWithAlternatives.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ─── Self-Reflection ───────────────────────────────────────

    describe('selfReflect', () => {
        it('should identify strengths for a well-structured response', async () => {
            // A response between 100 and 1000 chars, with paragraphs and examples
            const goodResponse =
                'This is a detailed explanation of the sorting algorithm.\n\n' +
                'For example, quicksort uses a pivot element to partition the array ' +
                'into two halves. The average time complexity is O(n log n), which ' +
                'makes it efficient for most practical use cases.';

            const reflection = await engine.selfReflect(
                'How does quicksort work?',
                goodResponse,
            );

            expect(reflection.strengths).toContain('Appropriate response length');
            expect(reflection.strengths).toContain('Well-structured with paragraphs');
            expect(reflection.strengths).toContain('Includes examples');
            expect(reflection.confidenceScore).toBe(1);
            expect(reflection.qualityScore).toBeGreaterThan(0);
        });

        it('should flag weaknesses for a too-brief response', async () => {
            const briefResponse = 'Sort it.';

            const reflection = await engine.selfReflect(
                'How do I sort?',
                briefResponse,
            );

            expect(reflection.weaknesses).toContain('Response too brief');
            expect(reflection.improvements).toContain(
                'Provide more detail and context',
            );
        });

        it('should flag weaknesses for a too-verbose response', async () => {
            const verboseResponse = 'word '.repeat(500); // 2500 chars

            const reflection = await engine.selfReflect(
                'Question?',
                verboseResponse,
            );

            expect(reflection.weaknesses).toContain('Response too verbose');
            expect(reflection.improvements).toContain('Be more concise');
        });

        it('should penalize confidence when many hedge words are present', async () => {
            const hedging =
                'This might work, but maybe you should try something else. ' +
                'Perhaps a different approach could possibly be better. ' +
                'It is also quite possible that the result might vary.';

            const reflection = await engine.selfReflect('How?', hedging);

            expect(reflection.confidenceScore).toBeLessThan(1);
            expect(reflection.weaknesses).toContain('Too many hedge words');
            expect(reflection.improvements).toContain(
                'Express ideas more directly',
            );
        });

        it('should suggest adding examples when none are present', async () => {
            const noExamples =
                'The algorithm works by dividing the problem into subproblems.\n\n' +
                'Each subproblem is solved independently and then merged. ' +
                'This general technique is known as divide and conquer.';

            const reflection = await engine.selfReflect('Explain D&C', noExamples);

            expect(reflection.improvements).toContain('Add concrete examples');
        });
    });

    // ─── Pattern Recording & Retrieval ─────────────────────────

    describe('recordPattern / getLearnedPatterns', () => {
        it('should create a new pattern entry on first recording', () => {
            engine.recordPattern('use-cache', true, 0.9);

            const patterns = engine.getLearnedPatterns();
            expect(patterns.length).toBe(1);
            expect(patterns[0].pattern).toBe('use-cache');
            expect(patterns[0].frequency).toBe(1);
            expect(patterns[0].successRate).toBe(1); // first entry, success=true
            expect(patterns[0].avgQuality).toBe(0.9);
        });

        it('should update an existing pattern with running averages', () => {
            engine.recordPattern('use-cache', true, 0.8);
            engine.recordPattern('use-cache', false, 0.4);

            const patterns = engine.getLearnedPatterns();
            expect(patterns.length).toBe(1);

            const p = patterns[0];
            expect(p.frequency).toBe(2);
            // successRate: (1 * (2-1) + 0) / 2 = 0.5  (first was 1.0, second adds 0)
            // Running average: after first call successRate = 1.0
            // After second: (1.0 * 1 + 0) / 2 = 0.5
            expect(p.successRate).toBeCloseTo(0.5, 5);
            // avgQuality: (0.8 * 1 + 0.4) / 2 = 0.6
            expect(p.avgQuality).toBeCloseTo(0.6, 5);
        });

        it('should sort learned patterns by frequency (descending)', () => {
            engine.recordPattern('rare-pattern', true, 0.9);
            engine.recordPattern('common-pattern', true, 0.7);
            engine.recordPattern('common-pattern', true, 0.8);
            engine.recordPattern('common-pattern', false, 0.5);

            const patterns = engine.getLearnedPatterns();
            expect(patterns[0].pattern).toBe('common-pattern');
            expect(patterns[0].frequency).toBe(3);
            expect(patterns[1].pattern).toBe('rare-pattern');
            expect(patterns[1].frequency).toBe(1);
        });
    });

    // ─── Best Practices & Anti-Patterns ────────────────────────

    describe('getBestPractices', () => {
        it('should return patterns with successRate > 0.8 and frequency > 5', () => {
            // Create a pattern with high success rate and high frequency
            for (let i = 0; i < 10; i++) {
                engine.recordPattern('proven-pattern', true, 0.95);
            }

            // Create one that is frequent but low success
            for (let i = 0; i < 10; i++) {
                engine.recordPattern('bad-pattern', false, 0.2);
            }

            // Create one that is high success but low frequency
            engine.recordPattern('untested-pattern', true, 0.99);

            const best = engine.getBestPractices();
            expect(best.length).toBe(1);
            expect(best[0].pattern).toBe('proven-pattern');
        });

        it('should return an empty array when no patterns qualify', () => {
            engine.recordPattern('new-pattern', true, 0.9);

            const best = engine.getBestPractices();
            expect(best).toEqual([]);
        });
    });

    describe('getAntiPatterns', () => {
        it('should return patterns with successRate < 0.5 and frequency > 3', () => {
            // Create a consistently failing pattern
            for (let i = 0; i < 5; i++) {
                engine.recordPattern('failing-pattern', false, 0.1);
            }

            // Create a successful pattern (should not appear)
            for (let i = 0; i < 5; i++) {
                engine.recordPattern('good-pattern', true, 0.9);
            }

            const anti = engine.getAntiPatterns();
            expect(anti.length).toBe(1);
            expect(anti[0].pattern).toBe('failing-pattern');
            expect(anti[0].successRate).toBeLessThan(0.5);
        });

        it('should return empty array when no anti-patterns exist', () => {
            for (let i = 0; i < 10; i++) {
                engine.recordPattern('good-pattern', true, 0.9);
            }

            const anti = engine.getAntiPatterns();
            expect(anti).toEqual([]);
        });
    });

    // ─── shouldUsePattern ──────────────────────────────────────

    describe('shouldUsePattern', () => {
        it('should recommend a well-established successful pattern', () => {
            for (let i = 0; i < 10; i++) {
                engine.recordPattern('proven-approach', true, 0.9);
            }

            const advice = engine.shouldUsePattern('proven-approach');
            expect(advice.recommended).toBe(true);
            expect(advice.confidence).toBeGreaterThan(0.8);
            expect(advice.reason).toContain('success rate');
        });

        it('should not recommend a pattern with low success rate', () => {
            for (let i = 0; i < 5; i++) {
                engine.recordPattern('bad-approach', false, 0.1);
            }

            const advice = engine.shouldUsePattern('bad-approach');
            expect(advice.recommended).toBe(false);
            expect(advice.reason).toContain('low');
        });

        it('should return neutral recommendation for unknown patterns', () => {
            const advice = engine.shouldUsePattern('never-seen-before');

            expect(advice.recommended).toBe(true);
            expect(advice.confidence).toBe(0.5);
            expect(advice.reason).toContain('No historical data');
        });

        it('should return moderate recommendation for patterns with mixed results', () => {
            // 3 successes and 1 failure — not enough frequency for anti-pattern,
            // and not enough success for best practice
            engine.recordPattern('mixed-pattern', true, 0.7);
            engine.recordPattern('mixed-pattern', true, 0.6);
            engine.recordPattern('mixed-pattern', false, 0.3);

            const advice = engine.shouldUsePattern('mixed-pattern');
            // successRate ~0.67, frequency=3 — falls into the "moderate success" branch
            expect(advice.recommended).toBe(true);
            expect(advice.reason).toContain('moderate success');
        });
    });

    // ─── clearOldPatterns ──────────────────────────────────────

    describe('clearOldPatterns', () => {
        it('should remove patterns older than the specified days', () => {
            // Record a pattern, then manually age it
            engine.recordPattern('old-pattern', true, 0.8);
            engine.recordPattern('recent-pattern', true, 0.9);

            // Hack: reach into the internals to set lastSeen in the past
            const patterns = engine.getLearnedPatterns();
            const oldMeta = patterns.find((p) => p.pattern === 'old-pattern');
            if (oldMeta) {
                oldMeta.lastSeen = new Date('2020-01-01');
            }

            const removed = engine.clearOldPatterns(30);
            expect(removed).toBe(1);

            const remaining = engine.getLearnedPatterns();
            expect(remaining.length).toBe(1);
            expect(remaining[0].pattern).toBe('recent-pattern');
        });

        it('should default to 30 days when no argument is provided', () => {
            engine.recordPattern('fresh-pattern', true, 0.9);

            // Fresh pattern should not be removed
            const removed = engine.clearOldPatterns();
            expect(removed).toBe(0);
            expect(engine.getLearnedPatterns().length).toBe(1);
        });

        it('should return 0 when there are no patterns to clear', () => {
            const removed = engine.clearOldPatterns(1);
            expect(removed).toBe(0);
        });
    });

    // ─── exportMetaLearning ────────────────────────────────────

    describe('exportMetaLearning', () => {
        it('should return all categories of meta-learning data', () => {
            // Build up a mixed set of patterns
            for (let i = 0; i < 10; i++) {
                engine.recordPattern('best-pattern', true, 0.95);
            }
            for (let i = 0; i < 5; i++) {
                engine.recordPattern('worst-pattern', false, 0.1);
            }
            engine.recordPattern('regular-pattern', true, 0.7);

            const exported = engine.exportMetaLearning();

            expect(exported.totalPatterns).toBe(3);
            expect(exported.allPatterns.length).toBe(3);
            expect(exported.bestPractices.length).toBe(1);
            expect(exported.bestPractices[0].pattern).toBe('best-pattern');
            expect(exported.antiPatterns.length).toBe(1);
            expect(exported.antiPatterns[0].pattern).toBe('worst-pattern');
        });

        it('should return empty collections when no patterns exist', () => {
            const exported = engine.exportMetaLearning();

            expect(exported.totalPatterns).toBe(0);
            expect(exported.allPatterns).toEqual([]);
            expect(exported.bestPractices).toEqual([]);
            expect(exported.antiPatterns).toEqual([]);
        });
    });
});
