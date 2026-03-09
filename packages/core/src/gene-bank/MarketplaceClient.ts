import type { CognitiveGene, GeneSearchFilters } from './index.js';
import type { GeneBank } from './GeneBank.js';
import type { MetricsCollector } from '../monitoring/MetricsCollector.js';

/**
 * MarketplaceClient.ts
 *
 * Client for the GSEP Gene Marketplace SaaS.
 * Enables agents to publish, discover, and adopt proven Cognitive Genes
 * via the global marketplace at market.gsep-platform.ai.
 *
 * @version 1.0.0
 */

export interface MarketplaceClientOptions {
    marketplaceUrl?: string;
    apiKey?: string;
}

export class MarketplaceClient {
    readonly marketplaceUrl: string;
    private apiKey: string | undefined;

    constructor(
        private geneBank: GeneBank,
        options?: MarketplaceClientOptions,
        private metricsCollector?: MetricsCollector
    ) {
        this.marketplaceUrl = options?.marketplaceUrl || 'https://market.gsep-platform.ai/v1';
        this.apiKey = options?.apiKey;
    }

    /**
     * Publishes a local gene to the GSEP Marketplace.
     * Sanitizes content, validates fitness, and sends via POST /v1/genes.
     */
    async publishToMarketplace(geneId: string): Promise<{ success: boolean; marketplaceId?: string; error?: string }> {
        const startTime = Date.now();

        try {
            const gene = await this.geneBank.getGene(geneId);
            if (!gene) throw new Error(`Gene ${geneId} not found in local bank.`);

            if (gene.fitness.overallFitness < 0.8) {
                return { success: false, error: 'Gene fitness too low for Marketplace (minimum 0.8).' };
            }

            // Sanitize content before publishing
            const sanitizedInstruction = this.sanitizeForMarketplace(gene.content.instruction);
            const payload = {
                ...gene,
                content: { ...gene.content, instruction: sanitizedInstruction },
                tenant: { ...gene.tenant, scope: 'marketplace' as const, verified: true },
            };

            const response = await this.httpPost('/genes', payload);

            if (!response.ok) {
                const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
                return { success: false, error: body.error || `HTTP ${response.status}` };
            }

            const result = await response.json() as { id: string };
            const marketplaceId = result.id;

            // Mark gene as published locally
            gene.tenant.scope = 'marketplace';
            await this.geneBank.updateGene(gene);

            this.metricsCollector?.logAudit({
                level: 'info',
                component: 'MarketplaceClient',
                operation: 'publishToMarketplace',
                message: `Gene ${gene.name} published to Marketplace.`,
                duration: Date.now() - startTime,
                metadata: { geneId, marketplaceId }
            });

            return { success: true, marketplaceId };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Discovers genes from the GSEP Marketplace via GET /v1/genes/search.
     */
    async discoverGenes(filters: Partial<GeneSearchFilters>): Promise<CognitiveGene[]> {
        try {
            const params = new URLSearchParams();
            if (filters.type?.length) params.set('type', filters.type.join(','));
            if (filters.domain?.length) params.set('domain', filters.domain.join(','));
            if (filters.tags?.length) params.set('tags', filters.tags.join(','));
            if (filters.minFitness !== undefined) params.set('minFitness', String(filters.minFitness));
            if (filters.minAdoptions !== undefined) params.set('minAdoptions', String(filters.minAdoptions));
            if (filters.sortBy) params.set('sortBy', filters.sortBy);
            if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
            if (filters.limit) params.set('limit', String(filters.limit));
            if (filters.offset) params.set('offset', String(filters.offset));

            const response = await this.httpGet(`/genes/search?${params.toString()}`);

            if (!response.ok) {
                // Fallback to local bank on network failure
                return this.geneBank.searchGenes({
                    ...filters,
                    scope: ['marketplace'],
                    verifiedOnly: true,
                    minFitness: filters.minFitness ?? 0.8,
                });
            }

            const body = await response.json() as { genes: CognitiveGene[] };
            return body.genes;
        } catch {
            // Offline fallback: search local gene bank
            return this.geneBank.searchGenes({
                ...filters,
                scope: ['marketplace'],
                verifiedOnly: true,
                minFitness: filters.minFitness ?? 0.8,
            });
        }
    }

    /**
     * Adopts a gene from the Marketplace into the local gene bank.
     * Downloads via GET /v1/genes/:id and records adoption via POST /v1/genes/:id/adopt.
     */
    async adoptFromMarketplace(marketplaceGeneId: string): Promise<CognitiveGene> {
        // 1. Download the gene
        const response = await this.httpGet(`/genes/${marketplaceGeneId}`);
        if (!response.ok) {
            throw new Error(`Gene ${marketplaceGeneId} not found in Marketplace (HTTP ${response.status}).`);
        }

        const targetGene = await response.json() as CognitiveGene;

        // 2. Record adoption on marketplace
        const agentId = this.geneBank.getConfig?.()?.agentId || 'unknown';
        await this.httpPost(`/genes/${marketplaceGeneId}/adopt`, {
            agentId,
            fitnessBefore: undefined,
        }).catch(() => { /* non-blocking */ });

        // 3. Create local copy with lineage
        const localCopy: CognitiveGene = {
            ...targetGene,
            id: `adopted_${targetGene.id}_${Date.now()}`,
            lineage: {
                ...targetGene.lineage,
                parentGeneId: targetGene.id,
                ancestors: [...targetGene.lineage.ancestors, targetGene.id]
            },
            tenant: {
                ...targetGene.tenant,
                scope: 'tenant'
            }
        };

        await this.geneBank.storeGene(localCopy);
        return localCopy;
    }

    /**
     * Sanitizes content by removing PII (emails, proper names) before publishing.
     */
    private sanitizeForMarketplace(content: string): string {
        return content
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
            .replace(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, '[REDACTED_NAME]');
    }

    private async httpGet(path: string): Promise<Response> {
        return fetch(`${this.marketplaceUrl}${path}`, {
            method: 'GET',
            headers: this.buildHeaders(),
        });
    }

    private async httpPost(path: string, body: unknown): Promise<Response> {
        return fetch(`${this.marketplaceUrl}${path}`, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        });
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
}
