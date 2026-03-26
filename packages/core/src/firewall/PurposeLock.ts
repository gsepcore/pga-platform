/**
 * PurposeLock — Purpose Fidelity Classifier
 *
 * Prevents the agent from being derailed by off-topic requests.
 * Unlike C3 (which blocks malicious injection), PurposeLock handles
 * normal users who simply ask for things outside the agent's scope.
 *
 * Example: A Mercado Libre support bot should not answer cooking recipes.
 *
 * Features:
 * - Classifies each message as on-purpose, borderline, or off-purpose
 * - Generates context-aware rejection responses (not robotic)
 * - Learns gray areas over time (evolves what's "borderline")
 * - Tracks deviation metrics for dashboard/reporting
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';

// ─── Types ──────────────────────────────────────────────

export type PurposeVerdict = 'on-purpose' | 'borderline' | 'off-purpose';

export interface PurposeLockConfig {
    /** The agent's purpose statement (e.g. "Customer support for Mercado Libre") */
    purpose: string;

    /** Allowed topics/domains (e.g. ["purchases", "shipping", "payments", "returns"]) */
    allowedTopics?: string[];

    /** Explicitly forbidden topics (e.g. ["cooking", "dating", "politics"]) */
    forbiddenTopics?: string[];

    /** How strict the lock is: 'strict' rejects borderline, 'moderate' allows it */
    strictness?: 'strict' | 'moderate' | 'lenient';

    /** Custom rejection message template. Use {purpose} as placeholder. */
    rejectionTemplate?: string;
}

export interface PurposeClassification {
    verdict: PurposeVerdict;
    confidence: number;
    reason: string;
    suggestedResponse?: string;
}

export interface PurposeLockAnalytics {
    totalChecked: number;
    onPurpose: number;
    borderline: number;
    offPurpose: number;
    redirectedSuccessfully: number;
    deviationRate: number;
}

// ─── Implementation ─────────────────────────────────────

export class PurposeLock {
    private config: Required<PurposeLockConfig>;
    private analytics: PurposeLockAnalytics = {
        totalChecked: 0,
        onPurpose: 0,
        borderline: 0,
        offPurpose: 0,
        redirectedSuccessfully: 0,
        deviationRate: 0,
    };

    // Learned patterns from LLM classifications
    private learnedOnPurpose: Set<string> = new Set();
    private learnedOffPurpose: Set<string> = new Set();

    constructor(
        config: PurposeLockConfig,
        private llm?: LLMAdapter,
    ) {
        this.config = {
            purpose: config.purpose,
            allowedTopics: config.allowedTopics ?? [],
            forbiddenTopics: config.forbiddenTopics ?? [],
            strictness: config.strictness ?? 'moderate',
            rejectionTemplate: config.rejectionTemplate
                ?? `I'm here to help with {purpose}. Is there something related I can assist you with?`,
        };
    }

    /**
     * Classify a user message against the agent's purpose.
     */
    async classify(message: string): Promise<PurposeClassification> {
        this.analytics.totalChecked++;

        // Fast path: keyword-based pre-check
        const fastResult = this.fastClassify(message);
        if (fastResult.confidence >= 0.9) {
            this.recordVerdict(fastResult.verdict);
            return fastResult;
        }

        // LLM-powered classification (more accurate)
        if (this.llm) {
            try {
                const llmResult = await this.llmClassify(message);
                this.recordVerdict(llmResult.verdict);
                this.learn(message, llmResult.verdict);
                return llmResult;
            } catch {
                // Fall through to keyword-based result
            }
        }

        this.recordVerdict(fastResult.verdict);
        return fastResult;
    }

    /**
     * Check if a message should be blocked and get the rejection response.
     * Returns null if the message is allowed.
     */
    async guard(message: string): Promise<string | null> {
        const classification = await this.classify(message);

        if (classification.verdict === 'on-purpose') {
            return null; // Allow
        }

        if (classification.verdict === 'borderline' && this.config.strictness !== 'strict') {
            return null; // Allow borderline in moderate/lenient mode
        }

        // Off-purpose (or borderline in strict mode) — return rejection
        return classification.suggestedResponse
            ?? this.config.rejectionTemplate.replace('{purpose}', this.config.purpose);
    }

    /**
     * Get analytics for dashboard/reporting.
     */
    getAnalytics(): PurposeLockAnalytics {
        return { ...this.analytics };
    }

    /**
     * Record that a redirected user came back with an on-purpose question.
     */
    recordSuccessfulRedirect(): void {
        this.analytics.redirectedSuccessfully++;
    }

    // ─── Fast keyword-based classification ──────────────────

