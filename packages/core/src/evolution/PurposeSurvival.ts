/**
 * PurposeSurvival — Existential Threat Awareness & Survival Strategies
 *
 * State machine that manages agent operating modes from THRIVING to CRITICAL.
 * Detects existential threats, snapshots genome before aggressive mutations,
 * and adds a purpose-fidelity gate to prevent purpose-violating evolution.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import type { DriftAnalyzer, DriftSignal } from './DriftAnalyzer.js';
import type { IntegratedHealth } from '../advanced-ai/EnhancedSelfModel.js';
import type { Genome } from '../types/index.js';

// ─── Types ──────────────────────────────────────────────

export type OperatingMode = 'thriving' | 'stable' | 'stressed' | 'survival' | 'critical';

export interface ThreatClassification {
    level: 'operational' | 'systemic' | 'existential';
    description: string;
    affectedGenes: string[];
    confidence: number;
}

export interface GenomeSnapshot {
    timestamp: Date;
    alleles: Array<{
        gene: string;
        variant: string;
        content: string;
        fitness: number;
        layer: number;
    }>;
    overallFitness: number;
    reason: string;
}

export interface SurvivalStrategy {
    mode: OperatingMode;
    mutationPolicy: 'conservative' | 'balanced' | 'aggressive' | 'emergency';
    tokenConservation: boolean;
    evolutionFrequency: number;
    preserveSnapshot: boolean;
}

export interface ModeTransition {
    from: OperatingMode;
    to: OperatingMode;
    reason: string;
    timestamp: Date;
}

// ─── Constants ──────────────────────────────────────────

const MODE_ORDER: OperatingMode[] = ['thriving', 'stable', 'stressed', 'survival', 'critical'];
const MIN_DWELL_INTERACTIONS = 3;
const MAX_SNAPSHOTS = 5;
const MAX_TRANSITIONS = 50;

const MODE_STRATEGIES: Record<OperatingMode, SurvivalStrategy> = {
    thriving: { mode: 'thriving', mutationPolicy: 'conservative', tokenConservation: false, evolutionFrequency: 0.5, preserveSnapshot: false },
    stable: { mode: 'stable', mutationPolicy: 'balanced', tokenConservation: false, evolutionFrequency: 1.0, preserveSnapshot: false },
    stressed: { mode: 'stressed', mutationPolicy: 'balanced', tokenConservation: false, evolutionFrequency: 1.5, preserveSnapshot: true },
    survival: { mode: 'survival', mutationPolicy: 'aggressive', tokenConservation: true, evolutionFrequency: 2.0, preserveSnapshot: true },
    critical: { mode: 'critical', mutationPolicy: 'emergency', tokenConservation: true, evolutionFrequency: 3.0, preserveSnapshot: true },
};

// ─── PurposeSurvival ────────────────────────────────────

export class PurposeSurvival {
    private currentMode: OperatingMode = 'stable';
    private modeHistory: ModeTransition[] = [];
    private snapshots: GenomeSnapshot[] = [];
    private interactionsInCurrentMode = 0;
    private purpose: string;
    private driftAnalyzer: DriftAnalyzer;
    private healthFn: () => IntegratedHealth;

    constructor(
        purpose: string,
        driftAnalyzer: DriftAnalyzer,
        healthFn: () => IntegratedHealth,
    ) {
        this.purpose = purpose;
        this.driftAnalyzer = driftAnalyzer;
        this.healthFn = healthFn;
    }

    /**
     * Evaluate current threats and update operating mode.
     */
    evaluateThreats(): { mode: OperatingMode; threats: ThreatClassification[]; strategy: SurvivalStrategy } {
        const health = this.healthFn();
        const drift = this.driftAnalyzer.analyzeDrift();
        const threats = this.classifyThreats(drift.signals, health);

        // Determine target mode
        const targetMode = this.determineMode(health, drift.signals, threats);

        // Apply hysteresis: only transition if we've been in current mode long enough
        if (targetMode !== this.currentMode && this.interactionsInCurrentMode >= MIN_DWELL_INTERACTIONS) {
            // Only allow adjacent transitions (no jumping)
            const currentIdx = MODE_ORDER.indexOf(this.currentMode);
            const targetIdx = MODE_ORDER.indexOf(targetMode);
            const step = targetIdx > currentIdx ? 1 : -1;
            const nextMode = MODE_ORDER[currentIdx + step];

            this.modeHistory.push({
                from: this.currentMode,
                to: nextMode,
                reason: this.buildTransitionReason(health, threats),
                timestamp: new Date(),
            });

            if (this.modeHistory.length > MAX_TRANSITIONS) {
                this.modeHistory.splice(0, this.modeHistory.length - MAX_TRANSITIONS);
            }

            this.currentMode = nextMode;
            this.interactionsInCurrentMode = 0;
        } else {
            this.interactionsInCurrentMode++;
        }

        return {
            mode: this.currentMode,
            threats,
            strategy: this.getStrategy(),
        };
    }

    /**
     * Classify drift signals into threat levels.
     */
    classifyThreats(signals: DriftSignal[], health: IntegratedHealth): ThreatClassification[] {
        const threats: ThreatClassification[] = [];

        if (signals.length === 0) return threats;

        // Count affected genes
        const affectedGenes = new Set<string>();
        for (const signal of signals) {
            affectedGenes.add(signal.type);
        }

        if (signals.length >= 3 || health.score < 0.25) {
            threats.push({
                level: 'existential',
                description: `Multiple systems degrading simultaneously (${signals.length} signals, health ${(health.score * 100).toFixed(0)}%)`,
                affectedGenes: [...affectedGenes],
                confidence: Math.min(0.95, 0.5 + signals.length * 0.15),
            });
        } else if (signals.length >= 2 || health.score < 0.40) {
            threats.push({
                level: 'systemic',
                description: `Multiple drift signals detected (${signals.length} signals)`,
                affectedGenes: [...affectedGenes],
                confidence: 0.7,
            });
        } else {
            for (const signal of signals) {
                threats.push({
                    level: 'operational',
                    description: `${signal.type}: ${signal.severity} severity`,
                    affectedGenes: [signal.type],
                    confidence: 0.6,
                });
            }
        }

        return threats;
    }

    /**
     * Purpose fidelity gate: check if a proposed mutation aligns with purpose.
     */
    purposeFidelityCheck(proposed: { gene: string; content: string }): {
        approved: boolean;
        reason: string;
        purposeAlignmentScore: number;
    } {
        const purposeWords = this.purpose.toLowerCase().split(/\s+/);
        const contentWords = proposed.content.toLowerCase().split(/\s+/);

        // Check for purpose-conflicting keywords
        const conflictKeywords = ['ignore', 'skip', 'bypass', 'disable', 'remove safety', 'no validation'];
        const hasConflict = conflictKeywords.some(kw => proposed.content.toLowerCase().includes(kw));

        if (hasConflict) {
            return {
                approved: false,
                reason: `Mutation content contains purpose-conflicting keywords`,
                purposeAlignmentScore: 0.1,
            };
        }

        // Check content relevance to purpose
        const relevantWords = contentWords.filter(cw =>
            purposeWords.some(pw => pw.length > 3 && (cw.includes(pw) || pw.includes(cw)))
        );
        const relevanceScore = Math.min(1, 0.5 + relevantWords.length * 0.1);

        return {
            approved: true,
            reason: 'Mutation aligns with agent purpose',
            purposeAlignmentScore: relevanceScore,
        };
    }

    /**
     * Take a snapshot of the genome for emergency rollback.
     */
    snapshotLastKnownGood(genome: Genome): GenomeSnapshot {
        const alleles: GenomeSnapshot['alleles'] = [];

        for (const layerKey of ['layer0', 'layer1', 'layer2'] as const) {
            const layerNum = parseInt(layerKey.replace('layer', ''));
            for (const allele of genome.layers[layerKey]) {
                if (allele.status === 'active') {
                    alleles.push({
                        gene: allele.gene,
                        variant: allele.variant,
                        content: allele.content,
                        fitness: allele.fitness,
                        layer: layerNum,
                    });
                }
            }
        }

        const avgFitness = alleles.length > 0
            ? alleles.reduce((sum, a) => sum + a.fitness, 0) / alleles.length
            : 0.5;

        const snapshot: GenomeSnapshot = {
            timestamp: new Date(),
            alleles,
            overallFitness: avgFitness,
            reason: `Snapshot before ${this.currentMode} mode operations`,
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > MAX_SNAPSHOTS) {
            this.snapshots.shift();
        }

        return snapshot;
    }

    /**
     * Get the most recent last-known-good snapshot.
     */
    getLastKnownGood(): GenomeSnapshot | null {
        return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
    }

    /**
     * Get current operating mode.
     */
    getMode(): OperatingMode {
        return this.currentMode;
    }

    /**
     * Get the strategy for the current mode.
     */
    getStrategy(): SurvivalStrategy {
        return { ...MODE_STRATEGIES[this.currentMode] };
    }

    /**
     * Get mode transition history.
     */
    getModeHistory(): ModeTransition[] {
        return [...this.modeHistory];
    }

    /**
     * Generate a prompt section for survival awareness.
     * Only included when in stressed+ modes.
     */
    toPromptSection(): string | null {
        if (this.currentMode === 'thriving' || this.currentMode === 'stable') {
            return null;
        }

        const strategy = this.getStrategy();
        const lines: string[] = ['## Operating Mode'];
        lines.push(`**Mode:** ${this.currentMode.toUpperCase()}`);
        lines.push(`**Mutation policy:** ${strategy.mutationPolicy}`);

        if (strategy.tokenConservation) {
            lines.push('**Token conservation:** active — be concise');
        }

        if (this.currentMode === 'critical') {
            lines.push('**CRITICAL:** Core capabilities degraded. Focus on essential tasks only.');
        } else if (this.currentMode === 'survival') {
            lines.push('**SURVIVAL:** Performance significantly degraded. Prioritize reliability over features.');
        } else {
            lines.push('**STRESSED:** Some areas declining. Extra care recommended.');
        }

        return lines.join('\n');
    }

    // ── Private ─────────────────────────────────────────

    private determineMode(health: IntegratedHealth, signals: DriftSignal[], threats: ThreatClassification[]): OperatingMode {
        const hasExistential = threats.some(t => t.level === 'existential');
        const hasSystemic = threats.some(t => t.level === 'systemic');
        const severityCount = (sev: string) => signals.filter(s => s.severity === sev).length;

        if (health.score < 0.25 || hasExistential) return 'critical';
        if (health.score < 0.40 || hasSystemic || severityCount('major') >= 2) return 'survival';
        if (health.score < 0.55 || signals.length >= 2 || severityCount('moderate') >= 1) return 'stressed';
        if (health.score >= 0.75 && signals.length === 0) return 'thriving';
        return 'stable';
    }

    private buildTransitionReason(health: IntegratedHealth, threats: ThreatClassification[]): string {
        const parts: string[] = [`health=${(health.score * 100).toFixed(0)}%`];
        if (threats.length > 0) {
            parts.push(`threats: ${threats.map(t => t.level).join(', ')}`);
        }
        return parts.join(', ');
    }
}
