import { describe, it, expect } from 'vitest';
import { gsepPlugin } from '../openclaw-plugin.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Mock response',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('OpenClaw Plugin Adapter', () => {
    it('should create a plugin with correct metadata', () => {
        const plugin = gsepPlugin({ name: 'test-agent', llm: mockLLM as never });

        expect(plugin.id).toBe('gsep');
        expect(plugin.name).toBe('GSEP — Genomic Self-Evolving Prompts');
        expect(plugin.version).toBe('0.8.0');
        expect(typeof plugin.register).toBe('function');
    });

    it('register should be synchronous and register hooks', () => {
        const plugin = gsepPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });

        const registeredHooks: string[] = [];
        const registeredCommands: string[] = [];

        const mockApi = {
            id: 'gsep',
            name: 'GSEP',
            config: {},
            logger: {
                info: () => {},
                warn: () => {},
                error: () => {},
            },
            on: (hookName: string) => { registeredHooks.push(hookName); },
            registerCommand: (cmd: { name: string }) => { registeredCommands.push(cmd.name); },
            registerService: () => {},
            runtime: { system: { enqueueSystemEvent: () => {} }, channel: { reply: { dispatchReplyWithBufferedBlockDispatcher: () => {} } } },
        };

        // register() should NOT return a promise
        const result = plugin.register(mockApi as never);
        expect(result).toBeUndefined();

        // Should have registered 3 hooks + 1 command
        expect(registeredHooks).toContain('before_prompt_build');
        expect(registeredHooks).toContain('llm_output');
        expect(registeredHooks).toContain('message_sending');
        expect(registeredCommands).toContain('gsep');
    });
});
