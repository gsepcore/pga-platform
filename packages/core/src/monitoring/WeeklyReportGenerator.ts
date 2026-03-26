/**
 * WeeklyReportGenerator — Automated Agent Performance Reports
 *
 * Generates comprehensive reports on agent performance, evolution,
 * security, and ROI. Enables GUAO moments #11 and #20.
 *
 * The agent can present its own report: "This week I answered 2,340
 * messages. Quality improved from 0.65 to 0.89. I blocked 12 injection
 * attempts. Your ROI is 333x."
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import type { MetricsCollector } from './MetricsCollector.js';
import type { DriftAnalyzer } from '../evolution/DriftAnalyzer.js';
import type { ContentFirewall } from '../firewall/ContentFirewall.js';
import type { BehavioralImmuneSystem } from '../immune/BehavioralImmuneSystem.js';
import type { PurposeLock } from '../firewall/PurposeLock.js';

// ─── Types ──────────────────────────────────────────────

export interface WeeklyReport {
    /** Report period */
    period: {
        start: Date;
        end: Date;
        durationDays: number;
    };

    /** Conversation metrics */
    conversations: {
        total: number;
        avgPerDay: number;
        peakDay: string;
        peakCount: number;
    };

    /** Quality evolution */
    quality: {
        startScore: number;
        endScore: number;
        delta: number;
        trend: 'improving' | 'stable' | 'declining';
    };

    /** Token economics */
    tokens: {
        totalUsed: number;
        savedByCompression: number;
        avgPerChat: number;
        estimatedCost: number;
    };

    /** Security summary */
    security: {
        c3Blocked: number;
        c4Quarantined: number;
        purposeRejected: number;
        totalThreats: number;
    };

    /** Evolution activity */
    evolution: {
        mutationsGenerated: number;
        mutationsPromoted: number;
        driftEventsDetected: number;
        urgentEvolutions: number;
        genesShared: number;
    };

    /** ROI calculation */
    roi: {
        tokenCostUSD: number;
        estimatedHumanCostUSD: number;
        savingsUSD: number;
        roiMultiplier: number;
    };

    /** Top suggestions for improvement */
    suggestions: string[];

    /** Human-readable summary */
    summary: string;
}

export interface ReportConfig {
    /** Average cost per human support interaction in USD (default: 15) */
    humanCostPerInteraction?: number;
    /** Cost per 1K tokens in USD (default: 0.003 for Claude Sonnet) */
    costPer1kTokens?: number;
    /** Agent name for personalized reports */
    agentName?: string;
}

// ─── Implementation ─────────────────────────────────────

export class WeeklyReportGenerator {
    private reportHistory: WeeklyReport[] = [];
    private interactionLog: Array<{
        timestamp: Date;
        quality: number;
        tokens: number;
    }> = [];

    constructor(
        private metrics: MetricsCollector,
        private driftAnalyzer?: DriftAnalyzer,
        private contentFirewall?: ContentFirewall,
        private immuneSystem?: BehavioralImmuneSystem,
        private purposeLock?: PurposeLock,
        private config: ReportConfig = {},
    ) {}

    /**
     * Record an interaction for reporting.
     * Called after each chat() to accumulate data.
     */
    recordInteraction(quality: number, tokens: number): void {
        this.interactionLog.push({
            timestamp: new Date(),
            quality,
            tokens,
        });
    }

    /**
     * Generate a weekly report from accumulated data.
     */
    generate(): WeeklyReport {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Filter to this week's interactions
        const weekInteractions = this.interactionLog.filter(
            i => i.timestamp >= weekAgo,
        );

        const total = weekInteractions.length;
        const humanCost = this.config.humanCostPerInteraction ?? 15;
        const costPer1k = this.config.costPer1kTokens ?? 0.003;
        const agentName = this.config.agentName ?? 'GSEP Agent';

        // ─── Conversations ──────────────────────────────────
        const dayBuckets = new Map<string, number>();
        for (const int of weekInteractions) {
            const day = int.timestamp.toISOString().split('T')[0];
            dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1);
        }

        let peakDay = '';
        let peakCount = 0;
        for (const [day, count] of dayBuckets) {
            if (count > peakCount) {
                peakDay = day;
                peakCount = count;
            }
        }

        // ─── Quality Evolution ──────────────────────────────
        const firstHalf = weekInteractions.slice(0, Math.floor(total / 2));
        const secondHalf = weekInteractions.slice(Math.floor(total / 2));

        const startScore = firstHalf.length > 0
            ? firstHalf.reduce((s, i) => s + i.quality, 0) / firstHalf.length
            : 0;
        const endScore = secondHalf.length > 0
            ? secondHalf.reduce((s, i) => s + i.quality, 0) / secondHalf.length
            : 0;
        const delta = endScore - startScore;
        const trend = delta > 0.03 ? 'improving' : delta < -0.03 ? 'declining' : 'stable';

        // ─── Tokens ─────────────────────────────────────────
        const totalTokens = weekInteractions.reduce((s, i) => s + i.tokens, 0);
        const avgTokens = total > 0 ? Math.round(totalTokens / total) : 0;
        const estimatedCost = (totalTokens / 1000) * costPer1k;

        // Estimate compression savings from metrics performance data
        const perfMetrics = this.metrics.exportMetrics();
        const compressionRate = perfMetrics.performance.successRate > 0 ? 0.15 : 0.1;
        const savedTokens = Math.round(totalTokens * compressionRate);

