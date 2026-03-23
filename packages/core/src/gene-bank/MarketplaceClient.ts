import type { CognitiveGene, GeneSearchFilters } from './index.js';
import type { GeneBank } from './GeneBank.js';
import type { MetricsCollector } from '../monitoring/MetricsCollector.js';
import type {
    MarketplaceGeneListing,
    MarketplaceSearchResponse,
    MarketplaceSearchFilters,
    MarketplaceHealthResponse,
    MarketplacePublishResponse,
    CreatePurchaseResponse,
    MarketplacePurchase,
    RefundResponse,
    SellerOnboardResponse,
    SellerStatus,
    SellerEarnings,
    DiscoverOptions,
} from './MarketplaceTypes.js';
import {
    mapListingToCognitiveGene,
    mapCognitiveGeneToPublishBody,
    mapFiltersToApiParams,
} from './MarketplaceMapper.js';

/**
 * MarketplaceClient.ts
 *
 * Client for the GSEP Gene Marketplace SaaS.
 * Enables agents to publish, discover, and adopt proven Cognitive Genes
 * via the global marketplace at market.gsepcore.com.
 *
 * @version 2.0.0
 */

export interface MarketplaceClientOptions {
    marketplaceUrl?: string;
    apiKey?: string;
    /** Request timeout in milliseconds (default 10000) */
    timeout?: number;
}

export class MarketplaceClient {
    readonly marketplaceUrl: string;
    private apiKey: string | undefined;
    private timeout: number;

    constructor(
        private geneBank: GeneBank,
        options?: MarketplaceClientOptions,
        private metricsCollector?: MetricsCollector
    ) {
        this.marketplaceUrl = options?.marketplaceUrl || 'https://market.gsepcore.com/v1';
        this.apiKey = options?.apiKey;
        this.timeout = options?.timeout ?? 10_000;
    }

    // ========================================================================
    // EXISTING METHODS (backward-compatible, now using real API contract)
    // ========================================================================

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
            const sanitizedGene: CognitiveGene = {
                ...gene,
                content: { ...gene.content, instruction: sanitizedInstruction },
                tenant: { ...gene.tenant, scope: 'marketplace' as const, verified: true },
            };

            // Map to API-expected body
            const payload = mapCognitiveGeneToPublishBody(sanitizedGene);

            const response = await this.httpPost('/genes', payload);

            if (!response.ok) {
                const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
                return { success: false, error: body.error || `HTTP ${response.status}` };
            }

