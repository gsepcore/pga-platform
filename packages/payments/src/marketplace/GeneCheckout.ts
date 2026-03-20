/**
 * GeneCheckout — Stripe Checkout for gene marketplace purchases
 *
 * Creates checkout sessions with automatic commission splitting
 * via Stripe Connect destination charges.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';
import type { PaymentStorage } from '../storage/PaymentStorage.js';
import type { CustomerManager } from '../customers/CustomerManager.js';
import type { ConnectManager } from './ConnectManager.js';
import type { StripePaymentsConfig, GenePurchaseRecord } from '../types.js';
import { COMMISSION_RATES } from '../types.js';

export class GeneCheckout {
    constructor(
        private stripe: Stripe,
        private storage: PaymentStorage,
        private customers: CustomerManager,
        private connect: ConnectManager,
        private config: StripePaymentsConfig,
    ) {}

    /**
     * Create a Stripe Checkout Session for purchasing a gene.
     *
     * Uses destination charges: payment goes to platform, then
     * transfers seller's share to their Connect account minus the
     * commission based on the buyer's subscription tier.
     */
    async createGeneCheckoutSession(params: {
        buyerUserId: string;
        buyerEmail: string;
        sellerUserId: string;
        geneId: string;
        geneName: string;
        priceUsd: number;
    }): Promise<{ sessionId: string; url: string }> {
        const { buyerUserId, buyerEmail, sellerUserId, geneId, geneName, priceUsd } = params;

        // Validate seller has a Connect account with payouts enabled
        const sellerAccount = await this.connect.getAccountStatus(sellerUserId);
        if (!sellerAccount.exists || !sellerAccount.payoutsEnabled) {
            throw new Error('Seller does not have an active Stripe Connect account');
        }

        // Get buyer's plan to determine commission rate
        const buyerPlan = await this.customers.getCustomerPlan(buyerUserId);
        const commissionRate = COMMISSION_RATES[buyerPlan];

        // Calculate amounts in cents
        const amountCents = Math.round(priceUsd * 100);
        const platformFeeCents = Math.round(amountCents * commissionRate);

        // Ensure buyer has a Stripe customer record
        const buyer = await this.customers.getOrCreateCustomer(buyerUserId, buyerEmail);

        const session = await this.stripe.checkout.sessions.create({
            customer: buyer.stripeCustomerId,
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    unit_amount: amountCents,
                    product_data: {
                        name: `GSEP Gene: ${geneName}`,
                        description: `Gene ID: ${geneId}`,
                    },
                },
                quantity: 1,
            }],
            payment_intent_data: {
                application_fee_amount: platformFeeCents,
                transfer_data: {
                    destination: sellerAccount.stripeAccountId!,
                },
                metadata: {
                    type: 'gene_purchase',
                    buyerUserId,
                    sellerUserId,
                    geneId,
                    commissionRate: String(commissionRate),
                },
            },
            success_url: this.config.urls.success,
            cancel_url: this.config.urls.cancel,
            metadata: {
                type: 'gene_purchase',
                buyerUserId,
                sellerUserId,
                geneId,
            },
        });

        return { sessionId: session.id, url: session.url! };
    }

    /**
     * Handle checkout.session.completed for gene purchases.
     * Records the purchase in storage.
     */
    async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const meta = session.metadata;
        if (!meta || meta.type !== 'gene_purchase') return;

        const { buyerUserId, sellerUserId, geneId } = meta;
        if (!buyerUserId || !sellerUserId || !geneId) return;

        const paymentIntentId = session.payment_intent as string;
        if (!paymentIntentId) return;

        // Avoid duplicate processing
        const existing = await this.storage.getPurchase(paymentIntentId);
        if (existing) return;

        const amountCents = session.amount_total ?? 0;
        const commissionRate = parseFloat(meta.commissionRate ?? '0.20');
        const platformFeeCents = Math.round(amountCents * commissionRate);
        const sellerPayoutCents = amountCents - platformFeeCents;

        const record: GenePurchaseRecord = {
            id: `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            buyerUserId,
            sellerUserId,
            geneId,
            stripePaymentIntentId: paymentIntentId,
            amountCents,
            platformFeeCents,
            sellerPayoutCents,
            commissionRate,
            status: 'completed',
            createdAt: new Date(),
        };

        await this.storage.savePurchase(record);
    }
}
