/**
 * GSEP Plugin for OpenClaw / Genome
 *
 * Native plugin that integrates GSEP's full 32-step pipeline
 * using OpenClaw's lifecycle hooks. No fetch patching, no hacks.
 *
 * Install: copy to ~/.genoma/plugins/gsep/ or <workspace>/plugins/gsep/
 *
 * @example
 * ```typescript
 * // plugins/gsep/index.ts
 * import { gsepPlugin } from '@gsep/core/openclaw-plugin';
 * export default gsepPlugin({ name: 'my-agent' });
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

export interface GSEPPluginOptions {
    /** Agent name (used for SQLite storage directory) */
    name?: string;
    /** Auto-detect name from IDENTITY.md (default: true) */
    autoDetectName?: boolean;
    /** LLM adapter for GSEP internal operations */
    llm?: LLMAdapter;
    /** Configuration preset (default: 'full') */
    preset?: PresetName;
    /** Extra autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;
    /** Storage adapter (default: SQLiteStorageAdapter) */
    storage?: StorageAdapter;
    /** Agent purpose — enables Purpose Lock */
    purpose?: string;
    /** Dashboard port (default: 4200, set to 0 to disable) */
    dashboardPort?: number;
}

// ─── OpenClaw/Genome Plugin Types (structural, no import needed) ─────

interface PluginApi {
    id: string;
    name: string;
    config: Record<string, unknown>;
    pluginConfig?: Record<string, unknown>;
    logger: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
    };
    on(hookName: string, handler: (...args: never[]) => unknown, opts?: { priority?: number }): void;
    registerCommand(cmd: {
        name: string;
        description: string;
        acceptsArgs?: boolean;
        handler: (ctx: Record<string, unknown>) => unknown;
    }): void;
    registerHttpRoute(params: Record<string, unknown>): void;
    resolvePath(input: string): string;
}

interface BeforePromptEvent {
    prompt: string;
    messages: unknown[];
}

interface AgentContext {
    agentId?: string;
    sessionKey?: string;
    sessionId?: string;
    workspaceDir?: string;
}

interface LLMOutputEvent {
    runId: string;
    sessionId: string;
    provider: string;
    model: string;
    assistantTexts: string[];
    usage?: { input?: number; output?: number; total?: number };
}

interface MessageSendingEvent {
    to: string;
    content: string;
    metadata?: Record<string, unknown>;
}

// ─── Name Detection ─────────────────────────────────────

function detectAgentName(): string {
    try {
        const { readFileSync } = require('node:fs');
        const { join } = require('node:path');
        const stateDir = process.env.GENOMA_STATE_DIR || join(process.env.HOME || '', '.genoma');
        const identity = readFileSync(join(stateDir, 'workspace', 'IDENTITY.md'), 'utf-8');
        const match = identity.match(/\*\*Name:\*\*\s*(.+)/);
        if (match && match[1].trim()) return match[1].trim();
    } catch { /* not available */ }
    return 'openclaw-agent';
}

// ─── Plugin Factory ─────────────────────────────────────

/**
 * Create a GSEP plugin for OpenClaw/Genome.
 *
 * Uses native lifecycle hooks — no fetch patching:
 * - before_prompt_build: runs beforeLLM() (C3, genes, PII redaction)
 * - llm_output: runs afterLLM() (C4, fitness, drift, evolution)
 */
