/**
 * GSEP Auto-Instrumentation — Zero-code integration.
 *
 * Add this ONE line at the top of your app:
 *
 *   import '@gsep/core/auto'
 *
 * GSEP patches globalThis.fetch BEFORE any LLM SDK loads.
 * On the first LLM call, GSEP captures the connection and activates
 * the full 32-step pipeline using the agent's own LLM.
 *
 * Streaming supported: GSEP tees the stream — agent gets tokens
 * in real-time, GSEP accumulates in background for post-LLM steps.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-31
 */

import { GSEP, type GenomeInstance } from './GSEP.js';
import type { LLMAdapter } from './interfaces/LLMAdapter.js';

// ─── State ──────────────────────────────────────────────

let _genome: GenomeInstance | null = null;
let _initializing: Promise<GenomeInstance | null> | null = null;
const _originalFetch = globalThis.fetch;

// LLM endpoints to intercept
const LLM_PATTERNS = [
    'api.openai.com/v1/chat/completions',
    'api.openai.com/v1/responses',
    'api.anthropic.com/v1/messages',
    'generativelanguage.googleapis.com',
];

function isLLMCall(url: string): boolean {
    return LLM_PATTERNS.some(p => url.includes(p));
}

// ─── Create LLM adapter from intercepted connection ─────

function createAdapterFromConnection(
    url: string,
    headers: Record<string, string>,
    model: string,
): LLMAdapter {
    return {
        name: 'agent-llm',
        model,
        async chat(messages: Array<{ role: string; content: string }>) {
            const res = await _originalFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ messages, model, max_tokens: 4096 }),
            });
            const data = await res.json() as Record<string, unknown>;

            // OpenAI format
            if (Array.isArray(data.choices)) {
                const choice = (data.choices as Array<{ message?: { content?: string } }>)[0];
                const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
                return {
                    content: choice?.message?.content ?? '',
                    usage: usage ? { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0 } : undefined,
                };
            }
            // Anthropic format
            if (Array.isArray(data.content)) {
                const block = (data.content as Array<{ type: string; text?: string }>).find(b => b.type === 'text');
                return { content: block?.text ?? '' };
            }
            return { content: String(data.content ?? '') };
        },
    };
}

// ─── Initialize GSEP from first intercepted call ────────

async function initGSEP(
    url: string,
    headers: Record<string, string>,
    model: string,
): Promise<GenomeInstance | null> {
    if (_genome) return _genome;
    if (_initializing) return _initializing;

    _initializing = (async () => {
        try {
            const llm = createAdapterFromConnection(url, headers, model);
            _genome = await GSEP.quickStart({
                name: 'auto-agent',
                llm,
                dashboardPort: parseInt(process.env.GSEP_DASHBOARD_PORT ?? '4200', 10),
            });
            console.log('\n[GSEP] 🧬 Pipeline active — using your agent\'s LLM connection.');
            console.log('[GSEP] 32 steps per call: Evolution ON | Security ON | PII Redaction ON');
            console.log('[GSEP] Dashboard: http://localhost:4200/gsep/dashboard\n');
            return _genome;
        } catch (err) {
            console.log('[GSEP] Init error:', (err as Error).message);
            return null;
        }
    })();

    return _initializing;
}

// ─── Extract auth headers from request ──────────────────

function extractHeaders(init?: RequestInit): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!init?.headers) return headers;

    if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) { headers[k] = v; }
    } else {
        Object.assign(headers, init.headers);
    }
    return headers;
}

// ─── Parse SSE stream into accumulated content ──────────

async function accumulateStream(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let raw = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
    }

    // Parse SSE data lines
    const lines = raw.split('\n').filter(l => l.startsWith('data: ') && !l.includes('[DONE]'));
    let content = '';
    for (const line of lines) {
        try {
            const data = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
            content += data.choices?.[0]?.delta?.content ?? '';
        } catch { /* skip malformed chunks */ }
    }
    return content;
}

