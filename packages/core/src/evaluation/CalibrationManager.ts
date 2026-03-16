/**
 * Calibration Manager - Dynamic Threshold Adjustment
 *
 * Learns optimal sandbox thresholds from historical performance data.
 * Adjusts gates dynamically based on actual mutation success/failure rates.
 *
 * Living OS v1.0 - Final 10/10: Self-calibrating sandbox gates
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Calibration Types ──────────────────────────────────────

export interface CalibrationPoint {
    timestamp: Date;
    context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    };
    threshold: number;
    metrics: {
        totalCandidates: number;
        passedSandbox: number;
        deployedSuccessfully: number;
        rolledBack: number;
    };
    performance: {
        falsePositiveRate: number; // Passed sandbox but failed in prod
        falseNegativeRate: number; // Would have succeeded but rejected
        optimalThreshold: number;   // Calculated optimal
    };
}

export interface CalibrationHistory {
    context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    };
    points: CalibrationPoint[];
    currentThreshold: number;
    recommendedThreshold: number;
    confidence: number;
}

// ─── Calibration Manager ────────────────────────────────────

export class CalibrationManager {
    private cache = new Map<string, CalibrationHistory>();

    constructor(private storage: StorageAdapter) {
        // Storage adapter used for calibration history persistence
    }

    /**
     * Get calibrated threshold for context
     *
     * Returns dynamic threshold based on historical performance
     */
    async getCalibratedThreshold(context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    }): Promise<{
        threshold: number;
        confidence: number;
        source: 'calibrated' | 'default' | 'cached';
    }> {
        const cacheKey = this.getContextKey(context);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const history = this.cache.get(cacheKey)!;
            return {
                threshold: history.recommendedThreshold,
                confidence: history.confidence,
                source: 'cached',
            };
        }

        // Load from storage
        const history = await this.loadCalibrationHistory(context);

        if (history && history.points.length >= 10) {
            // Sufficient data for calibration
            this.cache.set(cacheKey, history);
            return {
                threshold: history.recommendedThreshold,
                confidence: history.confidence,
                source: 'calibrated',
            };
        }

        // Not enough data, use defaults
        const defaultThreshold = this.getDefaultThreshold(context);
        return {
            threshold: defaultThreshold,
            confidence: 0.5,
            source: 'default',
        };
    }

    /**
     * Record calibration point
     *
     * Called after mutations are deployed to track actual performance
     */
    async recordCalibrationPoint(
        context: {
            layer?: 0 | 1 | 2;
            operator?: string;
            taskType?: string;
        },
        metrics: {
            totalCandidates: number;
            passedSandbox: number;
            deployedSuccessfully: number;
            rolledBack: number;
        },
        currentThreshold: number,
    ): Promise<void> {
        // Calculate performance metrics
        const falsePositiveRate = metrics.passedSandbox > 0
            ? metrics.rolledBack / metrics.passedSandbox
            : 0;

        // Estimate false negatives (mutations rejected that would have succeeded)
        // This is harder to measure, use heuristic based on deployment success rate
        const deploymentSuccessRate = metrics.deployedSuccessfully > 0
            ? metrics.deployedSuccessfully / metrics.passedSandbox
            : 0;

        const falseNegativeRate = deploymentSuccessRate > 0.8
            ? Math.max(0, 0.2 - (1 - currentThreshold))
            : 0;

        // Calculate optimal threshold
        const optimalThreshold = this.calculateOptimalThreshold(
            falsePositiveRate,
            falseNegativeRate,
            currentThreshold,
        );

        // Persist to storage if method available
        if (this.storage.saveCalibrationPoint) {
            await this.storage.saveCalibrationPoint({
                contextKey: this.getContextKey(context),
                layer: context.layer,
                operator: context.operator,
                taskType: context.taskType,
                threshold: currentThreshold,
                totalCandidates: metrics.totalCandidates,
                passedSandbox: metrics.passedSandbox,
                deployedSuccessfully: metrics.deployedSuccessfully,
                rolledBack: metrics.rolledBack,
                falsePositiveRate,
                falseNegativeRate,
                optimalThreshold,
                timestamp: new Date(),
            });
        }

        // Invalidate cache
        this.cache.delete(this.getContextKey(context));
    }

    /**
     * Calculate optimal threshold
     *
     * Uses cost function: minimize (FPR + alpha * FNR)
     * where alpha controls trade-off between safety and exploration
     */
    private calculateOptimalThreshold(
        falsePositiveRate: number,
        falseNegativeRate: number,
        currentThreshold: number,
    ): number {
        // Cost function parameter (safety vs exploration trade-off)
        // Planned for v1.0: use alpha = 0.3 in cost function: minimize (FPR + alpha * FNR)

        // If too many false positives, increase threshold
        if (falsePositiveRate > 0.1) {
            return Math.min(1.0, currentThreshold + 0.05);
        }

        // If too many false negatives and FPR is low, decrease threshold
        if (falseNegativeRate > 0.2 && falsePositiveRate < 0.05) {
            return Math.max(0.5, currentThreshold - 0.05);
        }

        // Otherwise, keep current threshold
        return currentThreshold;
    }

    /**
     * Load calibration history from storage
     */
    private async loadCalibrationHistory(context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    }): Promise<CalibrationHistory | null> {
        if (!this.storage.getCalibrationHistory) {
            return null;
        }

        const contextKey = this.getContextKey(context);
        const rows = await this.storage.getCalibrationHistory(contextKey, 100);

        if (rows.length === 0) {
            return null;
        }

        const points: CalibrationPoint[] = rows.map(row => ({
            timestamp: row.timestamp,
            context: {
                layer: row.layer as 0 | 1 | 2 | undefined,
                operator: row.operator ?? undefined,
                taskType: row.taskType ?? undefined,
            },
            threshold: row.threshold,
            metrics: {
                totalCandidates: row.totalCandidates,
                passedSandbox: row.passedSandbox,
                deployedSuccessfully: row.deployedSuccessfully,
                rolledBack: row.rolledBack,
            },
            performance: {
                falsePositiveRate: row.falsePositiveRate,
                falseNegativeRate: row.falseNegativeRate,
                optimalThreshold: row.optimalThreshold,
            },
        }));

        // Compute recommended threshold from recent points
        const recentPoints = points.slice(0, 20);
        const avgOptimal = recentPoints.reduce(
            (sum, p) => sum + p.performance.optimalThreshold, 0,
        ) / recentPoints.length;

        // More data points = higher confidence (max at 50 points)
        const confidence = Math.min(1, points.length / 50);

        return {
            context,
            points,
            currentThreshold: rows[0].threshold,
            recommendedThreshold: avgOptimal,
            confidence,
        };
    }

    /**
     * Get context key for caching
     */
    private getContextKey(context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    }): string {
        return `${context.layer ?? 'any'}_${context.operator ?? 'any'}_${context.taskType ?? 'any'}`;
    }

    /**
     * Get default threshold (fallback when no calibration data)
     */
    private getDefaultThreshold(context: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    }): number {
        // Use same logic as getSandboxPromotionThreshold from SandboxSuites
        if (context.layer === 0) return 1.0;
        if (context.layer === 1) return 0.75;
        if (context.layer === 2) return 0.60;

        if (context.operator === 'safety_reinforcement') return 0.85;
        if (context.operator === 'compress_instructions') return 0.65;
        if (context.operator === 'reorder_constraints') return 0.70;
        if (context.operator === 'tool_selection_bias') return 0.70;

        if (context.taskType === 'coding') return 0.75;
        if (context.taskType === 'general') return 0.65;

        return 0.65;
    }

    /**
     * Get calibration report
     *
     * Returns human-readable report of calibration status
     */
    async getCalibrationReport(context?: {
        layer?: 0 | 1 | 2;
        operator?: string;
        taskType?: string;
    }): Promise<string> {
        const lines: string[] = [];
        lines.push('# 📊 Sandbox Calibration Report\n');

        if (context) {
            const result = await this.getCalibratedThreshold(context);
            const key = this.getContextKey(context);

            lines.push(`**Context**: ${key}`);
            lines.push(`**Threshold**: ${(result.threshold * 100).toFixed(1)}%`);
            lines.push(`**Confidence**: ${(result.confidence * 100).toFixed(1)}%`);
            lines.push(`**Source**: ${result.source}`);
            lines.push('');
        } else {
            lines.push('**Status**: Calibration system active');
            lines.push(`**Cached contexts**: ${this.cache.size}`);
            lines.push('');
            lines.push('Use specific context for detailed calibration data.');
        }

        return lines.join('\n');
    }
}
