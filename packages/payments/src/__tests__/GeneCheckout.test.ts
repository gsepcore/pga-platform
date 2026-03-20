/**
 * GeneCheckout — Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeneCheckout } from '../marketplace/GeneCheckout.js';
import { CustomerManager } from '../customers/CustomerManager.js';
import { ConnectManager } from '../marketplace/ConnectManager.js';
import { InMemoryPaymentStorage } from '../storage/InMemoryPaymentStorage.js';
import type Stripe from 'stripe';
import type { StripePaymentsConfig } from '../types.js';

const TEST_CONFIG: StripePaymentsConfig = {
    secretKey: 'sk_test_fake',
    webhookSecret: 'whsec_fake',
    prices: { pro: 'price_pro', team: 'price_team' },
    urls: {
        success: 'https://example.com/success',
        cancel: 'https://example.com/cancel',
        connectReturn: 'https://example.com/connect/return',
        connectRefresh: 'https://example.com/connect/refresh',
    },
};

function createMockStripe() {
    return {
        customers: {
            create: vi.fn().mockResolvedValue({ id: 'cus_buyer123' }),
        },
        accounts: {
            create: vi.fn().mockResolvedValue({ id: 'acct_seller456' }),
        },
        accountLinks: {
            create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup' }),
        },
        checkout: {
            sessions: {
                create: vi.fn().mockResolvedValue({
                    id: 'cs_gene_test',
                    url: 'https://checkout.stripe.com/session/cs_gene_test',
                }),
            },
        },
    } as unknown as Stripe;
}

describe('GeneCheckout', () => {
    let stripe: Stripe;
    let storage: InMemoryPaymentStorage;
    let customers: CustomerManager;
    let connect: ConnectManager;
    let checkout: GeneCheckout;

    beforeEach(async () => {
        stripe = createMockStripe();
        storage = new InMemoryPaymentStorage();
        customers = new CustomerManager(stripe, storage);
        connect = new ConnectManager(stripe, storage, TEST_CONFIG);
        checkout = new GeneCheckout(stripe, storage, customers, connect, TEST_CONFIG);

        // Setup seller with completed onboarding
        await connect.createConnectAccount('seller1', 'seller@test.com');
        await storage.updateConnectStatus('seller1', true, true);
    });

    it('creates a gene checkout session with correct commission (community = 20%)', async () => {
        const result = await checkout.createGeneCheckoutSession({
            buyerUserId: 'buyer1',
            buyerEmail: 'buyer@test.com',
            sellerUserId: 'seller1',
            geneId: 'gene_123',
            geneName: 'Super Reasoning',
            priceUsd: 9.99,
        });

        expect(result.sessionId).toBe('cs_gene_test');
        expect(result.url).toContain('checkout.stripe.com');

        // Verify Stripe was called with correct params
        const createCall = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(createCall.mode).toBe('payment');
        expect(createCall.line_items[0].price_data.unit_amount).toBe(999); // $9.99 = 999 cents
        expect(createCall.payment_intent_data.application_fee_amount).toBe(200); // 20% of 999 ≈ 200
        expect(createCall.payment_intent_data.transfer_data.destination).toBe('acct_seller456');
        expect(createCall.metadata.type).toBe('gene_purchase');
        expect(createCall.metadata.geneId).toBe('gene_123');
    });

    it('uses pro commission rate (10%) when buyer is on pro plan', async () => {
        await customers.getOrCreateCustomer('buyer1', 'buyer@test.com');
        await customers.updatePlan('buyer1', 'pro');

        await checkout.createGeneCheckoutSession({
            buyerUserId: 'buyer1',
            buyerEmail: 'buyer@test.com',
            sellerUserId: 'seller1',
            geneId: 'gene_123',
            geneName: 'Test Gene',
            priceUsd: 10.00,
        });

        const createCall = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(createCall.payment_intent_data.application_fee_amount).toBe(100); // 10% of 1000
    });

    it('uses team commission rate (5%)', async () => {
        await customers.getOrCreateCustomer('buyer1', 'buyer@test.com');
        await customers.updatePlan('buyer1', 'team');

        await checkout.createGeneCheckoutSession({
            buyerUserId: 'buyer1',
            buyerEmail: 'buyer@test.com',
            sellerUserId: 'seller1',
            geneId: 'gene_123',
            geneName: 'Test Gene',
            priceUsd: 20.00,
        });

        const createCall = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(createCall.payment_intent_data.application_fee_amount).toBe(100); // 5% of 2000
    });

    it('throws when seller has no Connect account', async () => {
        await expect(checkout.createGeneCheckoutSession({
            buyerUserId: 'buyer1',
            buyerEmail: 'buyer@test.com',
            sellerUserId: 'unknown_seller',
            geneId: 'gene_123',
            geneName: 'Test Gene',
            priceUsd: 4.99,
        })).rejects.toThrow('Seller does not have an active Stripe Connect account');
    });

    it('throws when seller payouts not enabled', async () => {
        await connect.createConnectAccount('seller2', 'seller2@test.com');
        // Don't enable payouts

        await expect(checkout.createGeneCheckoutSession({
            buyerUserId: 'buyer1',
            buyerEmail: 'buyer@test.com',
            sellerUserId: 'seller2',
            geneId: 'gene_123',
            geneName: 'Test Gene',
            priceUsd: 4.99,
        })).rejects.toThrow('Seller does not have an active Stripe Connect account');
    });

    it('handles checkout completed — records purchase', async () => {
        const session = {
            metadata: {
                type: 'gene_purchase',
                buyerUserId: 'buyer1',
                sellerUserId: 'seller1',
                geneId: 'gene_123',
                commissionRate: '0.20',
            },
            payment_intent: 'pi_test_abc',
            amount_total: 999,
        } as unknown as Stripe.Checkout.Session;

        await checkout.handleCheckoutCompleted(session);

        const purchase = await storage.getPurchase('pi_test_abc');
        expect(purchase).not.toBeNull();
        expect(purchase!.buyerUserId).toBe('buyer1');
        expect(purchase!.sellerUserId).toBe('seller1');
        expect(purchase!.geneId).toBe('gene_123');
        expect(purchase!.amountCents).toBe(999);
        expect(purchase!.platformFeeCents).toBe(200); // 20% of 999
        expect(purchase!.sellerPayoutCents).toBe(799);
        expect(purchase!.status).toBe('completed');
    });

    it('skips duplicate checkout completed (idempotent)', async () => {
        const session = {
            metadata: {
                type: 'gene_purchase',
                buyerUserId: 'buyer1',
                sellerUserId: 'seller1',
                geneId: 'gene_123',
                commissionRate: '0.20',
            },
            payment_intent: 'pi_test_abc',
            amount_total: 999,
        } as unknown as Stripe.Checkout.Session;

        await checkout.handleCheckoutCompleted(session);
        await checkout.handleCheckoutCompleted(session); // Duplicate

        const purchases = await storage.getPurchasesByBuyer('buyer1');
        expect(purchases).toHaveLength(1);
    });

    it('ignores non-gene-purchase sessions', async () => {
        const session = {
            metadata: { type: 'subscription' },
            payment_intent: 'pi_sub_test',
        } as unknown as Stripe.Checkout.Session;

        await checkout.handleCheckoutCompleted(session);

        const purchase = await storage.getPurchase('pi_sub_test');
        expect(purchase).toBeNull();
    });
});
