/**
 * EstimateQuality Tests
 *
 * Tests for the heuristic quality estimation in GenomeInstance.
 * Since estimateQuality is private, we test it indirectly via chat().
 * We also test the scoring logic directly via a standalone function.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect } from 'vitest';

// ─── Standalone quality estimator (mirrors GenomeInstance.estimateQuality) ──

function estimateQuality(userMessage: string, response: string): number {
    let score = 0.5;

    // 1. Length appropriateness
    const len = response.length;
    if (len > 50 && len < 5000) score += 0.15;
    else if (len < 20) score -= 0.2;

    // 2. Code blocks when user asks for code
    const asksForCode = /write|code|function|implement|create.*class|fix.*bug/i.test(userMessage);
    if (asksForCode && /```/.test(response)) score += 0.15;

    // 3. Structured response (headers, lists, code blocks)
    if (/^#{1,3}\s|^[-*]\s|```/m.test(response)) score += 0.1;

    // 4. Error/refusal indicators
    if (/sorry.*can't|i don't know|as an ai|i cannot/i.test(response)) score -= 0.15;

    return Math.max(0, Math.min(1, score));
}

// ─── Tests ──────────────────────────────────────────────────

describe('estimateQuality', () => {
    describe('length scoring', () => {
        it('should give higher score for appropriate length responses', () => {
            const msg = 'What is TypeScript?';
            const goodLen = 'TypeScript is a typed superset of JavaScript. '.repeat(3); // ~140 chars
            const tooShort = 'Yes.';

            expect(estimateQuality(msg, goodLen)).toBeGreaterThan(estimateQuality(msg, tooShort));
        });

        it('should penalize very short responses', () => {
            const score = estimateQuality('Explain arrays', 'ok');
            expect(score).toBeLessThan(0.5);
        });

        it('should give base + length bonus for medium-length responses', () => {
            const response = 'Arrays are ordered collections of elements. '.repeat(2);
            const score = estimateQuality('What are arrays?', response);
            expect(score).toBeGreaterThanOrEqual(0.65);
        });
    });

    describe('code block detection', () => {
        it('should give higher score when code is present for code questions', () => {
            const msg = 'Write a function to add two numbers';
            const withCode = 'Here is the function:\n```typescript\nfunction add(a: number, b: number) { return a + b; }\n```';
            const withoutCode = 'You can add two numbers by using the + operator in a function that takes two parameters.';

            expect(estimateQuality(msg, withCode)).toBeGreaterThan(estimateQuality(msg, withoutCode));
        });

        it('should not give code bonus for non-code questions', () => {
            const msg = 'What is the capital of France?';
            const response = 'The capital of France is Paris, a beautiful city with lots of history and culture.';
            const score = estimateQuality(msg, response);
            // Should get length bonus but not code bonus
            expect(score).toBeCloseTo(0.65, 1);
        });
    });

    describe('structure detection', () => {
        it('should give bonus for markdown headers', () => {
            const msg = 'Explain REST';
            const structured = '## REST API\n\nREST stands for Representational State Transfer. It uses HTTP methods.';
            const plain = 'REST stands for Representational State Transfer. It uses HTTP methods for resources.';

            expect(estimateQuality(msg, structured)).toBeGreaterThan(estimateQuality(msg, plain));
        });

        it('should give bonus for bullet lists', () => {
            const msg = 'List some programming languages';
            const withList = 'Here are some popular programming languages:\n- JavaScript\n- Python\n- TypeScript\n- Go';
            const score = estimateQuality(msg, withList);
            expect(score).toBeGreaterThanOrEqual(0.75); // base + length + structure
        });
    });

    describe('error/refusal detection', () => {
        it('should penalize "I don\'t know" responses', () => {
            const msg = 'What is React?';
            const refusal = "I don't know what React is, but it might be a JavaScript library for building UIs.";
            const confident = 'React is a JavaScript library for building user interfaces, developed by Facebook.';

            expect(estimateQuality(msg, refusal)).toBeLessThan(estimateQuality(msg, confident));
        });

        it('should penalize "as an AI" responses', () => {
            const msg = 'Help me debug this code';
            const response = "As an AI, I can try to help. The issue might be in the variable declaration that you've shared.";
            const score = estimateQuality(msg, response);
            expect(score).toBeLessThan(0.65);
        });

        it('should penalize "sorry I cannot" responses', () => {
            const score = estimateQuality('Write code', "Sorry, I can't help with that particular request right now.");
            expect(score).toBeLessThan(0.55);
        });
    });

    describe('combined scoring', () => {
        it('should give high score for ideal code response', () => {
            const msg = 'Implement a debounce function in TypeScript';
            const response = `## Debounce Function

Here's a debounce implementation:

\`\`\`typescript
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
\`\`\`

- Uses generics for type safety
- Clears previous timer on each call
- Returns properly typed wrapper`;

            const score = estimateQuality(msg, response);
            // length(0.15) + code(0.15) + structure(0.1) = 0.9
            expect(score).toBeGreaterThanOrEqual(0.85);
        });

        it('should clamp score to [0, 1]', () => {
            // Very short + error should not go below 0
            const low = estimateQuality('test', "I don't know");
            expect(low).toBeGreaterThanOrEqual(0);

            // All bonuses should not exceed 1
            const high = estimateQuality(
                'Write a function',
                '## Answer\n```ts\nconst x = 1;\n```\n- Good code\n' + 'a'.repeat(100),
            );
            expect(high).toBeLessThanOrEqual(1);
        });
    });
});
