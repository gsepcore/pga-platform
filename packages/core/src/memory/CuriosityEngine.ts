/**
 * CuriosityEngine — Intrinsic Motivation for Knowledge Exploration
 *
 * Drives the agent to explore knowledge gaps, ask clarifying questions,
 * and proactively seek understanding. The engine tracks what the agent
 * knows well vs. where it has blind spots, generating "curiosity signals"
 * that influence behavior.
 *
 * Inspired by intrinsic motivation research and curiosity-driven learning.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

// ─── Types ──────────────────────────────────────────────

export interface KnowledgeGap {
    id: string;
    domain: string;
    description: string;
    detectedAt: Date;
    /** How many times this gap has been encountered */
    encounters: number;
    /** Was this gap ever resolved? */
    resolved: boolean;
    resolvedAt?: Date;
}

export interface CuriositySignal {
    domain: string;
    intensity: number;    // 0-1: how curious the agent is about this domain
    reason: string;
    suggestedAction: 'ask-clarification' | 'explore-topic' | 'suggest-resource' | 'acknowledge-gap';
}

export interface ExplorationRecord {
    domain: string;
    successCount: number;
    failureCount: number;
    lastExplored: Date;
}

// ─── Constants ──────────────────────────────────────────

const MAX_GAPS = 30;
const MAX_SIGNALS = 5;
const CURIOSITY_DECAY_HOURS = 72;  // curiosity fades after 3 days without encounter

// ─── CuriosityEngine ───────────────────────────────────

export class CuriosityEngine {
    private gaps: KnowledgeGap[] = [];
    private explorationHistory: Map<string, ExplorationRecord> = new Map();

    /**
     * Detect knowledge gaps from a user message and the agent's confidence.
     * Low confidence + unfamiliar domain = new gap.
     */
    detectGaps(userMessage: string, domain: string | null, confidence: number): KnowledgeGap[] {
        const detectedGaps: KnowledgeGap[] = [];

        // Low confidence signals a potential gap
        if (confidence < 0.5 && domain) {
            const existing = this.gaps.find(g => g.domain === domain && !g.resolved);
            if (existing) {
                existing.encounters++;
            } else {
                const gap: KnowledgeGap = {
                    id: `gap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    domain,
                    description: `Uncertain about ${domain}: "${userMessage.slice(0, 60)}..."`,
                    detectedAt: new Date(),
                    encounters: 1,
                    resolved: false,
                };
                this.gaps.push(gap);
                detectedGaps.push(gap);
            }
        }

        // Detect unknown topics via question words
        const isQuestion = /\b(what|how|why|explain|describe)\b/i.test(userMessage);
        if (isQuestion && domain && confidence < 0.6) {
            const existing = this.gaps.find(g => g.domain === domain && !g.resolved);
            if (!existing) {
                const gap: KnowledgeGap = {
                    id: `gap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    domain,
                    description: `User asking about ${domain} — need deeper knowledge`,
                    detectedAt: new Date(),
                    encounters: 1,
                    resolved: false,
                };
                this.gaps.push(gap);
                detectedGaps.push(gap);
            }
        }

        // Enforce max gaps — drop oldest resolved or least-encountered
        if (this.gaps.length > MAX_GAPS) {
            this.gaps.sort((a, b) => {
                // Resolved first, then by encounters (ascending)
                if (a.resolved !== b.resolved) return a.resolved ? -1 : 1;
                return a.encounters - b.encounters;
            });
            this.gaps = this.gaps.slice(-MAX_GAPS);
        }

        return detectedGaps;
    }

    /**
     * Mark a gap as resolved after successful interaction.
     */
    resolveGap(domain: string): void {
        for (const gap of this.gaps) {
            if (gap.domain === domain && !gap.resolved) {
                gap.resolved = true;
                gap.resolvedAt = new Date();
            }
        }
    }

    /**
     * Record exploration outcome (success/failure in a domain).
     */
    recordExploration(domain: string, success: boolean): void {
        const record = this.explorationHistory.get(domain) ?? {
            domain,
            successCount: 0,
            failureCount: 0,
            lastExplored: new Date(),
        };

        if (success) {
            record.successCount++;
        } else {
            record.failureCount++;
        }
        record.lastExplored = new Date();

        this.explorationHistory.set(domain, record);

        // Resolve gaps if enough successes
        if (record.successCount >= 3) {
            this.resolveGap(domain);
        }
    }

    /**
     * Get curiosity signals — what should the agent be curious about right now?
     */
    getCuriositySignals(): CuriositySignal[] {
        const now = Date.now();
        const signals: CuriositySignal[] = [];

        for (const gap of this.gaps) {
            if (gap.resolved) continue;

            // Compute curiosity intensity based on encounters and recency
            const hoursSinceDetected = (now - gap.detectedAt.getTime()) / (1000 * 60 * 60);
            const decayFactor = Math.exp(-hoursSinceDetected / CURIOSITY_DECAY_HOURS);
            const encounterBoost = Math.min(gap.encounters / 5, 1);
            const intensity = (0.5 + encounterBoost * 0.5) * decayFactor;

            if (intensity < 0.1) continue;  // Below threshold, not worth signaling

            // Determine suggested action
            let suggestedAction: CuriositySignal['suggestedAction'];
            if (gap.encounters >= 3) {
                suggestedAction = 'ask-clarification';
            } else if (gap.encounters >= 2) {
                suggestedAction = 'explore-topic';
            } else {
                suggestedAction = 'acknowledge-gap';
            }

            signals.push({
                domain: gap.domain,
                intensity,
                reason: gap.description,
                suggestedAction,
            });
        }

        // Sort by intensity descending, take top N
        return signals
            .sort((a, b) => b.intensity - a.intensity)
            .slice(0, MAX_SIGNALS);
    }

    /**
     * Get unresolved gaps.
     */
    getUnresolvedGaps(): KnowledgeGap[] {
        return this.gaps.filter(g => !g.resolved);
    }

    /**
     * Get all gaps.
     */
    getAllGaps(): KnowledgeGap[] {
        return [...this.gaps];
    }

    /**
     * Get exploration stats for a domain.
     */
    getExplorationStats(domain: string): ExplorationRecord | null {
        return this.explorationHistory.get(domain) ?? null;
    }

    /**
     * Generate a prompt section with curiosity-driven guidance.
     */
    toPromptSection(): string | null {
        const signals = this.getCuriositySignals();
        if (signals.length === 0) return null;

        const lines: string[] = ['## Curiosity & Knowledge Gaps'];

        for (const signal of signals.slice(0, 3)) {
            const actionText = {
                'ask-clarification': 'Consider asking clarifying questions',
                'explore-topic': 'Try to explore this topic more deeply',
                'suggest-resource': 'Suggest resources for deeper understanding',
                'acknowledge-gap': 'Acknowledge uncertainty and be transparent',
            }[signal.suggestedAction];

            lines.push(`- **${signal.domain}** (curiosity: ${(signal.intensity * 100).toFixed(0)}%): ${actionText}`);
        }

        const unresolvedCount = this.getUnresolvedGaps().length;
        if (unresolvedCount > 3) {
            lines.push(`*${unresolvedCount} knowledge gaps tracked — prioritize learning in weak areas.*`);
        }

        return lines.length > 1 ? lines.join('\n') : null;
    }
}
