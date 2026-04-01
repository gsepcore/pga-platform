/**
 * SQLiteStorageAdapter — Persistent storage using better-sqlite3
 *
 * Single-file database for GSEP. All genome data, interactions,
 * mutations, security stats, and gene bank in one .sqlite file.
 *
 * Zero-config: just provide an agent name and it creates
 * ~/.gsep/<agentName>/gsep.sqlite automatically.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-01
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, UserDNA, MutationLog, GeneRegistryEntry } from '../types/index.js';
import type { SemanticFact } from '../memory/LayeredMemory.js';

export interface SQLiteStorageOptions {
    /** Full path to .sqlite file (overrides dir/agentName) */
    path?: string;
    /** Agent name used as subdirectory (default: "default") */
    agentName?: string;
    /** Directory to store data (default: ~/.gsep/<agentName>) */
    dir?: string;
}

export class SQLiteStorageAdapter implements StorageAdapter {
    private db!: Database.Database;
    private readonly dbPath: string;

    constructor(options?: SQLiteStorageOptions) {
        if (options?.path) {
            this.dbPath = options.path;
        } else {
            const agentName = options?.agentName ?? 'default';
            const dir = options?.dir ?? join(homedir(), '.gsep', agentName);
            mkdirSync(dir, { recursive: true });
            this.dbPath = join(dir, 'gsep.sqlite');
        }
    }

    async initialize(): Promise<void> {
        this.db = new Database(this.dbPath);

        // Enable WAL mode for better concurrent read performance
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');

        this.createTables();
    }

