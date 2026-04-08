import { describe, it, expect, vi } from 'vitest';
import { SkillRouter } from '../SkillRouter.js';
import { SkillRegistry } from '../SkillRegistry.js';
import { SkillExecutor } from '../SkillExecutor.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';

// ─── Helpers ────────────────────────────────────────────

function createMockLLM(responses: string[]): LLMAdapter {
    let callIndex = 0;
    return {
        name: 'mock-llm',
        model: 'mock',
        chat: vi.fn(async () => {
            const content = responses[callIndex] ?? responses[responses.length - 1];
            callIndex++;
            return { content };
        }),
    };
}

function createSetup(
    llmResponses: string[],
    config?: { maxToolCalls?: number; maxIterations?: number },
) {
    const registry = new SkillRegistry();
    const llm = createMockLLM(llmResponses);
    const executor = new SkillExecutor(registry, { timeoutMs: 5000, maxRetries: 0 });
    const router = new SkillRouter(registry, executor, llm, config);
    return { registry, executor, llm, router };
}

// ─── Tests ──────────────────────────────────────────────

describe('SkillRouter', () => {
    describe('no skills registered', () => {
        it('should skip tool calling and return LLM response directly', async () => {
            const { router } = createSetup(['The answer is 42.']);

            const result = await router.run('You are helpful.', 'What is the meaning of life?');

            expect(result.response).toBe('The answer is 42.');
            expect(result.toolCalls).toHaveLength(0);
        });
    });

    describe('tool call extraction', () => {
        it('should extract tool calls from LLM response and execute them', async () => {
            const { registry, router } = createSetup([
                // First response: LLM wants to call a tool
                'Let me search for that.\n<tool_call>\n{"name": "search", "arguments": {"query": "weather"}}\n</tool_call>',
                // Second response: LLM gives final answer with results
                'Based on my search, it is sunny today.',
            ]);

            registry.registerInline(
                'search',
                'Web search',
                { type: 'object', properties: { query: { type: 'string' } } },
                async (params) => `Results for "${params.query}": sunny, 25°C`,
            );

            const result = await router.run('You are helpful.', 'What is the weather?');

            expect(result.response).toBe('Based on my search, it is sunny today.');
            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls[0].call.name).toBe('search');
            expect(result.toolCalls[0].result.success).toBe(true);
            expect(result.toolCalls[0].result.output).toContain('sunny');
        });

        it('should handle multiple tool calls in one response', async () => {
            const { registry, router } = createSetup([
                '<tool_call>\n{"name": "search", "arguments": {"q": "a"}}\n</tool_call>\n<tool_call>\n{"name": "calc", "arguments": {"expr": "2+2"}}\n</tool_call>',
                'The search found A and 2+2=4.',
            ]);

            registry.registerInline('search', 'Search', {}, async () => 'Result A');
            registry.registerInline('calc', 'Calculator', {}, async () => '4');

            const result = await router.run('System', 'Do both');

            expect(result.toolCalls).toHaveLength(2);
            expect(result.toolCalls[0].call.name).toBe('search');
            expect(result.toolCalls[1].call.name).toBe('calc');
        });

        it('should ignore tool calls for unregistered skills', async () => {
            const { registry, router } = createSetup([
                '<tool_call>\n{"name": "unknown_tool", "arguments": {}}\n</tool_call>',
                'I could not find that tool, but here is my answer.',
            ]);

            registry.registerInline('search', 'Search', {}, async () => 'result');

            const result = await router.run('System', 'Use unknown tool');

            // unknown_tool is not registered, so it should be ignored
            expect(result.toolCalls).toHaveLength(0);
        });

        it('should skip malformed JSON in tool call blocks', async () => {
            const { registry, router } = createSetup([
                '<tool_call>\nnot valid json\n</tool_call>\n<tool_call>\n{"name": "search", "arguments": {}}\n</tool_call>',
                'Found the answer.',
            ]);

            registry.registerInline('search', 'Search', {}, async () => 'result');

            const result = await router.run('System', 'Search');

            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls[0].call.name).toBe('search');
        });
    });

    describe('max tool calls limit', () => {
        it('should respect maxToolCalls limit', async () => {
            const { registry, router } = createSetup(
                [
                    '<tool_call>\n{"name": "a", "arguments": {}}\n</tool_call>\n<tool_call>\n{"name": "b", "arguments": {}}\n</tool_call>\n<tool_call>\n{"name": "c", "arguments": {}}\n</tool_call>',
                    'Done with limited tools.',
                ],
                { maxToolCalls: 2 },
            );

            registry.registerInline('a', 'A', {}, async () => 'a');
            registry.registerInline('b', 'B', {}, async () => 'b');
            registry.registerInline('c', 'C', {}, async () => 'c');

            const result = await router.run('System', 'Call all three');

            // Only 2 tool calls should have been made
            expect(result.toolCalls).toHaveLength(2);
        });
    });

    describe('max iterations limit', () => {
        it('should stop after maxIterations', async () => {
            const { registry, router, llm } = createSetup(
                [
                    // Keep calling tools every iteration
                    '<tool_call>\n{"name": "loop", "arguments": {}}\n</tool_call>',
                    '<tool_call>\n{"name": "loop", "arguments": {}}\n</tool_call>',
                    '<tool_call>\n{"name": "loop", "arguments": {}}\n</tool_call>',
                    'Finally done after forced stop.',
                ],
                { maxIterations: 2, maxToolCalls: 10 },
            );

            registry.registerInline('loop', 'Loop', {}, async () => 'looped');

            const result = await router.run('System', 'Keep looping');

            // Should have at most 2 iterations of tool calls + forced final
            expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
            expect(result.toolCalls.length).toBeLessThanOrEqual(3);
        });
    });

    describe('tool call results fed back', () => {
        it('should feed tool results back to LLM as conversation', async () => {
            const { registry, router, llm } = createSetup([
                '<tool_call>\n{"name": "search", "arguments": {"q": "test"}}\n</tool_call>',
                'Based on the search result: Found it!',
            ]);

            registry.registerInline('search', 'Search', {}, async () => 'Search result: test found');

            await router.run('System prompt', 'Find test');

            // Second call to LLM should include tool result in messages
            const calls = (llm.chat as ReturnType<typeof vi.fn>).mock.calls;
            expect(calls.length).toBeGreaterThanOrEqual(2);
            const secondCallMessages = calls[1][0];
            const toolResultMsg = secondCallMessages.find(
                (m: { content: string }) => m.content.includes('tool_result'),
            );
            expect(toolResultMsg).toBeDefined();
            expect(toolResultMsg.content).toContain('Search result: test found');
        });

        it('should include error in tool result when skill fails', async () => {
            const { registry, router, llm } = createSetup([
                '<tool_call>\n{"name": "broken", "arguments": {}}\n</tool_call>',
                'The tool failed, but I can still help.',
            ]);

            registry.registerInline('broken', 'Broken', {}, async () => { throw new Error('boom'); });

            const result = await router.run('System', 'Call broken tool');

            expect(result.toolCalls[0].result.success).toBe(false);
            expect(result.toolCalls[0].result.error).toContain('boom');
        });
    });

    describe('response cleaning', () => {
        it('should remove leftover tool_call blocks from final response', async () => {
            const { registry, router } = createSetup([
                // First call: make a real tool call so we enter the tool loop
                '<tool_call>\n{"name": "real", "arguments": {}}\n</tool_call>',
                // Second call: final response with leftover tool_call block
                'Here is the answer. <tool_call>\n{"name": "leftover", "arguments": {}}\n</tool_call> Done.',
            ]);

            // Register "real" but not "leftover"
            registry.registerInline('real', 'Real tool', {}, async () => 'ok');

            const result = await router.run('System', 'Test');

            expect(result.response).not.toContain('tool_call');
            expect(result.response).toContain('Here is the answer.');
        });
    });

    describe('system prompt with tools', () => {
        it('should include tool descriptions in system prompt', async () => {
            const { registry, router, llm } = createSetup([
                'Using no tools, just answering.',
            ]);

            registry.registerInline(
                'weather',
                'Get current weather',
                { type: 'object', properties: { city: { type: 'string', description: 'City name' } } },
                async () => 'sunny',
            );

            await router.run('You are helpful.', 'Hello');

            const calls = (llm.chat as ReturnType<typeof vi.fn>).mock.calls;
            const systemMsg = calls[0][0][0];
            expect(systemMsg.content).toContain('Available Tools');
            expect(systemMsg.content).toContain('weather');
            expect(systemMsg.content).toContain('Get current weather');
            expect(systemMsg.content).toContain('City name');
        });
    });
});
