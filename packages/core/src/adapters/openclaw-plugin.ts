/**
 * GSEP Plugin for OpenClaw / Genome
 *
 * Native plugin that integrates GSEP's full 32-step pipeline
 * using OpenClaw's lifecycle hooks. No fetch patching.
 *
 * Register is SYNCHRONOUS (Genome requirement). GSEP initializes
 * lazily on the first hook call.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-02
 */

import type { GenomeInstance } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { PresetName } from '../presets/ConfigPresets.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';

// ─── Public Options ─────────────────────────────────────

export interface GSEPPluginOptions {
    name?: string;
    autoDetectName?: boolean;
    llm?: LLMAdapter;
    preset?: PresetName;
    overrides?: Partial<AutonomousConfig>;
    storage?: StorageAdapter;
    purpose?: string;
    dashboardPort?: number;
}

// ─── OpenClaw Plugin Types (structural) ─────────────────

interface PluginApi {
    id: string;
    name: string;
    config: Record<string, unknown>;
    logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
    on(hookName: string, handler: (...args: never[]) => unknown, opts?: { priority?: number }): void;
    registerCommand(cmd: { name: string; description: string; acceptsArgs?: boolean; handler: (ctx: Record<string, unknown>) => unknown }): void;
    registerService(service: { id: string; start: (ctx: { stateDir?: string }) => void | Promise<void>; stop?: () => void | Promise<void> }): void;
    runtime: {
        system: { enqueueSystemEvent: (event: Record<string, unknown>) => void };
        channel: { reply: { dispatchReplyWithBufferedBlockDispatcher: (...args: unknown[]) => unknown } };
    };
}

interface BeforePromptEvent { prompt: string; messages: unknown[] }
interface AgentContext { agentId?: string; sessionKey?: string }
interface LLMOutputEvent { runId: string; assistantTexts: string[]; usage?: { input?: number; output?: number } }
interface MessageSendingEvent { to: string; content: string }

// ─── Name Detection ─────────────────────────────────────

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function detectAgentName(): string {
    try {
        const stateDir = process.env.GENOMA_STATE_DIR || join(process.env.HOME || '', '.genoma');
        const identity = readFileSync(join(stateDir, 'workspace', 'IDENTITY.md'), 'utf-8');
        const match = identity.match(/\*\*Name:\*\*\s*(.+)/);
        if (match && match[1].trim()) return match[1].trim();
    } catch { /* not available */ }
    return 'openclaw-agent';
}

// ─── Default LLM ────────────────────────────────────────

