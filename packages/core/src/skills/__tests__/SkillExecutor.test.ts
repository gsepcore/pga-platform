import { describe, it, expect, vi } from 'vitest';
import { SkillExecutor } from '../SkillExecutor.js';
import { SkillRegistry } from '../SkillRegistry.js';

function createSetup(config?: { timeoutMs?: number; maxRetries?: number }) {
    const registry = new SkillRegistry();
    const executor = new SkillExecutor(registry, config);
    return { registry, executor };
}

describe('SkillExecutor', () => {
    // ─── Inline skill execution ────────────────────────────

    describe('inline skill execution', () => {
        it('should execute an inline skill successfully', async () => {
            const { registry, executor } = createSetup();
            registry.registerInline(
                'echo',
                'Echoes input',
                { type: 'object', properties: { text: { type: 'string' } } },
                async (params) => `Echo: ${params.text}`,
            );

            const result = await executor.execute('echo', { text: 'hello' });

            expect(result.success).toBe(true);
            expect(result.output).toBe('Echo: hello');
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
            expect(result.error).toBeUndefined();
        });

        it('should return error for unknown skill', async () => {
            const { executor } = createSetup();

            const result = await executor.execute('nonexistent', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
            expect(result.latencyMs).toBe(0);
        });

        it('should handle skill execution errors', async () => {
            const { registry, executor } = createSetup({ maxRetries: 0 });
            registry.registerInline(
                'failing',
                'Always fails',
                {},
                async () => { throw new Error('Skill crashed'); },
            );

            const result = await executor.execute('failing', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Skill crashed');
        });

        it('should record execution metrics in registry', async () => {
            const { registry, executor } = createSetup();
            registry.registerInline(
                'tracked',
                'Tracked skill',
                {},
                async () => 'done',
            );

            await executor.execute('tracked', {});
            await executor.execute('tracked', {});

            const skill = registry.get('tracked')!;
            expect(skill.metrics.totalCalls).toBe(2);
            expect(skill.metrics.successCount).toBe(2);
            expect(skill.metrics.successRate).toBe(1);
            expect(skill.metrics.lastUsed).not.toBeNull();
        });

        it('should record failed execution metrics', async () => {
            const { registry, executor } = createSetup({ maxRetries: 0 });
            registry.registerInline(
                'flaky',
                'Sometimes fails',
                {},
                async () => { throw new Error('oops'); },
            );

            await executor.execute('flaky', {});

            const skill = registry.get('flaky')!;
            expect(skill.metrics.totalCalls).toBe(1);
            expect(skill.metrics.failureCount).toBe(1);
            expect(skill.metrics.successRate).toBe(0);
        });
    });

    // ─── Timeout handling ──────────────────────────────────

    describe('timeout', () => {
        it('should timeout slow skills', async () => {
            const { registry, executor } = createSetup({ timeoutMs: 50, maxRetries: 0 });
            registry.registerInline(
                'slow',
                'Very slow skill',
                {},
                () => new Promise((resolve) => setTimeout(() => resolve('late'), 200)),
            );

            const result = await executor.execute('slow', {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
        });

        it('should succeed when skill completes within timeout', async () => {
            const { registry, executor } = createSetup({ timeoutMs: 1000 });
            registry.registerInline(
                'fast',
                'Fast skill',
                {},
                async () => 'quick result',
            );

            const result = await executor.execute('fast', {});

            expect(result.success).toBe(true);
            expect(result.output).toBe('quick result');
        });
    });

    // ─── Retry logic ───────────────────────────────────────

    describe('retries', () => {
        it('should retry on failure up to maxRetries', async () => {
            let callCount = 0;
            const { registry, executor } = createSetup({ maxRetries: 2, timeoutMs: 5000 });
            registry.registerInline(
                'flaky',
                'Fails then succeeds',
                {},
                async () => {
                    callCount++;
                    if (callCount < 3) throw new Error(`Attempt ${callCount} failed`);
                    return 'success on 3rd try';
                },
            );

            const result = await executor.execute('flaky', {});

            expect(result.success).toBe(true);
            expect(result.output).toBe('success on 3rd try');
            expect(callCount).toBe(3); // 1 initial + 2 retries
        });

        it('should fail after exhausting retries', async () => {
            let callCount = 0;
            const { registry, executor } = createSetup({ maxRetries: 1, timeoutMs: 5000 });
            registry.registerInline(
                'always-fails',
                'Never succeeds',
                {},
                async () => {
                    callCount++;
                    throw new Error(`Fail #${callCount}`);
                },
            );

            const result = await executor.execute('always-fails', {});

            expect(result.success).toBe(false);
            expect(callCount).toBe(2); // 1 initial + 1 retry
            expect(result.error).toContain('Fail #2');
        });

        it('should not retry when maxRetries is 0', async () => {
            let callCount = 0;
            const { registry, executor } = createSetup({ maxRetries: 0 });
            registry.registerInline(
                'no-retry',
                'No retries',
                {},
                async () => {
                    callCount++;
                    throw new Error('fail');
                },
            );

            await executor.execute('no-retry', {});

            expect(callCount).toBe(1);
        });
    });

    // ─── Edge cases ────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle skill with no execute handler', async () => {
            const { registry, executor } = createSetup({ maxRetries: 0 });
            // Register MCP skill without URI — should fail gracefully
            registry.registerMCP('broken', 'No handler', '');

            const result = await executor.execute('broken', {});

            expect(result.success).toBe(false);
        });

        it('should use default config when none provided', () => {
            const registry = new SkillRegistry();
            const executor = new SkillExecutor(registry);
            // Should not throw
            expect(executor).toBeDefined();
        });

        it('should handle async skill returning empty string', async () => {
            const { registry, executor } = createSetup();
            registry.registerInline(
                'empty',
                'Returns empty',
                {},
                async () => '',
            );

            const result = await executor.execute('empty', {});

            expect(result.success).toBe(true);
            expect(result.output).toBe('');
        });

        it('should measure latency accurately', async () => {
            const { registry, executor } = createSetup();
            registry.registerInline(
                'timed',
                'Takes ~50ms',
                {},
                () => new Promise(r => setTimeout(() => r('done'), 50)),
            );

            const result = await executor.execute('timed', {});

            expect(result.success).toBe(true);
            expect(result.latencyMs).toBeGreaterThanOrEqual(40);
            expect(result.latencyMs).toBeLessThan(500);
        });
    });

    // ─── Disconnect ────────────────────────────────────────

    describe('disconnect', () => {
        it('should clear MCP clients on disconnect', async () => {
            const { executor } = createSetup();
            // Disconnect should not throw even with no connections
            await executor.disconnect();
        });
    });
});
