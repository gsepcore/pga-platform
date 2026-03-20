/**
 * WebhookHandler — Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookHandler } from '../webhooks/WebhookHandler.js';
import { SubscriptionManager } from '../subscriptions/SubscriptionManager.js';
import { CustomerManager } from '../customers/CustomerManager.js';
import { ConnectManager } from '../marketplace/ConnectManager.js';
import { GeneCheckout } from '../marketplace/GeneCheckout.js';
import { InMemoryPaymentStorage } from '../storage/InMemoryPaymentStorage.js';
import type Stripe from 'stripe';
import type { StripePaymentsConfig } from '../types.js';

const TEST_CONFIG: StripePaymentsConfig = {
    secretKey: 'sk_test_fake',
    webhookSecret: 'whsec_test',
    prices: { pro: 'price_pro', team: 'price_team' },
    urls: {
        success: 'https://example.com/success',
        cancel: 'https://example.com/cancel',
        connectReturn: 'https://example.com/connect/return',
        connectRefresh: 'https://example.com/connect/refresh',
    },
};

function createMockStripe(constructedEvent?: Stripe.Event) {
    return {
        webhooks: {
            constructEvent: vi.fn().mockImplementation((_body, _sig, _secret) => {
                if (!constructedEvent) {
                    throw new Error('Invalid signature');
                }
                return constructedEvent;
            }),
        },
        customers: {
            create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
        },
        accounts: {
            create: vi.fn().mockResolvedValue({ id: 'acct_test' }),
        },
        accountLinks: {
            create: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com' }),
        },
        checkout: {
            sessions: {
                create: vi.fn().mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com' }),
            },
        },
        subscriptions: {
            retrieve: vi.fn().mockResolvedValue({
                id: 'sub_test',
                current_period_end: Math.floor(Date.now() / 1000) + 86400,
            }),
        },
        billingPortal: {
            sessions: {
                create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com' }),
            },
        },
    } as unknown as Stripe;
}

describe('WebhookHandler', () => {
    let storage: InMemoryPaymentStorage;

    function createHandler(event?: Stripe.Event) {
        const stripe = createMockStripe(event);
        storage = new InMemoryPaymentStorage();
        const customers = new CustomerManager(stripe, storage);
        const subscriptions = new SubscriptionManager(stripe, storage, customers, TEST_CONFIG);
        const connect = new ConnectManager(stripe, storage, TEST_CONFIG);
        const geneCheckout = new GeneCheckout(stripe, storage, customers, connect, TEST_CONFIG);
        const handler = new WebhookHandler(stripe, TEST_CONFIG, subscriptions, connect, geneCheckout);
        return { handler, stripe, customers, subscriptions, connect, geneCheckout };
    }

    it('returns error when signature verification fails', async () => {
        const { handler } = createHandler(); // No event → constructEvent throws
        const result = await handler.handleEvent(Buffer.from('{}'), 'bad_sig');

        expect(result.handled).toBe(false);
        expect(result.error).toContain('Signature verification failed');
    });

    it('handles checkout.session.completed for subscription', async () => {
        const event: Stripe.Event = {
            id: 'evt_1',
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'subscription',
                    metadata: { userId: 'user1', plan: 'pro' },
                    subscription: 'sub_test',
                    customer: 'cus_test',
                } as any,
            },
        } as any;

        const { handler, customers } = createHandler(event);
        await customers.getOrCreateCustomer('user1', 'u@test.com');

        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');
        expect(result.handled).toBe(true);
        expect(result.eventType).toBe('checkout.session.completed');
    });

    it('handles checkout.session.completed for gene purchase', async () => {
        const event: Stripe.Event = {
            id: 'evt_2',
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    metadata: {
                        type: 'gene_purchase',
                        buyerUserId: 'buyer1',
                        sellerUserId: 'seller1',
                        geneId: 'gene_abc',
                        commissionRate: '0.10',
                    },
                    payment_intent: 'pi_gene_test',
                    amount_total: 499,
                } as any,
            },
        } as any;

        const { handler } = createHandler(event);
        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');

        expect(result.handled).toBe(true);
        const purchase = await storage.getPurchase('pi_gene_test');
        expect(purchase).not.toBeNull();
        expect(purchase!.geneId).toBe('gene_abc');
    });

    it('handles customer.subscription.updated', async () => {
        const event: Stripe.Event = {
            id: 'evt_3',
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_test',
                    status: 'past_due',
                    current_period_end: Math.floor(Date.now() / 1000) + 86400,
                    metadata: {},
                } as any,
            },
        } as any;

        const { handler } = createHandler(event);
        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');

        expect(result.handled).toBe(true);
        expect(result.eventType).toBe('customer.subscription.updated');
    });

    it('handles customer.subscription.deleted', async () => {
        const event: Stripe.Event = {
            id: 'evt_4',
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_test',
                    metadata: { userId: 'user1' },
                } as any,
            },
        } as any;

        const { handler } = createHandler(event);
        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');

        expect(result.handled).toBe(true);
    });

    it('handles invoice.payment_failed', async () => {
        const event: Stripe.Event = {
            id: 'evt_5',
            type: 'invoice.payment_failed',
            data: {
                object: {
                    subscription: 'sub_test',
                } as any,
            },
        } as any;

        const { handler } = createHandler(event);
        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');

        expect(result.handled).toBe(true);
    });

    it('handles account.updated (Connect)', async () => {
        const event: Stripe.Event = {
            id: 'evt_6',
            type: 'account.updated',
            data: {
                object: {
                    id: 'acct_seller',
                    metadata: { userId: 'seller1' },
                    details_submitted: true,
                    payouts_enabled: true,
                } as any,
            },
        } as any;

        const { handler, connect } = createHandler(event);
        await connect.createConnectAccount('seller1', 'seller@test.com');

        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');
        expect(result.handled).toBe(true);

        const status = await connect.getAccountStatus('seller1');
        expect(status.onboardingComplete).toBe(true);
        expect(status.payoutsEnabled).toBe(true);
    });

    it('returns not handled for unknown event types', async () => {
        const event: Stripe.Event = {
            id: 'evt_unknown',
            type: 'charge.succeeded' as any,
            data: { object: {} as any },
        } as any;

        const { handler } = createHandler(event);
        const result = await handler.handleEvent(Buffer.from('{}'), 'valid_sig');

        expect(result.handled).toBe(false);
        expect(result.eventType).toBe('charge.succeeded');
        expect(result.error).toBeUndefined();
    });
});
