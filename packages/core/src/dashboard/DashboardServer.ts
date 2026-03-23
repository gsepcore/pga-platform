/**
 * Dashboard Server — SSE Real-Time Transport
 *
 * Zero external dependencies (uses node:http + node:fs + node:path).
 * Serves per-user filtered event streams via Server-Sent Events.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DashboardTokenHelper, type DashboardTokenPayload } from './DashboardToken.js';
import type { GSEPEventEmitter, GSEPEvent } from '../realtime/EventEmitter.js';
import type { MarketplaceClient } from '../gene-bank/MarketplaceClient.js';

// ─── Types ───────────────────────────────────────────────

export interface DashboardServerConfig {
    /** HMAC secret for token verification */
    secret: string;
    /** Event emitter to subscribe to */
    events: GSEPEventEmitter;
    /** Port to listen on (default 4200) */
    port?: number;
    /** Host to bind to (default '0.0.0.0') */
    host?: string;
    /** Max SSE connections per user (default 3) */
    maxConnectionsPerUser?: number;
    /** Optional genome snapshot provider for initial hydration */
    getSnapshot?: (genomeId: string) => unknown;
    /** Optional MarketplaceClient provider for marketplace proxy routes */
    getMarketplaceClient?: () => MarketplaceClient | undefined;
    /** Optional gene data provider for the gene sidebar */
    getGenes?: () => {
        layer0: unknown[];
        layer1: unknown[];
        layer2: unknown[];
        c3?: { active: boolean; integrityValid: boolean; totalPatterns: number; totalScanned: number; totalBlocked: number; totalSanitized: number; blockRate: number };
        c4?: { active: boolean; totalScans: number; threatsDetected: number; quarantinesTriggered: number; sanitizations: number; immuneMemorySize: number };
        geneBank?: {
            active: boolean;
            totalGenes: number;
            sellable: unknown[];
            published: unknown[];
            adopted: unknown[];
        };
    };
}

interface SSEConnection {
    res: ServerResponse;
    payload: DashboardTokenPayload;
    connectedAt: number;
}

// ─── Dashboard Server ────────────────────────────────────

export class DashboardServer {
    private server: Server | null = null;
    private connections: Map<string, SSEConnection[]> = new Map();
    private eventSubscriptionId: string | null = null;
    private readonly config: Required<Omit<DashboardServerConfig, 'getSnapshot' | 'getGenes' | 'getMarketplaceClient'>> & Pick<DashboardServerConfig, 'getSnapshot' | 'getGenes' | 'getMarketplaceClient'>;
    private dashboardHtml: string | null = null;

    constructor(config: DashboardServerConfig) {
        this.config = {
            port: 4200,
            host: '0.0.0.0',
            maxConnectionsPerUser: 3,
            ...config,
        };
    }

