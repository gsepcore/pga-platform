/**
 * GSEP Auto-Instrumentation — Zero-code integration.
 *
 * Add this ONE line at the top of your app:
 *
 *   import '@gsep/core/auto'
 *
 * GSEP automatically detects your LLM SDK (OpenAI, Anthropic, etc.)
 * and wraps every LLM call with the full 32-step pipeline:
 * evolution, security, fitness tracking, drift detection, learning.
 *
 * No configuration. No code changes. No wrap() calls.
 * Same pattern as New Relic, Datadog, and Sentry.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-31
 */

import { GSEP, type GenomeInstance } from './GSEP.js';

// ─── State ──────────────────────────────────────────────

let _genome: GenomeInstance | null = null;
let _initializing: Promise<void> | null = null;
let _dashboardUrl: string | null = null;

// ─── Initialize GSEP (once) ─────────────────────────────

async function ensureInitialized(): Promise<GenomeInstance> {
    if (_genome) return _genome;

    if (_initializing) {
        await _initializing;
        return _genome!;
    }

    _initializing = (async () => {
        // Detect provider from environment
        const provider = detectProvider();
        const apiKey = detectApiKey(provider);

        if (!apiKey && provider !== 'ollama') {
            console.log('[GSEP Auto] No LLM API key found in environment. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY.');
            console.log('[GSEP Auto] GSEP will activate when an API key is available.');
            return;
        }

        try {
            _genome = await GSEP.quickStart({
                name: 'auto-agent',
                provider: provider as 'openai' | 'anthropic' | 'google' | 'ollama' | 'perplexity',
                apiKey,
                dashboardPort: parseInt(process.env.GSEP_DASHBOARD_PORT ?? '4200', 10),
            });

            console.log('\n[GSEP] 🧬 Auto-instrumentation active.');
            console.log('[GSEP] All LLM calls now run through the full 32-step GSEP pipeline.');
            console.log('[GSEP] Evolution: ON | Security: ON | PII Redaction: ON | Dashboard: ON\n');
        } catch (err) {
            console.log(`[GSEP Auto] Failed to initialize: ${(err as Error).message}`);
        }
    })();

    await _initializing;
    _initializing = null;
    return _genome!;
}

function detectProvider(): string {
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GOOGLE_API_KEY) return 'google';
    if (process.env.PERPLEXITY_API_KEY) return 'perplexity';
    if (process.env.OLLAMA_HOST || process.env.OLLAMA_API_KEY) return 'ollama';
    return 'openai'; // default
}

function detectApiKey(provider: string): string | undefined {
    switch (provider) {
        case 'anthropic': return process.env.ANTHROPIC_API_KEY;
        case 'openai': return process.env.OPENAI_API_KEY;
        case 'google': return process.env.GOOGLE_API_KEY;
        case 'perplexity': return process.env.PERPLEXITY_API_KEY;
        case 'ollama': return process.env.OLLAMA_API_KEY ?? 'ollama-local';
        default: return process.env.OPENAI_API_KEY;
    }
}

// ─── Intercept: OpenAI SDK ──────────────────────────────

