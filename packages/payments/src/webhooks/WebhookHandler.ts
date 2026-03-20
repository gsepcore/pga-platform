/**
 * WebhookHandler — Stripe webhook event dispatcher
 *
 * Verifies signatures, constructs events, and dispatches to
 * the appropriate manager (subscriptions, connect, gene checkout).
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';
import type { StripePaymentsConfig } from '../types.js';
import type { SubscriptionManager } from '../subscriptions/SubscriptionManager.js';
import type { ConnectManager } from '../marketplace/ConnectManager.js';
import type { GeneCheckout } from '../marketplace/GeneCheckout.js';

export interface WebhookResult {
    handled: boolean;
    eventType: string;
    error?: string;
}

export class WebhookHandler {
    constructor(
        private stripe: Stripe,
        private config: StripePaymentsConfig,
        private subscriptions: SubscriptionManager,
        private connect: ConnectManager,
        private geneCheckout: GeneCheckout,
    ) {}

    /**
     * Process a Stripe webhook event.
     *
     * @param rawBody - Raw request body (Buffer or string)
     * @param signature - Stripe-Signature header value
     * @param isConnect - Whether this is a Connect webhook (uses connectWebhookSecret)
     */
    async handleEvent(
        rawBody: Buffer | string,
        signature: string,
        isConnect = false,
    ): Promise<WebhookResult> {
        let event: Stripe.Event;

        try {
            const secret = isConnect
                ? (this.config.connectWebhookSecret ?? this.config.webhookSecret)
                : this.config.webhookSecret;

            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                secret,
            );
        } catch (err) {
            return {
                handled: false,
                eventType: 'unknown',
                error: `Signature verification failed: ${err instanceof Error ? err.message : 'unknown'}`,
            };
        }

        try {
            return await this.dispatch(event);
        } catch (err) {
            return {
                handled: false,
                eventType: event.type,
                error: err instanceof Error ? err.message : 'Unknown dispatch error',
            };
        }
    }

    private async dispatch(event: Stripe.Event): Promise<WebhookResult> {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription') {
                    await this.subscriptions.handleCheckoutCompleted(session);
                } else if (session.metadata?.type === 'gene_purchase') {
                    await this.geneCheckout.handleCheckoutCompleted(session);
                }
                return { handled: true, eventType: event.type };
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await this.subscriptions.handleSubscriptionUpdated(subscription);
                return { handled: true, eventType: event.type };
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await this.subscriptions.handleSubscriptionDeleted(subscription);
                return { handled: true, eventType: event.type };
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await this.subscriptions.handlePaymentFailed(invoice);
                return { handled: true, eventType: event.type };
            }

            case 'account.updated': {
                const account = event.data.object as Stripe.Account;
                await this.connect.handleAccountUpdated(account);
                return { handled: true, eventType: event.type };
            }

            default:
                return { handled: false, eventType: event.type };
        }
    }
}
