/**
 * gsep.wrap() Extended Tests — Coverage boost for wrap.ts
 *
 * Tests: adaptLLMClient branches, OpenAI SDK style wrapping,
 * string responses, error on unsupported clients, dashboard URL,
 * shutdown, chat with context.
 */

import { describe, it, expect, vi } from 'vitest';
import { gsep } from '../wrap.js';

// ─── Mock LLMs ────────────────────────────────────────

const gsepNativeLLM = {
    name: 'native',
    model: 'native-model',
    chat: async (messages: Array<{ role: string; content: string }>) => ({
        content: `Native: ${messages[messages.length - 1]?.content}`,
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

const openaiFormatLLM = {
    chat: async () => ({
        choices: [{ message: { content: 'OpenAI format response' } }],
        usage: { prompt_tokens: 50, completion_tokens: 25 },
    }),
};

const openaiNoUsageLLM = {
    chat: async () => ({
        choices: [{ message: { content: 'No usage info' } }],
    }),
};

const stringResponseLLM = {
    chat: async () => 'Plain string response',
};

const objectResponseLLM = {
    chat: async () => ({ someField: 42 }),
};

const openaiSdkStyleClient = {
    completions: {
        create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'SDK completions response' } }],
            usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
    },
};

const openaiSdkNoUsage = {
    completions: {
        create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'No usage' } }],
        }),
    },
};

// ─── Tests ────────────────────────────────────────────

describe('gsep.wrap() — Extended', () => {
    describe('GSEP native adapter', () => {
        it('should wrap a native GSEP adapter returning { content, usage }', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            const response = await agent.chat('Hello');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        });
    });

    describe('OpenAI format responses', () => {
        it('should handle OpenAI choices format with usage', async () => {
            const agent = await gsep.wrap(openaiFormatLLM, { dashboardPort: 0 });

            const response = await agent.chat('Hi');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        });

        it('should handle OpenAI choices format without usage', async () => {
            const agent = await gsep.wrap(openaiNoUsageLLM, { dashboardPort: 0 });

            const response = await agent.chat('Test');
            expect(response).toBeDefined();
        });
    });

    describe('String response LLM', () => {
        it('should handle LLM returning plain string', async () => {
            const agent = await gsep.wrap(stringResponseLLM, { dashboardPort: 0 });

            const response = await agent.chat('What?');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        });
    });

    describe('Object response LLM', () => {
        it('should handle LLM returning non-standard object', async () => {
            const agent = await gsep.wrap(objectResponseLLM, { dashboardPort: 0 });

            const response = await agent.chat('What?');
            expect(response).toBeDefined();
        });
    });

    describe('OpenAI SDK style (completions.create)', () => {
        it('should wrap client.completions.create() style', async () => {
            const agent = await gsep.wrap(openaiSdkStyleClient, { dashboardPort: 0 });

            const response = await agent.chat('SDK test');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        });

        it('should handle SDK style without usage', async () => {
            const agent = await gsep.wrap(openaiSdkNoUsage, { dashboardPort: 0 });

            const response = await agent.chat('Test');
            expect(response).toBeDefined();
        });
    });

    describe('Unsupported client', () => {
        it('should throw for client without chat or completions', async () => {
            const badClient = { someMethod: () => {} };

            await expect(gsep.wrap(badClient as never, { dashboardPort: 0 }))
                .rejects.toThrow('Cannot wrap this LLM client');
        });

        it('should throw for empty object', async () => {
            await expect(gsep.wrap({} as never, { dashboardPort: 0 }))
                .rejects.toThrow('Cannot wrap this LLM client');
        });
    });

    describe('WrapOptions', () => {
        it('should use custom name', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, {
                name: 'custom-agent',
                dashboardPort: 0,
            });

            const exported = await agent.genome.export();
            expect(exported.name).toBe('custom-agent');
        });

        it('should use default name my-agent', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            const exported = await agent.genome.export();
            expect(exported.name).toBe('my-agent');
        });

        it('should accept purpose and topic options', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, {
                name: 'purpose-agent',
                purpose: 'Help with coding',
                allowedTopics: ['typescript', 'testing'],
                forbiddenTopics: ['politics'],
                dashboardPort: 0,
            });

            expect(agent).toBeDefined();
        });

        it('should accept extra quickStart options', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, {
                dashboardPort: 0,
                extra: { preset: 'minimal' },
            });

            expect(agent).toBeDefined();
        });
    });

    describe('WrappedAgent API', () => {
        it('should expose genome instance', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            expect(agent.genome).toBeDefined();
            expect(agent.genome.chat).toBeDefined();
            expect(agent.genome.export).toBeDefined();
        });

        it('should have dashboardUrl property', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            // dashboardUrl may be string or undefined depending on port
            expect('dashboardUrl' in agent).toBe(true);
        });

        it('should chat with userId context', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            const response = await agent.chat('Hello', { userId: 'user-123' });
            expect(response).toBeDefined();
        });

        it('should chat with taskType context', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            const response = await agent.chat('Help', { taskType: 'coding' });
            expect(response).toBeDefined();
        });

        it('should chat with both userId and taskType', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            const response = await agent.chat('Debug this', {
                userId: 'dev-1',
                taskType: 'debugging',
            });
            expect(response).toBeDefined();
        });

        it('should shutdown without error', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            await expect(agent.shutdown()).resolves.not.toThrow();
        });

        it('should shutdown multiple times without error', async () => {
            const agent = await gsep.wrap(gsepNativeLLM, { dashboardPort: 0 });

            await agent.shutdown();
            await agent.shutdown();
            // Should not throw
        });
    });
});
