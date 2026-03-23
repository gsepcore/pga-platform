/**
 * MarketplaceClient Unit Tests
 *
 * Tests for the MarketplaceClient class covering:
 * - Publishing genes to the marketplace (with mapper)
 * - Discovering genes via search (with mapping + raw mode)
 * - Adopting genes from the marketplace (with listing→gene mapping)
 * - Content sanitization (PII removal)
 * - HTTP header construction with/without API key
 * - Error handling and fallback behavior
 * - Timeout via AbortController
 * - New methods: health, listings, purchases, seller
 *
 * @version 2.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketplaceClient } from '../MarketplaceClient.js';
import type { GeneBank } from '../GeneBank.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { MetricsCollector } from '../../monitoring/MetricsCollector.js';
import type { MarketplaceGeneListing } from '../MarketplaceTypes.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MARKETPLACE_URL = 'https://market.gsepcore.com/v1';
const TEST_API_KEY = 'test-api-key-12345';

// ============================================================================
// HELPER: Create a valid CognitiveGene
// ============================================================================

function createTestGene(overrides: Partial<CognitiveGene> = {}): CognitiveGene {
    const now = new Date().toISOString();
    return {
        id: 'gene-test-001',
        version: '1.0.0',
        name: 'Test Gene',
        description: 'A test gene for marketplace',
        type: 'reasoning-pattern',
        domain: 'coding',
        fitness: {
            overallFitness: 0.9,
            taskSuccessRate: 0.88,
            tokenEfficiency: 0.7,
            responseQuality: 0.92,
            adoptionCount: 10,
            adoptionPerformance: 0.85,
            ...(overrides.fitness as object),
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
            ...(overrides.lineage as object),
        },
        content: {
            instruction: 'Always think step by step when solving problems.',
            examples: [],
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
            ...(overrides.content as object),
        },
        tenant: {
            tenantId: 'tenant-test',
            createdBy: 'agent-test',
            scope: 'tenant' as const,
            verified: false,
            ...(overrides.tenant as object),
        },
        createdAt: now,
        updatedAt: now,
        tags: ['test'],
        ...overrides,
    } as CognitiveGene;
}

// ============================================================================
// HELPER: Create a MarketplaceGeneListing (API response shape)
// ============================================================================

function createTestListing(overrides: Partial<MarketplaceGeneListing> = {}): MarketplaceGeneListing {
    return {
        id: 'listing-001',
        sourceGeneId: 'gene-original-001',
        version: '1.0.0',
        name: 'Test Listing',
        description: 'A listing from the marketplace',
        type: 'reasoning-pattern',
        domain: 'coding',
        tags: ['test'],
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
        contentHash: 'sha256-test',
        publisherTenantId: 'tenant-pub',
        publisherAgentId: 'agent-pub',
        listingStatus: 'published',
        verified: true,
        verifiedAt: '2026-01-01T00:00:00Z',
        verificationNotes: null,
        downloadCount: 10,
        adoptionCount: 5,
        adoptionSuccessRate: 0.85,
        avgFitnessAfterAdoption: 0.88,
        reviewCount: 3,
        avgRating: 4.2,
        featured: false,
        featuredAt: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        publishedAt: '2026-01-02T00:00:00Z',
        deletedAt: null,
        ...overrides,
    };
}

// ============================================================================
// HELPER: Create mock GeneBank
// ============================================================================

function createMockGeneBank(): GeneBank {
    return {
        getGene: vi.fn(),
        updateGene: vi.fn(),
        storeGene: vi.fn(),
        searchGenes: vi.fn().mockResolvedValue([]),
        getConfig: vi.fn().mockReturnValue({ agentId: 'agent-test' }),
    } as unknown as GeneBank;
}

// ============================================================================
// HELPER: Create mock MetricsCollector
// ============================================================================

function createMockMetrics(): MetricsCollector {
    return {
        logAudit: vi.fn(),
    } as unknown as MetricsCollector;
}

// ============================================================================
// HELPER: Create mock Response
// ============================================================================

function createMockResponse(ok: boolean, body: unknown, status = 200): Response {
    return {
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

// ============================================================================
// TESTS
// ============================================================================

describe('MarketplaceClient', () => {
    let geneBank: GeneBank;
    let metrics: MetricsCollector;
    let client: MarketplaceClient;

    beforeEach(() => {
        vi.restoreAllMocks();
        geneBank = createMockGeneBank();
        metrics = createMockMetrics();
        client = new MarketplaceClient(geneBank, { apiKey: TEST_API_KEY }, metrics);
    });

    // ========================================================================
    // Constructor
    // ========================================================================

    describe('constructor', () => {
        it('should use default marketplace URL when none provided', () => {
            const c = new MarketplaceClient(geneBank);
            expect(c.marketplaceUrl).toBe(DEFAULT_MARKETPLACE_URL);
        });

        it('should use custom marketplace URL when provided', () => {
            const c = new MarketplaceClient(geneBank, { marketplaceUrl: 'https://custom.api/v2' });
            expect(c.marketplaceUrl).toBe('https://custom.api/v2');
        });

        it('should accept optional apiKey', () => {
            const c = new MarketplaceClient(geneBank, { apiKey: 'my-key' });
            expect(c.marketplaceUrl).toBe(DEFAULT_MARKETPLACE_URL);
        });

        it('should accept optional timeout', () => {
            const c = new MarketplaceClient(geneBank, { timeout: 5000 });
            expect(c.marketplaceUrl).toBe(DEFAULT_MARKETPLACE_URL);
        });
    });

    // ========================================================================
    // publishToMarketplace
    // ========================================================================

    describe('publishToMarketplace', () => {
        it('should fail when gene is not found', async () => {
            vi.mocked(geneBank.getGene).mockResolvedValue(null);

            const result = await client.publishToMarketplace('missing-gene');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should reject gene with fitness below 0.8', async () => {
            const lowFitnessGene = createTestGene({
                fitness: {
                    overallFitness: 0.5,
                    taskSuccessRate: 0.6,
                    tokenEfficiency: 0.5,
                    responseQuality: 0.5,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
            });
            vi.mocked(geneBank.getGene).mockResolvedValue(lowFitnessGene);

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(false);
            expect(result.error).toContain('fitness too low');
        });

        it('should publish successfully when gene meets all criteria', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true,
                marketplaceId: 'marketplace-123',
                status: 'published',
                message: 'Gene published',
            });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(true);
            expect(result.marketplaceId).toBe('marketplace-123');
        });

        it('should use mapCognitiveGeneToPublishBody for the API payload', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true,
                marketplaceId: 'mp-mapped',
                status: 'published',
                message: 'ok',
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            // mapCognitiveGeneToPublishBody adds a license field
            expect(callBody.license).toBe('MIT');
        });

        it('should sanitize content before publishing (remove emails)', async () => {
            const gene = createTestGene({
                content: {
                    instruction: 'Contact john@example.com for support.',
                    examples: [],
                    requiredCapabilities: [],
                    applicableContexts: [],
                    contraindications: [],
                    metadata: {},
                },
            });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true, marketplaceId: 'mp-001', status: 'published', message: 'ok',
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(callBody.content.instruction).toContain('[REDACTED_EMAIL]');
            expect(callBody.content.instruction).not.toContain('john@example.com');
        });

        it('should sanitize content before publishing (remove proper names)', async () => {
            const gene = createTestGene({
                content: {
                    instruction: 'This was created by John Smith for better results.',
                    examples: [],
                    requiredCapabilities: [],
                    applicableContexts: [],
                    contraindications: [],
                    metadata: {},
                },
            });
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true, marketplaceId: 'mp-002', status: 'published', message: 'ok',
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(callBody.content.instruction).toContain('[REDACTED_NAME]');
            expect(callBody.content.instruction).not.toContain('John Smith');
        });

        it('should update gene tenant scope to marketplace after successful publish', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true, marketplaceId: 'mp-003', status: 'published', message: 'ok',
            });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            expect(geneBank.updateGene).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenant: expect.objectContaining({ scope: 'marketplace' }),
                })
            );
        });

        it('should handle HTTP error responses from marketplace API', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(false, { error: 'Rate limited' }, 429);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Rate limited');
        });

        it('should handle HTTP error when response.json() fails', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: vi.fn().mockRejectedValue(new Error('invalid json')),
            } as unknown as Response;
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Internal Server Error');
        });

        it('should log audit event on successful publish', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true, marketplaceId: 'mp-audit', status: 'published', message: 'ok',
            });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            expect(metrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    component: 'MarketplaceClient',
                    operation: 'publishToMarketplace',
                })
            );
        });

        it('should handle unexpected exceptions gracefully', async () => {
            vi.mocked(geneBank.getGene).mockRejectedValue(new Error('DB connection failed'));

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(false);
            expect(result.error).toBe('DB connection failed');
        });

        it('should handle non-Error throws gracefully', async () => {
            vi.mocked(geneBank.getGene).mockRejectedValue('some string error');

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });
    });

    // ========================================================================
    // discoverGenes
    // ========================================================================

    describe('discoverGenes', () => {
        it('should return CognitiveGene[] mapped from API listings', async () => {
            const listings = [createTestListing({ sourceGeneId: 'remote-1' })];
            const mockResponse = createMockResponse(true, {
                genes: listings, total: 1, limit: 20, offset: 0,
            });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.discoverGenes({ domain: ['coding'] });

            expect(result).toHaveLength(1);
            // mapListingToCognitiveGene uses sourceGeneId as the id
            expect(result[0].id).toBe('remote-1');
            // Should have marketplace tenant scope from mapping
            expect(result[0].tenant.scope).toBe('marketplace');
        });

        it('should pass filters as URL search params via mapFiltersToApiParams', async () => {
            const mockResponse = createMockResponse(true, {
                genes: [], total: 0, limit: 20, offset: 0,
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.discoverGenes({
                type: ['reasoning-pattern'],
                domain: ['coding'],
                tags: ['test'],
                minFitness: 0.8,
                minAdoptions: 5,
                sortBy: 'fitness',
                sortOrder: 'desc',
                limit: 20,
                offset: 10,
            });

            const url = fetchSpy.mock.calls[0][0] as string;
            expect(url).toContain('type=reasoning-pattern');
            expect(url).toContain('domain=coding');
            expect(url).toContain('tags=test');
            expect(url).toContain('minFitness=0.8');
            expect(url).toContain('minAdoptions=5');
            expect(url).toContain('sortBy=fitness');
            expect(url).toContain('sortOrder=desc');
            expect(url).toContain('limit=20');
            expect(url).toContain('offset=10');
        });

        it('should support full-text search via q parameter', async () => {
            const mockResponse = createMockResponse(true, {
                genes: [], total: 0, limit: 20, offset: 0,
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.discoverGenes({ q: 'error recovery' });

            const url = fetchSpy.mock.calls[0][0] as string;
            expect(url).toContain('q=error+recovery');
        });

        it('should return MarketplaceSearchResponse when raw: true', async () => {
            const listings = [createTestListing()];
            const apiResponse = { genes: listings, total: 42, limit: 20, offset: 0 };
            const mockResponse = createMockResponse(true, apiResponse);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.discoverGenes({}, { raw: true });

            expect(result.total).toBe(42);
            expect(result.genes).toHaveLength(1);
            // Raw mode returns listings, not CognitiveGene
            expect(result.genes[0]).toHaveProperty('contentHash');
        });

        it('should fallback to local gene bank when API returns non-OK', async () => {
            const mockResponse = createMockResponse(false, null, 503);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const localGenes = [createTestGene({ id: 'local-1' })];
            vi.mocked(geneBank.searchGenes).mockResolvedValue(localGenes);

            const result = await client.discoverGenes({ domain: ['coding'] });

            expect(geneBank.searchGenes).toHaveBeenCalledWith(
                expect.objectContaining({
                    scope: ['marketplace'],
                    verifiedOnly: true,
                })
            );
            expect(result).toEqual(localGenes);
        });

        it('should return empty MarketplaceSearchResponse when raw and API fails', async () => {
            const mockResponse = createMockResponse(false, null, 503);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.discoverGenes({}, { raw: true });

            expect(result).toEqual({ genes: [], total: 0, limit: 20, offset: 0 });
        });

        it('should fallback to local gene bank when fetch throws (network error)', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

            const localGenes = [createTestGene({ id: 'local-fallback' })];
            vi.mocked(geneBank.searchGenes).mockResolvedValue(localGenes);

            const result = await client.discoverGenes({ minFitness: 0.85 });

            expect(geneBank.searchGenes).toHaveBeenCalledWith(
                expect.objectContaining({
                    minFitness: 0.85,
                    scope: ['marketplace'],
                    verifiedOnly: true,
                })
            );
            expect(result).toEqual(localGenes);
        });

        it('should return empty MarketplaceSearchResponse when raw and fetch throws', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

            const result = await client.discoverGenes({ minFitness: 0.85 }, { raw: true });

            expect(result).toEqual({ genes: [], total: 0, limit: 20, offset: 0 });
        });

        it('should use default minFitness of 0.8 in fallback when none provided', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
            vi.mocked(geneBank.searchGenes).mockResolvedValue([]);

            await client.discoverGenes({});

            expect(geneBank.searchGenes).toHaveBeenCalledWith(
                expect.objectContaining({ minFitness: 0.8 })
            );
        });

        it('should not include empty filter params in URL', async () => {
            const mockResponse = createMockResponse(true, {
                genes: [], total: 0, limit: 20, offset: 0,
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.discoverGenes({});

            const url = fetchSpy.mock.calls[0][0] as string;
            // Empty filters means just the base URL with empty params
            expect(url).toContain('/genes/search?');
        });
    });

    // ========================================================================
    // adoptFromMarketplace
    // ========================================================================

    describe('adoptFromMarketplace', () => {
        it('should download listing, map to gene, and store locally with correct lineage', async () => {
            const remoteListing = createTestListing({ sourceGeneId: 'remote-gene-1' });

            // First call = GET the listing, second call = POST adopt (non-blocking)
            const getResponse = createMockResponse(true, remoteListing);
            const adoptResponse = createMockResponse(true, { ok: true });
            vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(getResponse)
                .mockResolvedValueOnce(adoptResponse);

            const result = await client.adoptFromMarketplace('remote-gene-1');

            // ID from mapListingToCognitiveGene uses sourceGeneId
            expect(result.id).toContain('adopted_remote-gene-1_');
            expect(result.lineage.parentGeneId).toBe('remote-gene-1');
            expect(result.lineage.ancestors).toContain('remote-gene-1');
            expect(result.tenant.scope).toBe('tenant');
            expect(geneBank.storeGene).toHaveBeenCalledWith(result);
        });

        it('should throw when gene is not found on marketplace', async () => {
            const mockResponse = createMockResponse(false, null, 404);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.adoptFromMarketplace('nonexistent'))
                .rejects.toThrow('not found in Marketplace');
        });

        it('should handle POST /adopt failure gracefully (non-blocking)', async () => {
            const remoteListing = createTestListing({ sourceGeneId: 'gene-adopt-fail' });

            const getResponse = createMockResponse(true, remoteListing);
            vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(getResponse)
                .mockRejectedValueOnce(new Error('adopt endpoint down'));

            // Should NOT throw even though the adopt POST fails
            const result = await client.adoptFromMarketplace('gene-adopt-fail');
            expect(result.id).toContain('adopted_gene-adopt-fail_');
            expect(geneBank.storeGene).toHaveBeenCalled();
        });

        it('should use agentId from geneBank config if available', async () => {
            const remoteListing = createTestListing({ sourceGeneId: 'gene-with-agent' });

            const getResponse = createMockResponse(true, remoteListing);
            const adoptResponse = createMockResponse(true, {});
            const fetchSpy = vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(getResponse)
                .mockResolvedValueOnce(adoptResponse);

            await client.adoptFromMarketplace('gene-with-agent');

            // The second fetch call is the POST to /adopt
            const postBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
            expect(postBody.agentId).toBe('agent-test');
        });
    });

    // ========================================================================
    // HTTP headers
    // ========================================================================

    describe('HTTP headers', () => {
        it('should include Authorization header when apiKey is set', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, {
                success: true, marketplaceId: 'mp-auth', status: 'published', message: 'ok',
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
            expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('should NOT include Authorization header when apiKey is not set', async () => {
            const noKeyClient = new MarketplaceClient(geneBank);
            const mockResponse = createMockResponse(true, {
                genes: [], total: 0, limit: 20, offset: 0,
            });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await noKeyClient.discoverGenes({});

            const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
            expect(headers['Authorization']).toBeUndefined();
            expect(headers['Content-Type']).toBe('application/json');
        });
    });

    // ========================================================================
    // Timeout
    // ========================================================================

    describe('timeout', () => {
        it('should pass AbortSignal to fetch', async () => {
            const mockResponse = createMockResponse(true, { status: 'ok', version: '0.1.0', uptime: 100 });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.healthCheck();

            const fetchOptions = fetchSpy.mock.calls[0][1]!;
            expect(fetchOptions.signal).toBeDefined();
            expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
        });

        it('should use custom timeout from options', async () => {
            const fastClient = new MarketplaceClient(geneBank, { apiKey: TEST_API_KEY, timeout: 500 });
            const mockResponse = createMockResponse(true, { status: 'ok', version: '0.1.0', uptime: 100 });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            // Should not throw since mock resolves immediately
            await expect(fastClient.healthCheck()).resolves.toBeDefined();
        });
    });

    // ========================================================================
    // Metrics collector (optional)
    // ========================================================================

    describe('metrics collector', () => {
        it('should work without metrics collector', async () => {
            const clientNoMetrics = new MarketplaceClient(geneBank, { apiKey: TEST_API_KEY });
            vi.mocked(geneBank.getGene).mockResolvedValue(null);

            // Should not throw even without metricsCollector
            const result = await clientNoMetrics.publishToMarketplace('missing');
            expect(result.success).toBe(false);
        });
    });

    // ========================================================================
    // healthCheck
    // ========================================================================

    describe('healthCheck', () => {
        it('should return health status on success', async () => {
            const healthData = { status: 'ok', version: '0.1.0', uptime: 12345 };
            const mockResponse = createMockResponse(true, healthData);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.healthCheck();

            expect(result.status).toBe('ok');
            expect(result.version).toBe('0.1.0');
            expect(result.uptime).toBe(12345);
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, null, 503);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.healthCheck()).rejects.toThrow('health check failed');
        });
    });

    // ========================================================================
    // getGeneListing
    // ========================================================================

    describe('getGeneListing', () => {
        it('should return listing by ID', async () => {
            const listing = createTestListing({ id: 'listing-xyz' });
            const mockResponse = createMockResponse(true, listing);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.getGeneListing('listing-xyz');

            expect(result.id).toBe('listing-xyz');
        });

        it('should throw when listing not found', async () => {
            const mockResponse = createMockResponse(false, null, 404);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.getGeneListing('missing')).rejects.toThrow('not found');
        });
    });

    // ========================================================================
    // listPublishedGenes
    // ========================================================================

    describe('listPublishedGenes', () => {
        it('should return array of tenant listings', async () => {
            const listings = [createTestListing({ id: 'my-1' }), createTestListing({ id: 'my-2' })];
            const mockResponse = createMockResponse(true, listings);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.listPublishedGenes();

            expect(result).toHaveLength(2);
        });

        it('should call GET /tenant/genes', async () => {
            const mockResponse = createMockResponse(true, []);
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.listPublishedGenes();

            const url = fetchSpy.mock.calls[0][0] as string;
            expect(url).toContain('/tenant/genes');
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, null, 500);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.listPublishedGenes()).rejects.toThrow('Failed to list published genes');
        });
    });

    // ========================================================================
    // createPurchase
    // ========================================================================

    describe('createPurchase', () => {
        it('should send geneListingId and return purchase response', async () => {
            const purchaseData = {
                purchaseId: 'pur-001', clientSecret: 'cs_test', amount: 999, currency: 'usd',
            };
            const mockResponse = createMockResponse(true, purchaseData);
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.createPurchase('listing-abc');

            expect(result.purchaseId).toBe('pur-001');
            expect(result.clientSecret).toBe('cs_test');

            const postBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(postBody.geneListingId).toBe('listing-abc');
        });

        it('should throw with error message from API on failure', async () => {
            const mockResponse = createMockResponse(false, { error: 'Gene not purchasable' }, 400);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.createPurchase('bad-id')).rejects.toThrow('Gene not purchasable');
        });
    });

    // ========================================================================
    // listPurchases
    // ========================================================================

    describe('listPurchases', () => {
        it('should return array of purchases', async () => {
            const purchases = [
                { id: 'pur-1', geneListingId: 'listing-1', status: 'completed' },
                { id: 'pur-2', geneListingId: 'listing-2', status: 'pending' },
            ];
            const mockResponse = createMockResponse(true, purchases);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.listPurchases();

            expect(result).toHaveLength(2);
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, null, 500);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.listPurchases()).rejects.toThrow('Failed to list purchases');
        });
    });

    // ========================================================================
    // requestRefund
    // ========================================================================

    describe('requestRefund', () => {
        it('should send purchaseId and reason, return refunded response', async () => {
            const mockResponse = createMockResponse(true, { refunded: true });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.requestRefund('pur-001', 'Gene did not perform as expected');

            expect(result.refunded).toBe(true);

            const postBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(postBody.purchaseId).toBe('pur-001');
            expect(postBody.reason).toBe('Gene did not perform as expected');
        });

        it('should throw with error message from API on failure', async () => {
            const mockResponse = createMockResponse(false, { error: 'Refund window expired' }, 400);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.requestRefund('pur-old', 'too late'))
                .rejects.toThrow('Refund window expired');
        });
    });

    // ========================================================================
    // onboardSeller
    // ========================================================================

    describe('onboardSeller', () => {
        it('should send country and return onboarding URL', async () => {
            const onboardData = {
                accountId: 'acct_123', onboardingUrl: 'https://connect.stripe.com/onboard/123',
            };
            const mockResponse = createMockResponse(true, onboardData);
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.onboardSeller('DE');

            expect(result.accountId).toBe('acct_123');
            expect(result.onboardingUrl).toContain('stripe.com');

            const postBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(postBody.country).toBe('DE');
        });

        it('should default country to US when not provided', async () => {
            const mockResponse = createMockResponse(true, { accountId: 'acct_us', onboardingUrl: 'https://...' });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.onboardSeller();

            const postBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(postBody.country).toBe('US');
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, { error: 'Stripe unavailable' }, 503);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.onboardSeller()).rejects.toThrow('Stripe unavailable');
        });
    });

    // ========================================================================
    // getSellerStatus
    // ========================================================================

    describe('getSellerStatus', () => {
        it('should return seller Stripe status', async () => {
            const status = {
                connected: true,
                chargesEnabled: true,
                payoutsEnabled: true,
                onboardingCompleted: true,
                country: 'DE',
                defaultCurrency: 'eur',
            };
            const mockResponse = createMockResponse(true, status);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.getSellerStatus();

            expect(result.connected).toBe(true);
            expect(result.chargesEnabled).toBe(true);
            expect(result.country).toBe('DE');
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, null, 404);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.getSellerStatus()).rejects.toThrow('Failed to get seller status');
        });
    });

    // ========================================================================
    // getSellerEarnings
    // ========================================================================

    describe('getSellerEarnings', () => {
        it('should return earnings summary', async () => {
            const earnings = {
                totalEarned: 15000, pendingAmount: 2500, completedSales: 12, refundedSales: 1,
            };
            const mockResponse = createMockResponse(true, earnings);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.getSellerEarnings();

            expect(result.totalEarned).toBe(15000);
            expect(result.completedSales).toBe(12);
        });

        it('should throw on API failure', async () => {
            const mockResponse = createMockResponse(false, null, 500);
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await expect(client.getSellerEarnings()).rejects.toThrow('Failed to get seller earnings');
        });
    });
});
