/**
 * PGA — Genomic Self-Evolving Prompts
 *
 * Main entry point for the PGA SDK
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { LLMAdapter } from './interfaces/LLMAdapter.js';
import type { StorageAdapter } from './interfaces/StorageAdapter.js';
import type { Genome, GenomeConfig, SelectionContext, Interaction } from './types/index.js';
import { GenomeManager } from './core/GenomeManager.js';

export interface PGAConfig {
    /**
     * LLM adapter (Claude, GPT, Gemini, etc.)
     */
    llm: LLMAdapter;

    /**
     * Storage adapter (Postgres, MongoDB, Redis, etc.)
     */
    storage: StorageAdapter;

    /**
     * Optional genome configuration defaults
     */
    config?: Partial<GenomeConfig>;
}

/**
 * PGA Main Class
 *
 * Example usage:
 * ```typescript
 * const pga = new PGA({
 *   llm: new ClaudeAdapter({ apiKey: '...' }),
 *   storage: new PostgresAdapter({ connectionString: '...' }),
 * });
 *
 * const genome = await pga.createGenome({ name: 'my-agent' });
 * ```
 */
export class PGA {
    private genomeManager: GenomeManager;
    private llm: LLMAdapter;

    constructor(private pgaConfig: PGAConfig) {
        this.llm = pgaConfig.llm;
        this.genomeManager = new GenomeManager(pgaConfig.storage);
    }

    /**
     * Initialize PGA (setup database, load seeds, etc.)
     */
    async initialize(): Promise<void> {
        await this.pgaConfig.storage.initialize();
    }

    /**
     * Create a new genome
     */
    async createGenome(options: {
        name: string;
        config?: Partial<GenomeConfig>;
    }): Promise<GenomeInstance> {
        const genome = await this.genomeManager.createGenome({
            name: options.name,
            config: {
                enableSandbox: true,
                mutationRate: 'balanced',
                ...this.pgaConfig.config,
                ...options.config,
            },
        });

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
    }

    /**
     * Load existing genome
     */
    async loadGenome(genomeId: string): Promise<GenomeInstance | null> {
        const genome = await this.genomeManager.loadGenome(genomeId);
        if (!genome) return null;

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
    }

    /**
     * List all genomes
     */
    async listGenomes(): Promise<Genome[]> {
        return this.genomeManager.listGenomes();
    }

    /**
     * Delete genome
     */
    async deleteGenome(genomeId: string): Promise<void> {
        await this.genomeManager.deleteGenome(genomeId);
    }
}

/**
 * Genome Instance
 *
 * Represents a single genome that can be used with your agent
 */
export class GenomeInstance {
    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
    ) {}

    /**
     * Get genome ID
     */
    get id(): string {
        return this.genome.id;
    }

    /**
     * Get genome name
     */
    get name(): string {
        return this.genome.name;
    }

    /**
     * Assemble optimized prompt for current context
     */
    async assemblePrompt(context: SelectionContext): Promise<string> {
        // TODO: Implement prompt assembly from layers
        // This will select the best alleles for each gene based on context
        const layer0Prompt = await this.assembleLayer(0, context);
        const layer1Prompt = await this.assembleLayer(1, context);
        const layer2Prompt = await this.assembleLayer(2, context);

        return `${layer0Prompt}\n\n${layer1Prompt}\n\n${layer2Prompt}`;
    }

    /**
     * Chat with PGA optimization
     */
    async chat(userMessage: string, context: SelectionContext): Promise<string> {
        const prompt = await this.assemblePrompt(context);

        const response = await this.llm.chat(
            [
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage },
            ],
        );

        return response.content;
    }

    /**
     * Record interaction (enables auto-learning)
     */
    async recordInteraction(interaction: Omit<Interaction, 'genomeId'>): Promise<void> {
        await this.storage.recordInteraction({
            ...interaction,
            genomeId: this.genome.id,
        });
    }

    /**
     * Get user DNA profile
     */
    async getDNA(userId: string) {
        return this.storage.loadDNA(userId, this.genome.id);
    }

    /**
     * Record user feedback
     */
    async recordFeedback(userId: string, gene: string, sentiment: 'positive' | 'negative' | 'neutral'): Promise<void> {
        await this.storage.recordFeedback({
            genomeId: this.genome.id,
            userId,
            gene,
            sentiment,
            timestamp: new Date(),
        });
    }

    /**
     * Trigger mutation cycle manually
     */
    async mutate(options?: { userId?: string }): Promise<void> {
        // TODO: Implement mutation triggering
        console.log('Mutation cycle triggered for genome:', this.genome.id, options);
    }

    /**
     * Rollback to previous version
     */
    async rollback(options: { layer: 0 | 1 | 2; gene: string; variant: string }): Promise<void> {
        // TODO: Implement rollback
        console.log('Rollback requested:', options);
    }

    /**
     * Get analytics
     */
    async getAnalytics() {
        return this.storage.getAnalytics(this.genome.id);
    }

    /**
     * Export genome (for backup/transfer)
     */
    async export(): Promise<Genome> {
        return this.genome;
    }

    // ─── Private Methods ────────────────────────────────

    private async assembleLayer(layer: 0 | 1 | 2, context: SelectionContext): Promise<string> {
        // TODO: Implement layer assembly with epsilon-greedy selection
        const layerKey = `layer${layer}` as 'layer0' | 'layer1' | 'layer2';
        const alleles = this.genome.layers[layerKey];

        // For now, just concatenate all active alleles
        return alleles
            .filter(a => a.status === 'active')
            .map(a => a.content)
            .join('\n\n');
    }
}