function createDefaultLLM(): LLMAdapter {
    return {
        name: 'openclaw-internal',
        model: 'auto',
        chat: async (messages: Array<{ role: string; content: string }>) => {
            const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
            const isAnthropic = !!process.env.ANTHROPIC_API_KEY;
            const url = isAnthropic ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (isAnthropic) { headers['x-api-key'] = apiKey; headers['anthropic-version'] = '2023-06-01'; }
            else { headers['Authorization'] = `Bearer ${apiKey}`; }
            const body = isAnthropic
                ? { model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages }
                : { model: 'gpt-4o-mini', messages, max_tokens: 4096 };
            const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
            const data = await res.json() as Record<string, unknown>;
            if (isAnthropic) return { content: (data.content as Array<{ text: string }>)?.[0]?.text ?? '' };
            return { content: (data.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content ?? '' };
        },
    };
}

// ─── Plugin Factory ─────────────────────────────────────

export function gsepPlugin(options: GSEPPluginOptions = {}) {
    let genome: GenomeInstance | null = null;
    let initPromise: Promise<GenomeInstance | null> | null = null;
    let lastUserMessage = '';
    let lastC4Result: { safe: boolean; response: string } | null = null;

    async function ensureInit(logger: PluginApi['logger']): Promise<GenomeInstance | null> {
        if (genome) return genome;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            const agentName = options.name ?? (options.autoDetectName !== false ? detectAgentName() : 'openclaw-agent');
            logger.info(`[GSEP] Initializing for agent "${agentName}"...`);
            try {
                const { GSEP } = await import('../GSEP.js');
                const llm = options.llm ?? createDefaultLLM();
                genome = await GSEP.quickStart({
                    name: agentName, llm,
                    preset: options.preset ?? 'full',
                    overrides: options.overrides,
                    storage: options.storage,
                    purpose: options.purpose,
                    dashboardPort: options.dashboardPort ?? 4200,
                });
                (globalThis as Record<string, unknown>).__GSEP_PLUGIN_ACTIVE__ = true;
                logger.info('[GSEP] 🧬 Pipeline active — full 32-step pipeline via native hooks');
                return genome;
            } catch (err) {
                logger.error(`[GSEP] Init failed: ${err instanceof Error ? err.message : String(err)}`);
                return null;
            }
        })();
        return initPromise;
    }

    return {
        id: 'gsep',
        name: 'GSEP — Genomic Self-Evolving Prompts',
        description: 'Self-evolving prompts with 5-layer chromosome security, fitness tracking, and autonomous evolution',
        version: '0.8.0',

        // SYNCHRONOUS register — Genome requires this
        register(api: PluginApi) {

            // ─── BEFORE: Enhance prompt ─────────────────────
            api.on('before_prompt_build', async (event: BeforePromptEvent, _ctx: AgentContext) => {
                const g = await ensureInit(api.logger);
                if (!g) return undefined;

                lastUserMessage = event.prompt;

                try {
                    const before = await g.beforeLLM(event.prompt, { userId: 'owner', taskType: 'general' });
                    if (before.blocked) {
                        api.logger.info(`[GSEP] ⛔ Blocked: ${before.blockReason}`);
                        return { systemPrompt: before.blockReason };
                    }
                    return { systemPrompt: before.prompt };
                } catch (err) {
                    api.logger.warn(`[GSEP] BEFORE error: ${err instanceof Error ? err.message : String(err)}`);
                    return undefined;
                }
            }, { priority: 10 });

            // ─── AFTER: Process LLM output ──────────────────
            api.on('llm_output', async (event: LLMOutputEvent, _ctx: AgentContext) => {
                const g = await ensureInit(api.logger);
                if (!g || !lastUserMessage) return;

                const responseText = event.assistantTexts.join('\n');
                if (!responseText) return;

                try {
                    const after = await g.afterLLM(lastUserMessage, responseText, { userId: 'owner', taskType: 'general' });
                    lastC4Result = after.safe ? null : { safe: false, response: after.response };
                } catch (err) {
                    api.logger.warn(`[GSEP] AFTER error: ${err instanceof Error ? err.message : String(err)}`);
                }
            }, { priority: 10 });

            // ─── C4 INTERCEPT: Modify if threats ────────────
            api.on('message_sending', async (_event: MessageSendingEvent) => {
                if (!lastC4Result || lastC4Result.safe) return undefined;
                const result = { content: lastC4Result.response };
                lastC4Result = null;
                return result;
            });

            // ─── /gsep command ──────────────────────────────
            api.registerCommand({
                name: 'gsep',
                description: 'Show GSEP genome status',
                acceptsArgs: true,
                handler: async () => {
                    const g = await ensureInit(api.logger);
                    if (!g) return { text: 'GSEP not initialized' };
                    const exported = await g.export();
                    const c1Active = exported.layers?.layer1?.filter((a: { status: string }) => a.status === 'active') ?? [];
                    return {
                        text: [
                            '🧬 **GSEP Status**',
                            `Agent: **${exported.name}**`,
                            `Genome: \`${exported.id?.slice(0, 16)}...\``,
                            `C0: ${exported.layers?.layer0?.length ?? 0} (immutable)`,
                            `C1: ${c1Active.length} active genes`,
                            `C2: ${exported.layers?.layer2?.length ?? 0} (epigenomes)`,
                            '', ...c1Active.map((a: { gene: string; fitness: number }) => `  • ${a.gene}: fitness ${a.fitness.toFixed(2)}`),
                        ].join('\n'),
                    };
                },
            });

            // ─── Proactive Service: greetings & reminders (GUAO #4) ──
            api.registerService({
                id: 'gsep-proactive',
                start: () => {
                    const checkInterval = 60 * 60 * 1000; // Check every hour
                    const timer = setInterval(async () => {
                        const g = await ensureInit(api.logger);
                        if (!g) return;

                        const now = new Date();
                        const hour = now.getHours();

                        // Morning greeting (8-9 AM)
                        if (hour === 8) {
                            try {
                                const report = g.generateWeeklyReport();
                                const greeting = [
                                    `Buenos días! 🧬`,
                                    ``,
                                    report.conversations.total > 0
                                        ? `Ayer tuvimos ${report.conversations.avgPerDay.toFixed(0)} conversaciones. Calidad: ${(report.quality.endScore * 100).toFixed(0)}%.`
                                        : `Listo para empezar el día.`,
                                    report.quality.trend === 'improving'
                                        ? `📈 Tu calidad va en subida — sigue así.`
                                        : report.quality.trend === 'declining'
                                            ? `⚠️ La calidad bajó un poco. Trabajemos en mejorar hoy.`
                                            : '',
                                    report.suggestions.length > 0
                                        ? `💡 Sugerencia: ${report.suggestions[0]}`
                                        : '',
                                ].filter(Boolean).join('\n');

                                api.runtime.system.enqueueSystemEvent({
                                    type: 'gsep:proactive-message',
                                    message: greeting,
                                    channel: 'telegram',
                                });
                                api.logger.info('[GSEP] 🌅 Morning greeting sent');
                            } catch {
                                // Best-effort
                            }
                        }

                        // Evolution summary (6 PM)
                        if (hour === 18) {
                            try {
                                const exported = await g.export();
                                const activeGenes = exported.layers?.layer1?.filter(
                                    (a: { status: string }) => a.status === 'active'
                                ) ?? [];
                                const avgFitness = activeGenes.length > 0
                                    ? activeGenes.reduce((sum: number, a: { fitness: number }) => sum + a.fitness, 0) / activeGenes.length
                                    : 0;

                                if (avgFitness > 0) {
                                    api.runtime.system.enqueueSystemEvent({
                                        type: 'gsep:proactive-message',
                                        message: `🧬 Resumen del día: fitness promedio ${(avgFitness * 100).toFixed(0)}%. ${activeGenes.length} genes activos evolucionando.`,
                                        channel: 'telegram',
                                    });
                                    api.logger.info('[GSEP] 🌆 Evening summary sent');
                                }
                            } catch {
                                // Best-effort
                            }
                        }
                    }, checkInterval);

                    // Cleanup on stop
                    (api as unknown as Record<string, unknown>).__gsepTimer = timer;
                    api.logger.info('[GSEP] ⏰ Proactive service started — morning greetings + evening summaries');
                },
                stop: () => {
                    const timer = (api as unknown as Record<string, unknown>).__gsepTimer as NodeJS.Timeout;
                    if (timer) clearInterval(timer);
                },
            });

            api.logger.info('[GSEP] 🧬 Plugin registered — hooks: before_prompt_build, llm_output, message_sending, proactive service');
        },
    };
}