function patchOpenAI(): void {
    try {
        // Intentional require() — must be synchronous to patch before any call
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const openaiModule = require('openai');
        const OpenAI = openaiModule.default ?? openaiModule.OpenAI ?? openaiModule;

        if (!OpenAI?.prototype) return;

        // Find the chat.completions.create method
        // OpenAI SDK structure: client.chat.completions.create()
        // The Completions class is accessible via prototype chain
        const CompletionsClass = findCompletionsClass(OpenAI);
        if (!CompletionsClass) return;

        const originalCreate = CompletionsClass.prototype.create;
        if (!originalCreate || (originalCreate as { _gsepPatched?: boolean })._gsepPatched) return;

        CompletionsClass.prototype.create = async function gsepWrappedCreate(
            this: unknown,
            params: {
                messages?: Array<{ role: string; content: string }>;
                model?: string;
                stream?: boolean;
                [key: string]: unknown;
            },
            options?: unknown,
        ) {
            // Skip if streaming (GSEP doesn't support streaming yet)
            if (params.stream) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params, options);
            }

            // Skip if no messages
            if (!params.messages || params.messages.length === 0) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params, options);
            }

            const genome = await ensureInitialized();
            if (!genome) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params, options);
            }

            // Extract user message (last user message)
            const userMsg = [...params.messages].reverse().find(m => m.role === 'user');
            if (!userMsg) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params, options);
            }

            // Run through GSEP's full 32-step pipeline
            try {
                const response = await genome.chat(userMsg.content, {
                    userId: 'auto',
                    taskType: 'general',
                });

                // Return in OpenAI format
                return {
                    id: `gsep-${Date.now()}`,
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: params.model ?? 'gsep-enhanced',
                    choices: [{
                        index: 0,
                        message: { role: 'assistant', content: response },
                        finish_reason: 'stop',
                    }],
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                };
            } catch {
                // Fallback to original if GSEP fails
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params, options);
            }
        };

        (CompletionsClass.prototype.create as { _gsepPatched?: boolean })._gsepPatched = true;
        console.log('[GSEP Auto] ✓ OpenAI SDK patched — chat.completions.create() now runs through GSEP.');
    } catch {
        // OpenAI SDK not installed — skip
    }
}

function findCompletionsClass(OpenAI: { prototype?: Record<string, unknown>; Chat?: unknown; Completions?: unknown }): { prototype: Record<string, unknown> } | null {
    // Try direct: OpenAI.Completions
    if (OpenAI.Completions && typeof OpenAI.Completions === 'function') {
        return OpenAI.Completions as { prototype: Record<string, unknown> };
    }

    // Try: Create instance and find chat.completions
    try {
        const instance = new (OpenAI as unknown as new (opts: { apiKey: string }) => Record<string, unknown>)({ apiKey: 'probe' });
        const chat = instance.chat as Record<string, unknown> | undefined;
        const completions = chat?.completions;
        if (completions && typeof completions === 'object' && completions.constructor) {
            return completions.constructor as unknown as { prototype: Record<string, unknown> };
        }
    } catch {
        // Can't probe — skip
    }

    return null;
}

// ─── Intercept: Anthropic SDK ───────────────────────────

function patchAnthropic(): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const anthropicModule = require('@anthropic-ai/sdk');
        const Anthropic = anthropicModule.default ?? anthropicModule.Anthropic ?? anthropicModule;

        if (!Anthropic?.prototype) return;

        // Anthropic SDK: client.messages.create()
        const MessagesClass = findMessagesClass(Anthropic);
        if (!MessagesClass) return;

        const originalCreate = MessagesClass.prototype.create;
        if (!originalCreate || (originalCreate as { _gsepPatched?: boolean })._gsepPatched) return;

        MessagesClass.prototype.create = async function gsepWrappedCreate(
            this: unknown,
            params: {
                messages?: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
                model?: string;
                stream?: boolean;
                max_tokens?: number;
                [key: string]: unknown;
            },
        ) {
            if (params.stream) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params);
            }

            if (!params.messages || params.messages.length === 0) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params);
            }

            const genome = await ensureInitialized();
            if (!genome) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params);
            }

            const userMsg = [...params.messages].reverse().find(m => m.role === 'user');
            if (!userMsg) {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params);
            }

            const userContent = typeof userMsg.content === 'string'
                ? userMsg.content
                : userMsg.content.find(b => b.type === 'text')?.text ?? '';

            try {
                const response = await genome.chat(userContent, {
                    userId: 'auto',
                    taskType: 'general',
                });

                // Return in Anthropic format
                return {
                    id: `gsep-${Date.now()}`,
                    type: 'message',
                    role: 'assistant',
                    content: [{ type: 'text', text: response }],
                    model: params.model ?? 'gsep-enhanced',
                    stop_reason: 'end_turn',
                    usage: { input_tokens: 0, output_tokens: 0 },
                };
            } catch {
                return (originalCreate as (...args: unknown[]) => unknown).call(this, params);
            }
        };

        (MessagesClass.prototype.create as { _gsepPatched?: boolean })._gsepPatched = true;
        console.log('[GSEP Auto] ✓ Anthropic SDK patched — messages.create() now runs through GSEP.');
    } catch {
        // Anthropic SDK not installed — skip
    }
}

