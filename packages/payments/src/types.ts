/**
 * GSEP Payments — Types & Interfaces
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';

// ─── Config ──────────────────────────────────────────────

export interface StripePaymentsConfig {
    /** Stripe secret key (sk_test_... or sk_live_...) */
    secretKey: string;
    /** Webhook signing secret for platform events */
    webhookSecret: string;
    /** Webhook signing secret for Connect events (optional) */
    connectWebhookSecret?: string;
    /** Stripe Price IDs for subscription plans */
    prices: {
        pro: string;
        team: string;
    };
    /** Redirect URLs for Checkout and Connect */
    urls: {
        success: string;
        cancel: string;
        connectReturn: string;
        connectRefresh: string;
    };
}

// ─── Plans & Commission ──────────────────────────────────

export type PlanId = 'community' | 'pro' | 'team' | 'enterprise';

/** Commission rates by plan — platform fee percentage */
export const COMMISSION_RATES: Record<PlanId, number> = {
    community: 0.20,
    pro: 0.10,
    team: 0.05,
    enterprise: 0.00,
};

// ─── Records ─────────────────────────────────────────────

export interface CustomerRecord {
    userId: string;
    stripeCustomerId: string;
    email: string;
    name?: string;
    plan: PlanId;
    createdAt: Date;
}

export interface SubscriptionRecord {
    userId: string;
    stripeSubscriptionId: string;
    plan: PlanId;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
    currentPeriodEnd: Date;
    seats: number;
    createdAt: Date;
}

export interface ConnectAccountRecord {
    userId: string;
    stripeAccountId: string;
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
    createdAt: Date;
}

export interface GenePurchaseRecord {
    id: string;
    buyerUserId: string;
    sellerUserId: string;
    geneId: string;
    stripePaymentIntentId: string;
    amountCents: number;
    platformFeeCents: number;
    sellerPayoutCents: number;
    commissionRate: number;
    status: 'pending' | 'completed' | 'refunded';
    createdAt: Date;
}

// ─── Stripe instance type ────────────────────────────────

export type StripeInstance = Stripe;
