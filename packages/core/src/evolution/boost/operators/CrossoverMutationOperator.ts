/**
 * Crossover Mutation Operator — Intra-Genome Gene Fusion
 *
 * Takes high-fitness genes from the SAME genome and fuses their
 * successful techniques into a struggling target gene using LLM.
 *
 * Unlike biological crossover which requires two parents, this
 * operator does intra-genome crossover: it identifies what makes
 * other genes in the same agent successful, then transfers those
 * techniques to the gene that's underperforming.
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

// ─── Evidence types ─────────────────────────────────────────

interface CapabilityEvidence {
    taskType: string;
    gene: string;
    performanceScore: number;
    trend: string;
}

/**
 * Crossover Mutation Operator
 *
 * Intra-genome crossover: fuses successful techniques from high-fitness
 * genes into struggling genes, guided by LLM intelligence.
 */
export class CrossoverMutationOperator implements IMutationOperator {
    name: MutationType = 'crossover_mutation';
    description = 'Intra-genome crossover: fuse successful gene techniques into struggling genes';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);
        const allGenes = mutant.chromosomes.c1.operations;

        // Target specific gene if provided, otherwise find weakest gene
        const targetGene = context.targetGene
            ?? this.findWeakestGene(allGenes);

        if (!targetGene) {
            return this.createFailure(context, 'No target gene for crossover');
        }

        const geneIndex = allGenes.findIndex(
            g => g.id === targetGene.id || g.category === targetGene.category,
        );

        if (geneIndex === -1) {
            return this.createFailure(context, `Gene ${targetGene.category} not found`);
        }

        // Find donor genes (higher fitness than target)
        const donors = this.findDonorGenes(allGenes, targetGene);

        if (donors.length === 0) {
            return this.createFailure(context, 'No higher-fitness donor genes available for crossover');
        }

        // Fuse donor techniques into target
        let fusedContent: string;

        if (this.llm) {
            fusedContent = await this.llmFusion(targetGene, donors, context);
        } else {
            fusedContent = this.mechanicalFusion(targetGene, donors);
        }

        // Update gene
        mutant.chromosomes.c1.operations[geneIndex] = {
            ...targetGene,
            content: fusedContent,
            tokenCount: estimateTokenCount(fusedContent),
            version: (targetGene.version ?? 0) + 1,
            lastModified: new Date(),
            origin: 'mutation',
            mutationHistory: [
                ...(targetGene.mutationHistory || []),
                {
                    operation: this.name,
                    timestamp: new Date(),
                    reason: `Crossover from ${donors.length} donor genes: ${donors.map(d => d.category).join(', ')}`,
                },
            ],
        };

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: targetGene.content,
            after: fusedContent,
            diff: `Crossover: fused ${donors.length} donors into ${targetGene.category}`,
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
            description: `Fused techniques from ${donors.length} high-fitness genes into ${targetGene.category}`,
            expectedImprovement: this.estimateImprovement(context),
        };
    }

    estimateImprovement(context: MutationContext): number {
        const allGenes = context.genome.chromosomes.c1.operations;
        const target = context.targetGene ?? this.findWeakestGene(allGenes);

        if (!target || allGenes.length < 2) return 0.02;

        const donors = this.findDonorGenes(allGenes, target);
        if (donors.length === 0) return 0.02;

        // Estimate based on fitness gap between target and donors
        const targetFitness = target.fitness?.quality ?? target.successRate ?? 0.5;
        const avgDonorFitness = donors.reduce(
            (sum, d) => sum + (d.fitness?.quality ?? d.successRate ?? 0.5), 0,
        ) / donors.length;

        const gap = avgDonorFitness - targetFitness;
        return Math.min(0.35, Math.max(0.05, gap * 0.5));
    }

    /**
     * Find the weakest gene by composite fitness
     */
    private findWeakestGene(genes: OperativeGene[]): OperativeGene | undefined {
        if (genes.length === 0) return undefined;

        return genes.reduce((weakest, gene) => {
            const weakestFitness = weakest.fitness?.quality ?? weakest.successRate ?? 0.5;
            const geneFitness = gene.fitness?.quality ?? gene.successRate ?? 0.5;
            return geneFitness < weakestFitness ? gene : weakest;
        });
    }

    /**
     * Find donor genes with higher fitness than target
     */
    private findDonorGenes(allGenes: OperativeGene[], target: OperativeGene): OperativeGene[] {
        const targetFitness = target.fitness?.quality ?? target.successRate ?? 0.5;

        return allGenes
            .filter(g => g.id !== target.id && g.category !== target.category)
            .filter(g => {
                const fitness = g.fitness?.quality ?? g.successRate ?? 0.5;
                return fitness > targetFitness;
            })
            .sort((a, b) => {
                const fitnessA = a.fitness?.quality ?? a.successRate ?? 0.5;
                const fitnessB = b.fitness?.quality ?? b.successRate ?? 0.5;
                return fitnessB - fitnessA;
            })
            .slice(0, 3); // Top 3 donors
    }

    /**
     * LLM-powered intelligent fusion
     */
    private async llmFusion(
        target: OperativeGene,
        donors: OperativeGene[],
        context: MutationContext,
    ): Promise<string> {
        const donorsText = donors.map((d, i) => {
            const fitness = d.fitness?.quality ?? d.successRate ?? 0.5;
            return `Donor ${i + 1} (${d.category}, fitness: ${(fitness * 100).toFixed(0)}%):
\`\`\`
${d.content}
\`\`\``;
        }).join('\n\n');

        const targetFitness = target.fitness?.quality ?? target.successRate ?? 0.5;

        // Include capability data if available
        const capabilities = (context.evidence?.capabilities ?? []) as CapabilityEvidence[];
        const capText = capabilities.length > 0
            ? `\nDECLINING CAPABILITIES:\n${capabilities.slice(0, 5).map(c => `- ${c.taskType} × ${c.gene}: ${(c.performanceScore * 100).toFixed(0)}%`).join('\n')}`
            : '';

        const prompt = `You are an expert AI agent prompt engineer performing GENETIC CROSSOVER.

TARGET GENE (struggling, needs improvement):
Category: ${target.category}
Fitness: ${(targetFitness * 100).toFixed(0)}%
\`\`\`
${target.content}
\`\`\`

HIGH-PERFORMING DONOR GENES (from the same agent):
${donorsText}
${capText}

TASK: Cross-pollinate the target gene with successful techniques from the donors.

GUIDELINES:
1. IDENTIFY what makes each donor gene successful (clarity, structure, specificity, etc.)
2. TRANSFER those successful techniques to the target gene
3. ADAPT the techniques to fit the target gene's category (${target.category})
4. PRESERVE the target gene's core purpose
5. Don't copy donor content verbatim — extract and adapt the underlying patterns

Return ONLY the improved gene content. No explanations.

IMPROVED ${target.category.toUpperCase()} GENE:`;

        try {
            const response = await generateText(this.llm!, {
                prompt,
                temperature: 0.6, // Creative synthesis
                maxTokens: 1500,
            });
            return response.content.trim();
        } catch {
            return this.mechanicalFusion(target, donors);
        }
    }

    /**
     * Fallback: mechanical fusion without LLM
     */
    private mechanicalFusion(target: OperativeGene, donors: OperativeGene[]): string {
        const targetSentences = target.content.split(/[.!?]\s+/).filter(s => s.length > 10);
        const donorSentences: string[] = [];

        for (const donor of donors) {
            const sentences = donor.content.split(/[.!?]\s+/).filter(s => s.length > 10);
            for (const s of sentences) {
                const isDuplicate = targetSentences.some(ts => this.jaccard(ts, s) > 0.6);
                if (!isDuplicate && donorSentences.length < 3) {
                    donorSentences.push(s);
                }
            }
        }

        return [...targetSentences, ...donorSentences].join('. ') + '.';
    }

    private jaccard(s1: string, s2: string): number {
        const w1 = new Set(s1.toLowerCase().split(/\s+/));
        const w2 = new Set(s2.toLowerCase().split(/\s+/));
        const intersection = new Set([...w1].filter(w => w2.has(w)));
        const union = new Set([...w1, ...w2]);
        return union.size > 0 ? intersection.size / union.size : 0;
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
        return `mut_crossover_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