// ─── The fetch patch ────────────────────────────────────

async function gsepFetch(
    input: string | URL | Request,
    init?: RequestInit,
): Promise<Response> {
    const url = typeof input === 'string'
        ? input
        : input instanceof URL ? input.toString()
        : (input as Request).url;

    // Defer to native plugin when active (avoid duplicate processing)
    if ((globalThis as Record<string, unknown>).__GSEP_PLUGIN_ACTIVE__) {
        return _originalFetch(input, init);
    }

    // Only intercept LLM API calls
    if (!isLLMCall(url)) {
        return _originalFetch(input, init);
    }

    // Parse body
    const body = init?.body;
    if (!body || typeof body !== 'string') return _originalFetch(input, init);

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(body); } catch { return _originalFetch(input, init); }

    const messages = parsed.messages as Array<{ role: string; content: string }> | undefined;
    if (!messages || messages.length === 0) return _originalFetch(input, init);

    const isStreaming = !!parsed.stream;
    const headers = extractHeaders(init);
    const model = (parsed.model as string) ?? 'auto';

    // Initialize GSEP on first call
    const genome = await initGSEP(url, headers, model);
    if (!genome) return _originalFetch(input, init);

    // Find last user message
    const userMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!userMsg) return _originalFetch(input, init);

    // ─── STREAMING PATH ─────────────────────────────────
    if (isStreaming) {
        // BEFORE hooks: run GSEP pre-LLM steps on the user message
        // This modifies the prompt with evolved genes, PII redaction, etc.
        try {
            const beforeResult = await genome.assemblePrompt(
                { userId: 'auto', taskType: 'general' },
                userMsg.content,
            );

            // Enhance the system prompt with GSEP genes
            if (beforeResult) {
                const systemIdx = messages.findIndex(m => m.role === 'system');
                if (systemIdx >= 0) {
                    messages[systemIdx].content += '\n\n' + beforeResult;
                } else {
                    messages.unshift({ role: 'system', content: beforeResult });
                }
                // Update the body with enhanced messages
                parsed.messages = messages;
                init = {
                    ...init,
                    body: JSON.stringify(parsed),
                };
            }
        } catch { /* pre-LLM enhancement failed — continue with original */ }

        // Forward the streaming call to the real LLM
        const response = await _originalFetch(
            typeof input === 'string' ? input : input,
            init,
        );

        // Tee the stream: one for agent (real-time), one for GSEP (accumulate)
        if (!response.body) return response;

        const [agentStream, gsepStream] = response.body.tee();

        // AFTER hooks: accumulate in background, run post-LLM steps when done
        accumulateStream(gsepStream).then(async (content) => {
            if (!content || !_genome) return;
            try {
                // Feed the response into GSEP for fitness tracking + evolution
                await _genome.recordExternalInteraction({
                    userMessage: userMsg.content,
                    response: content,
                    userId: 'auto',
                    taskType: 'general',
                    success: true,
                });
            } catch { /* best-effort — don't break the agent */ }
        }).catch(() => {});

        // Return agent's stream immediately — no delay
        return new Response(agentStream, {
            status: response.status,
            headers: response.headers,
        });
    }

    // ─── NON-STREAMING PATH ─────────────────────────────
    // Full 32-step pipeline via genome.chat()
    try {
        const gsepResponse = await genome.chat(userMsg.content, {
            userId: 'auto',
            taskType: 'general',
        });

        return new Response(JSON.stringify({
            id: `gsep-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: `gsep/${model}`,
            choices: [{ index: 0, message: { role: 'assistant', content: gsepResponse }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
        return _originalFetch(input, init);
    }
}

// ─── Auto-execute on import ─────────────────────────────

console.log('[GSEP] 🧬 Auto-instrumentation loaded. Waiting for first LLM call...');
globalThis.fetch = gsepFetch as typeof fetch;

// Export for testing
export { _genome as genome, _originalFetch, initGSEP };
