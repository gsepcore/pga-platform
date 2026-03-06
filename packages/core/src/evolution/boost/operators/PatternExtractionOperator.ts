/**
 * Pattern Extraction Operator — Crystallize Learned Behaviors into Genes
 *
 * Extracts behavioral patterns that the agent has learned from interactions
 * (via PatternMemory) and crystallizes them INTO gene content using LLM.
 *
 * This transforms implicit behavioral knowledge (task sequences, error
 * recovery patterns, tool preferences) into explicit gene instructions.
 *
 * Primary source: PatternMemory data (from MutationContext.evidence)
 * Fallback source: GeneBank (if available and no patterns found)
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
import type { GeneBank } from '../../../gene-bank/GeneBank.js';
import { generateText } from '../utils/llmHelper.js';
import { estimateTokenCount } from '../../../utils/tokens.js';

// ─── Evidence types ─────────────────────────────────────────

interface PatternEvidence {
    id: string;
    type: string; // 'task-sequence' | 'error-recovery' | 'tool-preference'
    description: string;
    frequency: number;
    confidence: number;
    prediction?: string;
}

interface PredictionEvidence {
    prediction: string;
    confidence: number;
}

/**
 * Pattern Extraction Operator
 *
 * Converts learned behavioral patterns into explicit gene instructions.
 * Uses PatternMemory data as primary source, GeneBank as fallback.
 */
export class PatternExtractionOperator implements IMutationOperator {
    name: MutationType = 'pattern_extraction';
    description = 'Crystallize learned behavioral patterns into gene content';
    targetChromosome: 'c1' = 'c1';

    constructor(
        private llm: LLMAdapter,
        private geneBank?: GeneBank,
    ) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const evidence = context.evidence ?? {};
        const patterns = (evidence.patterns ?? []) as PatternEvidence[];
        const predictions = (evidence.predictions ?? []) as PredictionEvidence[];

        // Need patterns to extract from
        if (patterns.length === 0 && !this.geneBank) {
            return this.createFailure(context, 'No behavioral patterns available and no GeneBank fallback');
        }

        const mutant = this.deepClone(context.genome);

        // Target specific gene if provided, otherwise first C1 gene
        const targetGene = context.targetGene
            ?? mutant.chromosomes.c1.operations[0];

        if (!targetGene) {
            return this.createFailure(context, 'No target gene found for pattern extraction');
        }

        const geneIndex = mutant.chromosomes.c1.operations.findIndex(
            g => g.id === targetGene.id || g.category === targetGene.category,
        );

        if (geneIndex === -1) {
            return this.createFailure(context, `Gene ${targetGene.category} not found`);
        }

        let enhancedContent: string;

        if (patterns.length > 0) {
            // Primary path: use PatternMemory data
            enhancedContent = await this.extractFromPatterns(targetGene, patterns, predictions, context);
        } else if (this.geneBank) {
            // Fallback: use GeneBank
            enhancedContent = await this.extractFromGeneBank(targetGene, context);
        } else {
            return this.createFailure(context, 'No patterns or GeneBank available');
        }

