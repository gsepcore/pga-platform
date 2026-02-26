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
import { PromptAssembler } from './core/PromptAssembler.js';
import { DNAProfile } from './core/DNAProfile.js';
import { FitnessTracker } from './core/FitnessTracker.js';

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
    private assembler: PromptAssembler;
    private dnaProfile: DNAProfile;

    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
    ) {
        this.assembler = new PromptAssembler(storage, genome);
        this.dnaProfile = new DNAProfile(storage);
        // FitnessTracker will be used in future for performance tracking
        new FitnessTracker(storage, genome);
    }

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
        return this.assembler.assemblePrompt(context);
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
        const fullInteraction = {
            ...interaction,
            genomeId: this.genome.id,
        };

        // Record to storage
        await this.storage.recordInteraction(fullInteraction);

        // Update user DNA profile
        await this.dnaProfile.updateDNA(interaction.userId, this.genome.id, fullInteraction);

        // Record fitness for each layer (if we know which alleles were used)
        // TODO: Track which alleles were selected during assemblePrompt and record their fitness here
    }

    /**
     * Get user DNA profile
     */
    async getDNA(userId: string) {
        return this.dnaProfile.getDNA(userId, this.genome.id);
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
}
