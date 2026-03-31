/**
 * GSEP Auto-Instrumentation — Zero-code integration.
 *
 * Add this ONE line at the top of your app:
 *
 *   import '@gsep/core/auto'
 *
 * GSEP intercepts your agent's LLM calls and runs the full 32-step
 * pipeline using YOUR agent's LLM connection. No API key needed.
 * No configuration. No code changes.
 *
 * How it works:
 * 1. On import, GSEP patches globalThis.fetch
 * 2. On the first LLM call your agent makes, GSEP captures the
 *    connection (endpoint + auth header) and creates a GenomeInstance
 * 3. From that point, every LLM call runs through the 32-step pipeline
 *    using your agent's own LLM — not a separate one
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-31
 */

import { GSEP, type GenomeInstance } from './GSEP.js';
import type { LLMAdapter } from './interfaces/LLMAdapter.js';

// ─── State ──────────────────────────────────────────────

let _genome: GenomeInstance | null = null;
let _initializing: Promise<GenomeInstance> | null = null;

// LLM endpoints we intercept
const LLM_ENDPOINTS = [
    { pattern: 'api.openai.com/v1/chat/completions', provider: 'openai' },
    { pattern: 'api.anthropic.com/v1/messages', provider: 'anthropic' },
    { pattern: 'generativelanguage.googleapis.com', provider: 'google' },
    { pattern: '/v1/chat/completions', provider: 'openai-compatible' },
];

// ─── Create LLM Adapter from intercepted call ───────────

function createAdapterFromInterceptedCall(
    url: string,
    headers: Record<string, string>,
): LLMAdapter {
    return {
        name: 'agent-llm',
        model: 'auto',
        async chat(messages: Array<{ role: string; content: string }>) {
            // Use the ORIGINAL fetch (before our patch) to avoid infinite loop
            const response = await _originalFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({
                    messages,
                    model: headers['x-gsep-model'] ?? 'auto',
                    max_tokens: 4096,
                }),
            });

            const data = await response.json() as Record<string, unknown>;

            // OpenAI format
            if (Array.isArray(data.choices)) {
                const choice = (data.choices as Array<{ message?: { content?: string } }>)[0];
                const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
                return {
                    content: choice?.message?.content ?? '',
                    usage: usage ? {
                        inputTokens: usage.prompt_tokens ?? 0,
                        outputTokens: usage.completion_tokens ?? 0,
                    } : undefined,
                };
            }

            // Anthropic format
            if (Array.isArray(data.content)) {
                const block = (data.content as Array<{ type: string; text?: string }>).find(b => b.type === 'text');
                const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
                return {
                    content: block?.text ?? '',
                    usage: usage ? {
                        inputTokens: usage.input_tokens ?? 0,
                        outputTokens: usage.output_tokens ?? 0,
                    } : undefined,
                };
            }

            return { content: String(data.content ?? data.text ?? '') };
        },
    };
}

// ─── Initialize GSEP from first intercepted call ────────

async function initializeFromCall(
    url: string,
    headers: Record<string, string>,
    model: string,
): Promise<GenomeInstance> {
    if (_genome) return _genome;

    if (_initializing) return _initializing;

    _initializing = (async () => {
        const llm = createAdapterFromInterceptedCall(url, headers);
        (llm as { model: string }).model = model;

        _genome = await GSEP.quickStart({
            name: 'auto-agent',
            llm,
            dashboardPort: parseInt(process.env.GSEP_DASHBOARD_PORT ?? '4200', 10),
        });

        console.log('\n[GSEP] 🧬 Pipeline active — using your agent\'s LLM connection.');
        console.log('[GSEP] 32-step pipeline: Evolution ON | Security ON | PII Redaction ON');
        console.log('[GSEP] Dashboard: http://localhost:4200/gsep/dashboard\n');

        return _genome;
    })();

    return _initializing;
}

// ─── Patch OpenAI SDK ───────────────────────────────────

