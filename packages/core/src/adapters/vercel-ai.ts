/**
 * GSEP Middleware for Vercel AI SDK
 *
 * Wraps any Vercel AI SDK model with GSEP's full 32-step pipeline.
 * One line to make any agent self-evolving and secure.
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 * import { gsepMiddleware } from '@gsep/core/adapters/vercel-ai';
 * import { wrapLanguageModel } from 'ai';
 *
 * const gsep = await gsepMiddleware({ name: 'my-agent' });
 *
 * const model = wrapLanguageModel({
 *   model: openai('gpt-4o'),
 *   middleware: gsep.middleware,
 * });
 *
 * // Every call now runs GSEP's full pipeline
 * const result = await generateText({ model, prompt: 'Hello' });
 * ```
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-02
 */

import type { GenomeInstance } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { PresetName } from '../presets/ConfigPresets.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';

// ─── Types ──────────────────────────────────────────────

export interface GSEPVercelOptions {
    /** Agent name (used for SQLite storage directory) */
    name: string;
    /** LLM adapter for GSEP internal operations (mutations, reasoning) */
    llm?: LLMAdapter;
    /** LLM provider — auto-detected from env vars if omitted */
    provider?: 'anthropic' | 'openai' | 'google' | 'ollama' | 'perplexity';
    /** API key — reads from env vars if omitted */
    apiKey?: string;
    /** Model for GSEP internal ops (default: cheapest per provider) */
    model?: string;
    /** Configuration preset (default: 'full') */
    preset?: PresetName;
    /** Extra autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;
    /** Storage adapter (default: SQLiteStorageAdapter) */
    storage?: StorageAdapter;
    /** Agent purpose — enables Purpose Lock */
    purpose?: string;
    /** User ID resolver — extracts userId from request context */
    getUserId?: (params: Record<string, unknown>) => string;
    /** Task type resolver — extracts taskType from request context */
    getTaskType?: (params: Record<string, unknown>) => string;
    /** Dashboard port (default: 4200, set to 0 to disable) */
    dashboardPort?: number;
}

export interface GSEPVercelInstance {
    /** The middleware object to pass to wrapLanguageModel */
    middleware: GSEPVercelMiddleware;
    /** The underlying GenomeInstance for advanced operations */
    genome: GenomeInstance;
}

/**
 * Vercel AI SDK LanguageModelMiddleware compatible type.
 * We define it here to avoid requiring 'ai' as a dependency.
 * This is structurally compatible with the Vercel AI SDK types.
 */
export interface GSEPVercelMiddleware {
    transformParams?: (options: {
        type: 'generate' | 'stream';
        params: Record<string, unknown>;
        model: unknown;
    }) => Promise<Record<string, unknown>>;

    wrapGenerate?: (options: {
        doGenerate: () => Promise<{
            content: Array<{ type: string; text?: string; [key: string]: unknown }>;
            finishReason: string;
            usage: { inputTokens: number; outputTokens: number };
            [key: string]: unknown;
        }>;
        doStream: () => Promise<unknown>;
        params: Record<string, unknown>;
        model: unknown;
    }) => Promise<{
        content: Array<{ type: string; text?: string; [key: string]: unknown }>;
        finishReason: string;
        usage: { inputTokens: number; outputTokens: number };
        [key: string]: unknown;
    }>;

    wrapStream?: (options: {
        doGenerate: () => Promise<unknown>;
        doStream: () => Promise<{
            stream: ReadableStream;
            [key: string]: unknown;
        }>;
        params: Record<string, unknown>;
        model: unknown;
    }) => Promise<{
        stream: ReadableStream;
        [key: string]: unknown;
    }>;
}

// ─── Helper: Extract user message from Vercel AI SDK params ─────

function extractUserMessage(params: Record<string, unknown>): string {
    // Vercel AI SDK passes prompt as an array of messages
    const prompt = params.prompt as Array<{
        role: string;
        content: string | Array<{ type: string; text?: string }>;
    }> | undefined;

    if (!prompt || !Array.isArray(prompt)) return '';

    // Find the last user message
    const userMsg = [...prompt].reverse().find(m => m.role === 'user');
    if (!userMsg) return '';

    if (typeof userMsg.content === 'string') return userMsg.content;
    if (Array.isArray(userMsg.content)) {
        return userMsg.content
            .filter(p => p.type === 'text' && p.text)
            .map(p => p.text!)
            .join(' ');
    }
    return '';
}

// ─── Helper: Inject GSEP prompt into Vercel AI SDK params ───────

