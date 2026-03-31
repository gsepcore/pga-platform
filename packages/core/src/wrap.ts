/**
 * gsep.wrap() — One-line GSEP integration for ANY agent.
 *
 * Wraps any OpenAI-compatible LLM client so that every chat() call
 * runs through the full GSEP pipeline: 32 steps including evolution,
 * security, fitness tracking, drift detection, and learning.
 *
 * Usage:
 *
 * ```typescript
 * import { gsep } from '@gsep/core'
 *
 * // Wrap your existing LLM — one line
 * const agent = await gsep.wrap(myOpenAIClient)
 *
 * // Use exactly as before — GSEP does everything automatically
 * const response = await agent.chat('Hello!', { userId: 'user1' })
 *
 * // Dashboard is live at the URL printed to console
 * // Evolution is running
 * // Security is active
 * // PII is redacted
 * // Everything works
 * ```
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-31
 */

import { GSEP, GenomeInstance, type QuickStartOptions } from './GSEP.js';
import type { LLMAdapter } from './interfaces/LLMAdapter.js';

// ─── Types ──────────────────────────────────────────────

/** Any object that has a chat-like method */
export interface LLMClient {
    chat?(messages: Array<{ role: string; content: string }>, options?: unknown): Promise<unknown>;
    complete?(messages: Array<{ role: string; content: string }>, options?: unknown): Promise<unknown>;
    create?(params: unknown): Promise<unknown>;
    /** For OpenAI SDK: client.chat.completions.create() */
    completions?: { create?(params: unknown): Promise<unknown> };
}

export interface WrapOptions {
    /** Agent name (default: 'my-agent') */
    name?: string;
    /** Agent purpose — enables Purpose Lock */
    purpose?: string;
    /** Allowed topics */
    allowedTopics?: string[];
    /** Forbidden topics */
    forbiddenTopics?: string[];
    /** Dashboard port (default: 4200, set 0 to disable) */
    dashboardPort?: number;
    /** Any extra quickStart options */
    extra?: Partial<QuickStartOptions>;
}

export interface WrappedAgent {
    /** Send a message — runs full 32-step GSEP pipeline */
    chat(message: string, context?: { userId?: string; taskType?: string }): Promise<string>;
    /** Get the underlying GenomeInstance for advanced ops */
    genome: GenomeInstance;
    /** Dashboard URL (if started) */
    dashboardUrl?: string;
    /** Shutdown cleanly */
    shutdown(): Promise<void>;
}

// ─── Adapter: Convert any LLM client to GSEP LLMAdapter ─

function adaptLLMClient(client: LLMClient | LLMAdapter): LLMAdapter {
    // Already a GSEP adapter
    if ('chat' in client && typeof client.chat === 'function') {
        const testResult = client.chat([{ role: 'user', content: 'test' }]);
        if (testResult && typeof (testResult as Promise<{ content?: string }>).then === 'function') {
            // Check if it returns { content: string } (GSEP format)
            // or { choices: [...] } (OpenAI format)
            return {
                name: 'wrapped-llm',
                model: 'auto',
                chat: async (messages: Array<{ role: string; content: string }>) => {
                    const result = await (client as { chat: (msgs: typeof messages) => Promise<unknown> }).chat(messages) as Record<string, unknown>;

                    // GSEP native format
                    if (typeof result?.content === 'string') {
                        return result as { content: string; usage?: { inputTokens: number; outputTokens: number } };
                    }

                    // OpenAI format: { choices: [{ message: { content: '...' } }] }
                    if (Array.isArray(result?.choices)) {
                        const choice = (result.choices as Array<{ message?: { content?: string } }>)[0];
                        const content = choice?.message?.content ?? '';
                        const usage = result.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
                        return {
                            content,
                            usage: usage ? {
                                inputTokens: usage.prompt_tokens ?? 0,
                                outputTokens: usage.completion_tokens ?? 0,
                            } : undefined,
                        };
                    }

                    // String response
                    if (typeof result === 'string') {
                        return { content: result };
                    }

                    return { content: String(result) };
                },
            };
        }
    }

    // OpenAI SDK style: client.chat.completions.create()
    if ('completions' in client && client.completions?.create) {
        const completions = client.completions;
        return {
            name: 'openai-sdk',
            model: 'auto',
            chat: async (messages: Array<{ role: string; content: string }>) => {
                const result = await completions.create!({
                    messages,
                    model: 'gpt-4o', // default, can be overridden
                }) as Record<string, unknown>;

                const choices = result?.choices as Array<{ message?: { content?: string } }> | undefined;
                const content = choices?.[0]?.message?.content ?? '';
                const usage = result?.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;

                return {
                    content,
                    usage: usage ? {
                        inputTokens: usage.prompt_tokens ?? 0,
                        outputTokens: usage.completion_tokens ?? 0,
                    } : undefined,
                };
            },
        };
    }

    throw new Error(
        '[GSEP] Cannot wrap this LLM client. Expected an object with chat() or completions.create(). ' +
        'Pass a GSEP LLMAdapter, an OpenAI SDK client, or any object with chat(messages) → {content}.'
    );
}

// ─── gsep.wrap() ────────────────────────────────────────

/**
 * Wrap any LLM client with the full GSEP pipeline.
 *
 * One line. Everything activates automatically.
 */
async function wrap(llmClient: LLMClient | LLMAdapter, options: WrapOptions = {}): Promise<WrappedAgent> {
    const llm = adaptLLMClient(llmClient);

    const genome = await GSEP.quickStart({
        name: options.name ?? 'my-agent',
        llm,
        purpose: options.purpose,
        allowedTopics: options.allowedTopics,
        forbiddenTopics: options.forbiddenTopics,
        dashboardPort: options.dashboardPort,
        ...options.extra,
    });

    // Get dashboard URL if available
    let dashboardUrl: string | undefined;
    try {
        // Dashboard was auto-started by quickStart — find the URL from the server
        const exported = await genome.export();
        if (exported) {
            dashboardUrl = `http://localhost:${options.dashboardPort ?? 4200}/gsep/dashboard`;
        }
    } catch { /* dashboard may not be available */ }

    return {
        async chat(message: string, context?: { userId?: string; taskType?: string }): Promise<string> {
            return genome.chat(message, {
                userId: context?.userId ?? 'anonymous',
                taskType: context?.taskType ?? 'general',
            });
        },

        genome,
        dashboardUrl,

        async shutdown() {
            await genome.stopDashboard();
        },
    };
}

// ─── Public API ─────────────────────────────────────────

/**
 * The GSEP namespace — the only thing developers need to import.
 *
 * ```typescript
 * import { gsep } from '@gsep/core'
 * const agent = await gsep.wrap(myLLM)
 * const response = await agent.chat('Hello!')
 * ```
 */
export const gsep = {
    wrap,
} as const;