    private createTables(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS genomes (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS user_dna (
                key TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS mutations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                genome_id TEXT NOT NULL,
                gene TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_mutations_genome ON mutations(genome_id);
            CREATE INDEX IF NOT EXISTS idx_mutations_gene ON mutations(genome_id, gene);

            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                genome_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_message TEXT NOT NULL,
                assistant_response TEXT NOT NULL,
                tool_calls TEXT DEFAULT '[]',
                score REAL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_interactions_genome_user ON interactions(genome_id, user_id);

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                genome_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                gene TEXT NOT NULL,
                sentiment TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS semantic_facts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                genome_id TEXT NOT NULL,
                data TEXT NOT NULL,
                expiry TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_facts_user_genome ON semantic_facts(user_id, genome_id);

            CREATE TABLE IF NOT EXISTS gene_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                family_id TEXT NOT NULL,
                gene TEXT NOT NULL,
                fitness REAL NOT NULL DEFAULT 0,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_registry_family ON gene_registry(family_id);
            CREATE INDEX IF NOT EXISTS idx_registry_gene ON gene_registry(family_id, gene);

            CREATE TABLE IF NOT EXISTS calibration_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                context_key TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_calibration_key ON calibration_points(context_key);

            CREATE TABLE IF NOT EXISTS security_stats (
                id TEXT PRIMARY KEY DEFAULT 'current',
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );
        `);
    }

    /**
     * Close the database connection
     */
    close(): void {
        if (this.db) {
            this.db.close();
        }
    }

    /**
     * Get the database path
     */
    getPath(): string {
        return this.dbPath;
    }

    // ─── Genome Operations ──────────────────────────────────

    async saveGenome(genome: Genome): Promise<void> {
        this.db.prepare(
            'INSERT OR REPLACE INTO genomes (id, data, updated_at) VALUES (?, ?, datetime(\'now\'))'
        ).run(genome.id, JSON.stringify(genome));
    }

    async loadGenome(genomeId: string): Promise<Genome | null> {
        const row = this.db.prepare('SELECT data FROM genomes WHERE id = ?').get(genomeId) as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }

    async deleteGenome(genomeId: string): Promise<void> {
        this.db.prepare('DELETE FROM genomes WHERE id = ?').run(genomeId);
    }

    async listGenomes(): Promise<Genome[]> {
        const rows = this.db.prepare('SELECT data FROM genomes ORDER BY updated_at DESC').all() as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data));
    }

    // ─── User DNA ───────────────────────────────────────────

    async saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void> {
        this.db.prepare(
            'INSERT OR REPLACE INTO user_dna (key, data, updated_at) VALUES (?, ?, datetime(\'now\'))'
        ).run(`${userId}:${genomeId}`, JSON.stringify(dna));
    }

    async loadDNA(userId: string, genomeId: string): Promise<UserDNA | null> {
        const row = this.db.prepare('SELECT data FROM user_dna WHERE key = ?').get(`${userId}:${genomeId}`) as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }

    // ─── Mutations ──────────────────────────────────────────

    async logMutation(mutation: MutationLog): Promise<void> {
        this.db.prepare(
            'INSERT INTO mutations (genome_id, gene, data) VALUES (?, ?, ?)'
        ).run(mutation.genomeId, mutation.gene, JSON.stringify(mutation));
    }

    async getMutationHistory(genomeId: string, limit = 100): Promise<MutationLog[]> {
        const rows = this.db.prepare(
            'SELECT data FROM mutations WHERE genome_id = ? ORDER BY id DESC LIMIT ?'
        ).all(genomeId, limit) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data)).reverse();
    }

    async getGeneMutationHistory(genomeId: string, gene: string, limit = 50): Promise<MutationLog[]> {
        const rows = this.db.prepare(
            'SELECT data FROM mutations WHERE genome_id = ? AND gene = ? ORDER BY id DESC LIMIT ?'
        ).all(genomeId, gene, limit) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data)).reverse();
    }

    // ─── Interactions ───────────────────────────────────────

    async recordInteraction(interaction: {
        genomeId: string;
        userId: string;
        userMessage: string;
        assistantResponse: string;
        toolCalls: unknown[];
        score?: number;
        timestamp: Date;
    }): Promise<void> {
        this.db.prepare(
            'INSERT INTO interactions (genome_id, user_id, user_message, assistant_response, tool_calls, score) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
            interaction.genomeId,
            interaction.userId,
            interaction.userMessage,
            interaction.assistantResponse,
            JSON.stringify(interaction.toolCalls),
            interaction.score ?? null,
        );
    }

    async getRecentInteractions(genomeId: string, userId: string, limit = 20): Promise<unknown[]> {
        const rows = this.db.prepare(
            'SELECT genome_id, user_id, user_message, assistant_response, tool_calls, score, created_at FROM interactions WHERE genome_id = ? AND user_id = ? ORDER BY id DESC LIMIT ?'
        ).all(genomeId, userId, limit) as Array<Record<string, unknown>>;

        return rows.reverse().map(r => ({
            genomeId: r.genome_id,
            userId: r.user_id,
            userMessage: r.user_message,
            assistantResponse: r.assistant_response,
            toolCalls: JSON.parse(r.tool_calls as string),
            score: r.score,
            timestamp: new Date(r.created_at as string),
        }));
    }

    // ─── Feedback ───────────────────────────────────────────

    async recordFeedback(feedback: {
        genomeId: string;
        userId: string;
        gene: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        timestamp: Date;
    }): Promise<void> {
        this.db.prepare(
            'INSERT INTO feedback (genome_id, user_id, gene, sentiment) VALUES (?, ?, ?, ?)'
        ).run(feedback.genomeId, feedback.userId, feedback.gene, feedback.sentiment);
    }

    // ─── Analytics ──────────────────────────────────────────

    async getAnalytics(genomeId: string): Promise<{
        totalMutations: number;
        totalInteractions: number;
        avgFitnessImprovement: number;
        userSatisfaction: number;
        topGenes: Array<{ gene: string; fitness: number }>;
    }> {
        const mutCount = this.db.prepare(
            'SELECT COUNT(*) as cnt FROM mutations WHERE genome_id = ?'
        ).get(genomeId) as { cnt: number };

        const intCount = this.db.prepare(
            'SELECT COUNT(*) as cnt FROM interactions WHERE genome_id = ?'
        ).get(genomeId) as { cnt: number };

        // Avg fitness delta from mutations that have it
        const rows = this.db.prepare(
            'SELECT data FROM mutations WHERE genome_id = ?'
        ).all(genomeId) as Array<{ data: string }>;

        let totalDelta = 0;
        let deltaCount = 0;
        for (const row of rows) {
            const m = JSON.parse(row.data) as MutationLog;
            if (m.fitnessDelta !== undefined) {
                totalDelta += m.fitnessDelta;
                deltaCount++;
            }
        }

        return {
            totalMutations: mutCount.cnt,
            totalInteractions: intCount.cnt,
            avgFitnessImprovement: deltaCount > 0 ? totalDelta / deltaCount : 0,
            userSatisfaction: 0.7,
            topGenes: [],
        };
    }

    // ─── Semantic Facts ─────────────────────────────────────

    async saveFact(fact: SemanticFact, userId: string, genomeId: string): Promise<void> {
        this.db.prepare(
            'INSERT OR REPLACE INTO semantic_facts (id, user_id, genome_id, data, expiry, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
        ).run(fact.id, userId, genomeId, JSON.stringify(fact), fact.expiry ? new Date(fact.expiry).toISOString() : null);
    }

    async getFacts(userId: string, genomeId: string, includeExpired = false): Promise<SemanticFact[]> {
        let sql = 'SELECT data FROM semantic_facts WHERE user_id = ? AND genome_id = ?';
        if (!includeExpired) {
            sql += ' AND (expiry IS NULL OR expiry > datetime(\'now\'))';
        }
        const rows = this.db.prepare(sql).all(userId, genomeId) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data));
    }

    async getFact(factId: string): Promise<SemanticFact | null> {
        const row = this.db.prepare('SELECT data FROM semantic_facts WHERE id = ?').get(factId) as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }

    async updateFact(factId: string, updates: Partial<SemanticFact>): Promise<void> {
        const existing = await this.getFact(factId);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.db.prepare(
                'UPDATE semantic_facts SET data = ?, updated_at = datetime(\'now\') WHERE id = ?'
            ).run(JSON.stringify(updated), factId);
        }
    }

    async deleteFact(factId: string): Promise<void> {
        this.db.prepare('DELETE FROM semantic_facts WHERE id = ?').run(factId);
    }

    async deleteUserFacts(userId: string, genomeId: string): Promise<void> {
        this.db.prepare('DELETE FROM semantic_facts WHERE user_id = ? AND genome_id = ?').run(userId, genomeId);
    }

    async cleanExpiredFacts(userId: string, genomeId: string): Promise<number> {
        const result = this.db.prepare(
            'DELETE FROM semantic_facts WHERE user_id = ? AND genome_id = ? AND expiry IS NOT NULL AND expiry <= datetime(\'now\')'
        ).run(userId, genomeId);
        return result.changes;
    }

    // ─── Gene Registry ──────────────────────────────────────

    async saveToGeneRegistry(entry: GeneRegistryEntry): Promise<void> {
        this.db.prepare(
            'INSERT INTO gene_registry (family_id, gene, fitness, data) VALUES (?, ?, ?, ?)'
        ).run(entry.familyId, entry.gene, entry.fitness, JSON.stringify(entry));
    }

    async queryGeneRegistry(familyId: string, gene?: string, minFitness = 0): Promise<GeneRegistryEntry[]> {
        let sql = 'SELECT data FROM gene_registry WHERE family_id = ? AND fitness >= ?';
        const params: unknown[] = [familyId, minFitness];
        if (gene) {
            sql += ' AND gene = ?';
            params.push(gene);
        }
        sql += ' ORDER BY fitness DESC';
        const rows = this.db.prepare(sql).all(...params) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data));
    }

    async getBestRegistryGene(familyId: string, gene: string): Promise<GeneRegistryEntry | null> {
        const row = this.db.prepare(
            'SELECT data FROM gene_registry WHERE family_id = ? AND gene = ? ORDER BY fitness DESC LIMIT 1'
        ).get(familyId, gene) as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }

    // ─── Calibration ────────────────────────────────────────

    async saveCalibrationPoint(point: {
        contextKey: string; layer?: 0 | 1 | 2; operator?: string; taskType?: string;
        threshold: number; totalCandidates: number; passedSandbox: number;
        deployedSuccessfully: number; rolledBack: number; falsePositiveRate: number;
        falseNegativeRate: number; optimalThreshold: number; timestamp: Date;
    }): Promise<void> {
        this.db.prepare(
            'INSERT INTO calibration_points (context_key, data) VALUES (?, ?)'
        ).run(point.contextKey, JSON.stringify(point));
    }

    async getCalibrationHistory(contextKey: string, limit = 50): Promise<Array<{
        contextKey: string; layer?: number; operator?: string; taskType?: string;
        threshold: number; totalCandidates: number; passedSandbox: number;
        deployedSuccessfully: number; rolledBack: number; falsePositiveRate: number;
        falseNegativeRate: number; optimalThreshold: number; timestamp: Date;
    }>> {
        const rows = this.db.prepare(
            'SELECT data FROM calibration_points WHERE context_key = ? ORDER BY id DESC LIMIT ?'
        ).all(contextKey, limit) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data)).reverse();
    }

    // ─── Security Stats (C3/C4 persistence) ─────────────────

    saveSecurityStats(stats: Record<string, unknown>): void {
        this.db.prepare(
            'INSERT OR REPLACE INTO security_stats (id, data, updated_at) VALUES (\'current\', ?, datetime(\'now\'))'
        ).run(JSON.stringify(stats));
    }

    loadSecurityStats(): Record<string, unknown> | null {
        const row = this.db.prepare('SELECT data FROM security_stats WHERE id = \'current\'').get() as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }
}
