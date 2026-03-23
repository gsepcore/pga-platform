/**
 * MarketplaceTypes.ts
 *
 * Types that mirror the gsep-marketplace API response shapes.
 * Used by MarketplaceClient to handle the real API contract
 * while maintaining backward compatibility with CognitiveGene.
 *
 * @module gene-bank/MarketplaceTypes
 * @version 1.0.0
 */

import type { GeneType, FitnessMetrics, Lineage, GeneContent } from './CognitiveGene.js';

// ============================================================================
// GENE LISTING (API response shape — mirrors GeneListingRow)
// ============================================================================

/**
 * A gene listing as returned by the marketplace API.
 * Uses camelCase (JSON serialized from snake_case DB rows).
 */
export interface MarketplaceGeneListing {
    id: string;
    sourceGeneId: string;
    version: string;
    name: string;
    description: string;
    type: GeneType;
    domain: string;
    tags: string[];
    fitness: FitnessMetrics;
    lineage: Lineage;
    content: GeneContent;
    contentHash: string;
    publisherTenantId: string;
    publisherAgentId: string;
    listingStatus: string;
    verified: boolean;
    verifiedAt: string | null;
    verificationNotes: string | null;
    downloadCount: number;
    adoptionCount: number;
    adoptionSuccessRate: number | null;
    avgFitnessAfterAdoption: number | null;
    reviewCount: number;
    avgRating: number | null;
    featured: boolean;
    featuredAt: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    deletedAt: string | null;
    /** From view join (optional) */
    publisherName?: string;
    publisherSlug?: string;
    publisherVerified?: boolean;
}

// ============================================================================
// SEARCH
// ============================================================================

/** Paginated search response from GET /v1/genes/search */
export interface MarketplaceSearchResponse {
    genes: MarketplaceGeneListing[];
    total: number;
    limit: number;
    offset: number;
}

/** Extended search filters matching the API query schema */
export interface MarketplaceSearchFilters {
    /** Full-text search query */
    q?: string;
    /** Gene type filter (single or multiple) */
    type?: string | string[];
    /** Domain filter (single or multiple) */
    domain?: string | string[];
    /** Tag filter (single or multiple) */
    tags?: string | string[];
    /** Minimum overall fitness (0-1) */
    minFitness?: number;
    /** Minimum adoption count */
    minAdoptions?: number;
    /** Sort field */
    sortBy?: 'fitness' | 'adoptions' | 'newest' | 'trending';
    /** Sort direction */
    sortOrder?: 'asc' | 'desc';
    /** Results per page (1-100, default 20) */
    limit?: number;
    /** Offset for pagination (default 0) */
    offset?: number;
}

// ============================================================================
// PURCHASES
// ============================================================================

/** Response from POST /v1/purchases */
export interface CreatePurchaseResponse {
    purchaseId: string;
    clientSecret: string;
    amount: number;
    currency: string;
}

/** A purchase record from GET /v1/purchases */
export interface MarketplacePurchase {
    id: string;
    geneListingId: string;
    buyerTenantId: string;
    sellerTenantId: string;
    stripePaymentIntentId: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    stripeFeeCents: number | null;
    sellerAmountCents: number;
    commissionRate: number;
    status: 'pending' | 'completed' | 'refunded' | 'disputed' | 'failed';
    refundId: string | null;
    refundReason: string | null;
    refundedAt: string | null;
    createdAt: string;
    completedAt: string | null;
}

/** Response from POST /v1/purchases/refund */
export interface RefundResponse {
    refunded: boolean;
}

// ============================================================================
// SELLERS
// ============================================================================

/** Response from POST /v1/seller/onboard */
export interface SellerOnboardResponse {
    accountId: string;
    onboardingUrl: string;
}

/** Response from GET /v1/seller/status */
export interface SellerStatus {
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingCompleted: boolean;
    country: string | null;
    defaultCurrency: string;
}

/** Response from GET /v1/seller/earnings */
export interface SellerEarnings {
    totalEarned: number;
    pendingAmount: number;
    completedSales: number;
    refundedSales: number;
}

// ============================================================================
// ADOPTION
// ============================================================================

/** Response from POST /v1/genes/:id/adopt */
export interface MarketplaceAdoptionResponse {
    success: boolean;
    adoptionId: string;
    gene: MarketplaceGeneListing;
}

// ============================================================================
// HEALTH
// ============================================================================

/** Response from GET /v1/health */
export interface MarketplaceHealthResponse {
    status: string;
    version: string;
    uptime: number;
}

// ============================================================================
// PUBLISH
// ============================================================================

/** Response from POST /v1/genes (publish) */
export interface MarketplacePublishResponse {
    success: boolean;
    marketplaceId: string;
    status: string;
    message: string;
    warnings?: unknown[];
}

// ============================================================================
// TENANT GENES
// ============================================================================

/** Options for raw response mode */
export interface DiscoverOptions {
    /** When true, returns MarketplaceSearchResponse instead of CognitiveGene[] */
    raw?: boolean;
}
