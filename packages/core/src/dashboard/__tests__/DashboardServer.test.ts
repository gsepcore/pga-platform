/**
 * DashboardServer — Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DashboardServer } from '../DashboardServer.js';
import { DashboardTokenHelper } from '../DashboardToken.js';
import { GSEPEventEmitter } from '../../realtime/EventEmitter.js';
import http from 'node:http';

import type { MarketplaceClient } from '../../gene-bank/MarketplaceClient.js';

const SECRET = 'test-secret-dashboard-server';
// Use a random port in high range to avoid conflicts
const TEST_PORT = 14200 + Math.floor(Math.random() * 1000);
const TEST_PORT_MP = TEST_PORT + 1; // separate port for marketplace tests

function fetchUrl(url: string): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            res.on('end', () => {
                resolve({
                    status: res.statusCode ?? 0,
                    headers: res.headers as Record<string, string>,
                    body,
                });
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Use a single server instance for all tests to avoid port reuse timing issues
describe('DashboardServer', () => {
    let events: GSEPEventEmitter;
    let server: DashboardServer;
    const port = TEST_PORT;

    beforeAll(async () => {
        events = new GSEPEventEmitter();
        server = new DashboardServer({
            secret: SECRET,
            events,
            port,
            host: '127.0.0.1',
        });
        await server.start();
        // Give the server a moment to fully bind
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterAll(async () => {
        await server.stop();
    });

    describe('health endpoint', () => {
        it('should return health status', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/health`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.status).toBe('ok');
            expect(typeof data.connections).toBe('number');
        });
    });

    describe('snapshot endpoint', () => {
        it('should reject without token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/snapshot`);
            expect(res.status).toBe(401);
        });

        it('should reject with invalid token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/snapshot?token=bad-token`);
            expect(res.status).toBe(403);
        });

        it('should return snapshot with valid token', async () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-snap',
                genomeId: 'genome-snap',
            });

            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/snapshot?token=${encodeURIComponent(token)}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.genomeId).toBe('genome-snap');
            expect(data.userId).toBe('user-snap');
            expect(data.recentEvents).toBeDefined();
            expect(Array.isArray(data.recentEvents)).toBe(true);
        });

        it('should include recent events in snapshot', async () => {
            // Emit some events first
            events.emitSync('chat:started', { genomeId: 'genome-hist' }, { genomeId: 'genome-hist' });
            events.emitSync('fitness:computed', { composite: 0.85 }, { genomeId: 'genome-hist' });

            // Wait for events to be processed
            await new Promise(resolve => setTimeout(resolve, 50));

            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-hist',
                genomeId: 'genome-hist',
            });

            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/snapshot?token=${encodeURIComponent(token)}`);
            const data = JSON.parse(res.body);
            expect(data.recentEvents.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('SSE endpoint', () => {
        it('should reject without token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/events`);
            expect(res.status).toBe(401);
        });

        it('should reject with invalid token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/events?token=bad`);
            expect(res.status).toBe(403);
        });

        it('should establish SSE connection with valid token', async () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-sse',
                genomeId: 'genome-sse',
            });

            const received: string[] = [];

            await new Promise<void>((resolve) => {
                const req = http.get(
                    `http://127.0.0.1:${port}/gsep/events?token=${encodeURIComponent(token)}`,
                    (res) => {
                        expect(res.statusCode).toBe(200);
                        expect(res.headers['content-type']).toBe('text/event-stream');

                        res.on('data', (chunk: Buffer) => {
                            const data = chunk.toString();
                            received.push(data);
                            if (data.includes('"connected"')) {
                                req.destroy();
                                resolve();
                            }
                        });
                    },
                );
                req.on('error', () => { /* expected on destroy */ });
                setTimeout(() => { req.destroy(); resolve(); }, 3000);
            });

            expect(received.length).toBeGreaterThanOrEqual(1);
            expect(received[0]).toContain('"connected"');
        });

        it('should broadcast events to SSE connections', async () => {
            const token = DashboardTokenHelper.create(SECRET, {
                userId: 'user-broadcast',
                genomeId: 'genome-broadcast',
            });

            const received: unknown[] = [];

            await new Promise<void>((resolve) => {
                const req = http.get(
                    `http://127.0.0.1:${port}/gsep/events?token=${encodeURIComponent(token)}`,
                    (res) => {
                        res.on('data', (chunk: Buffer) => {
                            const lines = chunk.toString().split('\n');
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        received.push(JSON.parse(line.slice(6)));
                                    } catch { /* ignore */ }
                                }
                            }

                            if (received.length >= 2) {
                                req.destroy();
                                resolve();
                            }
                        });
                    },
                );
                req.on('error', () => { /* expected on destroy */ });

                // Wait for connection, then emit event
                setTimeout(() => {
                    events.emitSync('fitness:computed', { composite: 0.9 }, {
                        genomeId: 'genome-broadcast',
                        userId: 'user-broadcast',
                    });
                }, 100);

                setTimeout(() => { req.destroy(); resolve(); }, 5000);
            });

            expect(received.length).toBeGreaterThanOrEqual(2);
            expect((received[0] as { type: string }).type).toBe('connected');
            expect((received[1] as { type: string }).type).toBe('fitness:computed');
        });
    });

    describe('404 handling', () => {
        it('should return 404 for unknown paths', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/unknown`);
            expect(res.status).toBe(404);
        });
    });
});

// ────────────────────────────────────────────────────────────────────
// Marketplace Proxy Routes Tests
// ────────────────────────────────────────────────────────────────────

function postUrl(url: string, body: unknown): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(body);
        const req = http.request(
            {
                hostname: parsed.hostname,
                port: parsed.port,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            },
            (res) => {
                let responseBody = '';
                res.on('data', (chunk: Buffer) => { responseBody += chunk.toString(); });
                res.on('end', () => {
                    resolve({
                        status: res.statusCode ?? 0,
                        headers: res.headers as Record<string, string>,
                        body: responseBody,
                    });
                });
                res.on('error', reject);
            },
        );
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}

/** Creates a mock MarketplaceClient for testing */
function createMockMarketplaceClient(): MarketplaceClient {
    return {
        marketplaceUrl: 'https://market.gsepcore.com/v1',
        healthCheck: async () => ({ status: 'ok', version: '1.0.0' }),
        discoverGenes: async (_filters: unknown, _options?: unknown) => ({
            genes: [
                { id: 'gene-1', name: 'Test Gene', gene_type: 'behavioral', overall_fitness: 0.92, adoption_count: 5, price_cents: 500 },
            ],
            total: 1,
            limit: 20,
            offset: 0,
        }),
        getGeneListing: async (id: string) => ({
            id,
            name: 'Test Gene',
            gene_type: 'behavioral',
            overall_fitness: 0.92,
            adoption_count: 5,
            price_cents: 500,
            description: 'A test gene',
        }),
        listPublishedGenes: async () => [
            { id: 'pub-1', name: 'Published Gene', gene_type: 'cognitive', overall_fitness: 0.88 },
        ],
        listPurchases: async () => [
            { id: 'pur-1', gene_listing_id: 'gene-1', status: 'completed', amount_cents: 500 },
        ],
        getSellerStatus: async () => ({ status: 'active', charges_enabled: true }),
        getSellerEarnings: async () => ({ total_earned: 2500, pending: 500, total_sales: 5 }),
        publishToMarketplace: async (_geneId: string) => ({ success: true, marketplaceId: 'mp-123' }),
        adoptFromMarketplace: async (_id: string) => ({ id: 'adopted-1', name: 'Adopted Gene' }),
        createPurchase: async (_geneListingId: string) => ({ id: 'pur-new', status: 'completed' }),
        requestRefund: async (_purchaseId: string, _reason: string) => ({ refunded: true }),
        onboardSeller: async (_country?: string) => ({ onboarding_url: 'https://stripe.com/onboard' }),
    } as unknown as MarketplaceClient;
}

describe('DashboardServer — Marketplace Proxy Routes', () => {
    let mpEvents: GSEPEventEmitter;
    let mpServer: DashboardServer;
    let mockClient: MarketplaceClient;
    const port = TEST_PORT_MP;

    beforeAll(async () => {
        mpEvents = new GSEPEventEmitter();
        mockClient = createMockMarketplaceClient();
        mpServer = new DashboardServer({
            secret: SECRET,
            events: mpEvents,
            port,
            host: '127.0.0.1',
            getMarketplaceClient: () => mockClient,
        });
        await mpServer.start();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterAll(async () => {
        await mpServer.stop();
    });

    function mpToken() {
        return DashboardTokenHelper.create(SECRET, {
            userId: 'mp-user',
            genomeId: 'mp-genome',
        });
    }

    describe('auth', () => {
        it('should reject marketplace routes without token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/health`);
            expect(res.status).toBe(401);
        });

        it('should reject marketplace routes with invalid token', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/health?token=bad`);
            expect(res.status).toBe(403);
        });
    });

    describe('marketplace not configured', () => {
        it('should return 404 when getMarketplaceClient returns undefined', async () => {
            const noMpEvents = new GSEPEventEmitter();
            const noMpPort = port + 1;
            const noMpServer = new DashboardServer({
                secret: SECRET,
                events: noMpEvents,
                port: noMpPort,
                host: '127.0.0.1',
                // No getMarketplaceClient
            });
            await noMpServer.start();
            await new Promise(resolve => setTimeout(resolve, 50));

            try {
                const token = DashboardTokenHelper.create(SECRET, { userId: 'u', genomeId: 'g' });
                const res = await fetchUrl(`http://127.0.0.1:${noMpPort}/gsep/marketplace/health?token=${encodeURIComponent(token)}`);
                expect(res.status).toBe(404);
                const data = JSON.parse(res.body);
                expect(data.error).toContain('not configured');
            } finally {
                await noMpServer.stop();
            }
        });
    });

    describe('GET routes', () => {
        it('GET /gsep/marketplace/health — should return marketplace health', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/health?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.status).toBe('ok');
        });

        it('GET /gsep/marketplace/search — should return search results', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/search?token=${encodeURIComponent(mpToken())}&q=test&type=behavioral`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.genes).toBeDefined();
            expect(data.total).toBe(1);
        });

        it('GET /gsep/marketplace/genes/:id — should return gene listing', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/genes/gene-1?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.id).toBe('gene-1');
            expect(data.name).toBe('Test Gene');
        });

        it('GET /gsep/marketplace/my-genes — should return published genes', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/my-genes?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.length).toBe(1);
            expect(data[0].name).toBe('Published Gene');
        });

        it('GET /gsep/marketplace/purchases — should return purchases', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/purchases?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.length).toBe(1);
            expect(data[0].status).toBe('completed');
        });

        it('GET /gsep/marketplace/seller/status — should return seller status', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/seller/status?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.charges_enabled).toBe(true);
        });

        it('GET /gsep/marketplace/seller/earnings — should return earnings', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/seller/earnings?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.total_earned).toBe(2500);
        });

        it('GET /gsep/marketplace/unknown — should return 404', async () => {
            const res = await fetchUrl(`http://127.0.0.1:${port}/gsep/marketplace/unknown?token=${encodeURIComponent(mpToken())}`);
            expect(res.status).toBe(404);
        });
    });

    describe('POST routes', () => {
        it('POST /gsep/marketplace/publish/:geneId — should publish gene', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/publish/my-gene-1?token=${encodeURIComponent(mpToken())}`,
                {},
            );
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.success).toBe(true);
            expect(data.marketplaceId).toBe('mp-123');
        });

        it('POST /gsep/marketplace/adopt/:id — should adopt gene', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/adopt/gene-1?token=${encodeURIComponent(mpToken())}`,
                {},
            );
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.id).toBe('adopted-1');
        });

        it('POST /gsep/marketplace/purchases — should create purchase', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/purchases?token=${encodeURIComponent(mpToken())}`,
                { geneListingId: 'gene-1' },
            );
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.id).toBe('pur-new');
        });

        it('POST /gsep/marketplace/purchases — should reject without geneListingId', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/purchases?token=${encodeURIComponent(mpToken())}`,
                {},
            );
            expect(res.status).toBe(400);
        });

        it('POST /gsep/marketplace/purchases/refund — should request refund', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/purchases/refund?token=${encodeURIComponent(mpToken())}`,
                { purchaseId: 'pur-1', reason: 'Not as described' },
            );
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.refunded).toBe(true);
        });

        it('POST /gsep/marketplace/purchases/refund — should reject without fields', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/purchases/refund?token=${encodeURIComponent(mpToken())}`,
                { purchaseId: 'pur-1' },
            );
            expect(res.status).toBe(400);
        });

        it('POST /gsep/marketplace/seller/onboard — should onboard seller', async () => {
            const res = await postUrl(
                `http://127.0.0.1:${port}/gsep/marketplace/seller/onboard?token=${encodeURIComponent(mpToken())}`,
                { country: 'DE' },
            );
            expect(res.status).toBe(200);
            const data = JSON.parse(res.body);
            expect(data.onboarding_url).toContain('stripe.com');
        });
    });
});
