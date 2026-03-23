/**
 * Health Route — Public health check endpoint
 *
 * No authentication required.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { GSEPServer } from '../GSEPServer.js';

export function registerHealthRoutes(app: FastifyInstance, server: GSEPServer): void {
    app.get('/api/health', async () => {
        return {
            status: 'ok',
            genomes: server.getGenomeCount(),
            uptime: server.getUptime(),
        };
    });
}
