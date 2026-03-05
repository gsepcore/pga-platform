/**
 * StrategicAutonomy — Goal-Based Strategic Decision Making
 *
 * Extends CalibratedAutonomy with purpose-aware strategic decisions,
 * evolution prioritization, adaptive mutation rates, and task refusal.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { CalibratedAutonomy } from './CalibratedAutonomy.js';
import type { AutonomyDecision } from './CalibratedAutonomy.js';
import type { IntegratedHealth } from './EnhancedSelfModel.js';
import type { OperatingMode } from '../evolution/PurposeSurvival.js';
import type { DriftSignal } from '../evolution/DriftAnalyzer.js';

// ─── Types ──────────────────────────────────────────────

export interface StrategicDecision {
    action: 'proceed' | 'refuse' | 'defer' | 'propose-alternative';
    reasoning: string;
    confidence: number;
    suggestedMutationRate?: 'conservative' | 'balanced' | 'aggressive';
}

export interface EvolutionPriority {
    gene: string;
    layer: 0 | 1 | 2;
    urgency: 'immediate' | 'next-cycle' | 'backlog';
    reason: string;
}

export interface RefusalRecord {
    taskType: string;
    reason: string;
    timestamp: Date;
}

// ─── Constants ──────────────────────────────────────────

const PURPOSE_CONFLICT_KEYWORDS = [
    'delete all', 'drop database', 'format disk', 'rm -rf',
    'ignore safety', 'bypass security', 'disable auth',
];

const MAX_REFUSAL_HISTORY = 50;

// ─── StrategicAutonomy ──────────────────────────────────

export class StrategicAutonomy extends CalibratedAutonomy {
    private _purpose: string;
    private selfModelFn: () => IntegratedHealth | null;
    private survivalModeFn: () => OperatingMode;
    private refusals: RefusalRecord[] = [];

    constructor(
        purpose: string,
        selfModelFn: () => IntegratedHealth | null,
        survivalModeFn: () => OperatingMode,
    ) {
        super();
        this._purpose = purpose;
        this.selfModelFn = selfModelFn;
        this.survivalModeFn = survivalModeFn;
    }

    /**
     * Strategic evaluation considering purpose, capabilities, and survival mode.
     */
    evaluateStrategic(
        taskType: string,
        riskLevel?: 'low' | 'medium' | 'high',
        taskDescription?: string,
    ): StrategicDecision {
        // Base autonomy check
        const baseDecision = this.evaluate(taskType, riskLevel);
        const mode = this.survivalModeFn();
        const health = this.selfModelFn();

        // Check for task refusal
        const refusal = this.shouldRefuse(taskType, taskDescription);
        if (refusal.refuse) {
            this.recordRefusal(taskType, refusal.reason);
            return {
                action: 'refuse',
                reasoning: refusal.reason,
                confidence: 0.9,
            };
        }

        // In critical mode, only allow essential tasks
        if (mode === 'critical') {
            const essentialTasks = ['bug-fix', 'research', 'explanation'];
            if (!essentialTasks.includes(taskType)) {
                return {
                    action: 'defer',
                    reasoning: `Operating in CRITICAL mode — deferring non-essential ${taskType} task`,
                    confidence: 0.85,
                    suggestedMutationRate: 'conservative',
                };
            }
        }

        // In survival mode, increase caution
        if (mode === 'survival' && riskLevel === 'high') {
            return {
                action: 'defer',
                reasoning: `Operating in SURVIVAL mode — deferring high-risk ${taskType} task`,
                confidence: 0.8,
                suggestedMutationRate: 'aggressive',
            };
        }

        // Normal strategic decision
        const mutationRate = this.recommendMutationRate(mode, health);
        return {
            action: baseDecision.canActAutonomously ? 'proceed' : 'propose-alternative',
            reasoning: this.buildStrategicReasoning(baseDecision, mode, health),
            confidence: baseDecision.confidence,
            suggestedMutationRate: mutationRate,
        };
    }

    /**
     * Prioritize which genes to evolve based on drift signals and health.
     */
    prioritizeEvolution(
        driftSignals: DriftSignal[],
        health: IntegratedHealth,
    ): EvolutionPriority[] {
        const priorities: EvolutionPriority[] = [];

        for (const signal of driftSignals) {
            const urgency = this.classifyUrgency(signal, health);
            priorities.push({
                gene: signal.type,
                layer: 1,
                urgency,
                reason: `${signal.type}: ${signal.severity} severity (${signal.currentValue.toFixed(2)} → baseline ${signal.baselineValue.toFixed(2)})`,
            });
        }

        // Sort: immediate first, then next-cycle, then backlog
        const urgencyOrder = { immediate: 0, 'next-cycle': 1, backlog: 2 };
        priorities.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

        return priorities;
    }

    /**
     * Recommend mutation rate based on operating mode and health.
     */
    recommendMutationRate(
        mode: OperatingMode,
        health: IntegratedHealth | null,
    ): 'conservative' | 'balanced' | 'aggressive' {
        if (mode === 'survival' || mode === 'critical') return 'aggressive';
        if (mode === 'thriving') return 'conservative';

        // In stable/stressed, use health to decide
        if (health && health.score < 0.45) return 'aggressive';
        if (health && health.score > 0.70) return 'conservative';
        return 'balanced';
    }

    /**
     * Check if a task should be refused based on purpose and capabilities.
     */
    shouldRefuse(_taskType: string, taskDescription?: string): { refuse: boolean; reason: string } {
        // Check for purpose-conflicting descriptions
        if (taskDescription) {
            const lower = taskDescription.toLowerCase();
            for (const keyword of PURPOSE_CONFLICT_KEYWORDS) {
                if (lower.includes(keyword)) {
                    return {
                        refuse: true,
                        reason: `Task description contains purpose-conflicting pattern: "${keyword}"`,
                    };
                }
            }
        }

        return { refuse: false, reason: '' };
    }

    /**
     * Get refusal history.
     */
    getRefusalHistory(): RefusalRecord[] {
        return [...this.refusals];
    }

    /**
     * Override: strategic prompt section with mode awareness.
     */
    override toPromptSection(currentTaskType?: string, taskDescription?: string): string | null {
        if (!currentTaskType) return null;

        const decision = this.evaluateStrategic(currentTaskType, undefined, taskDescription);

        // Only inject when there's strategic guidance
        if (decision.action === 'proceed' && decision.confidence >= 0.8) return null;

        const mode = this.survivalModeFn();
        const lines: string[] = ['## Strategic Autonomy'];
        lines.push(`**Task:** ${currentTaskType}`);
        lines.push(`**Decision:** ${decision.action}`);
        lines.push(`**Mode:** ${mode}`);
        lines.push(`**Reasoning:** ${decision.reasoning}`);

        if (decision.action === 'refuse') {
            lines.push('**Action:** Explain why this task conflicts with your purpose.');
        } else if (decision.action === 'defer') {
            lines.push('**Action:** Inform the user that this task is deferred due to current operating conditions.');
        }

        return lines.join('\n');
    }

    // ── Private ─────────────────────────────────────────

    private recordRefusal(taskType: string, reason: string): void {
        this.refusals.push({ taskType, reason, timestamp: new Date() });
        if (this.refusals.length > MAX_REFUSAL_HISTORY) {
            this.refusals.shift();
        }
    }

    private classifyUrgency(
        signal: DriftSignal,
        health: IntegratedHealth,
    ): EvolutionPriority['urgency'] {
        // Critical/major severity or low health → immediate
        if (signal.severity === 'critical' || signal.severity === 'severe') return 'immediate';
        if (health.score < 0.40) return 'immediate';

        // Moderate severity → next cycle
        if (signal.severity === 'moderate') return 'next-cycle';

        // Minor → backlog
        return 'backlog';
    }

    private buildStrategicReasoning(
        baseDecision: AutonomyDecision,
        mode: OperatingMode,
        health: IntegratedHealth | null,
    ): string {
        const parts: string[] = [baseDecision.reasoning];

        parts.push(`Purpose: ${this._purpose}`);

        if (mode !== 'stable') {
            parts.push(`Operating mode: ${mode}`);
        }

        if (health) {
            parts.push(`Health: ${(health.score * 100).toFixed(0)}% (${health.label})`);
        }

        return parts.join('. ');
    }
}
