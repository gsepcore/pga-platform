/**
 * FileStorageAdapter — Persistent storage using JSON files on disk
 *
 * Zero-dependency, zero-config persistent storage for GSEP.
 * Stores data in ~/.gsep/<agentName>/ as JSON files.
 * Drop-in replacement for InMemoryStorageAdapter.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-01
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, UserDNA, MutationLog, GeneRegistryEntry } from '../types/index.js';
import type { SemanticFact } from '../memory/LayeredMemory.js';

export interface FileStorageOptions {
    /** Directory to store data (default: ~/.gsep/<agentName>) */
    dir?: string;
    /** Agent name used as subdirectory (default: "default") */
    agentName?: string;
    /** Maximum entries per unbounded collection (default: 10000) */
    maxEntries?: number;
}

export class FileStorageAdapter implements StorageAdapter {
    private readonly dir: string;
    private readonly maxEntries: number;

    // In-memory cache (loaded from disk on init, flushed on write)
    private genomes = new Map<string, Genome>();
    private dna = new Map<string, UserDNA>();
    private mutations: MutationLog[] = [];
    private interactions: Array<Record<string, unknown>> = [];
    private feedbackRecords: Array<Record<string, unknown>> = [];
    private facts = new Map<string, SemanticFact>();
    private factIndex = new Map<string, string[]>();
    private geneRegistry: GeneRegistryEntry[] = [];
    private calibrationPoints: Array<Record<string, unknown>> = [];

    constructor(options?: FileStorageOptions) {
        const agentName = options?.agentName ?? 'default';
        this.dir = options?.dir ?? join(homedir(), '.gsep', agentName);
        this.maxEntries = options?.maxEntries ?? 10_000;
    }

    async initialize(): Promise<void> {
        mkdirSync(this.dir, { recursive: true });
        this.loadAll();
    }

    // ─── Disk I/O ───────────────────────────────────────────

    private filePath(name: string): string {
        return join(this.dir, `${name}.json`);
    }

    private readJSON<T>(name: string, fallback: T): T {
        const path = this.filePath(name);
        if (!existsSync(path)) return fallback;
        try {
            return JSON.parse(readFileSync(path, 'utf-8'));
        } catch {
            return fallback;
        }
    }

    private writeJSON(name: string, data: unknown): void {
        writeFileSync(this.filePath(name), JSON.stringify(data), 'utf-8');
    }

    private loadAll(): void {
        // Genomes
        const genomeEntries = this.readJSON<Array<[string, Genome]>>('genomes', []);
        this.genomes = new Map(genomeEntries);

        // DNA
        const dnaEntries = this.readJSON<Array<[string, UserDNA]>>('dna', []);
        this.dna = new Map(dnaEntries);

        // Mutations
        this.mutations = this.readJSON<MutationLog[]>('mutations', []);

        // Interactions
        this.interactions = this.readJSON<Array<Record<string, unknown>>>('interactions', []);

        // Feedback
        this.feedbackRecords = this.readJSON<Array<Record<string, unknown>>>('feedback', []);

        // Facts
        const factEntries = this.readJSON<Array<[string, SemanticFact]>>('facts', []);
        this.facts = new Map(factEntries);
        const indexEntries = this.readJSON<Array<[string, string[]]>>('fact-index', []);
        this.factIndex = new Map(indexEntries);

        // Gene Registry
        this.geneRegistry = this.readJSON<GeneRegistryEntry[]>('gene-registry', []);

        // Calibration
        this.calibrationPoints = this.readJSON<Array<Record<string, unknown>>>('calibration', []);
    }

    private flushGenomes(): void { this.writeJSON('genomes', Array.from(this.genomes.entries())); }
    private flushDNA(): void { this.writeJSON('dna', Array.from(this.dna.entries())); }
    private flushMutations(): void { this.writeJSON('mutations', this.mutations); }
    private flushInteractions(): void { this.writeJSON('interactions', this.interactions); }
    private flushFeedback(): void { this.writeJSON('feedback', this.feedbackRecords); }
    private flushFacts(): void {
        this.writeJSON('facts', Array.from(this.facts.entries()));
        this.writeJSON('fact-index', Array.from(this.factIndex.entries()));
    }
    private flushGeneRegistry(): void { this.writeJSON('gene-registry', this.geneRegistry); }
    private flushCalibration(): void { this.writeJSON('calibration', this.calibrationPoints); }

