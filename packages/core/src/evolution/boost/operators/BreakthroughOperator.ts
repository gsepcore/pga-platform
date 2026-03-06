/**
 * Breakthrough Operator — Emergency Gene Redesign
 *
 * Complete gene rewrite for critical situations: severe drift,
 * purpose misalignment, or health collapse.
 *
 * Uses ALL available intelligence data to generate an entirely new
 * gene from scratch. This is the "last resort" operator — it only
 * activates when other operators have failed to address the problem.
 *
 * Activation gating:
 * - estimateImprovement() returns near-zero in normal conditions
 * - Only returns high estimates when drift is severe/critical OR health < 0.4
 * - This ensures MutationEngine only selects this operator when truly needed
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 3.0.0 — Intelligence-Fed Evolution
 */

import type {
    GenomeV2,
    OperativeGene,
    MutationType,
    MutationRecord,
    GeneCategory,
    FitnessVector,
} from '../../../types/GenomeV2.js';

import type {
    IMutationOperator,
    MutationContext,
    MutationResult,
} from '../../MutationOperator.js';

import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';
import { generateText } from '../utils/llmHelper.js';
import { estimateTokenCount } from '../../../utils/tokens.js';

// ─── Evidence types ─────────────────────────────────────────

interface DriftSignalEvidence {
    type: string;
    severity: string;
    currentValue?: number;
    baselineValue?: number;
}

interface HealthEvidence {
    score: number;
    label: string;
    fitnessComponent: number;
    driftComponent: number;
    purposeComponent: number;
    trajectoryComponent: number;
}

interface CapabilityEvidence {
    taskType: string;
    gene: string;
    performanceScore: number;
    trend: string;
}

interface PatternEvidence {
    type: string;
    description: string;
    confidence: number;
    prediction?: string;
}

interface TrajectoryEvidence {
    gene: string;
    trend: string;
    projectedFitness: number;
}

/**
 * Breakthrough Operator
 *
 * Emergency gene redesign that only activates in critical situations.
 * Uses comprehensive intelligence data for maximum-impact gene rewriting.
 */
export class BreakthroughOperator implements IMutationOperator {
    name: MutationType = 'breakthrough';
    description = 'Emergency gene redesign using comprehensive intelligence data';
    targetChromosome: 'c1' = 'c1';

    constructor(private llm: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Target specific gene if provided, otherwise first C1 gene
        const targetGene = context.targetGene
            ?? mutant.chromosomes.c1.operations[0];

        if (!targetGene) {
            return this.createFailure(context, 'No target gene for breakthrough');
        }

        const geneIndex = mutant.chromosomes.c1.operations.findIndex(
            g => g.id === targetGene.id || g.category === targetGene.category,
        );

        if (geneIndex === -1) {
            return this.createFailure(context, `Gene ${targetGene.category} not found`);
        }

        // Phase 1: Deep analysis
        const analysis = await this.analyzeWithIntelligence(targetGene, context);

        // Phase 2: Generate breakthrough redesign
        const redesignedContent = await this.generateBreakthroughContent(targetGene, analysis, context);

        // Update gene
        const defaultFitness: FitnessVector = {
            quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5,
            latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
            composite: 0.5, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
        };

        mutant.chromosomes.c1.operations[geneIndex] = {
            id: targetGene.id,
            category: targetGene.category as GeneCategory,
            content: redesignedContent,
            fitness: targetGene.fitness ?? defaultFitness,
            origin: 'mutation',
            usageCount: targetGene.usageCount ?? 0,
            lastUsed: new Date(),
            successRate: targetGene.successRate ?? 0.5,
            tokenCount: estimateTokenCount(redesignedContent),
            version: (targetGene.version ?? 0) + 1,
            lastModified: new Date(),
            mutationHistory: [
                ...(targetGene.mutationHistory || []),
                {
                    operation: this.name,
                    timestamp: new Date(),
                    reason: `Breakthrough redesign: ${analysis.summary}`,
                },
            ],
        };

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: targetGene.content,
            after: redesignedContent,
            diff: `Breakthrough: ${analysis.summary}`,
            trigger: 'drift-detected',
            reason: context.reason,
            sandboxTested: false,
            promoted: false,
            proposer: 'system',
        };

