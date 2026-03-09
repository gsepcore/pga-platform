/**
 * MarketplaceClient Unit Tests
 *
 * Tests for the MarketplaceClient class covering:
 * - Publishing genes to the marketplace
 * - Discovering genes via search
 * - Adopting genes from the marketplace
 * - Content sanitization (PII removal)
 * - HTTP header construction with/without API key
 * - Error handling and fallback behavior
 *
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketplaceClient } from '../MarketplaceClient.js';
import type { GeneBank } from '../GeneBank.js';
import type { CognitiveGene } from '../CognitiveGene.js';
import type { MetricsCollector } from '../../monitoring/MetricsCollector.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const TEST_MARKETPLACE_URL = 'https://market.gsep-platform.ai/v1';
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
            ...(overrides.fitness as object || {}),
        },
        lineage: {
            parentGeneId: null,
            generation: 0,
            ancestors: [],
            mutationHistory: [],
            ...(overrides.lineage as object || {}),
        },
        content: {
            instruction: 'Always think step by step when solving problems.',
            examples: [],
            requiredCapabilities: [],
            applicableContexts: ['general'],
            contraindications: [],
            metadata: {},
            ...(overrides.content as object || {}),
        },
        tenant: {
            tenantId: 'tenant-test',
            createdBy: 'agent-test',
            scope: 'tenant' as const,
            verified: false,
            ...(overrides.tenant as object || {}),
        },
        createdAt: now,
        updatedAt: now,
        tags: ['test'],
        ...overrides,
    } as CognitiveGene;
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
            expect(c.marketplaceUrl).toBe(TEST_MARKETPLACE_URL);
        });

        it('should use custom marketplace URL when provided', () => {
            const c = new MarketplaceClient(geneBank, { marketplaceUrl: 'https://custom.api/v2' });
            expect(c.marketplaceUrl).toBe('https://custom.api/v2');
        });

        it('should accept optional apiKey', () => {
            const c = new MarketplaceClient(geneBank, { apiKey: 'my-key' });
            expect(c.marketplaceUrl).toBe(TEST_MARKETPLACE_URL);
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

            const mockResponse = createMockResponse(true, { id: 'marketplace-123' });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.publishToMarketplace('gene-test-001');

            expect(result.success).toBe(true);
            expect(result.marketplaceId).toBe('marketplace-123');
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

            const mockResponse = createMockResponse(true, { id: 'mp-001' });
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

            const mockResponse = createMockResponse(true, { id: 'mp-002' });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const callBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
            expect(callBody.content.instruction).toContain('[REDACTED_NAME]');
            expect(callBody.content.instruction).not.toContain('John Smith');
        });

        it('should update gene tenant scope to marketplace after successful publish', async () => {
            const gene = createTestGene();
            vi.mocked(geneBank.getGene).mockResolvedValue(gene);

            const mockResponse = createMockResponse(true, { id: 'mp-003' });
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

            const mockResponse = createMockResponse(true, { id: 'mp-audit' });
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
        it('should return genes from marketplace API on success', async () => {
            const remoteGenes = [createTestGene({ id: 'remote-1' })];
            const mockResponse = createMockResponse(true, { genes: remoteGenes });
            vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            const result = await client.discoverGenes({ domain: ['coding'] });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('remote-1');
        });

        it('should pass filters as URL search params', async () => {
            const mockResponse = createMockResponse(true, { genes: [] });
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

        it('should use default minFitness of 0.8 in fallback when none provided', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
            vi.mocked(geneBank.searchGenes).mockResolvedValue([]);

            await client.discoverGenes({});

            expect(geneBank.searchGenes).toHaveBeenCalledWith(
                expect.objectContaining({ minFitness: 0.8 })
            );
        });

        it('should not include empty filter params in URL', async () => {
            const mockResponse = createMockResponse(true, { genes: [] });
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
        it('should download gene and store locally with correct lineage', async () => {
            const remoteGene = createTestGene({ id: 'remote-gene-1' });

            // First call = GET the gene, second call = POST adopt (non-blocking)
            const getResponse = createMockResponse(true, remoteGene);
            const adoptResponse = createMockResponse(true, { ok: true });
            vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(getResponse)
                .mockResolvedValueOnce(adoptResponse);

            const result = await client.adoptFromMarketplace('remote-gene-1');

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
            const remoteGene = createTestGene({ id: 'gene-adopt-fail' });

            const getResponse = createMockResponse(true, remoteGene);
            vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(getResponse)
                .mockRejectedValueOnce(new Error('adopt endpoint down'));

            // Should NOT throw even though the adopt POST fails
            const result = await client.adoptFromMarketplace('gene-adopt-fail');
            expect(result.id).toContain('adopted_gene-adopt-fail_');
            expect(geneBank.storeGene).toHaveBeenCalled();
        });

        it('should use agentId from geneBank config if available', async () => {
            const remoteGene = createTestGene({ id: 'gene-with-agent' });

            const getResponse = createMockResponse(true, remoteGene);
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

            const mockResponse = createMockResponse(true, { id: 'mp-auth' });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await client.publishToMarketplace('gene-test-001');

            const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
            expect(headers['Authorization']).toBe(`Bearer ${TEST_API_KEY}`);
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('should NOT include Authorization header when apiKey is not set', async () => {
            const noKeyClient = new MarketplaceClient(geneBank);
            const mockResponse = createMockResponse(true, { genes: [] });
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

            await noKeyClient.discoverGenes({});

            const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
            expect(headers['Authorization']).toBeUndefined();
            expect(headers['Content-Type']).toBe('application/json');
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
});
