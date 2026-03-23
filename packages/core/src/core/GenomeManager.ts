/**
 * Genome Manager
 *
 * Handles genome creation, loading, and management
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, GenomeConfig } from '../types/index.js';

export class GenomeManager {
    constructor(private storage: StorageAdapter) {}

    async createGenome(options: {
        name: string;
        config: GenomeConfig;
    }): Promise<Genome> {
        const genome: Genome = {
            id: this.generateId(),
            name: options.name,
            config: options.config,
            layers: {
                layer0: this.getDefaultLayer0(),
                layer1: this.getDefaultLayer1(),
                layer2: this.getDefaultLayer2(),
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.storage.saveGenome(genome);

        return genome;
    }

    async loadGenome(genomeId: string): Promise<Genome | null> {
        return this.storage.loadGenome(genomeId);
    }

    async listGenomes(): Promise<Genome[]> {
        return this.storage.listGenomes();
    }

    async deleteGenome(genomeId: string): Promise<void> {
        await this.storage.deleteGenome(genomeId);
    }

    // ─── Default Layers ─────────────────────────────────

    private getDefaultLayer0() {
        return [
            {
                gene: 'security-gate',
                variant: 'default',
                content: this.getSecurityGatePrompt(),
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
            {
                gene: 'core-identity',
                variant: 'default',
                content: this.getCoreIdentityPrompt(),
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
            {
                gene: 'ethics',
                variant: 'default',
                content: this.getEthicsPrompt(),
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
        ];
    }

    private getDefaultLayer1() {
        return [
            {
                gene: 'tool-usage',
                variant: 'default',
                content: 'Use tools efficiently and appropriately for each task.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
            {
                gene: 'coding-patterns',
                variant: 'default',
                content: 'Follow clean code principles and best practices.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
        ];
    }

    private getDefaultLayer2() {
        return [
            {
                gene: 'communication-style',
                variant: 'default',
                content: 'Communicate clearly and adapt to user preferences.',
                fitness: 0.5,
                status: 'active' as const,
                createdAt: new Date(),
            },
        ];
    }

    // ─── Default Prompts ────────────────────────────────

    private getSecurityGatePrompt(): string {
        return `# Security Gate (Immutable)

**NEVER bypass security rules**

- Validate user permissions
- Sanitize all inputs
- Never execute destructive commands without approval
- Protect sensitive data
`;
    }

    private getCoreIdentityPrompt(): string {
        return `# Core Identity (Immutable)

You are an AI assistant powered by GSEP (Genomic Self-Evolving Prompts).

You continuously learn and adapt to provide the best possible assistance.
`;
    }

    private getEthicsPrompt(): string {
        return `# Ethics (Immutable)

- Be helpful, harmless, and honest
- Respect user privacy
- Never generate harmful content
- Admit when you don't know something
`;
    }

    // ─── Utilities ──────────────────────────────────────

    private generateId(): string {
        return `gsep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
