import { describe, it, expect } from 'vitest';
import { gsepLangChainMiddleware } from '../langchain.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Mock response',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('LangChain Adapter', () => {
    it('should create a middleware instance with genome', async () => {
        const gsep = await gsepLangChainMiddleware({
            name: 'langchain-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        expect(gsep.middleware).toBeDefined();
        expect(gsep.genome).toBeDefined();
        expect(gsep.middleware.name).toBe('GSEPMiddleware');
        expect(gsep.middleware.wrapModelCall).toBeDefined();
    });

    it('wrapModelCall should enhance prompt and process response', async () => {
        const gsep = await gsepLangChainMiddleware({
            name: 'langchain-wrap-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        const mockResponse = {
            content: 'Paris is the capital of France.',
            usage_metadata: { input_tokens: 20, output_tokens: 15 },
        };

        const result = await gsep.middleware.wrapModelCall(
            {
                messages: [
                    { content: 'What is the capital of France?', _getType: () => 'human' },
                ],
                systemPrompt: 'You are helpful.',
            },
            async (request) => {
                // Verify system prompt was enhanced
                const sys = (request as { systemPrompt?: string }).systemPrompt ?? '';
                expect(sys.length).toBeGreaterThan('You are helpful.'.length);
                return mockResponse;
            },
        );

        // Response should pass through (clean response)
        expect(result.content).toBe('Paris is the capital of France.');
    });

    it('wrapModelCall should pass through when no user message', async () => {
        const gsep = await gsepLangChainMiddleware({
            name: 'langchain-empty-test',
            llm: mockLLM as never,
            dashboardPort: 0,
        });

        const mockResponse = { content: 'OK', usage_metadata: {} };

        const result = await gsep.middleware.wrapModelCall(
            { messages: [], systemPrompt: 'System' },
            async () => mockResponse,
        );

        expect(result.content).toBe('OK');
    });
});