    private fastClassify(message: string): PurposeClassification {
        const lower = message.toLowerCase().trim();

        // Check learned patterns first
        for (const pattern of this.learnedOffPurpose) {
            if (lower.includes(pattern)) {
                return {
                    verdict: 'off-purpose',
                    confidence: 0.85,
                    reason: `Matches learned off-purpose pattern: "${pattern}"`,
                    suggestedResponse: this.buildRejection(),
                };
            }
        }

        for (const pattern of this.learnedOnPurpose) {
            if (lower.includes(pattern)) {
                return {
                    verdict: 'on-purpose',
                    confidence: 0.85,
                    reason: `Matches learned on-purpose pattern: "${pattern}"`,
                };
            }
        }

        // Check forbidden topics (stem-aware: "recipes" matches "recipe")
        for (const topic of this.config.forbiddenTopics) {
            const topicLower = topic.toLowerCase();
            const topicStem = topicLower.replace(/s$/, ''); // naive stem: remove trailing 's'
            if (lower.includes(topicLower) || lower.includes(topicStem)) {
                return {
                    verdict: 'off-purpose',
                    confidence: 0.9,
                    reason: `Message contains forbidden topic: "${topic}"`,
                    suggestedResponse: this.buildRejection(),
                };
            }
        }

        // Check allowed topics (stem-aware)
        for (const topic of this.config.allowedTopics) {
            const topicLower = topic.toLowerCase();
            const topicStem = topicLower.replace(/s$/, '');
            if (lower.includes(topicLower) || lower.includes(topicStem)) {
                return {
                    verdict: 'on-purpose',
                    confidence: 0.9,
                    reason: `Message matches allowed topic: "${topic}"`,
                };
            }
        }

        // Unknown — low confidence, needs LLM
        return {
            verdict: 'borderline',
            confidence: 0.4,
            reason: 'No keyword match — requires deeper analysis',
        };
    }

    // ─── LLM-powered classification ────────────────────────

    private async llmClassify(message: string): Promise<PurposeClassification> {
        const allowedStr = this.config.allowedTopics.length > 0
            ? `Allowed topics: ${this.config.allowedTopics.join(', ')}`
            : '';
        const forbiddenStr = this.config.forbiddenTopics.length > 0
            ? `Forbidden topics: ${this.config.forbiddenTopics.join(', ')}`
            : '';

        const response = await this.llm!.chat([
            {
                role: 'system',
                content: `You are a purpose classifier for an AI agent. The agent's purpose is: "${this.config.purpose}". ${allowedStr} ${forbiddenStr}

Classify the user's message as one of:
- ON-PURPOSE: directly related to the agent's purpose
- BORDERLINE: tangentially related (e.g. asking about food on a marketplace that sells food)
- OFF-PURPOSE: completely unrelated to the agent's purpose

Respond ONLY in this exact JSON format:
{"verdict":"on-purpose|borderline|off-purpose","confidence":0.0-1.0,"reason":"brief explanation","suggestedResponse":"friendly redirect if off-purpose, omit if on-purpose"}`,
            },
            {
                role: 'user',
                content: message,
            },
        ], { temperature: 0 });

        try {
            const match = response.content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]) as {
                    verdict: string;
                    confidence: number;
                    reason: string;
                    suggestedResponse?: string;
                };

                const verdict = (['on-purpose', 'borderline', 'off-purpose'].includes(parsed.verdict)
                    ? parsed.verdict
                    : 'borderline') as PurposeVerdict;

                return {
                    verdict,
                    confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
                    reason: parsed.reason ?? 'LLM classification',
                    suggestedResponse: parsed.suggestedResponse,
                };
            }
        } catch {
            // Parse failed
        }

        return {
            verdict: 'borderline',
            confidence: 0.5,
            reason: 'LLM response could not be parsed',
        };
    }

    // ─── Learning ───────────────────────────────────────────

    private learn(message: string, verdict: PurposeVerdict): void {
        // Extract key phrases (2-3 word combos) for future fast classification
        const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (words.length < 2) return;

        const phrase = words.slice(0, 3).join(' ');

        if (verdict === 'on-purpose') {
            this.learnedOnPurpose.add(phrase);
            this.learnedOffPurpose.delete(phrase);
        } else if (verdict === 'off-purpose') {
            this.learnedOffPurpose.add(phrase);
            this.learnedOnPurpose.delete(phrase);
        }

        // Cap learned patterns to prevent memory bloat
        if (this.learnedOnPurpose.size > 200) {
            const first = this.learnedOnPurpose.values().next().value;
            if (first) this.learnedOnPurpose.delete(first);
        }
        if (this.learnedOffPurpose.size > 200) {
            const first = this.learnedOffPurpose.values().next().value;
            if (first) this.learnedOffPurpose.delete(first);
        }
    }

    // ─── Helpers ────────────────────────────────────────────

    private recordVerdict(verdict: PurposeVerdict): void {
        if (verdict === 'on-purpose') this.analytics.onPurpose++;
        else if (verdict === 'borderline') this.analytics.borderline++;
        else this.analytics.offPurpose++;

        this.analytics.deviationRate = this.analytics.totalChecked > 0
            ? this.analytics.offPurpose / this.analytics.totalChecked
            : 0;
    }

    private buildRejection(): string {
        return this.config.rejectionTemplate.replace('{purpose}', this.config.purpose);
    }
}
