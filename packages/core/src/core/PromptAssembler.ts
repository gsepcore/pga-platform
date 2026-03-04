/**
 * PromptAssembler — Assembles prompts from three-layer genome
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Handles Layer 0 (Immutable) + Layer 1 (Operative) + Layer 2 (Epigenome)
 * selection and assembly into final system prompt.
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, SelectionContext, Layer } from '../types/index.js';
import { ContextMemory } from './ContextMemory.js';
import { ProactiveSuggestions } from './ProactiveSuggestions.js';



export interface SelectedAlleleRef {
    layer: Layer;
    gene: string;
    variant: string;
}

export interface AssembledPromptResult {
    prompt: string;
    selectedAlleles: SelectedAlleleRef[];
}

export class PromptAssembler {
    private contextMemory: ContextMemory;
    private proactiveSuggestions: ProactiveSuggestions;

    constructor(
        storage: StorageAdapter,
        private genome: Genome,
    ) {
        this.contextMemory = new ContextMemory(storage);
        this.proactiveSuggestions = new ProactiveSuggestions(storage);
    }

    /**
     * Assemble full prompt from all three layers + intelligence boost
     */
    async assemblePrompt(context?: SelectionContext, currentMessage?: string): Promise<string> {
        const result = await this.assemblePromptWithSelection(context, currentMessage);
        return result.prompt;
    }

    async assemblePromptWithSelection(
        context?: SelectionContext,
        currentMessage?: string,
    ): Promise<AssembledPromptResult> {
        const sections: string[] = [];
        const selectedAlleles: SelectedAlleleRef[] = [];

        // Layer 0: Immutable DNA (security, core identity, ethics)
        for (const allele of this.genome.layers.layer0) {
            if (allele.status === 'active') {
                sections.push(allele.content);
                selectedAlleles.push({ layer: 0, gene: allele.gene, variant: allele.variant });
            }
        }

        // Layer 1: Operative Genes
        const layer1 = await this.selectBestFromLayer(1, context);
        sections.push(...layer1.contents);
        selectedAlleles.push(...layer1.selectedAlleles);

        // Layer 2: Epigenomes
        const layer2 = await this.selectBestFromLayer(2, context);
        sections.push(...layer2.contents);
        selectedAlleles.push(...layer2.selectedAlleles);

        if (context?.userId) {
            const memoryPrompt = await this.contextMemory.getMemoryPrompt(context.userId, this.genome.id);
            if (memoryPrompt) sections.push(memoryPrompt);

            if (currentMessage) {
                const suggestions = await this.proactiveSuggestions.generateSuggestions(
                    context.userId,
                    this.genome.id,
                    currentMessage,
                );

                if (suggestions.length > 0) {
                    sections.push(this.proactiveSuggestions.formatSuggestionsPrompt(suggestions));
                }
            }
        }

        return {
            prompt: sections.join('\n\n---\n\n'),
            selectedAlleles,
        };
    }

    /**
     * Select best alleles from a specific layer using epsilon-greedy
     */
    private async selectBestFromLayer(
        layer: 1 | 2,
        _context?: SelectionContext,
    ): Promise<{ contents: string[]; selectedAlleles: SelectedAlleleRef[] }> {
        const alleles = layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;
        const active = alleles.filter(a => a.status === 'active');

        if (active.length === 0) return { contents: [], selectedAlleles: [] };

        // Group by gene
        const byGene = new Map<string, typeof active>();
        for (const allele of active) {
            if (!byGene.has(allele.gene)) {
                byGene.set(allele.gene, []);
            }
            byGene.get(allele.gene)!.push(allele);
        }

        // Select best variant for each gene
        const selected: string[] = [];
        const selectedAlleles: SelectedAlleleRef[] = [];
        for (const [_gene, variants] of byGene) {
            const best = this.selectByEpsilonGreedy(
                variants,
                this.genome.config.epsilonExplore || 0.1,
            );
            selected.push(best.content);
            selectedAlleles.push({ layer, gene: best.gene, variant: best.variant });
        }

        return { contents: selected, selectedAlleles };
    }

    /**
     * Epsilon-greedy selection: exploit best with probability (1-ε), explore random with probability ε
     */
    private selectByEpsilonGreedy<T extends { fitness: number }>(
        candidates: T[],
        epsilon: number,
    ): T {
        if (candidates.length === 0) {
            throw new Error('Cannot select from empty candidates');
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        // Sort by fitness descending
        const sorted = [...candidates].sort((a, b) => b.fitness - a.fitness);

        // With probability epsilon, explore (select random non-best)
        if (Math.random() < epsilon) {
            const nonBest = sorted.slice(1);
            if (nonBest.length > 0) {
                return nonBest[Math.floor(Math.random() * nonBest.length)];
            }
        }

        // Exploit: select best
        return sorted[0];
    }
}
