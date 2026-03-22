/**
 * Semantic Restructuring Operator — Intelligence-Driven Gene Rewriting
 *
 * Uses LLM + intelligence data (capabilities, trajectories, drift signals,
 * behavioral patterns) to intelligently rewrite gene content for better
 * performance in areas where the agent is struggling.
 *
 * This is NOT a mechanical transformation — it generates genuinely NEW
 * content informed by what the agent has learned about its own performance.
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
} from '../../../types/GenomeV2.js';

import type {
    IMutationOperator,
    MutationContext,
    MutationResult,
} from '../../MutationOperator.js';

import type { LLMAdapter } from '../../../interfaces/LLMAdapter.js';
import { generateText } from '../utils/llmHelper.js';
import { estimateTokenCount } from '../../../utils/tokens.js';

// ─── Evidence types (from MutationContext.evidence) ─────────

interface DriftSignalEvidence {
    type: string;
    severity: string;
    currentValue?: number;
    baselineValue?: number;
}

interface CapabilityEvidence {
    taskType: string;
    gene: string;
    performanceScore: number;
    trend: string;
}

interface TrajectoryEvidence {
    gene: string;
    trend: string;
    projectedFitness: number;
}

interface HealthEvidence {
    score: number;
    label: string;
    fitnessComponent: number;
    driftComponent: number;
    purposeComponent: number;
    trajectoryComponent: number;
}

/**
 * Semantic Restructuring Operator
 *
 * Intelligence-driven gene rewriting that uses LLM to generate NEW content
 * based on performance data, capability gaps, and behavioral patterns.
 */
export class SemanticRestructuringOperator implements IMutationOperator {
    name: MutationType = 'semantic_restructuring';
    description = 'Intelligence-driven gene rewriting using LLM + performance data';
    targetChromosome = 'c1' as const;

