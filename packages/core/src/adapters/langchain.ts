/**
 * GSEP Middleware for LangChainJS
 *
 * Integrates GSEP's full 32-step pipeline into LangChain agents
 * via createMiddleware + wrapModelCall.
 *
 * @example
 * ```typescript
 * import { createAgent } from 'langchain';
 * import { gsepLangChainMiddleware } from '@gsep/core/langchain';
 *
 * const gsep = await gsepLangChainMiddleware({ name: 'my-agent' });
 *
 * const agent = createAgent({
 *   model: 'openai:gpt-4o',
 *   tools: [...],
 *   middleware: [gsep.middleware],
 * });
 * ```
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-03
 */

import type { GenomeInstance } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { PresetName } from '../presets/ConfigPresets.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';

// ─── Options ────────────────────────────────────────────

export interface GSEPLangChainOptions {
    /** Agent name (used for SQLite storage directory) */
    name: string;
    /** LLM adapter for GSEP internal operations */
    llm?: LLMAdapter;
    /** LLM provider — auto-detected from env vars if omitted */
    provider?: 'anthropic' | 'openai' | 'google' | 'ollama' | 'perplexity';
    /** API key */
    apiKey?: string;
    /** Model for GSEP internal ops */
    model?: string;
    /** Configuration preset (default: 'full') */
    preset?: PresetName;
    /** Extra autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;
    /** Storage adapter (default: SQLiteStorageAdapter) */
    storage?: StorageAdapter;
    /** Agent purpose — enables Purpose Lock */
    purpose?: string;
    /** User ID resolver */
    getUserId?: () => string;
    /** Dashboard port (default: 4200) */
    dashboardPort?: number;
}

export interface GSEPLangChainInstance {
    /** The middleware config object to pass to createAgent's middleware array */
    middleware: GSEPLangChainMiddlewareConfig;
    /** The underlying GenomeInstance */
    genome: GenomeInstance;
}

/**
 * Structural type compatible with LangChain's createMiddleware config.
 * We define it here to avoid requiring 'langchain' as a dependency.
 */
export interface GSEPLangChainMiddlewareConfig {
    name: string;
    wrapModelCall: (
        request: {
            messages: Array<{ content: string; _getType?: () => string; [key: string]: unknown }>;
            systemPrompt?: string;
            [key: string]: unknown;
        },
        handler: (request: Record<string, unknown>) => Promise<{
            content: string | Array<{ type: string; text?: string }>;
            usage_metadata?: { input_tokens?: number; output_tokens?: number };
            [key: string]: unknown;
        }>,
    ) => Promise<{
        content: string | Array<{ type: string; text?: string }>;
        [key: string]: unknown;
    }>;
}

// ─── Helpers ────────────────────────────────────────────

function extractUserMessage(messages: Array<{ content: string; _getType?: () => string; [key: string]: unknown }>): string {
    // Find the last HumanMessage
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const type = msg._getType?.() ?? (msg as Record<string, unknown>).type ?? '';
        if (type === 'human' || type === 'HumanMessage') {
            if (typeof msg.content === 'string') return msg.content;
            if (Array.isArray(msg.content)) {
                return (msg.content as Array<{ type: string; text?: string }>)
                    .filter(p => p.type === 'text' && p.text)
                    .map(p => p.text!)
                    .join(' ');
            }
        }
    }
    return '';
}

function extractResponseText(content: string | Array<{ type: string; text?: string }>): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .filter(p => p.type === 'text' && p.text)
            .map(p => p.text!)
            .join('');
    }
    return '';
}

// ─── Main ───────────────────────────────────────────────

/**
 * Create a GSEP middleware for LangChainJS agents.
 *
 * Uses wrapModelCall for full before/after control:
 * - BEFORE: C3 scan, gene injection, PII redaction, Purpose Lock
 * - AFTER: C4 immune scan, fitness, drift, evolution
 */
export async function gsepLangChainMiddleware(options: GSEPLangChainOptions): Promise<GSEPLangChainInstance> {
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

    const middleware: GSEPLangChainMiddlewareConfig = {
        name: 'GSEPMiddleware',

        wrapModelCall: async (request, handler) => {
            const userMessage = extractUserMessage(request.messages);
            const userId = getUserId();

            // ── BEFORE: Full pre-LLM pipeline ───────────────
            if (userMessage) {
                try {
                    const before = await genome.beforeLLM(userMessage, {
                        userId,
                        taskType: 'general',
                    });

                    if (before.blocked) {
                        // Return a blocked AIMessage
                        return {
                            content: before.blockReason ?? 'Message blocked by security policy.',
                        } as ReturnType<typeof handler> extends Promise<infer R> ? R : never;
                    }

                    // Inject GSEP prompt into system prompt
                    if (before.prompt) {
                        request.systemPrompt = (request.systemPrompt ?? '') + '\n\n---\n\n' + before.prompt;
                    }
                } catch {
                    // GSEP error — pass through
                }
            }

            // ── CALL LLM ────────────────────────────────────
            const response = await handler(request as Record<string, unknown>);

            // ── AFTER: Full post-LLM pipeline ───────────────
            if (userMessage) {
                const responseText = extractResponseText(response.content);
                if (responseText) {
                    try {
                        const after = await genome.afterLLM(userMessage, responseText, {
                            userId,
                            taskType: 'general',
                        });

                        // If C4 flagged threats, replace content
                        if (!after.safe) {
                            return { ...response, content: after.response };
                        }
                    } catch {
                        // GSEP error — return original
                    }
                }
            }

            return response;
        },
    };

    return { middleware, genome };
}
