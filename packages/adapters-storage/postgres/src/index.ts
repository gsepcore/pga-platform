/**
 * PostgreSQL Storage Adapter for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Implements StorageAdapter interface for PostgreSQL
 */

import { Pool, PoolConfig } from 'pg';
import type {
    StorageAdapter,
    Genome,
    UserDNA,
    Interaction,
    MutationLog,
    SemanticFact,
} from '@pga/core';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PostgresAdapterConfig {
    /**
     * PostgreSQL connection string
     * Example: "postgresql://user:pass@localhost:5432/dbname"
     */
    connectionString: string;

    /**
     * Maximum number of clients in the pool
     */
    maxConnections?: number;

    /**
     * Initialize database schema on first connection
     */
    autoInitialize?: boolean;
}

/**
 * PostgreSQL Storage Adapter
 *
 * @example
 * ```typescript
 * import { PostgresAdapter } from '@pga/adapters-storage-postgres';
 *
 * const adapter = new PostgresAdapter({
 *   connectionString: process.env.DATABASE_URL,
 *   autoInitialize: true,
 * });
 *
 * await adapter.initialize();
 * ```
 */
export class PostgresAdapter implements StorageAdapter {
    private pool: Pool;
    private config: Required<PostgresAdapterConfig>;

    /** Number of columns in a single pga_alleles INSERT row */
    private static readonly ALLELE_COLUMN_COUNT = 15;

    constructor(config: PostgresAdapterConfig) {
        this.config = {
            connectionString: config.connectionString,
            maxConnections: config.maxConnections ?? 20,
            autoInitialize: config.autoInitialize ?? true,
        };

        const poolConfig: PoolConfig = {
            connectionString: this.config.connectionString,
            max: this.config.maxConnections,
        };

        this.pool = new Pool(poolConfig);
    }