        // Update gene
        mutant.chromosomes.c1.operations[geneIndex] = {
            ...targetGene,
            content: enhancedContent,
            tokenCount: estimateTokenCount(enhancedContent),
            version: (targetGene.version ?? 0) + 1,
            lastModified: new Date(),
            origin: 'mutation',
            mutationHistory: [
                ...(targetGene.mutationHistory || []),
                {
                    operation: this.name,
                    timestamp: new Date(),
                    reason: `Extracted ${patterns.length} behavioral patterns`,
                },
            ],
        };

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: targetGene.content,
            after: enhancedContent,
            diff: `Pattern extraction: ${patterns.length} patterns crystallized into ${targetGene.category}`,
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
            description: `Crystallized ${patterns.length} behavioral patterns into ${targetGene.category}`,
            expectedImprovement: this.estimateImprovement(context),
        };
    }

    estimateImprovement(context: MutationContext): number {
        const evidence = context.evidence ?? {};
        const patterns = (evidence.patterns ?? []) as PatternEvidence[];

        if (patterns.length === 0) {
            return this.geneBank ? 0.08 : 0.02; // Low estimate without patterns
        }

        // Scale with pattern count and confidence
        const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
        const patternBonus = Math.min(patterns.length * 0.04, 0.20); // Up to 0.20 from pattern count
        const confidenceBonus = avgConfidence * 0.15; // Up to 0.15 from confidence

        return Math.min(0.40, 0.05 + patternBonus + confidenceBonus);
    }

    /**
     * Extract patterns from PatternMemory data and crystallize into gene content
     */
    private async extractFromPatterns(
        gene: OperativeGene,
        patterns: PatternEvidence[],
        predictions: PredictionEvidence[],
        context: MutationContext,
    ): Promise<string> {
        const patternsText = patterns.map((p, i) => {
            let text = `${i + 1}. [${p.type}] ${p.description} (confidence: ${(p.confidence * 100).toFixed(0)}%, seen ${p.frequency}x)`;
            if (p.prediction) text += `\n   → Prediction: ${p.prediction}`;
            return text;
        }).join('\n');

        const predictionsText = predictions.length > 0
            ? predictions.map(p => `- ${p.prediction} (${(p.confidence * 100).toFixed(0)}% confidence)`).join('\n')
            : 'None available';

        const purpose = (context.evidence?.purpose as string) ?? 'general-purpose AI assistant';

        const prompt = `You are an expert AI agent prompt engineer. Your task is to ENHANCE an agent instruction by incorporating learned behavioral patterns from real user interactions.

CURRENT INSTRUCTION (category: ${gene.category}):
\`\`\`
${gene.content}
\`\`\`

LEARNED BEHAVIORAL PATTERNS (from real interactions):
${patternsText}

NEXT-ACTION PREDICTIONS:
${predictionsText}

AGENT PURPOSE: ${purpose}

TASK: Rewrite the instruction to incorporate these learned patterns. The enhanced instruction should:

1. CODIFY successful patterns as explicit strategies (e.g., "When users ask for X, always include Y")
2. ADD proactive behaviors based on predictions (e.g., "Anticipate follow-up questions about Z")
3. INCLUDE error-recovery strategies from learned error patterns
4. OPTIMIZE tool usage based on tool-preference patterns
5. PRESERVE the core functionality of the original instruction
6. Keep the instruction focused on category: ${gene.category}

Return ONLY the enhanced instruction content. No explanations.

ENHANCED INSTRUCTION:`;

        try {
            const response = await generateText(this.llm, {
                prompt,
                temperature: 0.4, // Precision-focused
                maxTokens: 1500,
            });
            return response.content.trim();
        } catch {
            return gene.content; // Return original on failure
        }
    }

    /**
     * Fallback: extract from GeneBank when no PatternMemory data
     */
    private async extractFromGeneBank(
        gene: OperativeGene,
        _context: MutationContext,
    ): Promise<string> {
        if (!this.geneBank) return gene.content;

        try {
            const candidates = await this.geneBank.searchGenes({
                type: [this.categoryToType(gene.category)],
                minFitness: 0.75,
                sortBy: 'fitness',
                sortOrder: 'desc',
                limit: 3,
            });

            if (candidates.length === 0) return gene.content;

            const patternsText = candidates.map((c, i) =>
                `${i + 1}. (fitness: ${(c.fitness.overallFitness * 100).toFixed(0)}%): ${c.content.instruction}`,
            ).join('\n\n');

            const prompt = `You are an expert AI agent prompt engineer. Enhance this instruction by integrating techniques from high-performing agents.

CURRENT INSTRUCTION (${gene.category}):
\`\`\`
${gene.content}
\`\`\`

HIGH-PERFORMING PATTERNS FROM OTHER AGENTS:
${patternsText}

Rewrite the instruction to incorporate the best techniques. Return ONLY the enhanced content.

ENHANCED INSTRUCTION:`;

            const response = await generateText(this.llm, {
                prompt,
                temperature: 0.4,
                maxTokens: 1500,
            });
            return response.content.trim();
        } catch {
            return gene.content;
        }
    }

    private categoryToType(category: string): string {
        const mapping: Record<string, string> = {
            'tool-usage': 'tool-usage-pattern',
            'coding-patterns': 'reasoning-pattern',
            'reasoning': 'reasoning-pattern',
            'communication': 'communication-pattern',
            'error-handling': 'error-recovery-pattern',
            'data-processing': 'performance-optimization',
        };
        return mapping[category] || 'reasoning-pattern';
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
        return `mut_pattern_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
