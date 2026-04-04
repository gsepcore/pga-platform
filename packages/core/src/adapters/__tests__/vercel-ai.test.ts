import { describe, it, expect } from 'vitest';
import { gsepMiddleware } from '../vercel-ai.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Mock response',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('Vercel AI SDK Adapter', () => {
    it('should create a middleware instance with genome', async () => {
        const gsep = await gsepMiddleware({
            name: 'vercel-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        expect(gsep.middleware).toBeDefined();
        expect(gsep.genome).toBeDefined();
        expect(gsep.middleware.transformParams).toBeDefined();
        expect(gsep.middleware.wrapGenerate).toBeDefined();
        expect(gsep.middleware.wrapStream).toBeDefined();
    });

    it('transformParams should inject GSEP prompt into system message', async () => {
        const gsep = await gsepMiddleware({
            name: 'vercel-transform-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        const params = {
            prompt: [
                { role: 'user', content: 'Hello, how are you?' },
            ],
        };

        const result = await gsep.middleware.transformParams!({
            type: 'generate' as const,
            params,
            model: {},
        });

        // Should have added a system message with GSEP prompt
        const messages = result.prompt as Array<{ role: string; content: string }>;
        expect(messages.length).toBeGreaterThanOrEqual(2);
        const systemMsg = messages.find(m => m.role === 'system');
        expect(systemMsg).toBeDefined();
    });

    it('wrapGenerate should run afterLLM on response', async () => {
        const gsep = await gsepMiddleware({
            name: 'vercel-generate-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        const mockResult = {
            content: [{ type: 'text' as const, text: 'The capital of France is Paris.' }],
            finishReason: 'stop',
            usage: { inputTokens: 20, outputTokens: 30 },
        };

        const result = await gsep.middleware.wrapGenerate!({
            doGenerate: async () => mockResult,
            doStream: async () => ({ stream: new ReadableStream() }),
            params: {
                prompt: [{ role: 'user', content: 'What is the capital of France?' }],
            },
            model: {},
        });

        // Response should pass through (no C4 threats on clean response)
        expect(result.content[0].text).toBe('The capital of France is Paris.');
    });
});
