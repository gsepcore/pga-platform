/**
 * SQLiteGeneStorage — Gene Bank persistence using better-sqlite3
 *
 * Stores cognitive genes in the same SQLite database as the main storage.
 * Zero-config, included by default in quickStart.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-01
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { GeneStorageAdapter, GeneSearchFilters } from '../GeneBank.js';
import type { SharingScope } from '../CognitiveGene.js';

export interface SQLiteGeneStorageOptions {
    /** Full path to .sqlite file */
    path?: string;
    /** Agent name used as subdirectory (default: "default") */
    agentName?: string;
    /** Existing database instance to reuse */
    db?: Database.Database;
}

export class SQLiteGeneStorage implements GeneStorageAdapter {
    private db!: Database.Database;
    private ownsDb: boolean;

    constructor(private options: SQLiteGeneStorageOptions = {}) {
        this.ownsDb = !options.db;
    }

    async initialize(): Promise<void> {
        if (this.options.db) {
            this.db = this.options.db;
        } else {
            const agentName = this.options.agentName ?? 'default';
            const dir = join(homedir(), '.gsep', agentName);
            mkdirSync(dir, { recursive: true });
            const dbPath = this.options.path ?? join(dir, 'gsep.sqlite');
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL');
        }

        this.createTables();
    }

    private createTables(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cognitive_genes (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                scope TEXT NOT NULL DEFAULT 'private',
                type TEXT NOT NULL,
                domain TEXT NOT NULL,
                data TEXT NOT NULL,
                fitness REAL NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_genes_tenant ON cognitive_genes(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_genes_type ON cognitive_genes(type);
            CREATE INDEX IF NOT EXISTS idx_genes_domain ON cognitive_genes(domain);
            CREATE INDEX IF NOT EXISTS idx_genes_fitness ON cognitive_genes(fitness);

            CREATE TABLE IF NOT EXISTS gene_adoptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gene_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                performance REAL NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (gene_id) REFERENCES cognitive_genes(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_adoptions_gene ON gene_adoptions(gene_id);
        `);
    }

    close(): void {
        if (this.ownsDb && this.db) {
            this.db.close();
        }
    }

    /**
     * Get the raw database instance (for sharing with SQLiteStorageAdapter)
     */
    getDatabase(): Database.Database {
        return this.db;
    }

    // ─── GeneStorageAdapter Implementation ──────────────────

    async store(gene: CognitiveGene): Promise<void> {
        this.db.prepare(
            'INSERT OR REPLACE INTO cognitive_genes (id, tenant_id, scope, type, domain, data, fitness, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
        ).run(
            gene.id,
            gene.tenant.tenantId,
            gene.tenant.scope,
            gene.type,
            gene.domain,
            JSON.stringify(gene),
            gene.fitness.overallFitness,
        );
    }

    async get(geneId: string): Promise<CognitiveGene | null> {
        const row = this.db.prepare('SELECT data FROM cognitive_genes WHERE id = ?').get(geneId) as { data: string } | undefined;
        return row ? JSON.parse(row.data) : null;
    }

    async update(gene: CognitiveGene): Promise<void> {
        const exists = this.db.prepare('SELECT 1 FROM cognitive_genes WHERE id = ?').get(gene.id);
        if (!exists) throw new Error(`Gene not found: ${gene.id}`);
        await this.store(gene);
    }

    async delete(geneId: string): Promise<void> {
        this.db.prepare('DELETE FROM cognitive_genes WHERE id = ?').run(geneId);
    }

    async search(filters: GeneSearchFilters): Promise<CognitiveGene[]> {
        let sql = 'SELECT data FROM cognitive_genes WHERE 1=1';
        const params: unknown[] = [];

        if (filters.tenantId) {
            sql += ' AND tenant_id = ?';
            params.push(filters.tenantId);
        }
        if (filters.type && filters.type.length > 0) {
            sql += ` AND type IN (${filters.type.map(() => '?').join(',')})`;
            params.push(...filters.type);
        }
        if (filters.domain && filters.domain.length > 0) {
            sql += ` AND domain IN (${filters.domain.map(() => '?').join(',')})`;
            params.push(...filters.domain);
        }
        if (filters.minFitness !== undefined) {
            sql += ' AND fitness >= ?';
            params.push(filters.minFitness);
        }

        // Sort
        const sortBy = filters.sortBy || 'fitness';
        if (sortBy === 'fitness') {
            sql += filters.sortOrder === 'asc' ? ' ORDER BY fitness ASC' : ' ORDER BY fitness DESC';
        } else if (sortBy === 'createdAt') {
            sql += filters.sortOrder === 'asc' ? ' ORDER BY created_at ASC' : ' ORDER BY created_at DESC';
        } else if (sortBy === 'updatedAt') {
            sql += filters.sortOrder === 'asc' ? ' ORDER BY updated_at ASC' : ' ORDER BY updated_at DESC';
        } else {
            sql += ' ORDER BY fitness DESC';
        }

        // Limit
        sql += ' LIMIT ?';
        params.push(filters.limit || 10);

        const rows = this.db.prepare(sql).all(...params) as Array<{ data: string }>;
        let results = rows.map(r => JSON.parse(r.data) as CognitiveGene);

        // Tag filter (done in JS since SQLite doesn't handle array contains natively)
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(g =>
                filters.tags!.some(tag => g.tags.includes(tag))
            );
        }

        return results;
    }

    async listByTenant(tenantId: string, scope?: SharingScope): Promise<CognitiveGene[]> {
        let sql = 'SELECT data FROM cognitive_genes WHERE tenant_id = ?';
        const params: unknown[] = [tenantId];
        if (scope) {
            sql += ' AND scope = ?';
            params.push(scope);
        }
        const rows = this.db.prepare(sql).all(...params) as Array<{ data: string }>;
        return rows.map(r => JSON.parse(r.data));
    }

    async getLineage(geneId: string): Promise<CognitiveGene[]> {
        const gene = await this.get(geneId);
        if (!gene) return [];

        const lineage: CognitiveGene[] = [];
        let currentGeneId: string | null = gene.lineage.parentGeneId;

        while (currentGeneId) {
            const parent = await this.get(currentGeneId);
            if (!parent) break;
            lineage.push(parent);
            currentGeneId = parent.lineage.parentGeneId;
        }

        return lineage;
    }

    async recordAdoption(geneId: string, agentId: string, performance: number): Promise<void> {
        this.db.prepare(
            'INSERT INTO gene_adoptions (gene_id, agent_id, performance) VALUES (?, ?, ?)'
        ).run(geneId, agentId, performance);

        // Update gene fitness
        const gene = await this.get(geneId);
        if (gene) {
            gene.fitness.adoptionCount++;

            const adoptions = this.db.prepare(
                'SELECT AVG(performance) as avg_perf FROM gene_adoptions WHERE gene_id = ?'
            ).get(geneId) as { avg_perf: number };

            gene.fitness.adoptionPerformance = adoptions.avg_perf;
            gene.updatedAt = new Date().toISOString();
            await this.store(gene);
        }
    }
}
