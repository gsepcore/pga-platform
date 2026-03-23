/**
 * MarketplaceMapper.ts
 *
 * Pure functions that convert between the marketplace API shapes
 * (MarketplaceGeneListing) and the SDK internal shape (CognitiveGene).
 *
 * These mappers ensure backward compatibility: existing code that
 * expects CognitiveGene[] from discoverGenes() keeps working.
 *
 * @module gene-bank/MarketplaceMapper
 * @version 1.0.0
 */

import type { CognitiveGene } from './CognitiveGene.js';
import type { GeneSearchFilters } from './GeneBank.js';
import type { MarketplaceGeneListing, MarketplaceSearchFilters } from './MarketplaceTypes.js';

/**
 * Convert a MarketplaceGeneListing (API response) to a CognitiveGene (SDK type).
 * Maps marketplace-specific fields into the CognitiveGene shape.
 */
export function mapListingToCognitiveGene(listing: MarketplaceGeneListing): CognitiveGene {
    return {
        id: listing.sourceGeneId || listing.id,
        version: listing.version,
        name: listing.name,
        description: listing.description,
        type: listing.type,
        domain: listing.domain,
        tags: listing.tags,
        fitness: {
            ...listing.fitness,
            adoptionCount: listing.adoptionCount ?? listing.fitness.adoptionCount,
            adoptionPerformance: listing.adoptionSuccessRate ?? listing.fitness.adoptionPerformance ?? null,
        },
        lineage: listing.lineage,
        content: listing.content,
        tenant: {
            tenantId: listing.publisherTenantId,
            createdBy: listing.publisherAgentId,
            scope: 'marketplace',
            verified: listing.verified,
        },
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
    };
}

/**
 * Convert a CognitiveGene (SDK type) into the body expected by POST /v1/genes.
 * Maps SDK fields to the PublishGeneRequest schema.
 */
export function mapCognitiveGeneToPublishBody(gene: CognitiveGene): Record<string, unknown> {
    return {
        id: gene.id,
        version: gene.version,
        name: gene.name,
        description: gene.description,
        type: gene.type,
        domain: gene.domain,
        tags: gene.tags ?? [],
        fitness: gene.fitness,
        lineage: {
            ...gene.lineage,
            // API expects optional (undefined) not nullable (null)
            parentGeneId: gene.lineage.parentGeneId ?? undefined,
        },
        content: gene.content,
        tenant: gene.tenant,
        createdAt: gene.createdAt,
        updatedAt: gene.updatedAt,
        license: 'MIT',
    };
}

/**
 * Convert SDK GeneSearchFilters or MarketplaceSearchFilters into URLSearchParams
 * that match the API's SearchGenesQuery schema.
 */
export function mapFiltersToApiParams(
    filters: Partial<GeneSearchFilters & MarketplaceSearchFilters>
): URLSearchParams {
    const params = new URLSearchParams();

    // Full-text search (MarketplaceSearchFilters only)
    if (filters.q) {
        params.set('q', filters.q);
    }

    // Type filter — GeneSearchFilters uses string[], API accepts comma-separated or repeated
    if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        if (types.length) params.set('type', types.join(','));
    }

    // Domain filter
    if (filters.domain) {
        const domains = Array.isArray(filters.domain) ? filters.domain : [filters.domain];
        if (domains.length) params.set('domain', domains.join(','));
    }

    // Tags filter
    if (filters.tags) {
        const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        if (tags.length) params.set('tags', tags.join(','));
    }

    if (filters.minFitness !== undefined) {
        params.set('minFitness', String(filters.minFitness));
    }

    if (filters.minAdoptions !== undefined) {
        params.set('minAdoptions', String(filters.minAdoptions));
    }

    // Sort — map SDK sortBy values to API values
    if (filters.sortBy) {
        const sortByMap: Record<string, string> = {
            fitness: 'fitness',
            adoptions: 'adoptions',
            newest: 'newest',
            trending: 'trending',
            createdAt: 'newest',  // SDK alias
        };
        params.set('sortBy', sortByMap[filters.sortBy] || filters.sortBy);
    }

    if (filters.sortOrder) {
        params.set('sortOrder', filters.sortOrder);
    }

    if (filters.limit !== undefined) {
        params.set('limit', String(filters.limit));
    }

    if (filters.offset !== undefined) {
        params.set('offset', String(filters.offset));
    }

    return params;
}
