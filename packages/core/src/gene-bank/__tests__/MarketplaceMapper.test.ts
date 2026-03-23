/**
 * MarketplaceMapper Unit Tests
 *
 * Tests for the pure mapping functions that convert between
 * marketplace API shapes and SDK internal types.
 */

import { describe, it, expect } from 'vitest';
import {
    mapListingToCognitiveGene,
    mapCognitiveGeneToPublishBody,
    mapFiltersToApiParams,
} from '../MarketplaceMapper.js';
import type { MarketplaceGeneListing } from '../MarketplaceTypes.js';
import type { CognitiveGene } from '../CognitiveGene.js';

// ============================================================================
// FIXTURES
// ============================================================================

function createTestListing(overrides: Partial<MarketplaceGeneListing> = {}): MarketplaceGeneListing {
    return {
        id: 'listing-001',
        sourceGeneId: 'gene-original-001',
        version: '1.0.0',
        name: 'Error Recovery Pattern',
        description: 'Recovers from API errors gracefully',
        type: 'error-recovery-pattern',
        domain: 'backend',
        tags: ['error', 'resilience'],
        fitness: {
            overallFitness: 0.92,
            taskSuccessRate: 0.88,
            tokenEfficiency: 0.75,
            responseQuality: 0.90,
            adoptionCount: 15,
            adoptionPerformance: 0.85,
        },
        lineage: {
            parentGeneId: null,
            generation: 3,
            ancestors: ['gene-ancestor-1'],
            mutationHistory: [],
        },
        content: {
            instruction: 'When an API call fails, retry with exponential backoff.',
            requiredCapabilities: ['http-client'],
            applicableContexts: ['api-integration'],
            contraindications: [],
            metadata: {},
        },
        contentHash: 'sha256-abc123',
        publisherTenantId: 'tenant-pub-001',
        publisherAgentId: 'agent-pub-001',
        listingStatus: 'published',
        verified: true,
        verifiedAt: '2026-03-01T00:00:00Z',
        verificationNotes: null,
        downloadCount: 42,
        adoptionCount: 15,
        adoptionSuccessRate: 0.87,
        avgFitnessAfterAdoption: 0.89,
        reviewCount: 5,
        avgRating: 4.5,
        featured: false,
        featuredAt: null,
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-03-10T12:00:00Z',
        publishedAt: '2026-01-20T09:00:00Z',
        deletedAt: null,
        ...overrides,
    };
}

function createTestCognitiveGene(overrides: Partial<CognitiveGene> = {}): CognitiveGene {
    return {
        id: 'gene-test-001',
        version: '1.0.0',
        name: 'Test Gene',
        description: 'A test gene for publishing',
        type: 'reasoning-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.9,
            taskSuccessRate: 0.88,
            tokenEfficiency: 0.7,
            responseQuality: 0.92,
            adoptionCount: 10,
            adoptionPerformance: 0.85,
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
        },
        content: {
            instruction: 'Always think step by step.',
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
        },
        tenant: {
            tenantId: 'tenant-test',
            createdBy: 'agent-test',
            scope: 'tenant',
            verified: false,
        },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        tags: ['test'],
        ...overrides,
    } as CognitiveGene;
}

// ============================================================================
// mapListingToCognitiveGene
// ============================================================================