function injectPrompt(params: Record<string, unknown>, gsepPrompt: string, sanitizedMessage: string, originalMessage: string): Record<string, unknown> {
    const prompt = params.prompt as Array<{
        role: string;
        content: string | Array<{ type: string; text?: string }>;
    }> | undefined;

    if (!prompt || !Array.isArray(prompt)) return params;

    const newPrompt = [...prompt];

    // Inject GSEP enhanced prompt into system message
    const sysIdx = newPrompt.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
        const existing = typeof newPrompt[sysIdx].content === 'string'
            ? newPrompt[sysIdx].content as string
            : '';
        newPrompt[sysIdx] = {
            ...newPrompt[sysIdx],
            content: existing + '\n\n---\n\n' + gsepPrompt,
        };
    } else {
        newPrompt.unshift({ role: 'system', content: gsepPrompt });
    }

    // Replace user message with sanitized version if C3/PII changed it
    if (sanitizedMessage !== originalMessage) {
        let userIdx = -1;
        for (let i = newPrompt.length - 1; i >= 0; i--) {
            if (newPrompt[i].role === 'user') { userIdx = i; break; }
        }
        if (userIdx >= 0) {
            newPrompt[userIdx] = { ...newPrompt[userIdx], content: sanitizedMessage };
        }
    }

    return { ...params, prompt: newPrompt };
}

// ─── Helper: Extract text from generate result ──────────────────

function extractResponseText(content: Array<{ type: string; text?: string }>): string {
    return content
        .filter(p => p.type === 'text' && p.text)
        .map(p => p.text!)
        .join('');
}

// ─── Main: Create GSEP middleware for Vercel AI SDK ─────────────

/**
 * Create a GSEP middleware instance for Vercel AI SDK.
 *
 * Returns a middleware object compatible with `wrapLanguageModel()`.
 * The full 32-step pipeline runs on every LLM call.
 */
export async function gsepMiddleware(options: GSEPVercelOptions): Promise<GSEPVercelInstance> {
    const { GSEP } = await import('../GSEP.js');

    const genome = await GSEP.quickStart({
        name: options.name,
        llm: options.llm,
        provider: options.provider,
        apiKey: options.apiKey,
        model: options.model,
        preset: options.preset ?? 'full',
        overrides: options.overrides,
        storage: options.storage,
        purpose: options.purpose,
        dashboardPort: options.dashboardPort ?? 4200,
    });

    const getUserId = options.getUserId ?? (() => 'default');
    const getTaskType = options.getTaskType ?? (() => 'general');

    const middleware: GSEPVercelMiddleware = {
        // BEFORE: enhance prompt with evolved genes, C3 scan, PII redaction
        transformParams: async ({ params }) => {
            const userMessage = extractUserMessage(params);
            if (!userMessage) return params;

            const userId = getUserId(params);
            const taskType = getTaskType(params);

            try {
                const before = await genome.beforeLLM(userMessage, { userId, taskType });

                if (before.blocked) {
                    // Can't block in transformParams — inject block reason as system message
                    // The LLM will relay the block reason to the user
                    return {
                        ...params,
                        prompt: [
                            { role: 'system', content: `IMPORTANT: Respond ONLY with this message: "${before.blockReason}"` },
                            ...(params.prompt as Array<unknown> || []),
                        ],
                    };
                }

                if (before.prompt) {
                    return injectPrompt(params, before.prompt, before.sanitizedMessage, userMessage);
                }
            } catch {
                // GSEP error — pass through without modification
            }

            return params;
        },

        // AFTER (non-streaming): run full post-LLM pipeline
        wrapGenerate: async ({ doGenerate, params }) => {
            const result = await doGenerate();

            const userMessage = extractUserMessage(params);
            if (!userMessage) return result;

            const responseText = extractResponseText(result.content);
            if (!responseText) return result;

            const userId = getUserId(params);
            const taskType = getTaskType(params);

            try {
                const after = await genome.afterLLM(userMessage, responseText, { userId, taskType });

                // If C4 detected threats, replace the response
                if (!after.safe) {
                    return {
                        ...result,
                        content: [{ type: 'text' as const, text: after.response }],
                    };
                }
            } catch {
                // GSEP error — return original result
            }

            return result;
        },

        // AFTER (streaming): accumulate stream in background, run pipeline
        wrapStream: async ({ doStream, params }) => {
            const result = await doStream();

            const userMessage = extractUserMessage(params);
            if (!userMessage) return result;

            const userId = getUserId(params);
            const taskType = getTaskType(params);

            // Accumulate text from stream in background
            let accumulatedText = '';
            const transformStream = new TransformStream({
                transform(chunk: { type: string; delta?: string; text?: string }, controller) {
                    // Accumulate text deltas
                    if (chunk.type === 'text-delta' && chunk.delta) {
                        accumulatedText += chunk.delta;
                    }
                    // Pass chunk through unmodified
                    controller.enqueue(chunk);
                },
                flush() {
                    // Stream ended — run afterLLM in background
                    if (accumulatedText) {
                        genome.afterLLM(userMessage, accumulatedText, { userId, taskType })
                            .catch(() => { /* best-effort */ });
                    }
                },
            });

            return {
                ...result,
                stream: result.stream.pipeThrough(transformStream),
            };
        },
    };

    return { middleware, genome };
}
