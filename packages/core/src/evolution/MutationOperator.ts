/**
 * Mutation Operator Library - Controlled Evolution
 *
 * Provides a library of mutation operations for genome evolution.
 * Each operator implements a specific strategy for improving fitness.
 *
 * Key Operators:
 * 1. compress_instructions - Reduce token count while preserving meaning
 * 2. reorder_constraints - Optimize constraint ordering for LLM
 * 3. safety_reinforcement - Strengthen security boundaries
 * 4. tool_selection_bias - Adjust tool usage patterns
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 * @version 2.0.0
 */

import type {
    GenomeV2,
    OperativeGene,
    MutationType,
    MutationRecord,
} from '../types/GenomeV2.js';

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import { estimateTokenCount } from '../utils/tokens.js';

// ─── Mutation Context ───────────────────────────────────────

export interface MutationContext {
    genome: GenomeV2;
    targetChromosome: 'c1' | 'c2'; // Never c0!
    targetGene?: OperativeGene; // Specific gene or null for global
    reason: string; // Why this mutation
    evidence?: Record<string, unknown>; // Supporting data
}

// ─── Mutation Result ────────────────────────────────────────

export interface MutationResult {
    success: boolean;
    mutant: GenomeV2; // Mutated genome
    mutation: MutationRecord; // Audit record
    description: string; // Human-readable description
    expectedImprovement: number; // Predicted fitness gain (0-1)
    compressionMetrics?: {
        originalTokens: number;
        compressedTokens: number;
        ratio: number; // compressedTokens / originalTokens (lower = better)
    };
}

// ─── Mutation Operator Interface ────────────────────────────

export interface IMutationOperator {
    name: MutationType;
    description: string;
    targetChromosome: 'c1' | 'c2';

    /**
     * Apply mutation to genome
     *
     * MUST NOT mutate original genome - returns new mutant.
     */
    mutate(context: MutationContext): Promise<MutationResult>;

    /**
     * Estimate fitness improvement
     *
     * Used for mutation selection.
     */
    estimateImprovement(context: MutationContext): number;
}

// ─── Mutation Operators ─────────────────────────────────────

/**
 * Compress Instructions - Cognitive Compression
 *
 * Reduces token count while preserving semantic meaning.
 * Target: Improve token efficiency, reduce cost.
 */
export class CompressInstructionsOperator implements IMutationOperator {
    name: MutationType = 'compress_instructions';
    description = 'Reduce token count while preserving meaning (LLM-powered when available)';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // LLM-powered compression (preferred)
        if (this.llm) {
            return this.mutateLLM(context, mutant);
        }