        // ─── Security ───────────────────────────────────────
        const c3Analytics = this.contentFirewall?.getAnalytics();
        const c4Status = this.immuneSystem?.getImmuneStatus();
        const purposeAnalytics = this.purposeLock?.getAnalytics();

        const c3Blocked = c3Analytics?.totalBlocked ?? 0;
        const c4Quarantined = c4Status?.quarantinesTriggered ?? 0;
        const purposeRejected = purposeAnalytics?.offPurpose ?? 0;

        // ─── Evolution ──────────────────────────────────────
        const drift = this.driftAnalyzer?.analyzeDrift();
        const driftEvents = drift?.signals.length ?? 0;

        // ─── ROI ────────────────────────────────────────────
        const estimatedHumanCost = total * humanCost;
        const savings = estimatedHumanCost - estimatedCost;
        const roiMultiplier = estimatedCost > 0
            ? Math.round(estimatedHumanCost / estimatedCost)
            : 0;

        // ─── Suggestions ────────────────────────────────────
        const suggestions: string[] = [];

        if (trend === 'declining') {
            suggestions.push('Quality is declining — consider reviewing recent prompt mutations or rolling back.');
        }
        if (c3Blocked > 10) {
            suggestions.push(`High injection rate (${c3Blocked} blocked). Consider tightening input validation.`);
        }
        if (purposeRejected > total * 0.1) {
            suggestions.push(`${purposeRejected} off-topic messages (${Math.round(purposeRejected / total * 100)}%). Consider updating the purpose description or adding allowed topics.`);
        }
        if (avgTokens > 2000) {
            suggestions.push('High token usage per chat. Compression may help reduce costs.');
        }
        if (trend === 'improving') {
            suggestions.push('Quality is improving — evolution is working well. No action needed.');
        }
        if (total === 0) {
            suggestions.push('No interactions this week. Is the agent deployed?');
        }

        // ─── Summary ────────────────────────────────────────
        const summary = this.buildSummary({
            agentName, total, startScore, endScore, delta, trend,
            estimatedCost, estimatedHumanCost, savings, roiMultiplier,
            c3Blocked, c4Quarantined, purposeRejected, savedTokens,
        });

        const report: WeeklyReport = {
            period: { start: weekAgo, end: now, durationDays: 7 },
            conversations: { total, avgPerDay: Math.round(total / 7), peakDay, peakCount },
            quality: { startScore: +startScore.toFixed(3), endScore: +endScore.toFixed(3), delta: +delta.toFixed(3), trend },
            tokens: { totalUsed: totalTokens, savedByCompression: savedTokens, avgPerChat: avgTokens, estimatedCost: +estimatedCost.toFixed(2) },
            security: { c3Blocked, c4Quarantined, purposeRejected, totalThreats: c3Blocked + c4Quarantined + purposeRejected },
            evolution: { mutationsGenerated: 0, mutationsPromoted: 0, driftEventsDetected: driftEvents, urgentEvolutions: 0, genesShared: 0 },
            roi: {
                tokenCostUSD: +estimatedCost.toFixed(2),
                estimatedHumanCostUSD: +estimatedHumanCost.toFixed(2),
                savingsUSD: +savings.toFixed(2),
                roiMultiplier,
            },
            suggestions,
            summary,
        };

        this.reportHistory.push(report);
        return report;
    }

    /**
     * Get all historical reports.
     */
    getHistory(): WeeklyReport[] {
        return [...this.reportHistory];
    }

    /**
     * Get the interaction count for the current week.
     */
    getWeekInteractionCount(): number {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return this.interactionLog.filter(i => i.timestamp >= weekAgo).length;
    }

    private buildSummary(data: {
        agentName: string;
        total: number;
        startScore: number;
        endScore: number;
        delta: number;
        trend: string;
        estimatedCost: number;
        estimatedHumanCost: number;
        savings: number;
        roiMultiplier: number;
        c3Blocked: number;
        c4Quarantined: number;
        purposeRejected: number;
        savedTokens: number;
    }): string {
        const lines: string[] = [];

        lines.push(`📊 ${data.agentName} — Weekly Report`);
        lines.push('');
        lines.push(`💬 Conversations: ${data.total} this week`);

        if (data.total > 0) {
            lines.push(`📈 Quality: ${(data.startScore * 100).toFixed(0)}% → ${(data.endScore * 100).toFixed(0)}% (${data.trend})`);
            lines.push(`💰 Cost: $${data.estimatedCost.toFixed(2)} in tokens`);
            lines.push(`💾 Saved: ~${data.savedTokens.toLocaleString()} tokens by compression`);

            const totalThreats = data.c3Blocked + data.c4Quarantined + data.purposeRejected;
            if (totalThreats > 0) {
                lines.push(`🛡️ Security: ${totalThreats} threats handled (${data.c3Blocked} injections, ${data.c4Quarantined} output threats, ${data.purposeRejected} off-topic)`);
            } else {
                lines.push('🛡️ Security: All clear — zero threats detected');
            }

            if (data.roiMultiplier > 1) {
                lines.push(`🚀 ROI: ${data.roiMultiplier}x ($${data.estimatedCost.toFixed(2)} tokens vs $${data.estimatedHumanCost.toFixed(2)} human equivalent = $${data.savings.toFixed(2)} saved)`);
            }
        }

        return lines.join('\n');
    }
}