describe('mapListingToCognitiveGene', () => {
    it('should map sourceGeneId to CognitiveGene.id', () => {
        const listing = createTestListing({ sourceGeneId: 'original-gene-id' });
        const gene = mapListingToCognitiveGene(listing);
        expect(gene.id).toBe('original-gene-id');
    });

    it('should fall back to listing.id when sourceGeneId is empty', () => {
        const listing = createTestListing({ sourceGeneId: '', id: 'listing-fallback' });
        const gene = mapListingToCognitiveGene(listing);
        expect(gene.id).toBe('listing-fallback');
    });

    it('should preserve all standard CognitiveGene fields', () => {
        const listing = createTestListing();
        const gene = mapListingToCognitiveGene(listing);

        expect(gene.version).toBe(listing.version);
        expect(gene.name).toBe(listing.name);
        expect(gene.description).toBe(listing.description);
        expect(gene.type).toBe(listing.type);
        expect(gene.domain).toBe(listing.domain);
        expect(gene.tags).toEqual(listing.tags);
        expect(gene.createdAt).toBe(listing.createdAt);
        expect(gene.updatedAt).toBe(listing.updatedAt);
    });

    it('should map publisher info into tenant fields', () => {
        const listing = createTestListing({
            publisherTenantId: 'pub-tenant',
            publisherAgentId: 'pub-agent',
            verified: true,
        });
        const gene = mapListingToCognitiveGene(listing);

        expect(gene.tenant.tenantId).toBe('pub-tenant');
        expect(gene.tenant.createdBy).toBe('pub-agent');
        expect(gene.tenant.scope).toBe('marketplace');
        expect(gene.tenant.verified).toBe(true);
    });

    it('should use listing.adoptionCount over fitness.adoptionCount', () => {
        const listing = createTestListing({
            adoptionCount: 50,
            fitness: {
                overallFitness: 0.9,
                taskSuccessRate: 0.85,
                tokenEfficiency: 0.7,
                responseQuality: 0.9,
                adoptionCount: 10, // old value in nested fitness
                adoptionPerformance: 0.8,
            },
        });
        const gene = mapListingToCognitiveGene(listing);
        expect(gene.fitness.adoptionCount).toBe(50);
    });

    it('should use listing.adoptionSuccessRate for adoptionPerformance', () => {
        const listing = createTestListing({ adoptionSuccessRate: 0.95 });
        const gene = mapListingToCognitiveGene(listing);
        expect(gene.fitness.adoptionPerformance).toBe(0.95);
    });

    it('should handle null adoptionSuccessRate by falling back to fitness value', () => {
        const listing = createTestListing({
            adoptionSuccessRate: null,
            fitness: {
                overallFitness: 0.9,
                taskSuccessRate: 0.85,
                tokenEfficiency: 0.7,
                responseQuality: 0.9,
                adoptionCount: 10,
                adoptionPerformance: 0.77,
            },
        });
        const gene = mapListingToCognitiveGene(listing);
        expect(gene.fitness.adoptionPerformance).toBe(0.77);
    });

    it('should preserve lineage and content as-is', () => {
        const listing = createTestListing();
        const gene = mapListingToCognitiveGene(listing);

        expect(gene.lineage).toEqual(listing.lineage);
        expect(gene.content).toEqual(listing.content);
    });
});

// ============================================================================
// mapCognitiveGeneToPublishBody
// ============================================================================

describe('mapCognitiveGeneToPublishBody', () => {
    it('should include all required fields for PublishGeneRequest', () => {
        const gene = createTestCognitiveGene();
        const body = mapCognitiveGeneToPublishBody(gene);

        expect(body.id).toBe(gene.id);
        expect(body.version).toBe(gene.version);
        expect(body.name).toBe(gene.name);
        expect(body.description).toBe(gene.description);
        expect(body.type).toBe(gene.type);
        expect(body.domain).toBe(gene.domain);
        expect(body.tags).toEqual(gene.tags);
        expect(body.fitness).toEqual(gene.fitness);
        expect(body.content).toEqual(gene.content);
        expect(body.tenant).toEqual(gene.tenant);
        expect(body.createdAt).toBe(gene.createdAt);
        expect(body.updatedAt).toBe(gene.updatedAt);
    });

    it('should default license to MIT', () => {
        const gene = createTestCognitiveGene();
        const body = mapCognitiveGeneToPublishBody(gene);
        expect(body.license).toBe('MIT');
    });

    it('should convert null parentGeneId to undefined for API compatibility', () => {
        const gene = createTestCognitiveGene({
            lineage: {
                parentGeneId: null,
                generation: 0,
                ancestors: [],
                mutationHistory: [],
            },
        });
        const body = mapCognitiveGeneToPublishBody(gene);
        const lineage = body.lineage as Record<string, unknown>;
        expect(lineage.parentGeneId).toBeUndefined();
    });

    it('should keep parentGeneId when it has a value', () => {
        const gene = createTestCognitiveGene({
            lineage: {
                parentGeneId: 'parent-123',
                generation: 2,
                ancestors: ['parent-123'],
                mutationHistory: [],
            },
        });
        const body = mapCognitiveGeneToPublishBody(gene);
        const lineage = body.lineage as Record<string, unknown>;
        expect(lineage.parentGeneId).toBe('parent-123');
    });

    it('should default tags to empty array when undefined', () => {
        const gene = createTestCognitiveGene();
        // Force tags to undefined to simulate edge case
        (gene as Record<string, unknown>).tags = undefined;
        const body = mapCognitiveGeneToPublishBody(gene);
        expect(body.tags).toEqual([]);
    });
});