    /**
     * Start the dashboard server
     */
    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => this.handleRequest(req, res));

            this.server.on('error', reject);

            this.server.listen(this.config.port, this.config.host, () => {
                // Subscribe to all events from the emitter
                this.eventSubscriptionId = this.config.events.onAny((event: GSEPEvent) => {
                    this.broadcastEvent(event);
                });
                resolve();
            });
        });
    }

    /**
     * Stop the dashboard server
     */
    async stop(): Promise<void> {
        // Unsubscribe from events
        if (this.eventSubscriptionId) {
            this.config.events.off(this.eventSubscriptionId);
            this.eventSubscriptionId = null;
        }

        // Close all SSE connections
        for (const conns of this.connections.values()) {
            for (const conn of conns) {
                conn.res.end();
            }
        }
        this.connections.clear();

        // Close HTTP server
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    /**
     * Get the number of active connections
     */
    getConnectionCount(): number {
        let total = 0;
        for (const conns of this.connections.values()) {
            total += conns.length;
        }
        return total;
    }

    /**
     * Get the server port
     */
    getPort(): number {
        return this.config.port;
    }

    // ─── Request Handler ─────────────────────────────────

    private handleRequest(req: IncomingMessage, res: ServerResponse): void {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const path = url.pathname;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (path === '/gsep/events') {
            this.handleSSE(url, res);
        } else if (path === '/gsep/dashboard') {
            this.handleDashboard(url, res);
        } else if (path === '/gsep/snapshot') {
            this.handleSnapshot(url, res);
        } else if (path === '/gsep/genes') {
            this.handleGenes(url, res);
        } else if (path === '/gsep/health') {
            this.handleHealth(res);
        } else if (path.startsWith('/gsep/marketplace/')) {
            this.handleMarketplace(req, url, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    }

    // ─── SSE Endpoint ────────────────────────────────────

    private handleSSE(url: URL, res: ServerResponse): void {
        const token = url.searchParams.get('token');
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing token' }));
            return;
        }

        const payload = DashboardTokenHelper.verify(this.config.secret, token);
        if (!payload) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid or expired token' }));
            return;
        }

        // Check connection limit
        const userConns = this.connections.get(payload.userId) ?? [];
        if (userConns.length >= this.config.maxConnectionsPerUser) {
            // Close oldest connection
            const oldest = userConns.shift();
            if (oldest) oldest.res.end();
        }

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });

        // Send initial connected event
        res.write(`data: ${JSON.stringify({ type: 'connected', userId: payload.userId, genomeId: payload.genomeId })}\n\n`);

        // Register connection
        const conn: SSEConnection = {
            res,
            payload,
            connectedAt: Date.now(),
        };

        if (!this.connections.has(payload.userId)) {
            this.connections.set(payload.userId, []);
        }
        this.connections.get(payload.userId)!.push(conn);

        // Cleanup on close
        res.on('close', () => {
            const conns = this.connections.get(payload.userId);
            if (conns) {
                const idx = conns.indexOf(conn);
                if (idx !== -1) conns.splice(idx, 1);
                if (conns.length === 0) this.connections.delete(payload.userId);
            }
        });

        // Keep-alive ping every 30s
        const keepAlive = setInterval(() => {
            if (res.destroyed) {
                clearInterval(keepAlive);
                return;
            }
            res.write(': ping\n\n');
        }, 30_000);

        res.on('close', () => clearInterval(keepAlive));
    }

    // ─── Dashboard HTML Endpoint ─────────────────────────

    private handleDashboard(url: URL, res: ServerResponse): void {
        const token = url.searchParams.get('token');
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Missing token');
            return;
        }

        const payload = DashboardTokenHelper.verify(this.config.secret, token);
        if (!payload) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Invalid or expired token');
            return;
        }

        // Load HTML lazily
        if (!this.dashboardHtml) {
            try {
                this.dashboardHtml = readFileSync(
                    join(__dirname, 'dashboard.html'),
                    'utf-8',
                );
            } catch {
                // Try relative to source directory (for ts-node / tsx)
                try {
                    this.dashboardHtml = readFileSync(
                        join(__dirname, '..', 'dashboard', 'dashboard.html'),
                        'utf-8',
                    );
                } catch {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Dashboard HTML not found');
                    return;
                }
            }
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(this.dashboardHtml);
    }

    // ─── Snapshot Endpoint ───────────────────────────────

    private handleSnapshot(url: URL, res: ServerResponse): void {
        const token = url.searchParams.get('token');
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing token' }));
            return;
        }

        const payload = DashboardTokenHelper.verify(this.config.secret, token);
        if (!payload) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid or expired token' }));
            return;
        }

        const snapshot = this.config.getSnapshot
            ? this.config.getSnapshot(payload.genomeId)
            : { genomeId: payload.genomeId, userId: payload.userId, status: 'active' };

        // Include recent event history
        const recentEvents = this.config.events.getHistory({
            limit: 50,
        }).filter(e => e.metadata?.genomeId === payload.genomeId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ...snapshot as Record<string, unknown>,
            recentEvents: recentEvents.map(e => ({
                type: e.type,
                timestamp: e.timestamp,
                data: e.data,
            })),
        }));
    }

    // ─── Genes Endpoint ──────────────────────────────────

    private handleGenes(url: URL, res: ServerResponse): void {
        const token = url.searchParams.get('token');
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing token' }));
            return;
        }

        const payload = DashboardTokenHelper.verify(this.config.secret, token);
        if (!payload) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid or expired token' }));
            return;
        }

        const genes = this.config.getGenes
            ? this.config.getGenes()
            : { layer0: [], layer1: [], layer2: [], c3: undefined, c4: undefined };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(genes));
    }

    // ─── Health Endpoint ─────────────────────────────────

    private handleHealth(res: ServerResponse): void {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            connections: this.getConnectionCount(),
            uptime: process.uptime(),
        }));
    }

    // ─── Marketplace Proxy Routes ─────────────────────────

    private handleMarketplace(req: IncomingMessage, url: URL, res: ServerResponse): void {
        // Auth: all marketplace routes require token
        const token = url.searchParams.get('token');
        if (!token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing token' }));
            return;
        }

        const payload = DashboardTokenHelper.verify(this.config.secret, token);
        if (!payload) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid or expired token' }));
            return;
        }

        // Check if marketplace client is available
        const client = this.config.getMarketplaceClient?.();
        if (!client) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Marketplace not configured' }));
            return;
        }

        // Route based on sub-path + method
        const subPath = url.pathname.replace('/gsep/marketplace/', '');
        const method = req.method ?? 'GET';

        // GET routes
        if (method === 'GET') {
            if (subPath === 'health') {
                this.mpProxy(res, () => client.healthCheck());
            } else if (subPath === 'search') {
                const filters = this.parseSearchParams(url);
                this.mpProxy(res, () => client.discoverGenes(filters, { raw: true }));
            } else if (subPath.startsWith('genes/') && subPath.indexOf('/', 6) === -1) {
                const id = subPath.slice(6);
                this.mpProxy(res, () => client.getGeneListing(id));
            } else if (subPath === 'my-genes') {
                this.mpProxy(res, () => client.listPublishedGenes());
            } else if (subPath === 'purchases') {
                this.mpProxy(res, () => client.listPurchases());
            } else if (subPath === 'seller/status') {
                this.mpProxy(res, () => client.getSellerStatus());
            } else if (subPath === 'seller/earnings') {
                this.mpProxy(res, () => client.getSellerEarnings());
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
            return;
        }

        // POST routes — need body parsing
        if (method === 'POST') {
            this.readBody(req).then((body) => {
                if (subPath.startsWith('publish/')) {
                    const geneId = subPath.replace('publish/', '');
                    this.mpProxy(res, () => client.publishToMarketplace(geneId));
                } else if (subPath.startsWith('adopt/')) {
                    const id = subPath.replace('adopt/', '');
                    this.mpProxy(res, () => client.adoptFromMarketplace(id));
                } else if (subPath === 'purchases') {
                    const { geneListingId } = body as { geneListingId: string };
                    if (!geneListingId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing geneListingId' }));
                        return;
                    }
                    this.mpProxy(res, () => client.createPurchase(geneListingId));
                } else if (subPath === 'purchases/refund') {
                    const { purchaseId, reason } = body as { purchaseId: string; reason: string };
                    if (!purchaseId || !reason) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing purchaseId or reason' }));
                        return;
                    }
                    this.mpProxy(res, () => client.requestRefund(purchaseId, reason));
                } else if (subPath === 'seller/onboard') {
                    const { country } = body as { country?: string };
                    this.mpProxy(res, () => client.onboardSeller(country));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            }).catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            });
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    /** Execute a marketplace client method and send the result as JSON */
    private async mpProxy(res: ServerResponse, fn: () => Promise<unknown>): Promise<void> {
        try {
            const result = await fn();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            const status = message.includes('not found') || message.includes('HTTP 404') ? 404 : 502;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: message }));
        }
    }

    /** Read and parse JSON body from an incoming request */
    private readBody(req: IncomingMessage): Promise<unknown> {
        return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            req.on('end', () => {
                try {
                    resolve(data.length > 0 ? JSON.parse(data) : {});
                } catch {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    /** Parse marketplace search params from URL query */
    private parseSearchParams(url: URL): Record<string, unknown> {
        const filters: Record<string, unknown> = {};
        const q = url.searchParams.get('q');
        if (q) filters.q = q;
        const type = url.searchParams.get('type');
        if (type) filters.type = [type];
        const domain = url.searchParams.get('domain');
        if (domain) filters.domain = [domain];
        const minFitness = url.searchParams.get('minFitness');
        if (minFitness) filters.minFitness = parseFloat(minFitness);
        const sortBy = url.searchParams.get('sortBy');
        if (sortBy) filters.sortBy = sortBy;
        const limit = url.searchParams.get('limit');
        if (limit) filters.limit = parseInt(limit, 10);
        const offset = url.searchParams.get('offset');
        if (offset) filters.offset = parseInt(offset, 10);
        return filters;
    }

    // ─── Event Broadcasting ──────────────────────────────

    private broadcastEvent(event: GSEPEvent): void {
        const genomeId = event.metadata?.genomeId;
        const userId = event.metadata?.userId;

        const eventData = JSON.stringify({
            type: event.type,
            timestamp: event.timestamp,
            data: event.data,
        });

        const message = `data: ${eventData}\n\n`;

        // Broadcast to all connections that match the genomeId
        for (const [connUserId, conns] of this.connections.entries()) {
            for (const conn of conns) {
                // Filter: connection must be for the same genome
                if (genomeId && conn.payload.genomeId !== genomeId) continue;

                // Filter: if event has userId, only send to matching user
                // (for privacy — users only see their own events)
                if (userId && connUserId !== userId) continue;

                try {
                    conn.res.write(message);
                } catch {
                    // Connection broken — will be cleaned up on 'close'
                }
            }
        }
    }
}
