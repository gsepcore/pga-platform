import { describe, it, expect, vi } from 'vitest';
import { gsepMiddleware } from '../vercel-ai.js';
import type { GSEPVercelInstance } from '../vercel-ai.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Mock response',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

// Shared instance to avoid re-creating genome per test
let gsep: GSEPVercelInstance;

describe('Vercel AI SDK Adapter', () => {
    // ─── Setup ─────────────────────────────────────────────

    describe('initialization', () => {
        it('should create a middleware instance with genome', async () => {
            gsep = await gsepMiddleware({
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

        it('should accept custom getUserId and getTaskType', async () => {
            const instance = await gsepMiddleware({
                name: 'vercel-custom',
                llm: mockLLM as never,
                dashboardPort: 0,
                getUserId: () => 'custom-user',
                getTaskType: () => 'support',
            });
            expect(instance.middleware).toBeDefined();
        });

        it('should accept purpose option', async () => {
            const instance = await gsepMiddleware({
                name: 'vercel-purpose',
                llm: mockLLM as never,
                dashboardPort: 0,
                purpose: 'customer support agent',
            });
            expect(instance.genome).toBeDefined();
        });
    });

    // ─── transformParams ───────────────────────────────────

    describe('transformParams', () => {
        it('should inject GSEP prompt into params with user message', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-tp', llm: mockLLM as never, dashboardPort: 0 });

            const params = {
                prompt: [{ role: 'user', content: 'Hello, how are you?' }],
            };

            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            const messages = result.prompt as Array<{ role: string; content: string }>;
            expect(messages.length).toBeGreaterThanOrEqual(2);
            const systemMsg = messages.find(m => m.role === 'system');
            expect(systemMsg).toBeDefined();
        });

        it('should append to existing system message', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-sys', llm: mockLLM as never, dashboardPort: 0 });

            const params = {
                prompt: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'What time is it?' },
                ],
            };

            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            const messages = result.prompt as Array<{ role: string; content: string }>;
            const systemMsg = messages.find(m => m.role === 'system');
            expect(systemMsg!.content).toContain('You are a helpful assistant.');
            expect(systemMsg!.content).toContain('---');
        });

        it('should pass through when no user message', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-no-user', llm: mockLLM as never, dashboardPort: 0 });

            const params = {
                prompt: [{ role: 'system', content: 'System only' }],
            };

            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            expect(result).toEqual(params);
        });

        it('should pass through when no prompt array', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-no-prompt', llm: mockLLM as never, dashboardPort: 0 });

            const params = { text: 'Just a string' };
            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            expect(result).toEqual(params);
        });

        it('should handle multipart user content (array)', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-multi', llm: mockLLM as never, dashboardPort: 0 });

            const params = {
                prompt: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe this image' },
                        { type: 'image', image: 'base64data' },
                    ],
                }],
            };

            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            const messages = result.prompt as Array<{ role: string }>;
            expect(messages.length).toBeGreaterThanOrEqual(1);
        });

        it('should find the last user message from multiple messages', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-last', llm: mockLLM as never, dashboardPort: 0 });

            const params = {
                prompt: [
                    { role: 'user', content: 'First question' },
                    { role: 'assistant', content: 'First answer' },
                    { role: 'user', content: 'Follow up question' },
                ],
            };

            const result = await gsep.middleware.transformParams!({
                type: 'generate' as const,
                params,
                model: {},
            });

            // Should have processed — at minimum system message added
            const messages = result.prompt as Array<{ role: string }>;
            expect(messages.length).toBeGreaterThanOrEqual(3);
        });
    });

    // ─── wrapGenerate ──────────────────────────────────────

    describe('wrapGenerate', () => {
        it('should run afterLLM on response and pass through safe content', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-gen', llm: mockLLM as never, dashboardPort: 0 });

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

            expect(result.content[0].text).toBe('The capital of France is Paris.');
        });

        it('should pass through when no user message in params', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-gen-no-user', llm: mockLLM as never, dashboardPort: 0 });

            const mockResult = {
                content: [{ type: 'text' as const, text: 'Response' }],
                finishReason: 'stop',
                usage: { inputTokens: 5, outputTokens: 5 },
            };

            const result = await gsep.middleware.wrapGenerate!({
                doGenerate: async () => mockResult,
                doStream: async () => ({ stream: new ReadableStream() }),
                params: { prompt: [{ role: 'system', content: 'System only' }] },
                model: {},
            });

            expect(result.content[0].text).toBe('Response');
        });

        it('should pass through when response has no text content', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-gen-no-text', llm: mockLLM as never, dashboardPort: 0 });

            const mockResult = {
                content: [{ type: 'tool_call' as const, name: 'search' }],
                finishReason: 'tool_calls',
                usage: { inputTokens: 5, outputTokens: 5 },
            };

            const result = await gsep.middleware.wrapGenerate!({
                doGenerate: async () => mockResult,
                doStream: async () => ({ stream: new ReadableStream() }),
                params: { prompt: [{ role: 'user', content: 'Search for something' }] },
                model: {},
            });

            expect(result.content[0].type).toBe('tool_call');
        });
    });

    // ─── wrapStream ────────────────────────────────────────

    describe('wrapStream', () => {
        it('should pipe stream through and accumulate text', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-stream', llm: mockLLM as never, dashboardPort: 0 });

            const chunks = [
                { type: 'text-delta', delta: 'Hello' },
                { type: 'text-delta', delta: ' world' },
                { type: 'finish', finishReason: 'stop' },
            ];

            const originalStream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(chunk);
                    }
                    controller.close();
                },
            });

            const result = await gsep.middleware.wrapStream!({
                doGenerate: async () => ({} as never),
                doStream: async () => ({ stream: originalStream }),
                params: {
                    prompt: [{ role: 'user', content: 'Say hello' }],
                },
                model: {},
            });

            // Read the transformed stream
            const reader = result.stream.getReader();
            const received: unknown[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                received.push(value);
            }

            expect(received).toHaveLength(3);
            expect((received[0] as { delta: string }).delta).toBe('Hello');
            expect((received[1] as { delta: string }).delta).toBe(' world');
        });

        it('should pass through when no user message', async () => {
            if (!gsep) gsep = await gsepMiddleware({ name: 'vercel-stream-no-user', llm: mockLLM as never, dashboardPort: 0 });

            const originalStream = new ReadableStream({
                start(controller) { controller.close(); },
            });

            const result = await gsep.middleware.wrapStream!({
                doGenerate: async () => ({} as never),
                doStream: async () => ({ stream: originalStream }),
                params: { prompt: [] },
                model: {},
            });

            expect(result.stream).toBeDefined();
        });
    });
});
