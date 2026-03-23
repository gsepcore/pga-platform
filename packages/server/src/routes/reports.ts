/**
 * Report Routes — PUSH endpoint for external metrics
 *
 * External agents call this to report interaction metrics.
 * HMAC-signed to prevent metric forging.
 *
 * Security: Only numeric metrics flow in. No message content,
 * no API keys, no LLM responses. HMAC signature verification
 * ensures only the legitimate agent can report metrics.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { FastifyInstance } from 'fastify';
import type { GSEPServer } from '../GSEPServer.js';
import { HMACVerifier } from '../auth/HMACVerifier.js';

export function registerReportRoutes(app: FastifyInstance, server: GSEPServer): void {

    app.post<{ Params: { id: string } }>('/api/genomes/:id/report', async (request, reply) => {
        const { id } = request.params;

        const entry = server.getGenomeEntry(id);
        if (!entry) {
            return reply.status(404).send({ error: 'Genome not found' });
        }

        // Verify HMAC signature
        const signature = request.headers['x-gsep-signature'] as string | undefined;
        if (!signature) {
            return reply.status(401).send({ error: 'Missing X-GSEP-Signature header' });
        }

        const rawBody = JSON.stringify(request.body);
        if (!HMACVerifier.verify(entry.secret, rawBody, signature)) {
            return reply.status(401).send({ error: 'Invalid HMAC signature' });
        }

        const body = request.body as {
            userId?: string;
            success: boolean;
            latencyMs: number;
            inputTokens: number;
            outputTokens: number;
            taskType?: string;
            quality?: number;
            feedback?: 'positive' | 'negative' | 'neutral';
        };

        // Validate required fields
        if (typeof body.success !== 'boolean' || typeof body.latencyMs !== 'number') {
            return reply.status(400).send({ error: 'success (boolean) and latencyMs (number) are required' });
        }

        // Feed metrics into GSEP evolution pipeline
        try {
            await entry.instance.reportExternalMetrics({
                userId: body.userId,
                success: body.success,
                latencyMs: body.latencyMs,
                inputTokens: body.inputTokens ?? 0,
                outputTokens: body.outputTokens ?? 0,
                taskType: body.taskType,
                quality: body.quality,
                feedback: body.feedback,
            });
        } catch (err) {
            request.log.error(err, 'Failed to process metrics');
            return reply.status(500).send({ error: 'Failed to process metrics' });
        }

        return { recorded: true };
    });
}