function patchOpenAISDK(): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const openaiModule = require('openai');
        const OpenAI = openaiModule.default ?? openaiModule.OpenAI ?? openaiModule;
        if (!OpenAI || typeof OpenAI !== 'function') return;

        // Intercept the constructor to inject our fetch override
        const OriginalOpenAI = OpenAI;
        const PatchedOpenAI = function (this: Record<string, unknown>, ...args: unknown[]) {
            const opts = (args[0] ?? {}) as Record<string, unknown>;

            // Capture API key and base URL for creating our adapter
            const apiKey = (opts.apiKey as string) ?? process.env.OPENAI_API_KEY ?? '';
            const baseURL = (opts.baseURL as string) ?? 'https://api.openai.com/v1';

            // Inject a custom fetch that intercepts LLM calls
            const originalFetchOpt = opts.fetch as typeof fetch | undefined;
            opts.fetch = async (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
                const fetchFn = originalFetchOpt ?? _originalFetch;

                // Only intercept chat completions
                if (!urlStr.includes('/chat/completions') && !urlStr.includes('/responses')) {
                    return fetchFn(url, init);
                }

                const body = init?.body;
                if (!body || typeof body !== 'string') return fetchFn(url, init);

                let parsed: Record<string, unknown>;
                try { parsed = JSON.parse(body); } catch { return fetchFn(url, init); }

                // Skip streaming
                if (parsed.stream) return fetchFn(url, init);

                const messages = parsed.messages as Array<{ role: string; content: string }> | undefined;
                if (!messages || messages.length === 0) return fetchFn(url, init);

                // Initialize GSEP using this connection
                const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };
                const model = (parsed.model as string) ?? 'auto';
                headers['x-gsep-model'] = model;

                let genome: GenomeInstance;
                try {
                    genome = await initializeFromCall(`${baseURL}/chat/completions`, headers, model);
                } catch {
                    return fetchFn(url, init);
                }

                // Run through GSEP pipeline
                const userMsg = [...messages].reverse().find(m => m.role === 'user');
                if (!userMsg) return fetchFn(url, init);

                try {
                    const response = await genome.chat(userMsg.content, { userId: 'auto', taskType: 'general' });
                    const responseBody = JSON.stringify({
                        id: `gsep-${Date.now()}`,
                        object: 'chat.completion',
                        created: Math.floor(Date.now() / 1000),
                        model: `gsep-enhanced/${model}`,
                        choices: [{ index: 0, message: { role: 'assistant', content: response }, finish_reason: 'stop' }],
                        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    });
                    return new Response(responseBody, { status: 200, headers: { 'content-type': 'application/json' } });
                } catch {
                    return fetchFn(url, init);
                }
            };

            return Reflect.construct(OriginalOpenAI, [opts], new.target ?? OriginalOpenAI);
        } as unknown as typeof OriginalOpenAI;

        // Copy prototype and static properties
        Object.setPrototypeOf(PatchedOpenAI, OriginalOpenAI);
        Object.setPrototypeOf(PatchedOpenAI.prototype, OriginalOpenAI.prototype);

        // Replace in module cache
        openaiModule.default = PatchedOpenAI;
        openaiModule.OpenAI = PatchedOpenAI;

        console.log('[GSEP Auto] ✓ OpenAI SDK patched — all LLM calls will run through GSEP.');
    } catch {
        // OpenAI SDK not installed — skip
    }
}

// ─── Patch global fetch (fallback for non-SDK calls) ────

const _originalFetch = globalThis.fetch;

function patchGlobalFetch(): void {
    if ((_originalFetch as unknown as { _gsepPatched?: boolean })._gsepPatched) return;

    const patchedFetch = async (
        input: string | URL | Request,
        init?: RequestInit,
    ): Promise<Response> => {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.toString()
                : (input as Request).url;

        // Check if this is an LLM API call
        const endpoint = LLM_ENDPOINTS.find(ep => url.includes(ep.pattern));
        if (!endpoint) {
            return _originalFetch(input, init);
        }

        // Skip if no body (not a chat call)
        const body = init?.body;
        if (!body || typeof body !== 'string') {
            return _originalFetch(input, init);
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(body);
        } catch {
            return _originalFetch(input, init);
        }

        // Skip streaming (GSEP doesn't support streaming yet)
        if (parsed.stream) {
            return _originalFetch(input, init);
        }

        const messages = parsed.messages as Array<{ role: string; content: string }> | undefined;
        if (!messages || messages.length === 0) {
            return _originalFetch(input, init);
        }

        // Extract headers for creating the LLM adapter
        const headers: Record<string, string> = {};
        if (init?.headers) {
            if (init.headers instanceof Headers) {
                init.headers.forEach((v, k) => { headers[k] = v; });
            } else if (Array.isArray(init.headers)) {
                for (const [k, v] of init.headers) { headers[k] = v; }
            } else {
                Object.assign(headers, init.headers);
            }
        }

        // Store model for the adapter
        const model = (parsed.model as string) ?? 'auto';
        headers['x-gsep-model'] = model;

        // Initialize GSEP on first call (using this agent's LLM connection)
        let genome: GenomeInstance;
        try {
            genome = await initializeFromCall(url, headers, model);
        } catch {
            // GSEP init failed — pass through to original
            return _originalFetch(input, init);
        }

        // Find the last user message
        const userMsg = [...messages].reverse().find(m => m.role === 'user');
        if (!userMsg) {
            return _originalFetch(input, init);
        }

        // Run through GSEP's full 32-step pipeline
        try {
            const response = await genome.chat(userMsg.content, {
                userId: 'auto',
                taskType: 'general',
            });

            // Return in the format the agent expects (OpenAI format)
            const responseBody = JSON.stringify({
                id: `gsep-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: `gsep-enhanced/${model}`,
                choices: [{
                    index: 0,
                    message: { role: 'assistant', content: response },
                    finish_reason: 'stop',
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            });

            return new Response(responseBody, {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        } catch {
            // GSEP pipeline failed — fallback to original call
            return _originalFetch(input, init);
        }
    };

    (patchedFetch as unknown as { _gsepPatched: boolean })._gsepPatched = true;
    globalThis.fetch = patchedFetch as typeof fetch;
}

// ─── Auto-execute on import ─────────────────────────────

console.log('[GSEP] 🧬 Auto-instrumentation loaded. Waiting for first LLM call...');
patchOpenAISDK();
patchGlobalFetch();

// Export for testing
export { _genome as genome, _originalFetch, initializeFromCall };
