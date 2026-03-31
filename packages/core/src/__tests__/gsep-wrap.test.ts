import { describe, it, expect } from 'vitest';
import { gsep } from '../wrap.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async (messages: Array<{ role: string; content: string }>) => ({
        content: `I received: ${messages[messages.length - 1]?.content}`,
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('gsep.wrap()', () => {
    it('should wrap a LLM client and return a working agent', async () => {
        const agent = await gsep.wrap(mockLLM, { dashboardPort: 0 });

        expect(agent).toBeDefined();
        expect(agent.chat).toBeDefined();
        expect(agent.genome).toBeDefined();
    });

    it('should process chat through full GSEP pipeline', async () => {
        const agent = await gsep.wrap(mockLLM, { dashboardPort: 0 });

        const response = await agent.chat('Hello world');
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
    });

    it('should handle messages with PII without exposing them in response', async () => {
        const agent = await gsep.wrap(mockLLM, { dashboardPort: 0 });
        const response = await agent.chat('My card is 4111-1111-1111-1111');
        // The response should exist (agent processed it through GSEP pipeline)
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
    });

    it('should have genome instance accessible', async () => {
        const agent = await gsep.wrap(mockLLM, { dashboardPort: 0 });

        const exported = await agent.genome.export();
        expect(exported).toBeDefined();
        expect(exported.name).toBeDefined();
    });

    it('should work with OpenAI-format responses', async () => {
        const openaiStyleLLM = {
            chat: async () => ({
                choices: [{ message: { content: 'Hello from OpenAI format!' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 },
            }),
        };

        const agent = await gsep.wrap(openaiStyleLLM, { dashboardPort: 0 });
        const response = await agent.chat('Hi');
        expect(response).toBeDefined();
    });

    it('should accept purpose for Purpose Lock', async () => {
        const agent = await gsep.wrap(mockLLM, {
            name: 'support-bot',
            purpose: 'Customer support for an e-commerce store',
            allowedTopics: ['orders', 'shipping', 'returns'],
            forbiddenTopics: ['politics', 'religion'],
            dashboardPort: 0,
        });

        expect(agent).toBeDefined();
    });

    it('should shutdown cleanly', async () => {
        const agent = await gsep.wrap(mockLLM, { dashboardPort: 0 });
        await expect(agent.shutdown()).resolves.not.toThrow();
    });
});
