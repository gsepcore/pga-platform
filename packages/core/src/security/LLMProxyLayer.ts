/**
 * LLMProxyLayer — Security proxy that wraps any LLM adapter.
 *
 * Intercepts all LLM traffic to:
 * 1. Redact PII before sending to cloud providers
 * 2. Re-hydrate PII tokens in responses for user display
 * 3. Route sensitive queries to local models (Ollama)
 * 4. Log payload sizes and destinations (not content)
 *
 * Implements LLMAdapter interface — drop-in replacement.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { PIIRedactionEngine, type RedactionResult } from './PIIRedactionEngine.js';
import { DataClassifier, type DataClassification } from './DataClassifier.js';
import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

/** Minimal LLM adapter interface (matches @gsep/core LLMAdapter) */
export interface LLMAdapterLike {
    chat(messages: Array<{ role: string; content: string }>, options?: unknown): Promise<{
        content: string;
        usage?: { inputTokens: number; outputTokens: number };
    }>;
    model?: string;
    name?: string;
}

export interface LLMProxyConfig {
    /** Enable PII redaction (default: true) */
    enableRedaction: boolean;
    /** PII categories to redact (empty = all) */
    piiCategories?: string[];
    /** Local model adapter (e.g., Ollama) for sensitive queries */
    localAdapter?: LLMAdapterLike;
    /** Classification threshold to route to local model */
    localRouteThreshold: DataClassification;
    /** Security event bus for logging */
    eventBus?: SecurityEventBus;
}

export interface ProxyStats {
    totalRequests: number;
    redactedRequests: number;
    localRouted: number;
    cloudRouted: number;
    totalPIIRedacted: number;
    byCategory: Record<string, number>;
}

// ─── Proxy ──────────────────────────────────────────────

/**
 * Security proxy for LLM adapters.
 *
 * Usage:
 * ```typescript
 * const proxy = new LLMProxyLayer(cloudAdapter, {
 *   enableRedaction: true,
 *   localAdapter: ollamaAdapter,
 *   localRouteThreshold: 'confidential',
 * });
 *
 * // Use proxy exactly like a regular adapter
 * const response = await proxy.chat([{ role: 'user', content: 'My SSN is 123-45-6789' }]);
 * // SSN was redacted before sending to cloud, re-hydrated in response for user
 * ```
 */
export class LLMProxyLayer implements LLMAdapterLike {
    readonly model: string;
    readonly name: string;

    private cloudAdapter: LLMAdapterLike;
    private localAdapter?: LLMAdapterLike;
    private piiEngine: PIIRedactionEngine;
    private classifier: DataClassifier;
    private eventBus?: SecurityEventBus;
    private localRouteThreshold: DataClassification;
    private enableRedaction: boolean;

    private stats: ProxyStats = {
        totalRequests: 0,
        redactedRequests: 0,
        localRouted: 0,
        cloudRouted: 0,
        totalPIIRedacted: 0,
        byCategory: {},
    };

    constructor(cloudAdapter: LLMAdapterLike, config: Partial<LLMProxyConfig> = {}) {
        this.cloudAdapter = cloudAdapter;
        this.localAdapter = config.localAdapter;
        this.enableRedaction = config.enableRedaction ?? true;
        this.localRouteThreshold = config.localRouteThreshold ?? 'confidential';
        this.eventBus = config.eventBus;

        this.piiEngine = new PIIRedactionEngine({
            categories: config.piiCategories as never,
        });
        this.classifier = new DataClassifier();

        this.model = cloudAdapter.model ?? 'proxy';
        this.name = `secure-proxy(${cloudAdapter.name ?? 'llm'})`;
    }

    /**
     * Send chat messages through the security proxy.
     */
    async chat(
        messages: Array<{ role: string; content: string }>,
        options?: unknown,
    ): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }> {
        this.stats.totalRequests++;

        // Step 1: Classify the content to determine routing
        const fullText = messages.map(m => m.content).join('\n');
        const classification = this.classifier.classify(fullText);

        // Step 2: Decide routing — local or cloud?
        const useLocal = this.shouldRouteLocal(classification.classification);
        const adapter = useLocal ? (this.localAdapter ?? this.cloudAdapter) : this.cloudAdapter;

        if (useLocal) {
            this.stats.localRouted++;
            this.eventBus?.emitAllow('security:local-model-routed', 2, {
                type: 'llm-request',
                id: classification.classification,
                detail: `Routed to local: ${classification.categories.join(', ')}`,
            });
        } else {
            this.stats.cloudRouted++;
        }

        // Step 3: Redact PII if enabled and routing to cloud
        let processedMessages = messages;
        let redactionResults: RedactionResult[] = [];

        if (this.enableRedaction && !useLocal) {
            const redacted = messages.map(m => {
                if (m.role === 'system') return { msg: m, result: null }; // Don't redact system prompts
                const result = this.piiEngine.redact(m.content);
                return { msg: { ...m, content: result.redacted }, result };
            });

            processedMessages = redacted.map(r => r.msg);
            redactionResults = redacted.map(r => r.result).filter((r): r is RedactionResult => r !== null);

            const totalRedacted = redactionResults.reduce((sum, r) => sum + r.matches.length, 0);
            if (totalRedacted > 0) {
                this.stats.redactedRequests++;
                this.stats.totalPIIRedacted += totalRedacted;

                for (const result of redactionResults) {
                    for (const match of result.matches) {
                        this.stats.byCategory[match.category] = (this.stats.byCategory[match.category] || 0) + 1;
                    }
                }

                this.eventBus?.emit({
                    type: 'security:pii-redacted',
                    timestamp: new Date(),
                    layer: 2,
                    decision: 'info',
                    actor: {},
                    resource: {
                        type: 'pii',
                        id: `${totalRedacted} items`,
                        detail: redactionResults.flatMap(r => r.categories).join(', '),
                    },
                    severity: 'info',
                });
            }
        }

        // Step 4: Log the request (size only, not content)
        this.eventBus?.emit({
            type: 'security:llm-request-filtered',
            timestamp: new Date(),
            layer: 2,
            decision: 'allow',
            actor: {},
            resource: {
                type: 'llm-request',
                id: adapter.name ?? adapter.model ?? 'unknown',
                detail: `${processedMessages.length} messages, ${fullText.length} chars`,
            },
            severity: 'info',
        });

        // Step 5: Forward to adapter
        const response = await adapter.chat(processedMessages, options);

        // Step 6: Re-hydrate PII in response (so user sees original values)
        if (this.enableRedaction && redactionResults.length > 0) {
            response.content = this.piiEngine.rehydrate(response.content);
        }

        return response;
    }

    /**
     * Get proxy statistics.
     */
    getStats(): ProxyStats {
        return { ...this.stats };
    }

    /**
     * Get PII engine stats.
     */
    getPIIStats() {
        return this.piiEngine.getStats();
    }

    /**
     * Clear PII vault (call on session end).
     */
    clearVault(): void {
        this.piiEngine.clearVault();
    }

    // ─── Internal ───────────────────────────────────────

    private shouldRouteLocal(classification: DataClassification): boolean {
        if (!this.localAdapter) return false;

        const order: Record<DataClassification, number> = {
            public: 0, internal: 1, confidential: 2, restricted: 3,
        };

        return order[classification] >= order[this.localRouteThreshold];
    }
}