export function gsepPlugin(options: GSEPPluginOptions = {}) {
    let genome: GenomeInstance | null = null;
    let lastUserMessage = '';
    let lastC4Result: { safe: boolean; response: string } | null = null;

    return {
        id: 'gsep',
        name: 'GSEP — Genomic Self-Evolving Prompts',
        description: 'Self-evolving prompts with 5-layer chromosome security, fitness tracking, and autonomous evolution',
        version: '0.8.0',

        async register(api: PluginApi) {
            const agentName = options.name
                ?? (options.autoDetectName !== false ? detectAgentName() : 'openclaw-agent');

            api.logger.info(`[GSEP] Initializing for agent "${agentName}"...`);

            // ─── Initialize GSEP ────────────────────────────
            try {
                const { GSEP } = await import('../GSEP.js');

                // Create LLM adapter that uses the agent's own provider
                // (GSEP internal ops like mutations need an LLM)
                const llm = options.llm ?? {
                    name: 'openclaw-internal',
                    model: 'auto',
                    chat: async (messages: Array<{ role: string; content: string }>) => {
                        // Fallback: use fetch to call the same provider the agent uses
                        const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
                        const isAnthropic = !!process.env.ANTHROPIC_API_KEY;
                        const url = isAnthropic
                            ? 'https://api.anthropic.com/v1/messages'
                            : 'https://api.openai.com/v1/chat/completions';
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        if (isAnthropic) {
                            headers['x-api-key'] = apiKey;
                            headers['anthropic-version'] = '2023-06-01';
                        } else {
                            headers['Authorization'] = `Bearer ${apiKey}`;
                        }

                        const body = isAnthropic
                            ? { model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages }
                            : { model: 'gpt-4o-mini', messages, max_tokens: 4096 };

                        const res = await fetch(url, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(body),
                        });
                        const data = await res.json() as Record<string, unknown>;

                        if (isAnthropic) {
                            const content = (data.content as Array<{ text: string }>)?.[0]?.text ?? '';
                            return { content };
                        }
                        const choices = data.choices as Array<{ message: { content: string } }>;
                        return { content: choices?.[0]?.message?.content ?? '' };
                    },
                };

                genome = await GSEP.quickStart({
                    name: agentName,
                    llm,
                    preset: options.preset ?? 'full',
                    overrides: options.overrides,
                    storage: options.storage,
                    purpose: options.purpose,
                    dashboardPort: options.dashboardPort ?? 4200,
                });

                api.logger.info(`[GSEP] 🧬 Pipeline active — full 32-step pipeline on every call`);
            } catch (err) {
                api.logger.error(`[GSEP] Init failed: ${err instanceof Error ? err.message : String(err)}`);
                return;
            }

            // ─── BEFORE: Enhance prompt with evolved genes ──
            api.on('before_prompt_build', async (event: BeforePromptEvent, _ctx: AgentContext) => {
                if (!genome) return undefined;

                lastUserMessage = event.prompt;

                try {
                    const before = await genome.beforeLLM(event.prompt, {
                        userId: 'owner',
                        taskType: 'general',
                    });

                    if (before.blocked) {
                        api.logger.info(`[GSEP] ⛔ Blocked: ${before.blockReason}`);
                        return { systemPrompt: before.blockReason };
                    }

                    return { prependContext: before.prompt };
                } catch (err) {
                    api.logger.warn(`[GSEP] BEFORE error: ${err instanceof Error ? err.message : String(err)}`);
                    return undefined;
                }
            }, { priority: 10 }); // High priority: run before other plugins

            // ─── AFTER: Process LLM output ──────────────────
            api.on('llm_output', async (event: LLMOutputEvent, _ctx: AgentContext) => {
                if (!genome || !lastUserMessage) return;

                const responseText = event.assistantTexts.join('\n');
                if (!responseText) return;

                try {
                    const after = await genome.afterLLM(lastUserMessage, responseText, {
                        userId: 'owner',
                        taskType: 'general',
                    });

                    // Store C4 result for message_sending hook
                    if (!after.safe) {
                        lastC4Result = { safe: false, response: after.response };
                    } else {
                        lastC4Result = null;
                    }
                } catch (err) {
                    api.logger.warn(`[GSEP] AFTER error: ${err instanceof Error ? err.message : String(err)}`);
                }
            }, { priority: 10 });

            // ─── C4 INTERCEPT: Modify response if threats found ──
            api.on('message_sending', async (_event: MessageSendingEvent) => {
                if (!lastC4Result || lastC4Result.safe) return;

                // C4 flagged the response — replace with sanitized version
                const result = { content: lastC4Result.response };
                lastC4Result = null;
                return result;
            });

            // ─── Commands ───────────────────────────────────
            api.registerCommand({
                name: 'gsep',
                description: 'Show GSEP genome status',
                acceptsArgs: true,
                handler: async () => {
                    if (!genome) return { text: 'GSEP not initialized' };

                    const exported = await genome.export();
                    const c1Active = exported.layers?.layer1?.filter(
                        (a: { status: string }) => a.status === 'active'
                    ) ?? [];

                    return {
                        text: [
                            '🧬 **GSEP Status**',
                            `Agent: **${exported.name}**`,
                            `Genome: \`${exported.id?.slice(0, 16)}...\``,
                            `C0 genes: ${exported.layers?.layer0?.length ?? 0} (immutable)`,
                            `C1 genes: ${c1Active.length} active`,
                            `C2 genes: ${exported.layers?.layer2?.length ?? 0} (epigenomes)`,
                            '',
                            c1Active.map((a: { gene: string; fitness: number }) =>
                                `  • ${a.gene}: fitness ${a.fitness.toFixed(2)}`
                            ).join('\n'),
                        ].join('\n'),
                    };
                },
            });

            api.logger.info('[GSEP] 🧬 Plugin registered — hooks: before_prompt_build, llm_output, message_sending');
        },
    };
}
