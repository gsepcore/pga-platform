/**
 * GSEPMiddleware — Two-hook integration for existing agents
 *
 * Runs the FULL GSEP pipeline (32 steps) split into before/after hooks.
 * The agent keeps full control of its LLM call — GSEP enhances and protects.
 *
 * Usage:
 * ```typescript
 * const gsep = await GSEP.middleware({ name: 'my-agent', llm });
 *
 * // In your agent's chat flow:
 * const before = await gsep.before(userMessage, { userId });
 * if (before.blocked) return before.blockReason;
 *
 * const response = await myAgent.callLLM(before.prompt, before.sanitizedMessage);
 *
 * const after = await gsep.after(userMessage, response, { userId });
 * if (!after.safe) response = after.response; // C4 sanitized version
 * ```
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { AutonomousConfig } from '../types/index.js';
import type { PresetName } from '../presets/ConfigPresets.js';
import type { LLMProvider } from '../GSEP.js';
import { GSEP, GenomeInstance } from '../GSEP.js';

// ─── Types ──────────────────────────────────────────────

export interface MiddlewareOptions {
    /** Agent name (default: 'my-agent') */
    name?: string;
    /** LLM provider — auto-detected from env vars if omitted */
    provider?: LLMProvider;
    /** API key — reads from env vars if omitted */
    apiKey?: string;
    /** Model override for GSEP internal operations */
    model?: string;
    /** Ollama host URL */
    ollamaHost?: string;
    /** Configuration preset (default: 'full') */
    preset?: PresetName;
    /** Extra autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;
    /** Storage adapter (default: SQLiteStorageAdapter) */
    storage?: StorageAdapter;
    /** Pre-built LLM adapter — skips auto-detection */
    llm?: LLMAdapter;
    /** Agent purpose — enables Purpose Lock */
    purpose?: string;
    /** Allowed topics for Purpose Lock */
    allowedTopics?: string[];
    /** Forbidden topics for Purpose Lock */
    forbiddenTopics?: string[];
}

export interface BeforeContext {
    /** User ID for personalization */
    userId?: string;
    /** Task type for routing and fitness */
    taskType?: string;
}

export interface BeforeResult {
    /** Enhanced prompt with GSEP genes, memory, and suggestions */
    prompt: string;
    /** Sanitized user message (C3 + PII redaction applied) */
    sanitizedMessage: string;
    /** Whether the message was blocked (C3, PurposeLock, Anomaly, Shield) */
    blocked: boolean;
    /** Reason for blocking */
    blockReason?: string;
}

export interface AfterContext {
    /** User ID */
    userId?: string;
    /** Task type */
    taskType?: string;
}

export interface AfterResult {
    /** Whether the response passed C4 immune scan */
    safe: boolean;
    /** Threats detected by C4 */
    threats: Array<{ type: string; severity: string; description: string }>;
    /** Fitness score (0-1) */
    fitness: number;
    /** Response (sanitized if C4 detected threats) */
    response: string;
}

// ─── Cheap Model Map ────────────────────────────────────

const CHEAP_MODELS: Record<LLMProvider, string> = {
    anthropic: 'claude-haiku-4-5-20251001',
    openai: 'gpt-4o-mini',
    google: 'gemini-2.0-flash',
    ollama: '',
    perplexity: 'sonar',
};

// ─── Implementation ─────────────────────────────────────

export class GSEPMiddleware {
    private genome: GenomeInstance;

    private constructor(genome: GenomeInstance) {
        this.genome = genome;
    }

    /**
     * Create a middleware instance with the full GSEP pipeline.
     */
    static async create(options: MiddlewareOptions = {}): Promise<GSEPMiddleware> {
        const model = options.model ?? await GSEPMiddleware.resolveCheapModel(options);

        const genome = await GSEP.quickStart({
            name: options.name ?? 'middleware-agent',
            provider: options.provider,
            apiKey: options.apiKey,
            model,
            ollamaHost: options.ollamaHost,
            preset: options.preset ?? 'full',
            overrides: options.overrides,
            storage: options.storage,
            llm: options.llm,
            purpose: options.purpose,
            allowedTopics: options.allowedTopics,
            forbiddenTopics: options.forbiddenTopics,
        });

        return new GSEPMiddleware(genome);
    }

    /**
     * BEFORE hook — runs the full pre-LLM pipeline.
     *
     * C0 integrity, blackboard (emotional + cognitive + memory + health),
     * autonomous loop, curiosity engine, strategic refusal, emotional
     * escalation, prompt assembly with evolved genes, RAG, context memory,
     * proactive suggestions, pattern predictions, anomaly detection,
     * Purpose Lock, C3 firewall scan, PII redaction.
     */
    async before(userMessage: string, context: BeforeContext = {}): Promise<BeforeResult> {
        return this.genome.beforeLLM(userMessage, {
            userId: context.userId,
            taskType: context.taskType,
        });
    }

    /**
     * AFTER hook — runs the full post-LLM pipeline.
     *
     * C4 immune system scan, fitness calculation, drift detection,
     * evolution trigger, metacognition post-analysis, pattern memory,
     * emotional model, growth journal, curiosity engine, DNA profile
     * update, persist all to SQLite.
     */
    async after(userMessage: string, response: string, context: AfterContext = {}): Promise<AfterResult> {
        return this.genome.afterLLM(userMessage, response, {
            userId: context.userId,
            taskType: context.taskType,
        });
    }

    /**
     * Generate a weekly performance report.
     */
    generateReport() {
        return this.genome.generateWeeklyReport();
    }

    /**
     * Get the underlying GenomeInstance for advanced operations.
     */
    getGenome(): GenomeInstance {
        return this.genome;
    }

    // ─── Cheap Model Resolution ─────────────────────────────

    private static async resolveCheapModel(options: MiddlewareOptions): Promise<string> {
        const provider = options.provider ?? GSEPMiddleware.detectProvider(options.apiKey);
        if (provider === 'ollama') {
            return GSEPMiddleware.detectOllamaLightModel(options.ollamaHost);
        }
        return CHEAP_MODELS[provider] || '';
    }

    private static detectProvider(apiKey?: string): LLMProvider {
        if (apiKey?.startsWith('sk-ant-')) return 'anthropic';
        if (apiKey?.startsWith('pplx-')) return 'perplexity';
        if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
        if (process.env.OPENAI_API_KEY) return 'openai';
        if (process.env.GOOGLE_API_KEY) return 'google';
        if (process.env.PERPLEXITY_API_KEY) return 'perplexity';
        if (process.env.OLLAMA_HOST) return 'ollama';
        return 'anthropic';
    }

    private static async detectOllamaLightModel(host?: string): Promise<string> {
        const ollamaHost = host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';
        try {
            const response = await fetch(`${ollamaHost}/api/tags`);
            if (!response.ok) return 'llama3';
            const data = await response.json() as { models?: Array<{ name: string; size: number }> };
            if (!data.models || data.models.length === 0) return 'llama3';
            const sorted = [...data.models].sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
            return sorted[0].name;
        } catch {
            return 'llama3';
        }
    }
}