function findMessagesClass(Anthropic: { Messages?: unknown }): { prototype: Record<string, unknown> } | null {
    if (Anthropic.Messages && typeof Anthropic.Messages === 'function') {
        return Anthropic.Messages as { prototype: Record<string, unknown> };
    }

    try {
        const instance = new (Anthropic as unknown as new (opts: { apiKey: string }) => Record<string, unknown>)({ apiKey: 'probe' });
        const messages = instance.messages;
        if (messages && typeof messages === 'object' && (messages as object).constructor) {
            return (messages as object).constructor as unknown as { prototype: Record<string, unknown> };
        }
    } catch {
        // Can't probe
    }

    return null;
}

// ─── Intercept: Generic fetch-based LLM calls ───────────

function patchGlobalFetch(): void {
    const originalFetch = globalThis.fetch;
    if (!originalFetch || (originalFetch as unknown as { _gsepPatched?: boolean })._gsepPatched) return;

    const LLM_ENDPOINTS = [
        'api.openai.com/v1/chat/completions',
        'api.anthropic.com/v1/messages',
        'generativelanguage.googleapis.com',
    ];

    const patchedFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

        // Only intercept LLM API calls
        const isLLMCall = LLM_ENDPOINTS.some(ep => url.includes(ep));
        if (!isLLMCall) {
            return originalFetch(input, init);
        }

        // Try to parse the request body
        const body = init?.body;
        if (!body || typeof body !== 'string') {
            return originalFetch(input, init);
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(body);
        } catch {
            return originalFetch(input, init);
        }

        // Skip streaming
        if (parsed.stream) {
            return originalFetch(input, init);
        }

        const messages = parsed.messages as Array<{ role: string; content: string }> | undefined;
        if (!messages || messages.length === 0) {
            return originalFetch(input, init);
        }

        const genome = await ensureInitialized();
        if (!genome) {
            return originalFetch(input, init);
        }

        const userMsg = [...messages].reverse().find(m => m.role === 'user');
        if (!userMsg) {
            return originalFetch(input, init);
        }

        try {
            const response = await genome.chat(userMsg.content, {
                userId: 'auto',
                taskType: 'general',
            });

            // Return as a Response object in OpenAI format
            const responseBody = JSON.stringify({
                id: `gsep-${Date.now()}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: (parsed.model as string) ?? 'gsep-enhanced',
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
            // Fallback to original call
            return originalFetch(input, init);
        }
    };

    (patchedFetch as unknown as { _gsepPatched: boolean })._gsepPatched = true;
    globalThis.fetch = patchedFetch as typeof fetch;
    console.log('[GSEP Auto] ✓ Global fetch patched — LLM API calls (OpenAI, Anthropic, Google) now run through GSEP.');
}

// ─── Auto-execute on import ─────────────────────────────

console.log('[GSEP] 🧬 Auto-instrumentation loading...');

// Patch SDKs (synchronous — patches prototypes before any call)
patchOpenAI();
patchAnthropic();

// Patch global fetch as fallback (catches raw HTTP LLM calls)
patchGlobalFetch();

// Start initialization in background (lazy — completes on first LLM call)
ensureInitialized().catch(() => {});

// Export for testing/debugging
export { _genome as genome, _dashboardUrl as dashboardUrl, ensureInitialized };