        return {
            success: true,
            mutant,
            mutation,
            description: `Breakthrough redesign of ${targetGene.category}: ${analysis.summary}`,
            expectedImprovement: this.estimateImprovement(context),
        };
    }

    /**
     * Activation gating: only returns high estimates in critical situations.
     * In normal conditions, returns 0.02 so MutationEngine never selects this.
     */
    estimateImprovement(context: MutationContext): number {
        const evidence = context.evidence ?? {};

        // Check for severe/critical drift
        const driftSignals = (evidence.driftSignals ?? []) as DriftSignalEvidence[];
        const hasCriticalDrift = driftSignals.some(
            s => s.severity === 'critical' || s.severity === 'severe',
        );

        // Check for low health
        const health = evidence.health as HealthEvidence | undefined;
        const hasLowHealth = health ? health.score < 0.4 : false;

        // Check for very low genome fitness
        const hasLowFitness = context.genome.fitness.composite < 0.35;

        // ACTIVATION GATE: only high estimate when truly needed
        if (!hasCriticalDrift && !hasLowHealth && !hasLowFitness) {
            return 0.02; // Near-zero: never selected in normal conditions
        }

        // Scale with severity
        let estimate = 0.30; // Base when activated

        if (hasCriticalDrift) {
            const criticalCount = driftSignals.filter(s => s.severity === 'critical').length;
            estimate += criticalCount * 0.10;
        }

        if (hasLowHealth && health) {
            estimate += (0.4 - health.score) * 0.5;
        }

        if (hasLowFitness) {
            estimate += (0.35 - context.genome.fitness.composite) * 0.3;
        }

        return Math.min(0.60, estimate);
    }

    /**
     * Deep analysis using ALL available intelligence data
     */
    private async analyzeWithIntelligence(
        _gene: OperativeGene,
        context: MutationContext,
    ): Promise<{ summary: string; analysisText: string }> {
        const evidence = context.evidence ?? {};
        const sections: string[] = [];

        // Drift signals
        const driftSignals = (evidence.driftSignals ?? []) as DriftSignalEvidence[];
        if (driftSignals.length > 0) {
            sections.push('ACTIVE DRIFT SIGNALS:');
            for (const s of driftSignals) {
                sections.push(`  - ${s.type}: ${s.severity} (${s.baselineValue?.toFixed(2) ?? '?'} → ${s.currentValue?.toFixed(2) ?? '?'})`);
            }
        }

        // Health
        const health = evidence.health as HealthEvidence | undefined;
        if (health) {
            sections.push(`AGENT HEALTH: ${(health.score * 100).toFixed(0)}% (${health.label})`);
            sections.push(`  fitness: ${(health.fitnessComponent * 100).toFixed(0)}%, drift: ${(health.driftComponent * 100).toFixed(0)}%, purpose: ${(health.purposeComponent * 100).toFixed(0)}%, trajectory: ${(health.trajectoryComponent * 100).toFixed(0)}%`);
        }

        // Capabilities
        const capabilities = (evidence.capabilities ?? []) as CapabilityEvidence[];
        if (capabilities.length > 0) {
            sections.push('DECLINING CAPABILITIES:');
            for (const c of capabilities.slice(0, 5)) {
                sections.push(`  - ${c.taskType} × ${c.gene}: ${(c.performanceScore * 100).toFixed(0)}% (${c.trend})`);
            }
        }

        // Trajectories
        const trajectories = (evidence.trajectories ?? []) as TrajectoryEvidence[];
        if (trajectories.length > 0) {
            sections.push('DECLINING TRAJECTORIES:');
            for (const t of trajectories.slice(0, 3)) {
                sections.push(`  - ${t.gene}: projected → ${(t.projectedFitness * 100).toFixed(0)}%`);
            }
        }

        // Patterns
        const patterns = (evidence.patterns ?? []) as PatternEvidence[];
        if (patterns.length > 0) {
            sections.push('LEARNED PATTERNS:');
            for (const p of patterns.slice(0, 5)) {
                sections.push(`  - [${p.type}] ${p.description} (${(p.confidence * 100).toFixed(0)}% conf)`);
            }
        }

        // Purpose
        const purpose = evidence.purpose as string | undefined;
        if (purpose) {
            sections.push(`AGENT PURPOSE: ${purpose}`);
        }

        const analysisText = sections.join('\n');
        const summary = this.buildSummary(driftSignals, health, capabilities);

        return { summary, analysisText };
    }

    /**
     * Generate breakthrough content using comprehensive intelligence
     */
    private async generateBreakthroughContent(
        gene: OperativeGene,
        analysis: { summary: string; analysisText: string },
        context: MutationContext,
    ): Promise<string> {
        const prompt = `You are a visionary AI agent architect. This agent is in CRITICAL condition and needs an EMERGENCY REDESIGN of one of its core genes.

CURRENT GENE (category: ${gene.category}):
\`\`\`
${gene.content}
\`\`\`

CURRENT PERFORMANCE:
- Quality: ${(context.genome.fitness.quality * 100).toFixed(1)}%
- Success Rate: ${(context.genome.fitness.successRate * 100).toFixed(1)}%
- Token Efficiency: ${(context.genome.fitness.tokenEfficiency * 100).toFixed(1)}%
- Intervention Rate: ${(context.genome.fitness.interventionRate * 100).toFixed(1)}%

COMPREHENSIVE INTELLIGENCE DATA:
${analysis.analysisText}

CRISIS SUMMARY: ${analysis.summary}

TASK: Completely redesign this gene from scratch. This is NOT an incremental improvement — this is an emergency redesign to save the agent from further decline.

BREAKTHROUGH GUIDELINES:
1. Think fundamentally about what this gene should do given the intelligence data
2. Address ALL identified issues (drift, declining capabilities, health problems)
3. Incorporate learned patterns into the new design
4. Align with the agent's declared purpose
5. Be bold and innovative — conventional approaches haven't worked
6. Optimize for LLM comprehension with clear, specific, actionable instructions
7. Include concrete strategies, not vague guidelines
8. Keep focused on category: ${gene.category}

Return ONLY the redesigned gene content. No explanations, no headers.

BREAKTHROUGH REDESIGN:`;

        try {
            const response = await generateText(this.llm, {
                prompt,
                temperature: 0.7, // Maximum creativity for breakthrough
                maxTokens: 2000,
            });
            return response.content.trim();
        } catch {
            return gene.content;
        }
    }

    private buildSummary(
        driftSignals: DriftSignalEvidence[],
        health: HealthEvidence | undefined,
        capabilities: CapabilityEvidence[],
    ): string {
        const parts: string[] = [];

        if (driftSignals.length > 0) {
            const worst = driftSignals.sort((a, b) => {
                const rank = (s: string) => s === 'critical' ? 3 : s === 'severe' ? 2 : s === 'moderate' ? 1 : 0;
                return rank(b.severity) - rank(a.severity);
            })[0];
            parts.push(`${worst.type} (${worst.severity})`);
        }

        if (health && health.score < 0.4) {
            parts.push(`health ${(health.score * 100).toFixed(0)}%`);
        }

        if (capabilities.length > 0) {
            parts.push(`${capabilities.length} declining capabilities`);
        }

        return parts.length > 0 ? parts.join(', ') : 'emergency redesign triggered';
    }

    private createFailure(context: MutationContext, reason: string): MutationResult {
        return {
            success: false,
            mutant: context.genome,
            mutation: {
                id: this.generateId(),
                timestamp: new Date(),
                chromosome: 'c1',
                operation: this.name,
                before: '', after: '', diff: '',
                trigger: 'drift-detected',
                reason,
                sandboxTested: false,
                promoted: false,
                proposer: 'system',
            },
            description: reason,
            expectedImprovement: 0,
        };
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_breakthrough_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
