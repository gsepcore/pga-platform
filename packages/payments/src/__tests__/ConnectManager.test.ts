/**
 * ConnectManager — Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
        accounts: {
            create: vi.fn().mockResolvedValue({
                id: 'acct_seller123',
                metadata: { userId: 'seller1' },
            }),
        },
        accountLinks: {
            create: vi.fn().mockResolvedValue({
                url: 'https://connect.stripe.com/setup/acct_seller123',
            }),
        },
    } as unknown as Stripe;
}

describe('ConnectManager', () => {
    let stripe: Stripe;
    let storage: InMemoryPaymentStorage;
    let manager: ConnectManager;

    beforeEach(() => {
        stripe = createMockStripe();
        storage = new InMemoryPaymentStorage();
        manager = new ConnectManager(stripe, storage, TEST_CONFIG);
    });

    it('creates a Connect Express account', async () => {
        const result = await manager.createConnectAccount('seller1', 'seller@test.com');

        expect(result.userId).toBe('seller1');
        expect(result.stripeAccountId).toBe('acct_seller123');
        expect(result.onboardingComplete).toBe(false);
        expect(result.payoutsEnabled).toBe(false);
        expect(stripe.accounts.create).toHaveBeenCalledWith({
            type: 'express',
            email: 'seller@test.com',
            metadata: { userId: 'seller1' },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });
    });

    it('returns existing account without duplicate creation', async () => {
        await manager.createConnectAccount('seller1', 'seller@test.com');
        const second = await manager.createConnectAccount('seller1', 'seller@test.com');

        expect(second.stripeAccountId).toBe('acct_seller123');
        expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
    });

    it('generates an onboarding link', async () => {
        await manager.createConnectAccount('seller1', 'seller@test.com');
        const link = await manager.createOnboardingLink('seller1');

        expect(link.url).toContain('connect.stripe.com');
        expect(stripe.accountLinks.create).toHaveBeenCalledWith({
            account: 'acct_seller123',
            refresh_url: TEST_CONFIG.urls.connectRefresh,
            return_url: TEST_CONFIG.urls.connectReturn,
            type: 'account_onboarding',
        });
    });

    it('throws when generating link for non-existent account', async () => {
        await expect(manager.createOnboardingLink('unknown'))
            .rejects.toThrow('No Connect account found');
    });

    it('returns status for existing account', async () => {
        await manager.createConnectAccount('seller1', 'seller@test.com');
        const status = await manager.getAccountStatus('seller1');

        expect(status.exists).toBe(true);
        expect(status.onboardingComplete).toBe(false);
        expect(status.payoutsEnabled).toBe(false);
        expect(status.stripeAccountId).toBe('acct_seller123');
    });

    it('returns non-existent status for unknown user', async () => {
        const status = await manager.getAccountStatus('unknown');
        expect(status.exists).toBe(false);
    });

    it('handles account.updated webhook', async () => {
        await manager.createConnectAccount('seller1', 'seller@test.com');

        await manager.handleAccountUpdated({
            id: 'acct_seller123',
            metadata: { userId: 'seller1' },
            details_submitted: true,
            payouts_enabled: true,
        } as unknown as Stripe.Account);

        const status = await manager.getAccountStatus('seller1');
        expect(status.onboardingComplete).toBe(true);
        expect(status.payoutsEnabled).toBe(true);
    });

    it('gets Stripe Account ID for seller', async () => {
        await manager.createConnectAccount('seller1', 'seller@test.com');
        const id = await manager.getStripeAccountId('seller1');
        expect(id).toBe('acct_seller123');
    });

    it('returns null for unknown seller', async () => {
        const id = await manager.getStripeAccountId('unknown');
        expect(id).toBeNull();
    });
});