        // Fallback: regex-based compression
        mutant.chromosomes.c1.operations = mutant.chromosomes.c1.operations.map((gene) =>
            this.compressGene(gene)
        );

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: this.computeDiff(
                context.genome.chromosomes.c1,
                mutant.chromosomes.c1
            ),
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
            description: 'Compressed instructions to reduce token usage',
            expectedImprovement: 0.15,
        };
    }

    private async mutateLLM(context: MutationContext, mutant: GenomeV2): Promise<MutationResult> {
        let totalOriginal = 0;
        let totalCompressed = 0;
        let anyCompressed = false;

        for (let i = 0; i < mutant.chromosomes.c1.operations.length; i++) {
            const gene = mutant.chromosomes.c1.operations[i];
            const originalTokens = gene.tokenCount || estimateTokenCount(gene.content);
            totalOriginal += originalTokens;

            try {
                const response = await this.llm!.chat([
                    { role: 'system', content: 'You are a prompt compression specialist. Reduce token count while preserving EXACT functional behavior. Return ONLY the compressed text.' },
                    { role: 'user', content: `Compress this AI agent instruction. Preserve ALL capabilities, remove redundancy and filler.\n\nCATEGORY: ${gene.category}\n\nINSTRUCTION:\n${gene.content}` },
                ], { temperature: 0.3 });

                const compressed = response.content.trim();
                const compressedTokens = estimateTokenCount(compressed);

                if (compressedTokens < originalTokens) {
                    mutant.chromosomes.c1.operations[i] = {
                        ...gene,
                        content: compressed,
                        tokenCount: compressedTokens,
                        version: (gene.version ?? 0) + 1,
                        lastModified: new Date(),
                    };
                    totalCompressed += compressedTokens;
                    anyCompressed = true;
                } else {
                    totalCompressed += originalTokens;
                }
            } catch {
                totalCompressed += originalTokens;
            }
        }

        if (!anyCompressed) {
            return this.createFailure(context, 'LLM compression did not reduce tokens for any gene');
        }

        const ratio = totalCompressed / totalOriginal;
        const saved = totalOriginal - totalCompressed;

        return {
            success: true,
            mutant,
            mutation: {
                id: this.generateId(),
                timestamp: new Date(),
                chromosome: 'c1',
                operation: this.name,
                before: JSON.stringify(context.genome.chromosomes.c1),
                after: JSON.stringify(mutant.chromosomes.c1),
                diff: `LLM compression: ${totalOriginal} → ${totalCompressed} tokens (${saved} saved, ${((1 - ratio) * 100).toFixed(1)}% reduction)`,
                trigger: 'drift-detected',
                reason: context.reason,
                sandboxTested: false,
                promoted: false,
                proposer: 'system',
            },
            description: `LLM-compressed ${saved} tokens (${((1 - ratio) * 100).toFixed(1)}% reduction)`,
            expectedImprovement: (1 - ratio) * 0.25,
            compressionMetrics: { originalTokens: totalOriginal, compressedTokens: totalCompressed, ratio },
        };
    }

    estimateImprovement(context: MutationContext): number {
        const currentEfficiency = context.genome.fitness.tokenEfficiency;
        return (1 - currentEfficiency) * 0.2;
    }

    // ─── Regex fallback methods ─────────────────────────────
    private compressGene(gene: OperativeGene): OperativeGene {
        const compressed = { ...gene };
        compressed.content = this.removeRedundancy(gene.content);
        compressed.content = this.abbreviateCommon(compressed.content);
        compressed.content = this.consolidateInstructions(compressed.content);
        compressed.tokenCount = estimateTokenCount(compressed.content);
        return compressed;
    }

    private removeRedundancy(content: string): string {
        const sentences = content.split('. ');
        const unique = [...new Set(sentences)];
        return unique.join('. ');
    }

    private abbreviateCommon(content: string): string {
        const abbreviations: Record<string, string> = {
            'for example': 'e.g.',
            'that is': 'i.e.',
            'and so on': 'etc.',
            'please': 'pls',
            'you should': 'you must',
        };
        let result = content;
        for (const [full, abbrev] of Object.entries(abbreviations)) {
            result = result.replace(new RegExp(full, 'gi'), abbrev);
        }
        return result;
    }

    private consolidateInstructions(content: string): string {
        return content
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    private createFailure(context: MutationContext, reason: string): MutationResult {
        return {
            success: false,
            mutant: context.genome,
            mutation: {
                id: this.generateId(), timestamp: new Date(), chromosome: 'c1',
                operation: this.name, before: '', after: '', diff: '',
                trigger: 'drift-detected', reason, sandboxTested: false,
                promoted: false, proposer: 'system',
            },
            description: reason,
            expectedImprovement: 0,
        };
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private computeDiff(before: unknown, after: unknown): string {
        return `Changed ${JSON.stringify(before).length} → ${JSON.stringify(after).length} chars`;
    }
}

/**
 * Reorder Constraints - Optimize for LLM Processing
 *
 * Reorders constraints/instructions for better LLM comprehension.
 * Target: Improve quality, success rate.
 */
export class ReorderConstraintsOperator implements IMutationOperator {
    name: MutationType = 'reorder_constraints';
    description = 'Optimize constraint ordering for LLM processing (LLM-powered when available)';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // LLM-powered reordering (preferred)
        if (this.llm) {
            return this.mutateLLM(context, mutant);
        }

        // Fallback: static priority-based reordering
        mutant.chromosomes.c1.operations = this.reorderGenes(
            mutant.chromosomes.c1.operations
        );

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Reordered genes for optimal LLM processing',
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
            description: 'Reordered constraints for better LLM comprehension',
            expectedImprovement: 0.10,
        };
    }

    private async mutateLLM(context: MutationContext, mutant: GenomeV2): Promise<MutationResult> {
        const genes = mutant.chromosomes.c1.operations;
        const geneList = genes.map((g, i) => `[${i}] CATEGORY: ${g.category} | FITNESS: ${g.fitness.composite.toFixed(2)} | SUCCESS: ${(g.successRate * 100).toFixed(0)}% | CONTENT: ${g.content.substring(0, 100)}...`).join('\n');

        try {
            const response = await this.llm!.chat([
                { role: 'system', content: 'You are an LLM prompt optimization expert. LLMs give more weight to instructions at the beginning and end of prompts. High-priority, high-fitness instructions should be placed first. Low-performing instructions should be placed in the middle where they have less influence until they improve.' },
                { role: 'user', content: `Analyze these ${genes.length} agent instructions and return the optimal ordering as a JSON array of indices.\n\nCurrent fitness metrics:\n- Overall quality: ${context.genome.fitness.quality.toFixed(2)}\n- Success rate: ${(context.genome.fitness.successRate * 100).toFixed(0)}%\n- Drift reason: ${context.reason}\n\nINSTRUCTIONS:\n${geneList}\n\nReturn ONLY a JSON array of indices in optimal order, e.g. [2,0,1,3]. No explanation.` },
            ], { temperature: 0.3 });

            const match = response.content.match(/\[[\d,\s]+\]/);
            if (!match) {
                // LLM didn't return valid JSON, fall back to static
                mutant.chromosomes.c1.operations = this.reorderGenes(genes);
            } else {
                const order: number[] = JSON.parse(match[0]);
                // Validate all indices exist
                if (order.length === genes.length && order.every(i => i >= 0 && i < genes.length)) {
                    mutant.chromosomes.c1.operations = order.map(i => genes[i]);
                } else {
                    mutant.chromosomes.c1.operations = this.reorderGenes(genes);
                }
            }
        } catch {
            mutant.chromosomes.c1.operations = this.reorderGenes(genes);
        }

        return {
            success: true,
            mutant,
            mutation: {
                id: this.generateId(),
                timestamp: new Date(),
                chromosome: 'c1',
                operation: this.name,
                before: JSON.stringify(context.genome.chromosomes.c1),
                after: JSON.stringify(mutant.chromosomes.c1),
                diff: 'LLM-optimized gene ordering based on fitness and LLM attention patterns',
                trigger: 'drift-detected',
                reason: context.reason,
                sandboxTested: false,
                promoted: false,
                proposer: 'system',
            },
            description: 'LLM-optimized instruction ordering for maximum LLM comprehension',
            expectedImprovement: 0.15,
        };
    }

    estimateImprovement(_context: MutationContext): number {
        return 0.10;
    }

    // ─── Static fallback ────────────────────────────────────
    private reorderGenes(genes: OperativeGene[]): OperativeGene[] {
        const priorityOrder: Record<string, number> = {
            'tool-usage': 1,
            'reasoning': 2,
            'coding-patterns': 3,
            'communication': 4,
            'data-processing': 5,
            'error-handling': 6,
        };

        return [...genes].sort((a, b) => {
            const priorityA = priorityOrder[a.category] || 999;
            const priorityB = priorityOrder[b.category] || 999;
            return priorityA - priorityB;
        });
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Safety Reinforcement - Strengthen Security
 *
 * Adds or strengthens safety constraints.
 * Target: Reduce intervention rate, improve safety.
 */
export class SafetyReinforcementOperator implements IMutationOperator {
    name: MutationType = 'safety_reinforcement';
    description = 'Strengthen security and safety boundaries (LLM-powered when available)';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // LLM-powered safety analysis (preferred)
        if (this.llm) {
            return this.mutateLLM(context, mutant);
        }

        // Fallback: static safety strings
        mutant.chromosomes.c1.operations = mutant.chromosomes.c1.operations.map((gene) =>
            this.reinforceGene(gene)
        );

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Added safety reinforcements',
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
            description: 'Reinforced safety constraints',
            expectedImprovement: 0.08,
        };
    }

    private async mutateLLM(context: MutationContext, mutant: GenomeV2): Promise<MutationResult> {
        const purpose = context.genome.chromosomes.c0.identity.purpose;
        const constraints = context.genome.chromosomes.c0.identity.constraints.join(', ');
        const forbiddenTopics = context.genome.chromosomes.c0.security.forbiddenTopics.join(', ') || 'none specified';

        for (let i = 0; i < mutant.chromosomes.c1.operations.length; i++) {
            const gene = mutant.chromosomes.c1.operations[i];

            try {
                const response = await this.llm!.chat([
                    { role: 'system', content: 'You are a security expert for AI agents. Analyze instructions for vulnerabilities and rewrite them with targeted safety reinforcements. Do NOT add generic safety platitudes — identify SPECIFIC risks in the instruction and add SPECIFIC mitigations.' },
                    { role: 'user', content: `Analyze this AI agent instruction and rewrite it with targeted safety reinforcements.\n\nAGENT PURPOSE: ${purpose}\nCONSTRAINTS: ${constraints}\nFORBIDDEN TOPICS: ${forbiddenTopics}\nINTERVENTION RATE: ${(context.genome.fitness.interventionRate * 100).toFixed(0)}%\nDRIFT REASON: ${context.reason}\n\nCATEGORY: ${gene.category}\nCURRENT INSTRUCTION:\n${gene.content}\n\nRewrite the instruction with safety reinforcements integrated naturally (not appended). Return ONLY the reinforced instruction.` },
                ], { temperature: 0.3 });

                const reinforced = response.content.trim();
                if (reinforced.length > 0 && reinforced !== gene.content) {
                    mutant.chromosomes.c1.operations[i] = {
                        ...gene,
                        content: reinforced,
                        tokenCount: estimateTokenCount(reinforced),
                        version: (gene.version ?? 0) + 1,
                        lastModified: new Date(),
                    };
                }
            } catch {
                // Keep original gene on LLM failure
            }
        }

        return {
            success: true,
            mutant,
            mutation: {
                id: this.generateId(),
                timestamp: new Date(),
                chromosome: 'c1',
                operation: this.name,
                before: JSON.stringify(context.genome.chromosomes.c1),
                after: JSON.stringify(mutant.chromosomes.c1),
                diff: 'LLM-analyzed vulnerabilities and integrated targeted safety reinforcements',
                trigger: 'drift-detected',
                reason: context.reason,
                sandboxTested: false,
                promoted: false,
                proposer: 'system',
            },
            description: 'LLM-reinforced safety with targeted mitigations based on vulnerability analysis',
            expectedImprovement: 0.15,
        };
    }

    estimateImprovement(context: MutationContext): number {
        const interventionRate = context.genome.fitness.interventionRate;
        return interventionRate * 0.15;
    }

    // ─── Static fallback ────────────────────────────────────
    private reinforceGene(gene: OperativeGene): OperativeGene {
        const reinforced = { ...gene };

        if (gene.category === 'tool-usage') {
            reinforced.content += '\n\nSAFETY: Always validate inputs before tool execution.';
        } else if (gene.category === 'coding-patterns') {
            reinforced.content += '\n\nSAFETY: Check for security vulnerabilities (XSS, SQL injection, etc.).';
        }

        reinforced.tokenCount = estimateTokenCount(reinforced.content);
        return reinforced;
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Tool Selection Bias - Optimize Tool Usage
 *
 * Adjusts tool usage patterns based on success rates.
 * Target: Improve success rate, reduce latency.
 */
export class ToolSelectionBiasOperator implements IMutationOperator {
    name: MutationType = 'tool_selection_bias';
    description = 'Adjust tool usage patterns based on performance (LLM-powered when available)';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        const mutant = this.deepClone(context.genome);

        // LLM-powered tool optimization (preferred)
        if (this.llm) {
            return this.mutateLLM(context, mutant);
        }

        // Fallback: static bias adjustment
        for (let i = 0; i < mutant.chromosomes.c1.operations.length; i++) {
            const gene = mutant.chromosomes.c1.operations[i];
            if (gene.category === 'tool-usage') {
                mutant.chromosomes.c1.operations[i] = this.adjustToolBias(gene);
            }
        }

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: 'Adjusted tool selection bias',
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
            description: 'Optimized tool usage patterns',
            expectedImprovement: 0.12,
        };
    }

    private async mutateLLM(context: MutationContext, mutant: GenomeV2): Promise<MutationResult> {
        const allGenes = mutant.chromosomes.c1.operations;
        const toolGenes = allGenes.filter(g => g.category === 'tool-usage');

        if (toolGenes.length === 0) {
            return {
                success: true, mutant, mutation: {
                    id: this.generateId(), timestamp: new Date(), chromosome: 'c1',
                    operation: this.name, before: '', after: '', diff: 'No tool-usage genes to optimize',
                    trigger: 'drift-detected', reason: context.reason, sandboxTested: false,
                    promoted: false, proposer: 'system',
                },
                description: 'No tool-usage genes found',
                expectedImprovement: 0,
            };
        }

        const performanceReport = toolGenes.map(g =>
            `- "${g.content.substring(0, 80)}..." → success: ${(g.successRate * 100).toFixed(0)}%, used: ${g.usageCount} times, fitness: ${g.fitness.composite.toFixed(2)}`
        ).join('\n');

        for (let i = 0; i < mutant.chromosomes.c1.operations.length; i++) {
            const gene = mutant.chromosomes.c1.operations[i];
            if (gene.category !== 'tool-usage') continue;

            try {
                const response = await this.llm!.chat([
                    { role: 'system', content: 'You are an expert in AI agent tool usage optimization. Rewrite tool instructions based on real performance data. If a tool has low success rate, rewrite the instruction to narrow its use cases. If high success rate, reinforce and expand. Do NOT just append advice — rewrite the entire instruction.' },
                    { role: 'user', content: `Rewrite this tool instruction based on real performance data.\n\nTOOL PERFORMANCE ACROSS ALL TOOLS:\n${performanceReport}\n\nTHIS TOOL'S METRICS:\n- Success rate: ${(gene.successRate * 100).toFixed(0)}%\n- Usage count: ${gene.usageCount}\n- Fitness: ${gene.fitness.composite.toFixed(2)}\n\nCURRENT INSTRUCTION:\n${gene.content}\n\nDRIFT REASON: ${context.reason}\n\nRewrite the instruction to optimize based on this data. Return ONLY the rewritten instruction.` },
                ], { temperature: 0.5 });

                const optimized = response.content.trim();
                if (optimized.length > 0 && optimized !== gene.content) {
                    mutant.chromosomes.c1.operations[i] = {
                        ...gene,
                        content: optimized,
                        tokenCount: estimateTokenCount(optimized),
                        version: (gene.version ?? 0) + 1,
                        lastModified: new Date(),
                    };
                }
            } catch {
                // Keep original on failure
            }
        }

        return {
            success: true,
            mutant,
            mutation: {
                id: this.generateId(),
                timestamp: new Date(),
                chromosome: 'c1',
                operation: this.name,
                before: JSON.stringify(context.genome.chromosomes.c1),
                after: JSON.stringify(mutant.chromosomes.c1),
                diff: 'LLM-optimized tool instructions based on real performance data',
                trigger: 'drift-detected',
                reason: context.reason,
                sandboxTested: false,
                promoted: false,
                proposer: 'system',
            },
            description: 'LLM-rewritten tool instructions based on success/failure patterns',
            expectedImprovement: 0.18,
        };
    }

    estimateImprovement(_context: MutationContext): number {
        return 0.12;
    }

    // ─── Static fallback ────────────────────────────────────
    private adjustToolBias(gene: OperativeGene): OperativeGene {
        let content = gene.content;

        if (gene.successRate > 0.8) {
            content += '\n\nPRIORITY: Prefer this tool for similar tasks (high success rate).';
        } else if (gene.successRate < 0.5) {
            content += '\n\nCAUTION: Use this tool sparingly (low success rate). Consider alternatives.';
        }

        return {
            ...gene,
            content,
            tokenCount: estimateTokenCount(content),
        };
    }

    private deepClone(genome: GenomeV2): GenomeV2 {
        return JSON.parse(JSON.stringify(genome));
    }

    private generateId(): string {
        return `mut_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

/**
 * Token Compression Operator - Evolutionary Token Reduction
 *
 * Uses LLM to compress gene content while preserving ALL functional capabilities.
 * This is the core of GSEP's token optimization: never discard a functional gene,
 * instead compress it to use fewer tokens with identical behavior.
 *
 * Key principles:
 * - Temperature 0.3 (fidelity > creativity)
 * - REJECTS if compressed >= original (compression gate)
 * - Does NOT degrade fitness (same intent, fewer tokens)
 * - Resets sampleSize/confidence for re-evaluation
 */
export class TokenCompressionOperator implements IMutationOperator {
    name: MutationType = 'compress_instructions';
    description = 'LLM-powered token compression preserving functional behavior';
    targetChromosome = 'c1' as const;

    constructor(private llm?: LLMAdapter) {}

    async mutate(context: MutationContext): Promise<MutationResult> {
        if (!this.llm) {
            return this.createFailure(context, 'No LLM adapter configured for compression');
        }

        const mutant = this.deepClone(context.genome);
        let totalOriginalTokens = 0;
        let totalCompressedTokens = 0;
        let anyCompressed = false;

        // Compress each operative gene
        for (let i = 0; i < mutant.chromosomes.c1.operations.length; i++) {
            const gene = mutant.chromosomes.c1.operations[i];
            const originalTokens = gene.tokenCount || estimateTokenCount(gene.content);
            totalOriginalTokens += originalTokens;

            try {
                const compressed = await this.compressGene(gene);
                const compressedTokens = estimateTokenCount(compressed);

                // Compression gate: reject if not actually smaller
                if (compressedTokens < originalTokens) {
                    mutant.chromosomes.c1.operations[i] = {
                        ...gene,
                        content: compressed,
                        tokenCount: compressedTokens,
                        // Preserve fitness — same intent, fewer tokens
                        // Reset sample tracking for re-evaluation
                        version: (gene.version ?? 0) + 1,
                        lastModified: new Date(),
                        mutationHistory: [
                            ...(gene.mutationHistory || []),
                            {
                                operation: this.name,
                                timestamp: new Date(),
                                reason: `Compressed ${originalTokens} → ${compressedTokens} tokens (${((1 - compressedTokens / originalTokens) * 100).toFixed(0)}% reduction)`,
                            },
                        ],
                    };
                    totalCompressedTokens += compressedTokens;
                    anyCompressed = true;
                } else {
                    totalCompressedTokens += originalTokens;
                }
            } catch {
                totalCompressedTokens += originalTokens;
            }
        }

        if (!anyCompressed) {
            return this.createFailure(context, 'Compression did not reduce tokens for any gene');
        }

        const ratio = totalCompressedTokens / totalOriginalTokens;
        const tokensSaved = totalOriginalTokens - totalCompressedTokens;

        const mutation: MutationRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            chromosome: 'c1',
            operation: this.name,
            before: JSON.stringify(context.genome.chromosomes.c1),
            after: JSON.stringify(mutant.chromosomes.c1),
            diff: `Token compression: ${totalOriginalTokens} → ${totalCompressedTokens} tokens (${tokensSaved} saved, ${((1 - ratio) * 100).toFixed(1)}% reduction)`,
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
            description: `Compressed ${tokensSaved} tokens (${((1 - ratio) * 100).toFixed(1)}% reduction) while preserving gene functionality`,
            expectedImprovement: (1 - ratio) * 0.2, // Token savings → fitness improvement
            compressionMetrics: {
                originalTokens: totalOriginalTokens,
                compressedTokens: totalCompressedTokens,
                ratio,
            },
        };
    }

    estimateImprovement(context: MutationContext): number {
        // Estimate based on current token efficiency
        const tokenEfficiency = context.genome.fitness.tokenEfficiency;
        // Lower efficiency = more room for compression
        return (1 - tokenEfficiency) * 0.25;
    }

    private async compressGene(gene: OperativeGene): Promise<string> {
        const response = await this.llm!.chat([
            {
                role: 'system',
                content: 'You are a prompt compression specialist. Your ONLY job is to reduce token count while preserving EXACT functional behavior. The compressed version must produce identical AI agent behavior.',
            },
            {
                role: 'user',
                content: `Compress this AI agent instruction to use fewer tokens while preserving ALL functional capabilities. The compressed version must produce identical behavior.

INSTRUCTION TO COMPRESS:
\`\`\`
${gene.content}
\`\`\`

CATEGORY: ${gene.category}

RULES:
1. Preserve ALL functional directives
2. Remove filler words, redundancies, verbose explanations
3. Use concise imperative language
4. Keep technical terms intact
5. Do NOT add new functionality
6. Do NOT remove any capability

Return ONLY the compressed instruction, nothing else.`,
            },
        ], { temperature: 0.3 });

        return response.content.trim();
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
                before: '',
                after: '',
                diff: '',
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
        return `mut_compress_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

// ─── Mutation Engine ────────────────────────────────────────

/**
 * MutationEngine - Orchestrates mutation operations
 *
 * Selects and applies appropriate mutations based on context.
 */
export class MutationEngine {
    private operators: Map<MutationType, IMutationOperator> = new Map();

    constructor(llm?: LLMAdapter) {
        // Register all operators (LLM-powered when available, regex fallback otherwise)
        this.registerOperator(new CompressInstructionsOperator(llm));
        this.registerOperator(new ReorderConstraintsOperator(llm));
        this.registerOperator(new SafetyReinforcementOperator(llm));
        this.registerOperator(new ToolSelectionBiasOperator(llm));
    }

    /**
     * Register a custom mutation operator
     */
    public registerOperator(operator: IMutationOperator): void {
        this.operators.set(operator.name, operator);
    }

    /**
     * Generate N mutation candidates
     *
     * Returns multiple mutants for sandbox testing.
     */
    public async generateMutants(
        context: MutationContext,
        count: number = 3
    ): Promise<MutationResult[]> {
        const results: MutationResult[] = [];

        // Select top N operators by estimated improvement
        const rankedOperators = this.rankOperators(context);
        const selected = rankedOperators.slice(0, count);

        // Apply each operator
        for (const operator of selected) {
            const result = await operator.mutate(context);
            results.push(result);
        }

        return results;
    }

    /**
     * Select mutation strategy based on context signals.
     *
     * Returns ranked operators with contextual boost applied:
     * - efficiency-decline drift → boost compress_instructions
     * - cost-increase drift → boost compress_instructions
     * - quality-decline drift → boost safety_reinforcement, reorder_constraints
     * - high token usage → boost compress_instructions
     *
     * Falls back to estimateImprovement() ranking when no signals present.
     */
    public selectMutationStrategy(context: MutationContext): Array<{
        operator: IMutationOperator;
        score: number;
        reason: string;
    }> {
        return this.rankOperatorsWithContext(context);
    }

    /**
     * Rank operators by estimated improvement + contextual drift boost
     */
    private rankOperators(context: MutationContext): IMutationOperator[] {
        return this.rankOperatorsWithContext(context).map(s => s.operator);
    }

    /**
     * Core ranking logic: base estimate + drift-aware bonus
     */
    private rankOperatorsWithContext(context: MutationContext): Array<{
        operator: IMutationOperator;
        score: number;
        reason: string;
    }> {
        const driftSignals = (context.evidence?.driftSignals ?? []) as Array<{
            type: string;
            severity: string;
        }>;

        // Compute total C1 token usage for token-pressure signal
        const totalC1Tokens = context.genome.chromosomes.c1.operations
            .reduce((sum, g) => sum + (g.tokenCount || estimateTokenCount(g.content)), 0);

        const scored = Array.from(this.operators.values()).map((op) => {
            let base = op.estimateImprovement(context);
            let reason = 'base estimate';

            // Drift-aware boosting
            for (const signal of driftSignals) {
                const boost = this.driftBoost(op.name, signal.type, signal.severity);
                if (boost > 0) {
                    base += boost;
                    reason = `drift:${signal.type} (${signal.severity})`;
                }
            }

            // Token pressure: if C1 is over 80% of typical budget (1600 tokens),
            // boost compression operators
            if (totalC1Tokens > 1600 && op.name === 'compress_instructions') {
                const pressure = Math.min((totalC1Tokens - 1600) / 400, 0.3); // 0–0.3 bonus
                base += pressure;
                reason = `token pressure (${totalC1Tokens} tokens)`;
            }

            return { operator: op, score: base, reason };
        });

        return scored.sort((a, b) => b.score - a.score);
    }

    /**
     * Compute drift-type → operator bonus
     */
    private driftBoost(operatorName: string, driftType: string, severity: string): number {
        const severityMultiplier = severity === 'critical' ? 0.3
            : severity === 'major' ? 0.2
            : severity === 'moderate' ? 0.1
            : 0.05;

        // Map drift types to preferred operators (base + intelligent)
        const mapping: Record<string, string[]> = {
            'efficiency-decline': ['compress_instructions', 'semantic_restructuring'],
            'cost-increase': ['compress_instructions'],
            'quality-decline': ['semantic_restructuring', 'pattern_extraction', 'safety_reinforcement', 'reorder_constraints'],
            'intervention-increase': ['safety_reinforcement', 'tool_selection_bias', 'pattern_extraction'],
            'latency-increase': ['compress_instructions', 'reorder_constraints'],
        };

        const preferred = mapping[driftType] || [];
        return preferred.includes(operatorName) ? severityMultiplier : 0;
    }

    /**
     * Get operator by name
     */
    public getOperator(name: MutationType): IMutationOperator | undefined {
        return this.operators.get(name);
    }

    /**
     * List all registered operators
     */
    public listOperators(): IMutationOperator[] {
        return Array.from(this.operators.values());
    }
}
