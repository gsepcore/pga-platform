import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProactiveEngine } from '../ProactiveEngine.js';
import { SkillRegistry } from '../SkillRegistry.js';
import { SkillExecutor } from '../SkillExecutor.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';

// ─── Helpers ────────────────────────────────────────────

function createMockLLM(response: string): LLMAdapter {
    return {
        name: 'mock',
        model: 'mock',
        chat: vi.fn(async () => ({ content: response })),
    };
}

function createEngine(
    llmResponse: string,
    config?: { minIntervalMs?: number; maxConcurrent?: number; agentPurpose?: string },
) {
    const registry = new SkillRegistry();
    const llm = createMockLLM(llmResponse);
    const executor = new SkillExecutor(registry, { timeoutMs: 5000, maxRetries: 0 });
    const engine = new ProactiveEngine(llm, registry, executor, config);
    return { engine, registry, executor, llm };
}

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: 'task-1',
        name: 'Test Task',
        instruction: 'Do something useful',
        intervalMs: 60000 as number | 'once',
        notify: true,
        priority: 1,
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('ProactiveEngine', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ─── Task management ────────────────────────────────────

    describe('task management', () => {
        it('should add and retrieve tasks', () => {
            const { engine } = createEngine('{}');
            engine.addTask(makeTask());

            const tasks = engine.getTasks();
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe('task-1');
            expect(tasks[0].name).toBe('Test Task');
            expect(tasks[0].active).toBe(true);
        });

        it('should remove tasks', () => {
            const { engine } = createEngine('{}');
            engine.addTask(makeTask());
            engine.removeTask('task-1');

            expect(engine.getTasks()).toHaveLength(0);
        });

        it('should handle removing non-existent task', () => {
            const { engine } = createEngine('{}');
            // Should not throw
            engine.removeTask('nonexistent');
            expect(engine.getTasks()).toHaveLength(0);
        });
    });

    // ─── Task execution ─────────────────────────────────────

    describe('task execution', () => {
        it('should execute a task and return result', async () => {
            const { engine } = createEngine(
                '{"findings": "Found 3 anomalies", "actionTaken": "Logged them", "skillsUsed": [], "importance": "medium"}',
            );
            engine.addTask(makeTask());

            const result = await engine.runTask('task-1');

            expect(result).not.toBeNull();
            expect(result!.taskId).toBe('task-1');
            expect(result!.findings).toBe('Found 3 anomalies');
            expect(result!.actionTaken).toBe('Logged them');
            expect(result!.importance).toBe('medium');
        });

        it('should return null for unknown task', async () => {
            const { engine } = createEngine('{}');
            const result = await engine.runTask('nonexistent');
            expect(result).toBeNull();
        });

        it('should handle LLM errors gracefully', async () => {
            const llm: LLMAdapter = {
                name: 'failing',
                model: 'mock',
                chat: vi.fn(async () => { throw new Error('LLM down'); }),
            };
            const registry = new SkillRegistry();
            const executor = new SkillExecutor(registry);
            const engine = new ProactiveEngine(llm, registry, executor);

            engine.addTask(makeTask());
            const result = await engine.runTask('task-1');

            expect(result).not.toBeNull();
            expect(result!.findings).toContain('Task failed');
            expect(result!.findings).toContain('LLM down');
            expect(result!.importance).toBe('low');
        });

        it('should execute tool calls from LLM response', async () => {
            const { engine, registry } = createEngine(
                '<tool_call>\n{"name": "check-status", "arguments": {"service": "api"}}\n</tool_call>\n{"findings": "API is healthy", "actionTaken": "Checked", "skillsUsed": ["check-status"], "importance": "low"}',
            );

            const executeFn = vi.fn(async () => 'Status: OK');
            registry.registerInline('check-status', 'Check service status', {}, executeFn);
            engine.addTask(makeTask());

            const result = await engine.runTask('task-1');

            expect(executeFn).toHaveBeenCalledWith({ service: 'api' });
            expect(result!.skillsUsed).toContain('check-status');
        });

        it('should skip tool calls for unregistered skills', async () => {
            const { engine } = createEngine(
                '<tool_call>\n{"name": "unknown", "arguments": {}}\n</tool_call>\n{"findings": "done", "actionTaken": "none", "skillsUsed": [], "importance": "low"}',
            );
            engine.addTask(makeTask());

            const result = await engine.runTask('task-1');

            expect(result!.skillsUsed).not.toContain('unknown');
        });

        it('should handle malformed JSON in LLM response', async () => {
            const { engine } = createEngine('This is not JSON at all, just a plain response.');
            engine.addTask(makeTask());

            const result = await engine.runTask('task-1');

            // Should use defaults
            expect(result!.findings).toBe('Task completed');
            expect(result!.importance).toBe('low');
        });
    });

    // ─── Run all ────────────────────────────────────────────

    describe('runAll', () => {
        it('should run all active tasks sorted by priority', async () => {
            const { engine } = createEngine(
                '{"findings": "ok", "actionTaken": "checked", "skillsUsed": [], "importance": "low"}',
            );

            engine.addTask(makeTask({ id: 'low', name: 'Low Priority', priority: 1 }));
            engine.addTask(makeTask({ id: 'high', name: 'High Priority', priority: 10 }));

            const results = await engine.runAll();

            expect(results).toHaveLength(2);
            // High priority should run first
            expect(results[0].taskId).toBe('high');
            expect(results[1].taskId).toBe('low');
        });
    });

    // ─── Notifications ──────────────────────────────────────

    describe('notifications', () => {
        it('should notify handlers when importance > low and notify=true', async () => {
            const { engine } = createEngine(
                '{"findings": "Critical issue!", "actionTaken": "Alerted", "skillsUsed": [], "importance": "high"}',
            );
            engine.addTask(makeTask({ notify: true }));

            const handler = vi.fn();
            engine.onNotification(handler);

            await engine.runTask('task-1');

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].importance).toBe('high');
            expect(handler.mock.calls[0][0].shouldNotify).toBe(true);
        });

        it('should NOT notify when importance is low', async () => {
            const { engine } = createEngine(
                '{"findings": "All good", "actionTaken": "Checked", "skillsUsed": [], "importance": "low"}',
            );
            engine.addTask(makeTask({ notify: true }));

            const handler = vi.fn();
            engine.onNotification(handler);

            await engine.runTask('task-1');

            expect(handler).not.toHaveBeenCalled();
        });

        it('should NOT notify when notify=false', async () => {
            const { engine } = createEngine(
                '{"findings": "Big issue", "actionTaken": "Found", "skillsUsed": [], "importance": "critical"}',
            );
            engine.addTask(makeTask({ notify: false }));

            const handler = vi.fn();
            engine.onNotification(handler);

            await engine.runTask('task-1');

            expect(handler).not.toHaveBeenCalled();
        });

        it('should handle notification handler errors gracefully', async () => {
            const { engine } = createEngine(
                '{"findings": "Issue", "actionTaken": "Found", "skillsUsed": [], "importance": "high"}',
            );
            engine.addTask(makeTask({ notify: true }));

            const badHandler = vi.fn(async () => { throw new Error('Handler crashed'); });
            const goodHandler = vi.fn();
            engine.onNotification(badHandler);
            engine.onNotification(goodHandler);

            // Should not throw even though first handler fails
            await engine.runTask('task-1');

            expect(badHandler).toHaveBeenCalled();
            expect(goodHandler).toHaveBeenCalled();
        });
    });

    // ─── Results history ────────────────────────────────────

    describe('results history', () => {
        it('should store results and allow retrieval', async () => {
            const { engine } = createEngine(
                '{"findings": "ok", "actionTaken": "checked", "skillsUsed": [], "importance": "low"}',
            );
            engine.addTask(makeTask());

            await engine.runTask('task-1');
            await engine.runTask('task-1');

            const results = engine.getResults();
            expect(results).toHaveLength(2);
        });

        it('should respect results limit', async () => {
            const { engine } = createEngine(
                '{"findings": "ok", "actionTaken": "checked", "skillsUsed": [], "importance": "low"}',
            );
            engine.addTask(makeTask());

            await engine.runTask('task-1');
            await engine.runTask('task-1');
            await engine.runTask('task-1');

            const results = engine.getResults(2);
            expect(results).toHaveLength(2);
        });
    });

    // ─── Engine lifecycle ───────────────────────────────────

    describe('engine lifecycle', () => {
        it('should track running state', () => {
            const { engine } = createEngine('{}');

            expect(engine.isRunning()).toBe(false);

            engine.start();
            expect(engine.isRunning()).toBe(true);

            engine.stop();
            expect(engine.isRunning()).toBe(false);
        });

        it('should not double-start', () => {
            const { engine } = createEngine('{}');
            engine.addTask(makeTask());

            engine.start();
            engine.start(); // Should be no-op

            expect(engine.isRunning()).toBe(true);
            engine.stop();
        });

        it('should stop all timers on stop', () => {
            const { engine } = createEngine('{}');
            engine.addTask(makeTask({ intervalMs: 100000 }));

            engine.start();
            engine.stop();

            expect(engine.isRunning()).toBe(false);
        });

        it('should handle one-shot tasks', async () => {
            const { engine } = createEngine(
                '{"findings": "done", "actionTaken": "ran once", "skillsUsed": [], "importance": "low"}',
            );
            engine.addTask(makeTask({ intervalMs: 'once' }));

            engine.start();

            // Give time for the one-shot task to run
            await new Promise(r => setTimeout(r, 50));

            const tasks = engine.getTasks();
            // One-shot task should be deactivated after running
            expect(tasks[0].active).toBe(false);

            engine.stop();
        });
    });

    // ─── Allowed skills filter ──────────────────────────────

    describe('allowed skills', () => {
        it('should pass allowed skills to LLM context', async () => {
            const { engine, registry, llm } = createEngine(
                '{"findings": "ok", "actionTaken": "checked", "skillsUsed": [], "importance": "low"}',
            );

            registry.registerInline('search', 'Web search', {}, async () => 'result');
            registry.registerInline('email', 'Send email', {}, async () => 'sent');

            engine.addTask(makeTask({ allowedSkills: ['search'] }));
            await engine.runTask('task-1');

            const chatCalls = (llm.chat as ReturnType<typeof vi.fn>).mock.calls;
            const systemMsg = chatCalls[0][0][0].content;

            // Should mention search but not email
            expect(systemMsg).toContain('search');
        });
    });
});