    constructor(private llm: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // Target specific gene if provided, otherwise first C1 gene
        const targetGene = context.targetGene
            ?? mutant.chromosomes.c1.operations[0];

        if (!targetGene) {
            return this.createFailure(context, 'No target gene found for restructuring');
        }

        // Find the gene in the mutant to modify
        const geneIndex = mutant.chromosomes.c1.operations.findIndex(
            g => g.id === targetGene.id || g.category === targetGene.category,
        );

        if (geneIndex === -1) {
            return this.createFailure(context, `Gene ${targetGene.category} not found in genome`);
        }

        // Build intelligence-enriched prompt
        const prompt = this.buildIntelligentPrompt(targetGene, context);

        let restructuredContent: string;
        try {
            const response = await generateText(this.llm, {
                prompt,
                temperature: 0.5, // Balanced: creative enough for new content, controlled enough for quality
                maxTokens: 1500,
            });
            restructuredContent = response.content.trim();
        } catch {
            // Fallback to simple heuristic restructuring
            restructuredContent = this.performSimpleRestructuring(targetGene.content);
        }

        // Update the specific gene
        mutant.chromosomes.c1.operations[geneIndex] = {
            ...targetGene,
            content: restructuredContent,
            tokenCount: estimateTokenCount(restructuredContent),
            version: (targetGene.version ?? 0) + 1,
            lastModified: new Date(),
            origin: 'mutation',
            mutationHistory: [
                ...(targetGene.mutationHistory || []),
                {
                    operation: this.name,
                    timestamp: new Date(),
                    reason: `Intelligence-driven restructuring: ${context.reason}`,
                },
            ],
        };

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: targetGene.content,
            after: restructuredContent,
            diff: `Restructured ${targetGene.category}: ${targetGene.content.length} → ${restructuredContent.length} chars`,
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
            description: `Intelligence-driven restructuring of ${targetGene.category}`,
            expectedImprovement: this.estimateImprovement(context),
        };
    }

    estimateImprovement(context: MutationContext): number {
        const evidence = context.evidence ?? {};

        // Base: low estimate that scales with need
        let estimate = 0.08;

        // Boost based on drift severity
        const driftSignals = (evidence.driftSignals ?? []) as DriftSignalEvidence[];
        for (const signal of driftSignals) {
            if (signal.severity === 'critical') estimate += 0.20;
            else if (signal.severity === 'severe') estimate += 0.15;
            else if (signal.severity === 'moderate') estimate += 0.08;
            else estimate += 0.03;
        }

        // Boost based on health score (worse health = more room for improvement)
        const health = evidence.health as HealthEvidence | undefined;
        if (health) {
            estimate += (1 - health.score) * 0.15;
        }

        // Boost based on declining capabilities for target gene
        const capabilities = (evidence.capabilities ?? []) as CapabilityEvidence[];
        const targetCategory = context.targetGene?.category;
        if (targetCategory) {
            const declining = capabilities.filter(
                c => c.gene === targetCategory && c.trend === 'declining',
            );
            estimate += declining.length * 0.05;
        }

        return Math.min(0.50, estimate); // Cap at 50%
    }

    /**
     * Build LLM prompt enriched with intelligence data
     */
    private buildIntelligentPrompt(gene: OperativeGene, context: MutationContext): string {
        const evidence = context.evidence ?? {};
        const sections: string[] = [];

        // Core instruction
        sections.push(`You are an expert AI agent prompt engineer. Your task is to REWRITE this agent instruction to be more effective based on real performance data.

CURRENT INSTRUCTION (category: ${gene.category}):
\`\`\`
${gene.content}
\`\`\``);

        // Current performance metrics
        sections.push(`CURRENT PERFORMANCE:
- Quality: ${(context.genome.fitness.quality * 100).toFixed(1)}%
- Success Rate: ${(context.genome.fitness.successRate * 100).toFixed(1)}%
- Token Efficiency: ${(context.genome.fitness.tokenEfficiency * 100).toFixed(1)}%
- Intervention Rate: ${(context.genome.fitness.interventionRate * 100).toFixed(1)}%`);

        // Drift signals
        const driftSignals = (evidence.driftSignals ?? []) as DriftSignalEvidence[];
        if (driftSignals.length > 0) {
            const driftText = driftSignals.map(s =>
                `- ${s.type} (${s.severity}): ${s.baselineValue?.toFixed(2) ?? '?'} → ${s.currentValue?.toFixed(2) ?? '?'}`,
            ).join('\n');
            sections.push(`ACTIVE DRIFT SIGNALS (performance declining in these areas):
${driftText}`);
        }

        // Declining capabilities
        const capabilities = (evidence.capabilities ?? []) as CapabilityEvidence[];
        if (capabilities.length > 0) {
            const capText = capabilities.slice(0, 5).map(c =>
                `- ${c.taskType} × ${c.gene}: score ${(c.performanceScore * 100).toFixed(0)}% (${c.trend})`,
            ).join('\n');
            sections.push(`DECLINING CAPABILITIES (task×gene combinations struggling):
${capText}`);
        }

        // Fitness trajectories
        const trajectories = (evidence.trajectories ?? []) as TrajectoryEvidence[];
        if (trajectories.length > 0) {
            const trajText = trajectories.slice(0, 3).map(t =>
                `- ${t.gene}: ${t.trend}, projected fitness → ${(t.projectedFitness * 100).toFixed(0)}%`,
            ).join('\n');
            sections.push(`FITNESS TRAJECTORIES (genes getting worse):
${trajText}`);
        }

        // Purpose
        const purpose = evidence.purpose as string | undefined;
        if (purpose) {
            sections.push(`AGENT PURPOSE: ${purpose}`);
        }

        // Mutation rate guidance
        const mutationRate = evidence.mutationRate as string | undefined;
        if (mutationRate === 'aggressive') {
            sections.push('GUIDANCE: Be bold — significant changes are encouraged. The agent needs substantial improvement.');
        } else if (mutationRate === 'conservative') {
            sections.push('GUIDANCE: Be careful — make targeted improvements without disrupting what works.');
        }

        // Instructions
        sections.push(`REWRITE OBJECTIVES:
1. Address the specific performance issues identified above
2. Make the instruction CRYSTAL CLEAR with no ambiguity
3. Add specific strategies for the declining areas
4. Optimize for LLM comprehension and reliable execution
5. Keep the instruction focused on its category (${gene.category})
6. Preserve any existing strengths

Return ONLY the rewritten instruction content. No explanations, no markdown headers.

REWRITTEN INSTRUCTION:`);

        return sections.join('\n\n');
    }

    private performSimpleRestructuring(content: string): string {
        let restructured = content.trim();
        restructured = restructured.replace(/\s+/g, ' ');
        restructured = restructured.replace(/(^|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
        return restructured;
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
        return `mut_semantic_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
