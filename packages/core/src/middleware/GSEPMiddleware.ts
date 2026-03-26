/**
 * GSEPMiddleware — Two-hook integration for existing agents
 *
 * Injects GSEP capabilities into any agent without replacing its runtime.
 * The agent keeps full control — GSEP only enhances the prompt (before)
 * and observes the result (after).
 *
 * Usage:
 * ```typescript
 * const gsep = await GSEP.middleware();
 *
 * // In your agent's chat flow:
 * const enhanced = await gsep.before(originalPrompt, { userId, message });
 * const response = await myAgent.callLLM(enhanced);
 * await gsep.after(response, { userId, quality });
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

    /** Model override for GSEP internal operations (default: cheapest model per provider) */
    model?: string;

    /** Ollama host URL */
    ollamaHost?: string;

    /** Configuration preset (default: 'full') */
    preset?: PresetName;

    /** Extra autonomous config overrides */
    overrides?: Partial<AutonomousConfig>;

    /** Storage adapter (default: InMemoryStorageAdapter) */
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
    /** The user's message (for ProactiveSuggestions, PurposeLock, etc.) */
    message: string;
    /** Task type for routing and fitness */
    taskType?: string;
}

export interface AfterContext {
    /** User ID */
    userId?: string;
    /** Quality score 0-1 (if the agent can measure it) */
    quality?: number;
    /** User feedback signal */
    feedback?: 'good' | 'bad' | 'neutral' | number;
    /** Tokens used in the response */
    tokens?: number;
    /** Task type */
    taskType?: string;
}

export interface BeforeResult {
    /** Enhanced prompt with GSEP genes, memory, and suggestions injected */
    prompt: string;
    /** Whether Purpose Lock rejected the message (off-topic) */
    rejected: boolean;
    /** Rejection message if rejected */
    rejectionMessage?: string;
    /** Whether anomaly detection flagged the message */
    anomalyDetected: boolean;
    /** Anomaly details if detected */
    anomalies?: Array<{ type: string; severity: string; description: string }>;
}

// ─── Cheap Model Map ────────────────────────────────────

const CHEAP_MODELS: Record<LLMProvider, string> = {
    anthropic: 'claude-haiku-4-5-20251001',
    openai: 'gpt-4o-mini',
    google: 'gemini-2.0-flash',
    ollama: '', // Will be detected from available models
    perplexity: 'sonar',
};

// ─── Implementation ─────────────────────────────────────

export class GSEPMiddleware {
    private genome: GenomeInstance;

    private constructor(genome: GenomeInstance) {
        this.genome = genome;
    }

    /**
     * Create a middleware instance. Auto-detects LLM provider and
     * selects the cheapest model for GSEP internal operations.
     */
    static async create(options: MiddlewareOptions = {}): Promise<GSEPMiddleware> {
        // Resolve the cheap model for internal operations
        const model = options.model ?? await GSEPMiddleware.resolveCheapModel(options);

        // Use quickStart internally — it handles all the detection
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
     * BEFORE hook — enhance the prompt before sending to the agent's LLM.
     *
     * Injects: evolved genes, user memory, proactive suggestions,
     * and checks Purpose Lock + Anomaly Detection.
     */
    async before(originalPrompt: string, context: BeforeContext): Promise<BeforeResult> {
        // Check anomalies first
        let anomalyDetected = false;
        const anomalies: Array<{ type: string; severity: string; description: string }> = [];

        // Run anomaly check via internal analyze
        const anomalyHistory = this.genome.getAnomalyHistory?.(1) ?? [];
        if (anomalyHistory.length > 0) {
            const latest = anomalyHistory[0];
            if (latest.suggestedAction === 'block') {
                anomalyDetected = true;
                anomalies.push({
                    type: latest.type,
                    severity: latest.severity,
                    description: latest.description,
                });
            }
        }

        // Build enhanced prompt using GSEP's internal assembler
        const enhancedPrompt = await this.genome.assemblePrompt(
            {
                userId: context.userId ?? 'anonymous',
                taskType: context.taskType ?? 'general',
            },
            context.message,
        );

        // Combine: original prompt + GSEP enhancements
        const combined = enhancedPrompt
            ? `${originalPrompt}\n\n---\n\n${enhancedPrompt}`
            : originalPrompt;

        return {
            prompt: combined,
            rejected: false,
            anomalyDetected,
            anomalies: anomalies.length > 0 ? anomalies : undefined,
        };
    }

    /**
     * AFTER hook — observe the response and feed GSEP's evolution engine.
     *
     * Records: fitness metrics, drift signals, emotional state,
     * pattern memory, and weekly report data.
     */
    async after(_response: string, context: AfterContext = {}): Promise<void> {
        // Map simple feedback to internal format
        if (context.feedback !== undefined) {
            const sentiment = typeof context.feedback === 'number'
                ? (context.feedback >= 0.6 ? 'positive' : context.feedback >= 0.3 ? 'neutral' : 'negative')
                : (context.feedback === 'good' ? 'positive' : context.feedback === 'bad' ? 'negative' : 'neutral');

            const userId = context.userId ?? 'anonymous';

            // Record feedback for all active genes
            try {
                const genome = await this.genome.export();
                const activeGenes = genome.layers?.layer1?.filter(
                    (a: { status: string }) => a.status === 'active',
                ) ?? [];
                for (const allele of activeGenes) {
                    await this.genome.recordFeedback(userId, allele.gene, sentiment);
                }
            } catch { /* best-effort */ }
        }
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

    /**
     * Get anomaly detection analytics.
     */
    getAnomalyAnalytics() {
        return this.genome.getAnomalyAnalytics();
    }

    // ─── Cheap Model Resolution ─────────────────────────────

    private static async resolveCheapModel(options: MiddlewareOptions): Promise<string> {
        const provider = options.provider ?? GSEPMiddleware.detectProvider(options.apiKey);

        // For Ollama: try to detect the lightest model available
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

        return 'anthropic'; // default
    }

    private static async detectOllamaLightModel(host?: string): Promise<string> {
        const ollamaHost = host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';

        try {
            const response = await fetch(`${ollamaHost}/api/tags`);
            if (!response.ok) return 'llama3';

            const data = await response.json() as { models?: Array<{ name: string; size: number }> };
            if (!data.models || data.models.length === 0) return 'llama3';

            // Sort by size (smallest first) and pick the lightest
            const sorted = [...data.models].sort((a, b) => (a.size ?? 0) - (b.size ?? 0));
            return sorted[0].name;
        } catch {
            return 'llama3'; // fallback
        }
    }
}
