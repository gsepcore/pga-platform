/**
 * ConnectManager — Stripe Connect Express for marketplace sellers
 *
 * Handles seller onboarding, account status, and payout readiness.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';
import type { PaymentStorage } from '../storage/PaymentStorage.js';
import type { StripePaymentsConfig, ConnectAccountRecord } from '../types.js';

export class ConnectManager {
    constructor(
        private stripe: Stripe,
        private storage: PaymentStorage,
        private config: StripePaymentsConfig,
    ) {}

    /**
     * Create a Stripe Connect Express account for a seller.
     * Returns the account ID if already created.
     */
    async createConnectAccount(
        userId: string,
        email: string,
    ): Promise<ConnectAccountRecord> {
        const existing = await this.storage.getConnectAccount(userId);
        if (existing) return existing;

        const account = await this.stripe.accounts.create({
            type: 'express',
            email,
            metadata: { userId },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        const record: ConnectAccountRecord = {
            userId,
            stripeAccountId: account.id,
            onboardingComplete: false,
            payoutsEnabled: false,
            createdAt: new Date(),
        };

        await this.storage.saveConnectAccount(record);
        return record;
    }

    /**
     * Generate an onboarding link for the seller to complete setup on Stripe.
     */
    async createOnboardingLink(userId: string): Promise<{ url: string }> {
        const account = await this.storage.getConnectAccount(userId);
        if (!account) {
            throw new Error(`No Connect account found for user ${userId}`);
        }

        const accountLink = await this.stripe.accountLinks.create({
            account: account.stripeAccountId,
            refresh_url: this.config.urls.connectRefresh,
            return_url: this.config.urls.connectReturn,
            type: 'account_onboarding',
        });

        return { url: accountLink.url };
    }

    /**
     * Get the current status of a seller's Connect account.
     */
    async getAccountStatus(userId: string): Promise<{
        exists: boolean;
        onboardingComplete: boolean;
        payoutsEnabled: boolean;
        stripeAccountId?: string;
    }> {
        const account = await this.storage.getConnectAccount(userId);
        if (!account) {
            return { exists: false, onboardingComplete: false, payoutsEnabled: false };
        }

        return {
            exists: true,
            onboardingComplete: account.onboardingComplete,
            payoutsEnabled: account.payoutsEnabled,
            stripeAccountId: account.stripeAccountId,
        };
    }

    /**
     * Handle account.updated webhook from Stripe Connect.
     */
    async handleAccountUpdated(account: Stripe.Account): Promise<void> {
        const userId = account.metadata?.userId;
        if (!userId) return;

        const onboardingComplete = account.details_submitted ?? false;
        const payoutsEnabled = account.payouts_enabled ?? false;

        await this.storage.updateConnectStatus(userId, onboardingComplete, payoutsEnabled);
    }

    /**
     * Get the Stripe Account ID for a seller (for destination charges).
     */
    async getStripeAccountId(userId: string): Promise<string | null> {
        const account = await this.storage.getConnectAccount(userId);
        return account?.stripeAccountId ?? null;
    }
}