    private trimArray<T>(arr: T[]): void {
        if (arr.length > this.maxEntries) {
            arr.splice(0, arr.length - this.maxEntries);
        }
    }

    // ─── Genome Operations ──────────────────────────────────

    async saveGenome(genome: Genome): Promise<void> {
        this.genomes.set(genome.id, structuredClone(genome));
        this.flushGenomes();
    }

    async loadGenome(genomeId: string): Promise<Genome | null> {
        const genome = this.genomes.get(genomeId);
        return genome ? structuredClone(genome) : null;
    }

    async deleteGenome(genomeId: string): Promise<void> {
        this.genomes.delete(genomeId);
        this.flushGenomes();
    }

    async listGenomes(): Promise<Genome[]> {
        return Array.from(this.genomes.values()).map(g => structuredClone(g));
    }

    // ─── User DNA ───────────────────────────────────────────

    async saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void> {
        this.dna.set(`${userId}:${genomeId}`, structuredClone(dna));
        this.flushDNA();
    }

    async loadDNA(userId: string, genomeId: string): Promise<UserDNA | null> {
        const dna = this.dna.get(`${userId}:${genomeId}`);
        return dna ? structuredClone(dna) : null;
    }

    // ─── Mutations ──────────────────────────────────────────

    async logMutation(mutation: MutationLog): Promise<void> {
        this.mutations.push(structuredClone(mutation));
        this.trimArray(this.mutations);
        this.flushMutations();
    }

    async getMutationHistory(genomeId: string, limit = 100): Promise<MutationLog[]> {
        return this.mutations
            .filter(m => m.genomeId === genomeId)
            .slice(-limit);
    }

    async getGeneMutationHistory(genomeId: string, gene: string, limit = 50): Promise<MutationLog[]> {
        return this.mutations
            .filter(m => m.genomeId === genomeId && m.gene === gene)
            .slice(-limit);
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
        this.interactions.push({ ...interaction });
        this.trimArray(this.interactions);
        this.flushInteractions();
    }

    async getRecentInteractions(genomeId: string, userId: string, limit = 20): Promise<unknown[]> {
        return this.interactions
            .filter(i => i.genomeId === genomeId && i.userId === userId)
            .slice(-limit);
    }

    // ─── Feedback ───────────────────────────────────────────

    async recordFeedback(feedback: {
        genomeId: string;
        userId: string;
        gene: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        timestamp: Date;
    }): Promise<void> {
        this.feedbackRecords.push({ ...feedback });
        this.trimArray(this.feedbackRecords);
        this.flushFeedback();
    }

    // ─── Analytics ──────────────────────────────────────────

    async getAnalytics(genomeId: string): Promise<{
        totalMutations: number;
        totalInteractions: number;
        avgFitnessImprovement: number;
        userSatisfaction: number;
        topGenes: Array<{ gene: string; fitness: number }>;
    }> {
        const genomeMutations = this.mutations.filter(m => m.genomeId === genomeId);
        const genomeInteractions = this.interactions.filter(i => i.genomeId === genomeId);

        return {
            totalMutations: genomeMutations.length,
            totalInteractions: genomeInteractions.length,
            avgFitnessImprovement: genomeMutations.length > 0
                ? genomeMutations.reduce((sum, m) => sum + (m.fitnessDelta ?? 0), 0) / genomeMutations.length
                : 0,
            userSatisfaction: 0.7,
            topGenes: [],
        };
    }

    // ─── Semantic Facts ─────────────────────────────────────

    async saveFact(fact: SemanticFact, userId: string, genomeId: string): Promise<void> {
        this.facts.set(fact.id, structuredClone(fact));
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        if (!ids.includes(fact.id)) ids.push(fact.id);
        this.factIndex.set(key, ids);
        this.flushFacts();
    }

