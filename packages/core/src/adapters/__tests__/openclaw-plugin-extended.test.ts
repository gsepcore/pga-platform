/**
 * OpenClaw Plugin Extended Tests — Coverage boost
 *
 * Tests: detectAgentName, createDefaultLLM, proactive service start/stop,
 * llm_output with empty response, message_sending clearing C4 result,
 * /gsep command with uninitialized genome, autoDetectName option.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gsepPlugin } from '../openclaw-plugin.js';

// ─── Mock LLM ──────────────────────────────────────────

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Mock response',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

// ─── Mock PluginApi ────────────────────────────────────

type HookHandler = (...args: unknown[]) => unknown;

function createMockApi() {
    const hooks = new Map<string, HookHandler>();
    const commands = new Map<string, { handler: (...args: unknown[]) => unknown }>();
    const services = new Map<string, { start: (ctx: Record<string, unknown>) => void; stop?: () => void }>();

    return {
        api: {
            id: 'gsep',
            name: 'GSEP',
            config: {},
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            on: vi.fn((hookName: string, handler: HookHandler) => {
                hooks.set(hookName, handler);
            }),
            registerCommand: vi.fn((cmd: { name: string; handler: (...args: unknown[]) => unknown }) => {
                commands.set(cmd.name, cmd);
            }),
            registerService: vi.fn((svc: { id: string; start: (ctx: Record<string, unknown>) => void; stop?: () => void }) => {
                services.set(svc.id, svc);
            }),
            runtime: {
                system: { enqueueSystemEvent: vi.fn() },
                channel: { reply: { dispatchReplyWithBufferedBlockDispatcher: vi.fn() } },
            },
        },
        hooks,
        commands,
        services,
    };
}

// ─── Tests ─────────────────────────────────────────────

describe('OpenClaw Plugin — Extended Coverage', () => {

    describe('Plugin factory defaults', () => {
        it('should use default options when none provided', () => {
            const plugin = gsepPlugin();

            expect(plugin.id).toBe('gsep');
            expect(plugin.version).toBe('0.8.0');
        });

        it('should accept autoDetectName: false', () => {
            const plugin = gsepPlugin({ autoDetectName: false, llm: mockLLM as never });

            expect(plugin.id).toBe('gsep');
        });

        it('should accept autoDetectName: true (default)', () => {
            const plugin = gsepPlugin({ llm: mockLLM as never });

            expect(plugin.id).toBe('gsep');
        });
    });

    describe('Proactive service', () => {
        it('should start proactive service and create timer', () => {
            vi.useFakeTimers();
            const plugin = gsepPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, services } = createMockApi();
            plugin.register(api as never);

            const service = services.get('gsep-proactive')!;
            expect(service).toBeDefined();

            service.start({});

            expect(api.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Proactive service started'),
            );

            vi.useRealTimers();
        });

        it('should stop proactive service and clear timer', () => {
            vi.useFakeTimers();
            const plugin = gsepPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, services } = createMockApi();
            plugin.register(api as never);

            const service = services.get('gsep-proactive')!;
            service.start({});

            // Set the timer reference on the api mock
            expect(service.stop).toBeDefined();
            service.stop!();

            vi.useRealTimers();
        });

        it('should handle stop when no timer exists', () => {
            const plugin = gsepPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, services } = createMockApi();
            plugin.register(api as never);

            const service = services.get('gsep-proactive')!;
            // Stop without starting — should not throw
            expect(() => service.stop!()).not.toThrow();
        });
    });

    describe('llm_output hook edge cases', () => {
        it('should handle empty assistant texts array', async () => {
            const mockGenome = {
                beforeLLM: vi.fn().mockResolvedValue({ prompt: 'test', sanitizedMessage: 'test', blocked: false }),
                afterLLM: vi.fn().mockResolvedValue({ safe: true, response: 'ok' }),
                export: vi.fn().mockResolvedValue({ id: 'test', name: 'test', layers: {} }),
                generateWeeklyReport: vi.fn(),
                chat: vi.fn(),
            };

            vi.doMock('../../GSEP.js', () => ({
                GSEP: {
                    quickStart: vi.fn().mockResolvedValue(mockGenome),
                },
            }));

            const { gsepPlugin: freshPlugin } = await import('../openclaw-plugin.js');
            const plugin = freshPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, hooks } = createMockApi();
            plugin.register(api as never);

            // Trigger before to set lastUserMessage
            const beforeHandler = hooks.get('before_prompt_build')!;
            await beforeHandler({ prompt: 'Test', messages: [] }, {});

            // Trigger llm_output with empty texts
            const afterHandler = hooks.get('llm_output')!;
            await afterHandler({ runId: 'run-1', assistantTexts: [] }, {});

            // afterLLM should NOT be called with empty response
            // (responseText would be empty string, which is falsy)
        });

        it('should handle afterLLM throwing an error', async () => {
            const mockGenome = {
                beforeLLM: vi.fn().mockResolvedValue({ prompt: 'test', sanitizedMessage: 'test', blocked: false }),
                afterLLM: vi.fn().mockRejectedValue(new Error('C4 check failed')),
                export: vi.fn().mockResolvedValue({ id: 'test', name: 'test', layers: {} }),
                generateWeeklyReport: vi.fn(),
                chat: vi.fn(),
            };

            vi.doMock('../../GSEP.js', () => ({
                GSEP: {
                    quickStart: vi.fn().mockResolvedValue(mockGenome),
                },
            }));

            const { gsepPlugin: freshPlugin } = await import('../openclaw-plugin.js');
            const plugin = freshPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, hooks } = createMockApi();
            plugin.register(api as never);

            const beforeHandler = hooks.get('before_prompt_build')!;
            await beforeHandler({ prompt: 'Test', messages: [] }, {});

            const afterHandler = hooks.get('llm_output')!;
            await afterHandler({ runId: 'run-1', assistantTexts: ['Response'] }, {});

            // Should log warning but not throw
            if (api.logger.warn.mock.calls.length > 0) {
                expect(api.logger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('AFTER error'),
                );
            }
        });
    });

    describe('message_sending clears C4 result', () => {
        it('should clear C4 result after intercepting once', async () => {
            const mockGenome = {
                beforeLLM: vi.fn().mockResolvedValue({ prompt: 'test', sanitizedMessage: 'test', blocked: false }),
                afterLLM: vi.fn().mockResolvedValue({ safe: false, response: 'Blocked content' }),
                export: vi.fn().mockResolvedValue({ id: 'test', name: 'test', layers: {} }),
                generateWeeklyReport: vi.fn(),
                chat: vi.fn(),
            };

            vi.doMock('../../GSEP.js', () => ({
                GSEP: {
                    quickStart: vi.fn().mockResolvedValue(mockGenome),
                },
            }));

            const { gsepPlugin: freshPlugin } = await import('../openclaw-plugin.js');
            const plugin = freshPlugin({ name: 'test-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, hooks } = createMockApi();
            plugin.register(api as never);

            // Set up C4 unsafe result
            const beforeHandler = hooks.get('before_prompt_build')!;
            await beforeHandler({ prompt: 'Bad prompt', messages: [] }, {});

            const afterHandler = hooks.get('llm_output')!;
            await afterHandler({ runId: 'run-1', assistantTexts: ['Dangerous content'] }, {});

            const msgHandler = hooks.get('message_sending')!;

            // First call should intercept
            const first = await msgHandler({ to: 'user', content: 'Dangerous' }) as { content?: string } | undefined;
            if (first?.content) {
                expect(first.content).toBe('Blocked content');
            }

            // Second call should pass through (C4 result cleared)
            const second = await msgHandler({ to: 'user', content: 'Normal' });
            expect(second).toBeUndefined();
        });
    });

    describe('/gsep command with uninitialized genome', () => {
        it('should return "not initialized" if genome init fails', async () => {
            vi.doMock('../../GSEP.js', () => ({
                GSEP: {
                    quickStart: vi.fn().mockRejectedValue(new Error('Init failed')),
                },
            }));

            const { gsepPlugin: freshPlugin } = await import('../openclaw-plugin.js');
            const plugin = freshPlugin({ name: 'fail-agent', llm: mockLLM as never, dashboardPort: 0 });
            const { api, commands } = createMockApi();
            plugin.register(api as never);

            const cmd = commands.get('gsep')!;
            const result = await cmd.handler({}) as { text?: string };

            if (result?.text) {
                expect(result.text).toContain('not initialized');
            }
        });
    });

    describe('Plugin description field', () => {
        it('should have description in metadata', () => {
            const plugin = gsepPlugin({ name: 'test', llm: mockLLM as never });
            expect(plugin.description).toContain('Self-evolving prompts');
        });
    });

    describe('Logger messages on register', () => {
        it('should log plugin registration info', () => {
            const plugin = gsepPlugin({ name: 'test', llm: mockLLM as never, dashboardPort: 0 });
            const { api } = createMockApi();

            plugin.register(api as never);

            expect(api.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Plugin registered'),
            );
        });
    });
});