// ============================================================================
// mapFiltersToApiParams
// ============================================================================

describe('mapFiltersToApiParams', () => {
    it('should produce empty params for empty filters', () => {
        const params = mapFiltersToApiParams({});
        expect(params.toString()).toBe('');
    });

    it('should set q for full-text search', () => {
        const params = mapFiltersToApiParams({ q: 'error recovery' });
        expect(params.get('q')).toBe('error recovery');
    });

    it('should join array type values with comma', () => {
        const params = mapFiltersToApiParams({ type: ['reasoning-pattern', 'error-recovery-pattern'] });
        expect(params.get('type')).toBe('reasoning-pattern,error-recovery-pattern');
    });

    it('should handle single string type value', () => {
        const params = mapFiltersToApiParams({ type: 'reasoning-pattern' as unknown as string[] });
        expect(params.get('type')).toBe('reasoning-pattern');
    });

    it('should join array domain values with comma', () => {
        const params = mapFiltersToApiParams({ domain: ['coding', 'backend'] });
        expect(params.get('domain')).toBe('coding,backend');
    });

    it('should set numeric filters correctly', () => {
        const params = mapFiltersToApiParams({ minFitness: 0.85, minAdoptions: 10 });
        expect(params.get('minFitness')).toBe('0.85');
        expect(params.get('minAdoptions')).toBe('10');
    });

    it('should map SDK sortBy "createdAt" to API "newest"', () => {
        const params = mapFiltersToApiParams({ sortBy: 'createdAt' as 'fitness' });
        expect(params.get('sortBy')).toBe('newest');
    });

    it('should pass through API-native sortBy values unchanged', () => {
        const params = mapFiltersToApiParams({ sortBy: 'trending' });
        expect(params.get('sortBy')).toBe('trending');
    });

    it('should set pagination params', () => {
        const params = mapFiltersToApiParams({ limit: 50, offset: 20 });
        expect(params.get('limit')).toBe('50');
        expect(params.get('offset')).toBe('20');
    });

    it('should set sortOrder', () => {
        const params = mapFiltersToApiParams({ sortOrder: 'asc' });
        expect(params.get('sortOrder')).toBe('asc');
    });

    it('should handle tags as array', () => {
        const params = mapFiltersToApiParams({ tags: ['resilience', 'api'] });
        expect(params.get('tags')).toBe('resilience,api');
    });

    it('should combine all filters into a single URLSearchParams', () => {
        const params = mapFiltersToApiParams({
            q: 'search term',
            type: ['reasoning-pattern'],
            domain: ['coding'],
            tags: ['test'],
            minFitness: 0.8,
            minAdoptions: 5,
            sortBy: 'fitness',
            sortOrder: 'desc',
            limit: 20,
            offset: 0,
        });

        expect(params.get('q')).toBe('search term');
        expect(params.get('type')).toBe('reasoning-pattern');
        expect(params.get('domain')).toBe('coding');
        expect(params.get('tags')).toBe('test');
        expect(params.get('minFitness')).toBe('0.8');
        expect(params.get('minAdoptions')).toBe('5');
        expect(params.get('sortBy')).toBe('fitness');
        expect(params.get('sortOrder')).toBe('desc');
        expect(params.get('limit')).toBe('20');
        expect(params.get('offset')).toBe('0');
    });
});