    async getFacts(userId: string, genomeId: string, includeExpired = false): Promise<SemanticFact[]> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        const results: SemanticFact[] = [];
        for (const id of ids) {
            const fact = this.facts.get(id);
            if (fact) {
                if (includeExpired || !fact.expiry || new Date(fact.expiry) > new Date()) {
                    results.push(structuredClone(fact));
                }
            }
        }
        return results;
    }

    async getFact(factId: string): Promise<SemanticFact | null> {
        const fact = this.facts.get(factId);
        return fact ? structuredClone(fact) : null;
    }

    async updateFact(factId: string, updates: Partial<SemanticFact>): Promise<void> {
        const existing = this.facts.get(factId);
        if (existing) {
            this.facts.set(factId, { ...existing, ...updates });
            this.flushFacts();
        }
    }

    async deleteFact(factId: string): Promise<void> {
        this.facts.delete(factId);
        for (const [key, ids] of this.factIndex.entries()) {
            const filtered = ids.filter(id => id !== factId);
            if (filtered.length !== ids.length) this.factIndex.set(key, filtered);
        }
        this.flushFacts();
    }

    async deleteUserFacts(userId: string, genomeId: string): Promise<void> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        for (const id of ids) this.facts.delete(id);
        this.factIndex.delete(key);
        this.flushFacts();
    }

    async cleanExpiredFacts(userId: string, genomeId: string): Promise<number> {
        const key = `${userId}:${genomeId}`;
        const ids = this.factIndex.get(key) ?? [];
        let cleaned = 0;
        const now = new Date();
        const remaining: string[] = [];
        for (const id of ids) {
            const fact = this.facts.get(id);
            if (fact?.expiry && new Date(fact.expiry) <= now) {
                this.facts.delete(id);
                cleaned++;
            } else {
                remaining.push(id);
            }
        }
        this.factIndex.set(key, remaining);
        if (cleaned > 0) this.flushFacts();
        return cleaned;
    }

    // ─── Gene Registry ──────────────────────────────────────

    async saveToGeneRegistry(entry: GeneRegistryEntry): Promise<void> {
        this.geneRegistry.push(structuredClone(entry));
        this.trimArray(this.geneRegistry);
        this.flushGeneRegistry();
    }

    async queryGeneRegistry(familyId: string, gene?: string, minFitness = 0): Promise<GeneRegistryEntry[]> {
        return this.geneRegistry.filter(e =>
            e.familyId === familyId &&
            (!gene || e.gene === gene) &&
            e.fitness >= minFitness,
        );
    }

    async getBestRegistryGene(familyId: string, gene: string): Promise<GeneRegistryEntry | null> {
        const entries = await this.queryGeneRegistry(familyId, gene);
        if (entries.length === 0) return null;
        return entries.sort((a, b) => b.fitness - a.fitness)[0];
    }

    // ─── Calibration ────────────────────────────────────────

    async saveCalibrationPoint(point: {
        contextKey: string; layer?: 0 | 1 | 2; operator?: string; taskType?: string;
        threshold: number; totalCandidates: number; passedSandbox: number;
        deployedSuccessfully: number; rolledBack: number; falsePositiveRate: number;
        falseNegativeRate: number; optimalThreshold: number; timestamp: Date;
    }): Promise<void> {
        this.calibrationPoints.push(structuredClone(point) as Record<string, unknown>);
        this.trimArray(this.calibrationPoints);
        this.flushCalibration();
    }

    async getCalibrationHistory(contextKey: string, limit = 50): Promise<Array<{
        contextKey: string; layer?: number; operator?: string; taskType?: string;
        threshold: number; totalCandidates: number; passedSandbox: number;
        deployedSuccessfully: number; rolledBack: number; falsePositiveRate: number;
        falseNegativeRate: number; optimalThreshold: number; timestamp: Date;
    }>> {
        return (this.calibrationPoints as Array<{ contextKey: string; timestamp: Date } & Record<string, unknown>>)
            .filter(p => p.contextKey === contextKey)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit) as never;
    }
}
