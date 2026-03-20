/**
 * Payment Routes — Stripe subscriptions, Connect, gene checkout, webhooks
 *
 * Only registered if StripePayments is provided in server config.
 * Uses Admin API key auth for management endpoints.
 * Webhook endpoint uses Stripe signature verification (no admin key).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type { FastifyInstance } from 'fastify';
import type { PGAServer } from '../PGAServer.js';
import type { StripePayments } from '@pga-ai/payments';

export function registerPaymentRoutes(
    app: FastifyInstance,
    server: PGAServer,
    payments: StripePayments,
): void {

    // ─── Subscription Checkout ────────────────────────────

    app.post('/api/checkout/subscription', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const body = request.body as {
            userId: string;
            email: string;
            plan: 'pro' | 'team';
            name?: string;
        };

        if (!body.userId || !body.email || !body.plan) {
            return reply.status(400).send({ error: 'userId, email, and plan are required' });
        }

        if (body.plan !== 'pro' && body.plan !== 'team') {
            return reply.status(400).send({ error: 'plan must be "pro" or "team"' });
        }

        const result = await payments.subscriptions.createCheckoutSession(
            body.userId, body.email, body.plan, body.name,
        );

        return reply.status(200).send(result);
    });

    // ─── Billing Portal ───────────────────────────────────

    app.post('/api/billing/portal', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const body = request.body as { userId: string };
        if (!body.userId) {
            return reply.status(400).send({ error: 'userId is required' });
        }

        try {
            const result = await payments.subscriptions.createBillingPortalSession(body.userId);
            return reply.status(200).send(result);
        } catch (err) {
            return reply.status(404).send({
                error: err instanceof Error ? err.message : 'Customer not found',
            });
        }
    });

    // ─── Gene Purchase Checkout ───────────────────────────

    app.post<{ Params: { geneId: string } }>(
        '/api/checkout/gene/:geneId',
        async (request, reply) => {
            const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
            if (!server.verifyAdminKey(apiKey)) {
                return reply.status(401).send({ error: 'Invalid or missing admin API key' });
            }

            const body = request.body as {
                buyerUserId: string;
                buyerEmail: string;
                sellerUserId: string;
                geneName: string;
                priceUsd: number;
            };

            if (!body.buyerUserId || !body.buyerEmail || !body.sellerUserId || !body.priceUsd) {
                return reply.status(400).send({
                    error: 'buyerUserId, buyerEmail, sellerUserId, and priceUsd are required',
                });
            }

            try {
                const result = await payments.geneCheckout.createGeneCheckoutSession({
                    ...body,
                    geneId: request.params.geneId,
                    geneName: body.geneName || request.params.geneId,
                });
                return reply.status(200).send(result);
            } catch (err) {
                return reply.status(400).send({
                    error: err instanceof Error ? err.message : 'Checkout failed',
                });
            }
        },
    );

    // ─── Connect Onboarding ───────────────────────────────

    app.post('/api/connect/onboard', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const body = request.body as { userId: string; email: string };
        if (!body.userId || !body.email) {
            return reply.status(400).send({ error: 'userId and email are required' });
        }

        const account = await payments.connect.createConnectAccount(body.userId, body.email);
        const link = await payments.connect.createOnboardingLink(body.userId);

        return reply.status(200).send({
            stripeAccountId: account.stripeAccountId,
            onboardingUrl: link.url,
        });
    });

    // ─── Connect Status ───────────────────────────────────

    app.get('/api/connect/status', async (request, reply) => {
        const apiKey = request.headers['x-pga-admin-key'] as string | undefined;
        if (!server.verifyAdminKey(apiKey)) {
            return reply.status(401).send({ error: 'Invalid or missing admin API key' });
        }

        const query = request.query as { userId?: string };
        if (!query.userId) {
            return reply.status(400).send({ error: 'userId query parameter is required' });
        }

        const status = await payments.connect.getAccountStatus(query.userId);
        return reply.status(200).send(status);
    });

    // ─── Stripe Webhook ───────────────────────────────────
    // Uses Fastify encapsulation for raw body parsing (Stripe needs unparsed body)

    app.register(async (webhookScope) => {
        webhookScope.removeAllContentTypeParsers();
        webhookScope.addContentTypeParser(
            'application/json',
            { parseAs: 'buffer' },
            (_req: any, body: Buffer, done: (err: null, body: Buffer) => void) => {
                done(null, body);
            },
        );

        webhookScope.post('/api/webhooks/stripe', async (request, reply) => {
            const signature = request.headers['stripe-signature'] as string | undefined;
            if (!signature) {
                return reply.status(400).send({ error: 'Missing Stripe-Signature header' });
            }

            const rawBody = request.body as Buffer;
            if (!rawBody || !Buffer.isBuffer(rawBody)) {
                return reply.status(400).send({ error: 'Missing request body' });
            }

            const result = await payments.webhooks.handleEvent(rawBody, signature);

            if (result.error) {
                return reply.status(400).send({ error: result.error });
            }

            return reply.status(200).send({ received: true, handled: result.handled });
        });
    });
}