            const result = await response.json() as MarketplacePublishResponse;
            const marketplaceId = result.marketplaceId;

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
     *
     * @param filters - Search filters (SDK GeneSearchFilters or MarketplaceSearchFilters)
     * @param options - When `{ raw: true }`, returns the full MarketplaceSearchResponse
     * @returns CognitiveGene[] by default, or MarketplaceSearchResponse when raw
     */
    async discoverGenes(
        filters: Partial<GeneSearchFilters & MarketplaceSearchFilters>,
    ): Promise<CognitiveGene[]>;
    async discoverGenes(
        filters: Partial<GeneSearchFilters & MarketplaceSearchFilters>,
        options: { raw: true },
    ): Promise<MarketplaceSearchResponse>;
    async discoverGenes(
        filters: Partial<GeneSearchFilters & MarketplaceSearchFilters>,
        options?: DiscoverOptions,
    ): Promise<CognitiveGene[] | MarketplaceSearchResponse> {
        try {
            const params = mapFiltersToApiParams(filters);
            const response = await this.httpGet(`/genes/search?${params.toString()}`);

            if (!response.ok) {
                // Fallback to local bank on API error
                const local = await this.geneBank.searchGenes({
                    ...filters,
                    scope: ['marketplace'],
                    verifiedOnly: true,
                    minFitness: filters.minFitness ?? 0.8,
                });
                if (options?.raw) {
                    return { genes: [], total: 0, limit: 20, offset: 0 };
                }
                return local;
            }

            const body = await response.json() as MarketplaceSearchResponse;

            if (options?.raw) {
                return body;
            }

            // Map API listings to SDK CognitiveGene for backward compat
            return body.genes.map(mapListingToCognitiveGene);
        } catch {
            // Offline fallback: search local gene bank
            if (options?.raw) {
                return { genes: [], total: 0, limit: 20, offset: 0 };
            }
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
        // 1. Download the gene listing
        const response = await this.httpGet(`/genes/${marketplaceGeneId}`);
        if (!response.ok) {
            throw new Error(`Gene ${marketplaceGeneId} not found in Marketplace (HTTP ${response.status}).`);
        }

        const listing = await response.json() as MarketplaceGeneListing;

        // Map API listing to CognitiveGene
        const targetGene = mapListingToCognitiveGene(listing);

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

    // ========================================================================
    // NEW METHODS — Health
    // ========================================================================

    /** Check marketplace API health: GET /v1/health */
    async healthCheck(): Promise<MarketplaceHealthResponse> {
        const response = await this.httpGet('/health');
        if (!response.ok) {
            throw new Error(`Marketplace health check failed (HTTP ${response.status}).`);
        }
        return response.json() as Promise<MarketplaceHealthResponse>;
    }

    // ========================================================================
    // NEW METHODS — Gene Listings
    // ========================================================================

    /** Get a single gene listing by ID: GET /v1/genes/:id */
    async getGeneListing(id: string): Promise<MarketplaceGeneListing> {
        const response = await this.httpGet(`/genes/${id}`);
        if (!response.ok) {
            throw new Error(`Gene listing ${id} not found (HTTP ${response.status}).`);
        }
        return response.json() as Promise<MarketplaceGeneListing>;
    }

    /** List genes published by the authenticated tenant: GET /v1/tenant/genes */
    async listPublishedGenes(): Promise<MarketplaceGeneListing[]> {
        const response = await this.httpGet('/tenant/genes');
        if (!response.ok) {
            throw new Error(`Failed to list published genes (HTTP ${response.status}).`);
        }
        return response.json() as Promise<MarketplaceGeneListing[]>;
    }

    // ========================================================================
    // NEW METHODS — Purchases
    // ========================================================================

    /** Create a purchase for a gene: POST /v1/purchases */
    async createPurchase(geneListingId: string): Promise<CreatePurchaseResponse> {
        const response = await this.httpPost('/purchases', { geneListingId });
        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
            throw new Error(body.error || `Purchase failed (HTTP ${response.status}).`);
        }
        return response.json() as Promise<CreatePurchaseResponse>;
    }

    /** List purchases by the authenticated tenant: GET /v1/purchases */
    async listPurchases(): Promise<MarketplacePurchase[]> {
        const response = await this.httpGet('/purchases');
        if (!response.ok) {
            throw new Error(`Failed to list purchases (HTTP ${response.status}).`);
        }
        return response.json() as Promise<MarketplacePurchase[]>;
    }

    /** Request a refund: POST /v1/purchases/refund */
    async requestRefund(purchaseId: string, reason: string): Promise<RefundResponse> {
        const response = await this.httpPost('/purchases/refund', { purchaseId, reason });
        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
            throw new Error(body.error || `Refund failed (HTTP ${response.status}).`);
        }
        return response.json() as Promise<RefundResponse>;
    }

    // ========================================================================
    // NEW METHODS — Seller
    // ========================================================================

    /** Onboard as a seller (Stripe Connect): POST /v1/seller/onboard */
    async onboardSeller(country?: string): Promise<SellerOnboardResponse> {
        const response = await this.httpPost('/seller/onboard', { country: country ?? 'US' });
        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
            throw new Error(body.error || `Seller onboarding failed (HTTP ${response.status}).`);
        }
        return response.json() as Promise<SellerOnboardResponse>;
    }

    /** Get seller Stripe Connect status: GET /v1/seller/status */
    async getSellerStatus(): Promise<SellerStatus> {
        const response = await this.httpGet('/seller/status');
        if (!response.ok) {
            throw new Error(`Failed to get seller status (HTTP ${response.status}).`);
        }
        return response.json() as Promise<SellerStatus>;
    }

    /** Get seller earnings summary: GET /v1/seller/earnings */
    async getSellerEarnings(): Promise<SellerEarnings> {
        const response = await this.httpGet('/seller/earnings');
        if (!response.ok) {
            throw new Error(`Failed to get seller earnings (HTTP ${response.status}).`);
        }
        return response.json() as Promise<SellerEarnings>;
    }

    // ========================================================================
    // PRIVATE — Content sanitization
    // ========================================================================

    /**
     * Sanitizes content by removing PII (emails, proper names) before publishing.
     */
    private sanitizeForMarketplace(content: string): string {
        return content
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
            .replace(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, '[REDACTED_NAME]');
    }

    // ========================================================================
    // PRIVATE — HTTP layer with timeout
    // ========================================================================

    private async httpRequest(method: string, path: string, body?: unknown): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            return await fetch(`${this.marketplaceUrl}${path}`, {
                method,
                headers: this.buildHeaders(),
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timer);
        }
    }

    private async httpGet(path: string): Promise<Response> {
        return this.httpRequest('GET', path);
    }

    private async httpPost(path: string, body: unknown): Promise<Response> {
        return this.httpRequest('POST', path, body);
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