    /**
     * Initialize database schema
     */
    async initialize(): Promise<void> {
        if (!this.config.autoInitialize) {
            return;
        }

        try {
            const schemaPath = join(__dirname, '../sql/schema.sql');
            const schema = readFileSync(schemaPath, 'utf-8');

            await this.pool.query(schema);
            console.log('[PGA] PostgreSQL schema initialized');
        } catch (error) {
            throw new Error(
                `Failed to initialize PostgreSQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Save genome to database
     */
    async saveGenome(genome: Genome): Promise<void> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Upsert genome
            await client.query(
                `INSERT INTO pga_genomes (id, name, config, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                    name = $2,
                    config = $3,
                    updated_at = $5`,
                [
                    genome.id,
                    genome.name,
                    JSON.stringify(genome.config),
                    genome.createdAt,
                    genome.updatedAt,
                ],
            );

            // Delete existing alleles for this genome
            await client.query('DELETE FROM pga_alleles WHERE genome_id = $1', [genome.id]);

            // Collect all alleles across layers for a single batch insert
            const alleleRows: unknown[] = [];
            const valuePlaceholders: string[] = [];
            const COLS = PostgresAdapter.ALLELE_COLUMN_COUNT;
            let rowIndex = 0;

            for (const layer of [0, 1, 2] as const) {
                const layerKey = `layer${layer}` as 'layer0' | 'layer1' | 'layer2';
                for (const allele of genome.layers[layerKey]) {
                    const base = rowIndex * COLS;
                    valuePlaceholders.push(
                        `(${Array.from({ length: COLS }, (_, i) => `$${base + i + 1}`).join(', ')})`,
                    );
                    alleleRows.push(
                        genome.id,
                        layer,
                        allele.gene,
                        allele.variant,
                        allele.content,
                        allele.fitness,
                        allele.sampleCount || 0,
                        allele.parentVariant,
                        allele.generation || 0,
                        allele.status,
                        allele.sandboxTested || false,
                        allele.sandboxScore,
                        JSON.stringify(allele.recentScores || []),
                        allele.createdAt,
                        new Date(),
                    );
                    rowIndex++;
                }
            }

            // Insert all alleles in a single query
            if (valuePlaceholders.length > 0) {
                await client.query(
                    `INSERT INTO pga_alleles (
                        genome_id, layer, gene, variant, content, fitness,
                        sample_count, parent_variant, generation, status,
                        sandbox_tested, sandbox_score, recent_scores,
                        created_at, updated_at
                    ) VALUES ${valuePlaceholders.join(', ')}`,
                    alleleRows,
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Load genome from database
     */
    async loadGenome(genomeId: string): Promise<Genome | null> {
        const result = await this.pool.query(
            'SELECT * FROM pga_genomes WHERE id = $1',
            [genomeId],
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];

        // Load alleles
        const allelesResult = await this.pool.query(
            'SELECT * FROM pga_alleles WHERE genome_id = $1 ORDER BY layer, gene, fitness DESC',
            [genomeId],
        );

        const layer0 = [];
        const layer1 = [];
        const layer2 = [];

        for (const alleleRow of allelesResult.rows) {
            const allele = {
                gene: alleleRow.gene,
                variant: alleleRow.variant,
                content: alleleRow.content,
                fitness: parseFloat(alleleRow.fitness),
                sampleCount: alleleRow.sample_count,
                parentVariant: alleleRow.parent_variant,
                generation: alleleRow.generation,
                status: alleleRow.status as 'active' | 'retired',
                sandboxTested: alleleRow.sandbox_tested,
                sandboxScore: alleleRow.sandbox_score ? parseFloat(alleleRow.sandbox_score) : undefined,
                recentScores: alleleRow.recent_scores || [],
                createdAt: alleleRow.created_at,
            };

            if (alleleRow.layer === 0) layer0.push(allele);
            else if (alleleRow.layer === 1) layer1.push(allele);
            else if (alleleRow.layer === 2) layer2.push(allele);
        }

        return {
            id: row.id,
            name: row.name,
            config: row.config,
            layers: {
                layer0,
                layer1,
                layer2,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * List all genomes
     */
    async listGenomes(): Promise<Genome[]> {
        const result = await this.pool.query(
            `SELECT
                g.id, g.name, g.config, g.created_at AS genome_created_at, g.updated_at AS genome_updated_at,
                a.layer, a.gene, a.variant, a.content, a.fitness, a.sample_count, a.parent_variant,
                a.generation, a.status, a.sandbox_tested, a.sandbox_score, a.recent_scores,
                a.created_at AS allele_created_at
             FROM pga_genomes g
             LEFT JOIN pga_alleles a ON g.id = a.genome_id
             ORDER BY g.created_at DESC, a.layer, a.gene, a.fitness DESC`,
        );

        const genomesMap = new Map<string, Genome>();

        for (const row of result.rows) {
            if (!genomesMap.has(row.id)) {
                genomesMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    config: row.config,
                    layers: { layer0: [], layer1: [], layer2: [] },
                    createdAt: row.genome_created_at,
                    updatedAt: row.genome_updated_at,
                });
            }

            if (row.layer !== null) {
                const genome = genomesMap.get(row.id)!;
                const allele = {
                    gene: row.gene,
                    variant: row.variant,
                    content: row.content,
                    fitness: parseFloat(row.fitness),
                    sampleCount: row.sample_count,
                    parentVariant: row.parent_variant,
                    generation: row.generation,
                    status: row.status as 'active' | 'retired',
                    sandboxTested: row.sandbox_tested,
                    sandboxScore: row.sandbox_score ? parseFloat(row.sandbox_score) : undefined,
                    recentScores: row.recent_scores || [],
                    createdAt: row.allele_created_at,
                };
                if (row.layer === 0) genome.layers.layer0.push(allele);
                else if (row.layer === 1) genome.layers.layer1.push(allele);
                else if (row.layer === 2) genome.layers.layer2.push(allele);
            }
        }

        return [...genomesMap.values()];
    }

    /**
     * Delete genome
     */
    async deleteGenome(genomeId: string): Promise<void> {
        await this.pool.query('DELETE FROM pga_genomes WHERE id = $1', [genomeId]);
    }

    /**
     * Save user DNA profile
     */
    async saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void> {
        await this.pool.query(
            `INSERT INTO pga_user_dna (
                user_id, genome_id, traits, confidence, generation, last_evolved, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, genome_id) DO UPDATE SET
                traits = $3,
                confidence = $4,
                generation = $5,
                last_evolved = $6,
                updated_at = $7`,
            [
                userId,
                genomeId,
                JSON.stringify(dna.traits),
                JSON.stringify(dna.confidence),
                dna.generation,
                dna.lastEvolved,
                new Date(),
            ],
        );
    }

    /**
     * Load user DNA profile
     */
    async loadDNA(userId: string, genomeId: string): Promise<UserDNA | null> {
        const result = await this.pool.query(
            'SELECT * FROM pga_user_dna WHERE user_id = $1 AND genome_id = $2',
            [userId, genomeId],
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];

        return {
            userId: row.user_id,
            genomeId: row.genome_id,
            traits: row.traits,
            confidence: row.confidence,
            generation: row.generation,
            lastEvolved: row.last_evolved,
        };
    }

    /**
     * Record interaction
     */
    async recordInteraction(interaction: Interaction): Promise<void> {
        await this.pool.query(
            `INSERT INTO pga_interactions (
                genome_id, user_id, user_message, assistant_response,
                tool_calls, score, task_type, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                interaction.genomeId,
                interaction.userId,
                interaction.userMessage,
                interaction.assistantResponse,
                JSON.stringify(interaction.toolCalls),
                interaction.score,
                interaction.taskType,
                interaction.timestamp,
            ],
        );
    }

    /**
     * Log mutation
     */
    async logMutation(mutation: MutationLog): Promise<void> {
        await this.pool.query(
            `INSERT INTO pga_mutations (
                genome_id, layer, gene, variant, mutation_type,
                parent_variant, trigger_reason, fitness_delta,
                deployed, details, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                mutation.genomeId,
                mutation.layer,
                mutation.gene,
                mutation.variant,
                mutation.mutationType,
                mutation.parentVariant,
                mutation.triggerReason,
                mutation.fitnessDelta,
                mutation.deployed,
                JSON.stringify(mutation.details || {}),
                mutation.timestamp,
            ],
        );
    }

    /**
     * Get mutation history for a genome
     */
    async getMutationHistory(genomeId: string, limit: number = 100): Promise<MutationLog[]> {
        const result = await this.pool.query(
            `SELECT * FROM pga_mutations
             WHERE genome_id = $1
             ORDER BY timestamp DESC
             LIMIT $2`,
            [genomeId, limit],
        );

        return result.rows.map((row) => ({
            genomeId: row.genome_id,
            layer: row.layer,
            gene: row.gene,
            variant: row.variant,
            mutationType: row.mutation_type,
            parentVariant: row.parent_variant,
            triggerReason: row.trigger_reason,
            fitnessDelta: parseFloat(row.fitness_delta),
            deployed: row.deployed,
            details: row.details,
            createdAt: row.timestamp,
            timestamp: row.timestamp,
        }));
    }

    /**
     * Get mutation history for a specific gene
     */
    async getGeneMutationHistory(genomeId: string, gene: string, limit: number = 50): Promise<MutationLog[]> {
        const result = await this.pool.query(
            `SELECT * FROM pga_mutations
             WHERE genome_id = $1 AND gene = $2
             ORDER BY timestamp DESC
             LIMIT $3`,
            [genomeId, gene, limit],
        );

        return result.rows.map((row) => ({
            genomeId: row.genome_id,
            layer: row.layer,
            gene: row.gene,
            variant: row.variant,
            mutationType: row.mutation_type,
            parentVariant: row.parent_variant,
            triggerReason: row.trigger_reason,
            fitnessDelta: parseFloat(row.fitness_delta),
            deployed: row.deployed,
            details: row.details,
            createdAt: row.timestamp,
            timestamp: row.timestamp,
        }));
    }

    /**
     * Get recent interactions
     */
    async getRecentInteractions(genomeId: string, userId: string, limit: number = 20): Promise<unknown[]> {
        const result = await this.pool.query(
            `SELECT * FROM pga_interactions
             WHERE genome_id = $1 AND user_id = $2
             ORDER BY timestamp DESC
             LIMIT $3`,
            [genomeId, userId, limit],
        );

        return result.rows.map((row) => ({
            genomeId: row.genome_id,
            userId: row.user_id,
            userMessage: row.user_message,
            assistantResponse: row.assistant_response,
            toolCalls: row.tool_calls,
            score: row.score ? parseFloat(row.score) : undefined,
            timestamp: row.timestamp,
        }));
    }

    /**
     * Record user feedback
     */
    async recordFeedback(feedback: {
        genomeId: string;
        userId: string;
        gene: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        timestamp: Date;
    }): Promise<void> {
        await this.pool.query(
            `INSERT INTO pga_feedback (
                genome_id, user_id, gene, sentiment, timestamp
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
                feedback.genomeId,
                feedback.userId,
                feedback.gene,
                feedback.sentiment,
                feedback.timestamp,
            ],
        );
    }

    /**
     * Get analytics for genome
     */
    async getAnalytics(genomeId: string): Promise<{
        totalMutations: number;
        totalInteractions: number;
        avgFitnessImprovement: number;
        userSatisfaction: number;
        topGenes: Array<{ gene: string; fitness: number }>;
    }> {
        const [
            interactionsResult,
            mutationsResult,
            feedbackResult,
            topGenesResult,
        ] = await Promise.all([
            this.pool.query(
                'SELECT COUNT(*) as count FROM pga_interactions WHERE genome_id = $1',
                [genomeId],
            ),
            this.pool.query(
                'SELECT COUNT(*) as count, AVG(fitness_improvement) as avg_improvement FROM pga_mutations WHERE genome_id = $1 AND deployed = true',
                [genomeId],
            ),
            this.pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive,
                    COUNT(*) as total
                 FROM pga_feedback WHERE genome_id = $1`,
                [genomeId],
            ),
            this.pool.query(
                `SELECT gene, AVG(sandbox_score) as fitness
                 FROM pga_mutations
                 WHERE genome_id = $1 AND deployed = true
                 GROUP BY gene
                 ORDER BY fitness DESC
                 LIMIT 5`,
                [genomeId],
            ),
        ]);

        const totalFeedback = parseInt(feedbackResult.rows[0]?.total || '0');
        const positiveFeedback = parseInt(feedbackResult.rows[0]?.positive || '0');

        return {
            totalMutations: parseInt(mutationsResult.rows[0]?.count || '0'),
            totalInteractions: parseInt(interactionsResult.rows[0]?.count || '0'),
            avgFitnessImprovement: parseFloat(mutationsResult.rows[0]?.avg_improvement || '0'),
            userSatisfaction: totalFeedback > 0 ? positiveFeedback / totalFeedback : 0,
            topGenes: topGenesResult.rows.map((row) => ({
                gene: row.gene,
                fitness: parseFloat(row.fitness || '0'),
            })),
        };
    }

    // ─── Semantic Facts (Layered Memory) ──────────────────────

    /**
     * Save semantic fact
     */
    async saveFact(fact: SemanticFact, userId: string, genomeId: string): Promise<void> {
        await this.pool.query(
            `INSERT INTO semantic_facts (
                id, user_id, genome_id, fact, category, confidence,
                source_turn, source_interaction_id, extracted_at,
                expiry, verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                fact = $4,
                category = $5,
                confidence = $6,
                verified = $11,
                expiry = $10,
                updated_at = NOW()`,
            [
                fact.id,
                userId,
                genomeId,
                fact.fact,
                fact.category,
                fact.confidence,
                fact.sourceTurn,
                fact.sourceInteractionId,
                fact.extractedAt,
                fact.expiry,
                fact.verified,
            ],
        );
    }

    /**
     * Get all facts for a user/genome
     */
    async getFacts(userId: string, genomeId: string, includeExpired: boolean = false): Promise<SemanticFact[]> {
        const query = includeExpired
            ? `SELECT * FROM semantic_facts
               WHERE user_id = $1 AND genome_id = $2
               ORDER BY verified DESC, confidence DESC, extracted_at DESC`
            : `SELECT * FROM semantic_facts
               WHERE user_id = $1 AND genome_id = $2
               AND (expiry IS NULL OR expiry > NOW())
               ORDER BY verified DESC, confidence DESC, extracted_at DESC`;

        const result = await this.pool.query(query, [userId, genomeId]);

        return result.rows.map((row) => ({
            id: row.id,
            fact: row.fact,
            category: row.category,
            confidence: parseFloat(row.confidence),
            sourceTurn: row.source_turn,
            sourceInteractionId: row.source_interaction_id,
            extractedAt: row.extracted_at,
            expiry: row.expiry,
            verified: row.verified,
        }));
    }

    /**
     * Get specific fact by ID
     */
    async getFact(factId: string): Promise<SemanticFact | null> {
        const result = await this.pool.query(
            'SELECT * FROM semantic_facts WHERE id = $1',
            [factId],
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            fact: row.fact,
            category: row.category,
            confidence: parseFloat(row.confidence),
            sourceTurn: row.source_turn,
            sourceInteractionId: row.source_interaction_id,
            extractedAt: row.extracted_at,
            expiry: row.expiry,
            verified: row.verified,
        };
    }

    /**
     * Update existing fact
     */
    async updateFact(factId: string, updates: Partial<SemanticFact>): Promise<void> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.fact !== undefined) {
            setClauses.push(`fact = $${paramIndex++}`);
            values.push(updates.fact);
        }
        if (updates.category !== undefined) {
            setClauses.push(`category = $${paramIndex++}`);
            values.push(updates.category);
        }
        if (updates.confidence !== undefined) {
            setClauses.push(`confidence = $${paramIndex++}`);
            values.push(updates.confidence);
        }
        if (updates.verified !== undefined) {
            setClauses.push(`verified = $${paramIndex++}`);
            values.push(updates.verified);
        }
        if (updates.expiry !== undefined) {
            setClauses.push(`expiry = $${paramIndex++}`);
            values.push(updates.expiry);
        }

        if (setClauses.length === 0) {
            return; // Nothing to update
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(factId);

        const query = `UPDATE semantic_facts SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
        await this.pool.query(query, values);
    }

    /**
     * Delete specific fact
     */
    async deleteFact(factId: string): Promise<void> {
        await this.pool.query('DELETE FROM semantic_facts WHERE id = $1', [factId]);
    }

    /**
     * Delete all facts for a user/genome
     */
    async deleteUserFacts(userId: string, genomeId: string): Promise<void> {
        await this.pool.query(
            'DELETE FROM semantic_facts WHERE user_id = $1 AND genome_id = $2',
            [userId, genomeId],
        );
    }

    /**
     * Clean expired facts (returns count of deleted facts)
     */
    async cleanExpiredFacts(userId: string, genomeId: string): Promise<number> {
        const result = await this.pool.query(
            `DELETE FROM semantic_facts
             WHERE user_id = $1 AND genome_id = $2
             AND expiry IS NOT NULL AND expiry <= NOW()
             RETURNING id`,
            [userId, genomeId],
        );

        return result.rowCount || 0;
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        await this.pool.end();
    }
}
