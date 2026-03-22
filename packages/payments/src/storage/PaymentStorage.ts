/**
 * PaymentStorage — Interface for payment data persistence
 *
 * Independent of @gsep/core StorageAdapter to avoid coupling.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type {
    PlanId,
    CustomerRecord,
    SubscriptionRecord,
    ConnectAccountRecord,
    GenePurchaseRecord,
} from '../types.js';

export interface PaymentStorage {
    // ─── Customers ───────────────────────────────────────
    saveCustomer(record: CustomerRecord): Promise<void>;
    getCustomerByUserId(userId: string): Promise<CustomerRecord | null>;
    getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null>;
    updateCustomerPlan(userId: string, plan: PlanId): Promise<void>;

    // ─── Subscriptions ───────────────────────────────────
    saveSubscription(record: SubscriptionRecord): Promise<void>;
    getSubscription(userId: string): Promise<SubscriptionRecord | null>;
    updateSubscriptionStatus(
        stripeSubscriptionId: string,
        status: SubscriptionRecord['status'],
        periodEnd?: Date,
    ): Promise<void>;

    // ─── Connect Accounts ────────────────────────────────
    saveConnectAccount(record: ConnectAccountRecord): Promise<void>;
    getConnectAccount(userId: string): Promise<ConnectAccountRecord | null>;
    updateConnectStatus(
        userId: string,
        onboardingComplete: boolean,
        payoutsEnabled: boolean,
    ): Promise<void>;

    // ─── Gene Purchases ──────────────────────────────────
    savePurchase(record: GenePurchaseRecord): Promise<void>;
    getPurchase(paymentIntentId: string): Promise<GenePurchaseRecord | null>;
    updatePurchaseStatus(
        paymentIntentId: string,
        status: GenePurchaseRecord['status'],
    ): Promise<void>;
    getPurchasesByBuyer(userId: string): Promise<GenePurchaseRecord[]>;
    getPurchasesBySeller(userId: string): Promise<GenePurchaseRecord[]>;
}
