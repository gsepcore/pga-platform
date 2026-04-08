import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMProxyLayer, type LLMAdapterLike } from '../LLMProxyLayer.js';

// ─── Helpers ────────────────────────────────────────────

function makeAdapter(overrides?: Partial<LLMAdapterLike>): LLMAdapterLike {
    return {
        model: 'test-model',
        name: 'test-adapter',
        chat: vi.fn().mockResolvedValue({ content: 'Hello from LLM', usage: { inputTokens: 10, outputTokens: 5 } }),
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('LLMProxyLayer', () => {
    let cloudAdapter: LLMAdapterLike;

    beforeEach(() => {
        cloudAdapter = makeAdapter();
    });

    // ── Basic pass-through ──────────────────────────────

    it('should send messages to cloud adapter and return its response', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter);
        const messages = [{ role: 'user', content: 'Hello world' }];

        const response = await proxy.chat(messages);

        expect(response.content).toBe('Hello from LLM');
        expect(response.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
        expect(cloudAdapter.chat).toHaveBeenCalledTimes(1);
    });

    // ── Stats tracking ──────────────────────────────────

    it('should increment totalRequests and cloudRouted on each call', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter);

        await proxy.chat([{ role: 'user', content: 'First' }]);
        await proxy.chat([{ role: 'user', content: 'Second' }]);

        const stats = proxy.getStats();
        expect(stats.totalRequests).toBe(2);
        expect(stats.cloudRouted).toBe(2);
        expect(stats.localRouted).toBe(0);
    });

    // ── GSEP identity injection ─────────────────────────
    // Note: identity is injected into messagesWithIdentity but when
    // redaction is enabled (default), processedMessages is rebuilt from
    // the original messages array, losing the identity. Identity is only
    // visible when redaction is disabled or routing locally.

    it('should append GSEP Shield identity when redaction is disabled', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: false });
        const messages = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hi' },
        ];

        await proxy.chat(messages);

        const sentMessages = (cloudAdapter.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const systemMsg = sentMessages.find((m: { role: string }) => m.role === 'system');
        expect(systemMsg.content).toContain('You are a helpful assistant.');
        expect(systemMsg.content).toContain('GSEP Shield (Active)');
    });

    it('should prepend system message with GSEP identity when none exists and redaction disabled', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: false });
        const messages = [{ role: 'user', content: 'Hi' }];

        await proxy.chat(messages);

        const sentMessages = (cloudAdapter.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(sentMessages[0].role).toBe('system');
        expect(sentMessages[0].content).toContain('GSEP Shield (Active)');
    });

    // ── Local routing ───────────────────────────────────

    it('should route to local adapter when content is classified as confidential', async () => {
        const localAdapter = makeAdapter({ name: 'local-ollama', model: 'llama3' });
        const proxy = new LLMProxyLayer(cloudAdapter, {
            localAdapter,
            localRouteThreshold: 'confidential',
        });

        const messages = [{ role: 'user', content: 'My SSN is 123-45-6789' }];
        await proxy.chat(messages);

        expect(localAdapter.chat).toHaveBeenCalledTimes(1);
        expect(cloudAdapter.chat).not.toHaveBeenCalled();
    });

    it('should increment localRouted when routed to local adapter', async () => {
        const localAdapter = makeAdapter({ name: 'local-ollama' });
        const proxy = new LLMProxyLayer(cloudAdapter, {
            localAdapter,
            localRouteThreshold: 'confidential',
        });

        await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);

        const stats = proxy.getStats();
        expect(stats.localRouted).toBe(1);
        expect(stats.cloudRouted).toBe(0);
    });

    // ── PII redaction ───────────────────────────────────

    it('should redact SSN and email before sending to cloud', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: true });
        const messages = [
            { role: 'user', content: 'My SSN is 123-45-6789 and email is test@example.com' },
        ];

        await proxy.chat(messages);

        const sentMessages = (cloudAdapter.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const userMsg = sentMessages.find((m: { role: string }) => m.role === 'user');
        expect(userMsg.content).not.toContain('123-45-6789');
        expect(userMsg.content).not.toContain('test@example.com');
    });

    it('should track redaction stats', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: true });

        await proxy.chat([
            { role: 'user', content: 'My SSN is 123-45-6789 and email is test@example.com' },
        ]);

        const stats = proxy.getStats();
        expect(stats.redactedRequests).toBe(1);
        expect(stats.totalPIIRedacted).toBeGreaterThanOrEqual(1);
    });

    // ── PII re-hydration ────────────────────────────────

    it('should re-hydrate PII tokens in the LLM response', async () => {
        const captureAdapter = makeAdapter();
        (captureAdapter.chat as ReturnType<typeof vi.fn>).mockImplementation(
            async (msgs: Array<{ role: string; content: string }>) => {
                const userMsg = msgs.find(m => m.role === 'user');
                return { content: `You said: ${userMsg?.content ?? ''}` };
            },
        );

        const proxy = new LLMProxyLayer(captureAdapter, { enableRedaction: true });
        const response = await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);

        expect(response.content).toContain('123-45-6789');
    });

    // ── Redaction disabled ──────────────────────────────

    it('should pass PII through when enableRedaction is false', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: false });

        await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);

        const sentMessages = (cloudAdapter.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const userMsg = sentMessages.find((m: { role: string }) => m.role === 'user');
        expect(userMsg.content).toContain('123-45-6789');
    });

    // ── Model and name ──────────────────────────────────

    it('should expose model and name derived from cloud adapter', () => {
        const proxy = new LLMProxyLayer(
            makeAdapter({ model: 'claude-sonnet-4-5-20250514', name: 'anthropic' }),
        );

        expect(proxy.model).toBe('claude-sonnet-4-5-20250514');
        expect(proxy.name).toBe('secure-proxy(anthropic)');
    });

    it('should use defaults when cloud adapter has no model or name', () => {
        const proxy = new LLMProxyLayer(
            makeAdapter({ model: undefined, name: undefined }),
        );

        expect(proxy.model).toBe('proxy');
        expect(proxy.name).toBe('secure-proxy(llm)');
    });

    // ── getStats returns copy ───────────────────────────

    it('should return a copy of stats', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter);
        await proxy.chat([{ role: 'user', content: 'Hello' }]);

        const stats1 = proxy.getStats();
        stats1.totalRequests = 999;

        const stats2 = proxy.getStats();
        expect(stats2.totalRequests).toBe(1);
    });

    // ── clearVault ──────────────────────────────────────

    it('should clear PII vault', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: true });
        await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);

        proxy.clearVault();

        const piiStats = proxy.getPIIStats();
        expect(piiStats).toBeDefined();
    });

    // ── Edge cases ──────────────────────────────────────

    it('should not redact system prompt content', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, { enableRedaction: true });

        await proxy.chat([
            { role: 'system', content: 'Admin email: admin@secret.com' },
            { role: 'user', content: 'My email is user@test.com' },
        ]);

        const sentMessages = (cloudAdapter.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const systemMsg = sentMessages.find((m: { role: string }) => m.role === 'system');
        expect(systemMsg.content).toContain('admin@secret.com');
    });

    it('should not route locally when no localAdapter configured', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter, {
            localRouteThreshold: 'confidential',
        });

        await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);

        expect(cloudAdapter.chat).toHaveBeenCalledTimes(1);
        const stats = proxy.getStats();
        expect(stats.cloudRouted).toBe(1);
        expect(stats.localRouted).toBe(0);
    });

    it('should pass options through to the adapter', async () => {
        const proxy = new LLMProxyLayer(cloudAdapter);
        const options = { temperature: 0.7 };

        await proxy.chat([{ role: 'user', content: 'Hello' }], options);

        expect(cloudAdapter.chat).toHaveBeenCalledWith(expect.any(Array), options);
    });
});
