/**
 * SubscriptionManager — Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager } from '../subscriptions/SubscriptionManager.js';
import { CustomerManager } from '../customers/CustomerManager.js';
import { InMemoryPaymentStorage } from '../storage/InMemoryPaymentStorage.js';
import type Stripe from 'stripe';
import type { StripePaymentsConfig } from '../types.js';

const TEST_CONFIG: StripePaymentsConfig = {
    secretKey: 'sk_test_fake',
    webhookSecret: 'whsec_fake',
    prices: { pro: 'price_pro_123', team: 'price_team_456' },
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
            create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
        },
        checkout: {
            sessions: {
                create: vi.fn().mockResolvedValue({
                    id: 'cs_test123',
                    url: 'https://checkout.stripe.com/session/cs_test123',
                }),
            },
        },
        subscriptions: {
            retrieve: vi.fn().mockResolvedValue({
                id: 'sub_test123',
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
                status: 'active',
            }),
        },
        billingPortal: {
            sessions: {
                create: vi.fn().mockResolvedValue({
                    url: 'https://billing.stripe.com/session/bps_test',
                }),
            },
        },
    } as unknown as Stripe;
}

describe('SubscriptionManager', () => {
    let stripe: Stripe;
    let storage: InMemoryPaymentStorage;
    let customers: CustomerManager;
    let manager: SubscriptionManager;

    beforeEach(() => {
        stripe = createMockStripe();
        storage = new InMemoryPaymentStorage();
        customers = new CustomerManager(stripe, storage);
        manager = new SubscriptionManager(stripe, storage, customers, TEST_CONFIG);
    });

    it('creates a checkout session for pro plan', async () => {
        const result = await manager.createCheckoutSession('user1', 'u@test.com', 'pro');

        expect(result.sessionId).toBe('cs_test123');
        expect(result.url).toContain('checkout.stripe.com');
        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'subscription',
                line_items: [{ price: 'price_pro_123', quantity: 1 }],
                metadata: { userId: 'user1', plan: 'pro' },
            }),
        );
    });

    it('creates a checkout session for team plan', async () => {
        await manager.createCheckoutSession('user1', 'u@test.com', 'team');

        expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [{ price: 'price_team_456', quantity: 1 }],
            }),
        );
    });

    it('creates a billing portal session', async () => {
        await customers.getOrCreateCustomer('user1', 'u@test.com');
        const result = await manager.createBillingPortalSession('user1');

        expect(result.url).toContain('billing.stripe.com');
    });

    it('throws for billing portal when customer not found', async () => {
        await expect(manager.createBillingPortalSession('nonexistent'))
            .rejects.toThrow('No customer found');
    });

    it('handles checkout completed for subscription', async () => {
        await customers.getOrCreateCustomer('user1', 'u@test.com');

        const session = {
            metadata: { userId: 'user1', plan: 'pro' },
            subscription: 'sub_test123',
            mode: 'subscription',
        } as unknown as Stripe.Checkout.Session;

        await manager.handleCheckoutCompleted(session);

        const sub = await storage.getSubscription('user1');
        expect(sub).not.toBeNull();
        expect(sub!.plan).toBe('pro');
        expect(sub!.status).toBe('active');

        const plan = await customers.getCustomerPlan('user1');
        expect(plan).toBe('pro');
    });

    it('handles subscription updated', async () => {
        // First create subscription via checkout
        await customers.getOrCreateCustomer('user1', 'u@test.com');
        await manager.handleCheckoutCompleted({
            metadata: { userId: 'user1', plan: 'pro' },
            subscription: 'sub_test123',
        } as unknown as Stripe.Checkout.Session);

        // Then update
        await manager.handleSubscriptionUpdated({
            id: 'sub_test123',
            status: 'past_due',
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            metadata: {},
        } as unknown as Stripe.Subscription);

        const sub = await storage.getSubscription('user1');
        expect(sub!.status).toBe('past_due');
    });

    it('handles subscription deleted — reverts to community', async () => {
        await customers.getOrCreateCustomer('user1', 'u@test.com');
        await manager.handleCheckoutCompleted({
            metadata: { userId: 'user1', plan: 'pro' },
            subscription: 'sub_test123',
        } as unknown as Stripe.Checkout.Session);

        await manager.handleSubscriptionDeleted({
            id: 'sub_test123',
            metadata: { userId: 'user1' },
        } as unknown as Stripe.Subscription);

        const sub = await storage.getSubscription('user1');
        expect(sub!.status).toBe('canceled');

        const plan = await customers.getCustomerPlan('user1');
        expect(plan).toBe('community');
    });

    it('handles payment failed', async () => {
        await customers.getOrCreateCustomer('user1', 'u@test.com');
        await manager.handleCheckoutCompleted({
            metadata: { userId: 'user1', plan: 'pro' },
            subscription: 'sub_test123',
        } as unknown as Stripe.Checkout.Session);

        await manager.handlePaymentFailed({
            subscription: 'sub_test123',
        } as unknown as Stripe.Invoice);

        const sub = await storage.getSubscription('user1');
        expect(sub!.status).toBe('past_due');
    });
});
