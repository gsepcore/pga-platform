/**
 * DashboardServer — Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DashboardServer } from '../DashboardServer.js';
import { DashboardTokenHelper } from '../DashboardToken.js';
import { PGAEventEmitter } from '../../realtime/EventEmitter.js';
import http from 'node:http';

const SECRET = 'test-secret-dashboard-server';
// Use a random port in high range to avoid conflicts
const TEST_PORT = 14200 + Math.floor(Math.random() * 1000);

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
    let events: PGAEventEmitter;
    let server: DashboardServer;
    const port = TEST_PORT;

    beforeAll(async () => {
        events = new PGAEventEmitter();
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
