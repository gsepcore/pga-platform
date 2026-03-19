/**
 * FitnessTracker — Tracks allele performance and triggers C4 immune system
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Responsibilities:
 * - Record performance scores for alleles (EMA update)
 * - Track recent scores window for C4 immune system
 * - Auto-rollback variants with sudden fitness drops
 * - Update contextual fitness (model-specific, task-specific)
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, GeneAllele, SelectionContext, Layer } from '../types/index.js';

const MAX_RECENT_SCORES = 10;
const IMMUNE_WINDOW_SIZE = 5;
const IMMUNE_DROP_THRESHOLD = 0.2; // 20% drop triggers rollback

export class FitnessTracker {
    constructor(
        private storage: StorageAdapter,
        private genome: Genome,
    ) {}

    /**
     * Record performance score for an allele
     */
    async recordPerformance(
        layer: Layer,
        gene: string,
        variant: string,
        score: number,
        _context?: SelectionContext,
    ): Promise<void> {
        // Get current allele
        const layerAlleles = this.getAllelesForLayer(layer);
        const allele = layerAlleles.find(a => a.gene === gene && a.variant === variant);

        if (!allele) {
            return;
        }

        // Update recent scores window
        const recentScores = [...(allele.recentScores || []), score].slice(-MAX_RECENT_SCORES);

        // Calculate new fitness (EMA)
        const newFitness = Math.round((0.9 * allele.fitness + 0.1 * score) * 10000) / 10000;

        // Update allele
        const updatedAllele: GeneAllele = {
            ...allele,
            fitness: newFitness,
            sampleCount: (allele.sampleCount || 0) + 1,
            recentScores,
        };

        // Replace in genome
        this.replaceAllele(layer, updatedAllele);

        // Save genome
        await this.storage.saveGenome(this.genome);

        // Check C4 immune system (fire-and-forget with logging)
        this.checkImmune(layer, gene, variant, recentScores, allele.fitness).catch(() => {
            // Immune check is non-critical; genome is already saved above
        });
    }

    /**
     * C4 Immune system: rollback variant if recent performance drops significantly
     */
    private async checkImmune(
        layer: Layer,
        gene: string,
        variant: string,
        recentScores: number[],
        currentFitness: number,
    ): Promise<void> {
        // Don't rollback Layer 0 (immutable)
        if (layer === 0) return;

        // Don't rollback default variant
        if (variant === 'default') return;

        // Need enough samples
        if (recentScores.length < IMMUNE_WINDOW_SIZE) return;

        const window = recentScores.slice(-IMMUNE_WINDOW_SIZE);
        const windowAvg = window.reduce((s, v) => s + v, 0) / window.length;

        // Check: is the recent window significantly worse than the overall fitness?
        const drop = currentFitness - windowAvg;

        if (drop > IMMUNE_DROP_THRESHOLD) {
            // Rollback: retire this variant, restore parent
            await this.rollbackVariant(layer, gene, variant);

            // Log mutation
            await this.storage.logMutation({
                genomeId: this.genome.id,
                layer,
                gene,
                variant,
                mutationType: 'rollback',
                parentVariant: null,
                triggerReason: 'immune_system',
                deployed: false,
                details: {
                    windowAvg,
                    currentFitness,
                    drop,
                    recentScores: window,
                },
                timestamp: new Date(),
                createdAt: new Date(),
            });
        }
    }

    /**
     * Rollback a variant: retire it and restore parent
     */
    private async rollbackVariant(layer: Layer, gene: string, variant: string): Promise<boolean> {
        if (layer === 0) {
            return false;
        }

        const layerAlleles = this.getAllelesForLayer(layer);
        const target = layerAlleles.find(a => a.gene === gene && a.variant === variant);

        if (!target || target.variant === 'default') {
            return false;
        }

        // Retire this variant
        target.status = 'retired';

        // Reactivate parent if exists
        if (target.parentVariant) {
            const parent = layerAlleles.find(
                a => a.gene === gene && a.variant === target.parentVariant,
            );
            if (parent && parent.status !== 'active') {
                parent.status = 'active';
            }
        }

        // Save genome
        await this.storage.saveGenome(this.genome);

        return true;
    }

    // ─── Helpers ────────────────────────────────────────────

    private getAllelesForLayer(layer: Layer): GeneAllele[] {
        if (layer === 0) return this.genome.layers.layer0;
        if (layer === 1) return this.genome.layers.layer1;
        return this.genome.layers.layer2;
    }

    private replaceAllele(layer: Layer, updatedAllele: GeneAllele): void {
        const layerAlleles = this.getAllelesForLayer(layer);
        const index = layerAlleles.findIndex(
            a => a.gene === updatedAllele.gene && a.variant === updatedAllele.variant,
        );

        if (index !== -1) {
            layerAlleles[index] = updatedAllele;
        }
    }
}
