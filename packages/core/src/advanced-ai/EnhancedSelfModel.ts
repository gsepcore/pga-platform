/**
 * EnhancedSelfModel — Purpose-Aware Agent Self-Understanding
 *
 * Extends SelfModel with purpose awareness, capability tracking,
 * evolution trajectory analysis, and integrated health scoring.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { SelfModel } from './SelfModel.js';
import type { Genome } from '../types/index.js';
import type { DriftAnalyzer } from '../evolution/DriftAnalyzer.js';

// ─── Types ──────────────────────────────────────────────

export interface PurposeAlignment {
    purpose: string;
    alignmentScore: number;
    driftFromPurpose: string[];
}

export interface CapabilityEntry {
    taskType: string;
    gene: string;
    performanceScore: number;
    sampleCount: number;
    trend: 'improving' | 'stable' | 'declining';
    lastUpdated: Date;
}

export interface HardLimit {
    description: string;
    category: 'architectural' | 'knowledge' | 'ethical';
}

export interface EvolutionTrajectory {
    gene: string;
    fitnessHistory: Array<{ score: number; timestamp: Date }>;
    trend: 'improving' | 'stable' | 'declining';
    projectedFitness: number;
}

export interface IntegratedHealth {
    score: number;
    fitnessComponent: number;
    driftComponent: number;
    purposeComponent: number;
    trajectoryComponent: number;
    label: 'thriving' | 'stable' | 'stressed' | 'struggling' | 'critical';
}

// ─── Constants ──────────────────────────────────────────

const MAX_CAPABILITY_HISTORY = 100;
const MAX_FITNESS_SNAPSHOTS = 20;
const TREND_WINDOW = 5;

const HARD_LIMITS: HardLimit[] = [
    { description: 'Cannot execute arbitrary system commands', category: 'architectural' },
    { description: 'Cannot access external databases directly', category: 'architectural' },
    { description: 'Cannot modify immutable C0 layer', category: 'ethical' },
    { description: 'Knowledge limited to training data and context', category: 'knowledge' },
];

// ─── EnhancedSelfModel ─────────────────────────────────

export class EnhancedSelfModel extends SelfModel {
    public readonly purpose: string;
    private capabilities: Map<string, CapabilityEntry> = new Map();
    private fitnessSnapshots: Map<string, Array<{ score: number; timestamp: Date }>> = new Map();

    constructor(
        genome: Genome,
        driftAnalyzer: DriftAnalyzer,
        purpose: string,
    ) {
        super(genome, driftAnalyzer);
        this.purpose = purpose;
    }

    /**
     * Full assessment with purpose alignment, capabilities, and trajectory.
     */
    assessFull(): IntegratedHealth {
        // 1. Fitness component: average fitness of active alleles
        const activeAlleles = [
            ...this.genome.layers.layer1.filter(a => a.status === 'active'),
            ...this.genome.layers.layer2.filter(a => a.status === 'active'),
        ];
        const fitnessComponent = activeAlleles.length > 0
            ? activeAlleles.reduce((sum, a) => sum + a.fitness, 0) / activeAlleles.length
            : 0.5;

        // 2. Drift component: inverted (1.0 = no drift, 0.0 = severe drift)
        const drift = this.driftAnalyzer.analyzeDrift();
        let driftComponent = 1.0;
        if (drift.isDrifting) {
            const severityScore = (s: string) =>
                s === 'critical' ? 0.0 : s === 'major' ? 0.2 : s === 'moderate' ? 0.5 : 0.8;
            const worstSeverity = Math.min(...drift.signals.map(s => severityScore(s.severity)));
            driftComponent = worstSeverity;
        }

        // 3. Purpose component: alignment with declared purpose
        const purposeAlignment = this.assessPurposeAlignment();
        const purposeComponent = purposeAlignment.alignmentScore;

        // 4. Trajectory component: aggregate trend of all genes
        const trajectories = this.getTrajectories();
        let trajectoryComponent = 0.5;
        if (trajectories.length > 0) {
            const trendScores = trajectories.map(t =>
                t.trend === 'improving' ? 0.8 : t.trend === 'stable' ? 0.5 : 0.2
            );
            trajectoryComponent = trendScores.reduce((s, v) => s + v, 0) / trendScores.length;
        }

        // Weighted composite
        const score =
            fitnessComponent * 0.35 +
            driftComponent * 0.25 +
            purposeComponent * 0.20 +
            trajectoryComponent * 0.20;

        const label: IntegratedHealth['label'] =
            score >= 0.75 ? 'thriving' :
            score >= 0.55 ? 'stable' :
            score >= 0.40 ? 'stressed' :
            score >= 0.25 ? 'struggling' : 'critical';

        return {
            score,
            fitnessComponent,
            driftComponent,
            purposeComponent,
            trajectoryComponent,
            label,
        };
    }

    /**
     * Record performance for a task type × gene combination.
     */
    recordCapability(taskType: string, gene: string, score: number): void {
        const key = `${taskType}:${gene}`;
        const existing = this.capabilities.get(key);

        if (existing) {
            // Running average
            const newScore = (existing.performanceScore * existing.sampleCount + score) / (existing.sampleCount + 1);
            const prevScore = existing.performanceScore;

            existing.performanceScore = newScore;
            existing.sampleCount++;
            existing.lastUpdated = new Date();
            existing.trend = this.computeTrend(prevScore, newScore, existing.sampleCount);
        } else {
            this.capabilities.set(key, {
                taskType,
                gene,
                performanceScore: score,
                sampleCount: 1,
                trend: 'stable',
                lastUpdated: new Date(),
            });
        }

        // Evict oldest if too many
        if (this.capabilities.size > MAX_CAPABILITY_HISTORY) {
            const oldest = [...this.capabilities.entries()]
                .sort((a, b) => a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime())[0];
            if (oldest) this.capabilities.delete(oldest[0]);
        }
    }

    /**
     * Get all tracked capabilities.
     */
    getCapabilities(): CapabilityEntry[] {
        return Array.from(this.capabilities.values());
    }

    /**
     * Assess how well current behavior aligns with declared purpose.
     */
    assessPurposeAlignment(): PurposeAlignment {
        const purposeWords = this.purpose.toLowerCase().split(/\s+/);
        const driftFromPurpose: string[] = [];

        // Check if active genes are aligned with purpose keywords
        const activeGenes = this.genome.layers.layer1
            .filter(a => a.status === 'active')
            .map(a => a.gene);

        // Simple alignment: genes that don't seem related to purpose
        let alignedCount = 0;
        for (const gene of activeGenes) {
            const geneWords = gene.toLowerCase().split(/[-_\s]+/);
            const isAligned = geneWords.some(gw =>
                purposeWords.some(pw => pw.includes(gw) || gw.includes(pw))
            );
            if (isAligned) {
                alignedCount++;
            } else {
                // Not necessarily a drift — agent can have auxiliary genes
            }
        }

        // Check for low-fitness genes that are purpose-critical
        const weakGenes = this.genome.layers.layer1
            .filter(a => a.status === 'active' && a.fitness < 0.4);
        for (const weak of weakGenes) {
            driftFromPurpose.push(`${weak.gene} fitness low (${weak.fitness.toFixed(2)})`);
        }

        // Alignment score: base 0.7 + up to 0.3 from no weak genes
        const weaknessPenalty = Math.min(0.3, weakGenes.length * 0.1);
        const alignmentScore = Math.max(0, 0.7 + 0.3 - weaknessPenalty);

        return {
            purpose: this.purpose,
            alignmentScore: Math.min(1, alignmentScore),
            driftFromPurpose,
        };
    }

    /**
     * Get known hard limits of this agent.
     */
    getHardLimits(): HardLimit[] {
        return [...HARD_LIMITS];
    }

    /**
     * Record a fitness snapshot for trajectory analysis.
     */
    recordFitnessSnapshot(): void {
        const activeAlleles = this.genome.layers.layer1.filter(a => a.status === 'active');
        const now = new Date();

        for (const allele of activeAlleles) {
            if (!this.fitnessSnapshots.has(allele.gene)) {
                this.fitnessSnapshots.set(allele.gene, []);
            }
            const history = this.fitnessSnapshots.get(allele.gene)!;
            history.push({ score: allele.fitness, timestamp: now });

            // Keep only recent snapshots
            if (history.length > MAX_FITNESS_SNAPSHOTS) {
                history.splice(0, history.length - MAX_FITNESS_SNAPSHOTS);
            }
        }
    }

    /**
     * Get evolution trajectories per gene.
     */
    getTrajectories(): EvolutionTrajectory[] {
        const trajectories: EvolutionTrajectory[] = [];

        for (const [gene, history] of this.fitnessSnapshots) {
            if (history.length < 2) continue;

            const recent = history.slice(-TREND_WINDOW);
            const first = recent[0].score;
            const last = recent[recent.length - 1].score;
            const diff = last - first;

            const trend: EvolutionTrajectory['trend'] =
                diff > 0.05 ? 'improving' :
                diff < -0.05 ? 'declining' : 'stable';

            // Simple linear projection
            const projectedFitness = Math.max(0, Math.min(1, last + diff * 0.5));

            trajectories.push({
                gene,
                fitnessHistory: [...history],
                trend,
                projectedFitness,
            });
        }

        return trajectories;
    }

    /**
     * Override: enhanced prompt section with purpose awareness.
     */
    override toPromptSection(): string | null {
        const health = this.assessFull();
        const baseSection = super.toPromptSection();

        // Always generate section when enhanced model is active
        const lines: string[] = ['## Self-Awareness'];

        // Purpose
        lines.push(`**Purpose:** ${this.purpose}`);
        lines.push(`**Health:** ${health.label} (${(health.score * 100).toFixed(0)}%)`);

        // Include base assessment content if present
        if (baseSection) {
            const baseLines = baseSection.split('\n').filter(l => !l.startsWith('## '));
            lines.push(...baseLines);
        }

        // Trajectories
        const trajectories = this.getTrajectories();
        const declining = trajectories.filter(t => t.trend === 'declining');
        const improving = trajectories.filter(t => t.trend === 'improving');

        if (improving.length > 0) {
            lines.push(`**Improving:** ${improving.map(t => t.gene).join(', ')}`);
        }
        if (declining.length > 0) {
            lines.push(`**Declining:** ${declining.map(t => `${t.gene} (→${t.projectedFitness.toFixed(2)})`).join(', ')}`);
        }

        return lines.join('\n');
    }

    // ── Private ─────────────────────────────────────────

    private computeTrend(prevScore: number, newScore: number, sampleCount: number): CapabilityEntry['trend'] {
        if (sampleCount < 3) return 'stable';
        const diff = newScore - prevScore;
        if (diff > 0.03) return 'improving';
        if (diff < -0.03) return 'declining';
        return 'stable';
    }
}
