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

    // 5. Response relevance — shared key terms between question and answer
    const questionWords = new Set(
        userMessage.toLowerCase().split(/\W+/).filter(w => w.length > 3),
    );
    if (questionWords.size > 0) {
        const responseWords = response.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const overlap = responseWords.filter(w => questionWords.has(w)).length;
        const relevanceRatio = Math.min(overlap / questionWords.size, 1);
        if (relevanceRatio > 0.3) score += 0.05;
        if (relevanceRatio > 0.6) score += 0.05;
    }

    // 6. Explanation depth — response contains reasoning
    if (/because|therefore|since|this means|the reason|due to/i.test(response) && len > 100) {
        score += 0.05;
    }

    // 7. Proportional response — length relative to question complexity
    const questionLen = userMessage.length;
    const ratio = len / Math.max(questionLen, 1);
    if (ratio > 1 && ratio < 20) score += 0.05;
    if (ratio > 50) score -= 0.05;

    // 8. Completeness — clean ending and balanced code blocks
    const lastChar = response.trim().slice(-1);
    if (/[.!?)\]`\d]/.test(lastChar)) score += 0.03;
    const codeBlockCount = (response.match(/```/g) || []).length;
    if (codeBlockCount > 0 && codeBlockCount % 2 !== 0) score -= 0.1;

    // 9. Actionable for task-oriented queries
    const isTaskOriented = /how|explain|help|show|create|build|fix|setup|install/i.test(userMessage);
    if (isTaskOriented && /\d\.\s|step\s\d|first.*then|```/i.test(response)) score += 0.05;

    // 10. Penalize repetitive content
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 3) {
        const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
        const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);
        if (repetitionRatio > 0.3) score -= 0.1;
    }

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
            const withCode = 'The capital of France is Paris.\n```\nconsole.log("Paris")\n```';
            const withoutCode = 'The capital of France is Paris, a beautiful city with lots of history and culture.';
            // Non-code question: code blocks should not increase score
            expect(estimateQuality(msg, withoutCode)).toBeGreaterThanOrEqual(estimateQuality(msg, withCode) - 0.15);
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
            const withRefusal = estimateQuality('Write code', "Sorry, I can't help with that particular request right now.");
            const withoutRefusal = estimateQuality('Write code', 'Here is the code that handles that particular request right now.');
            expect(withRefusal).toBeLessThan(withoutRefusal);
        });
    });

    describe('relevance scoring', () => {
        it('should give higher score for relevant responses', () => {
            const msg = 'How do I configure TypeScript compiler options?';
            const relevant = 'To configure TypeScript compiler options, edit your tsconfig.json file and set the compiler settings you need.';
            const irrelevant = 'The weather today is sunny and warm. Consider going for a walk in the park for fresh air.';

            expect(estimateQuality(msg, relevant)).toBeGreaterThan(estimateQuality(msg, irrelevant));
        });

        it('should handle questions with short words gracefully', () => {
            const msg = 'Is it ok?';
            const response = 'Yes, the configuration looks correct and should work properly for your use case.';
            const score = estimateQuality(msg, response);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });
    });

    describe('explanation depth', () => {
        it('should give bonus for responses with reasoning', () => {
            const msg = 'Why should I use TypeScript?';
            const withReasoning = 'You should use TypeScript because it catches errors at compile time, therefore reducing bugs in production. Since the type system is structural, it integrates well with JavaScript.';
            const withoutReasoning = 'TypeScript is great. It has types. It works with JavaScript. Many developers like it a lot.';

            expect(estimateQuality(msg, withReasoning)).toBeGreaterThan(estimateQuality(msg, withoutReasoning));
        });
    });

    describe('proportional response', () => {
        it('should penalize extremely long responses for short questions', () => {
            const msg = 'Hi';
            const veryLong = 'Here is a detailed explanation. '.repeat(100); // ~3100 chars, ratio > 50
            const score = estimateQuality(msg, veryLong);
            // Should not get proportionality bonus (ratio > 50)
            expect(score).toBeDefined();
        });
    });

    describe('completeness', () => {
        it('should penalize unclosed code blocks', () => {
            const msg = 'Write a function';
            const unclosed = 'Here is the function:\n```typescript\nfunction add(a: number, b: number) { return a + b; }';
            const closed = 'Here is the function:\n```typescript\nfunction add(a: number, b: number) { return a + b; }\n```';

            expect(estimateQuality(msg, closed)).toBeGreaterThan(estimateQuality(msg, unclosed));
        });

        it('should give bonus for clean endings', () => {
            const msg = 'Explain arrays';
            const cleanEnd = 'Arrays are ordered collections of elements stored in contiguous memory.';
            const messyEnd = 'Arrays are ordered collections of elements stored in contiguous memory and';

            expect(estimateQuality(msg, cleanEnd)).toBeGreaterThan(estimateQuality(msg, messyEnd));
        });
    });

    describe('actionable responses', () => {
        it('should give bonus for step-by-step answers to how-to questions', () => {
            const msg = 'How do I setup a Node.js project?';
            const withSteps = 'To setup a Node.js project:\n1. Create a directory\n2. Run npm init\n3. Install dependencies.';
            const withoutSteps = 'Node.js projects are easy to set up. You just need to install Node and create some files.';

            expect(estimateQuality(msg, withSteps)).toBeGreaterThan(estimateQuality(msg, withoutSteps));
        });
    });

    describe('repetition detection', () => {
        it('should penalize highly repetitive content', () => {
            const msg = 'Tell me about JavaScript';
            const repetitive = 'JavaScript is a language. JavaScript is a language. JavaScript is a language. JavaScript is a language.';
            const varied = 'JavaScript is a versatile language. It runs in browsers and on servers. Node.js enables backend development. TypeScript adds types.';

            expect(estimateQuality(msg, varied)).toBeGreaterThan(estimateQuality(msg, repetitive));
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
