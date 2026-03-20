/**
 * InMemoryPaymentStorage — In-memory implementation for testing
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type { PaymentStorage } from './PaymentStorage.js';
import type {
    PlanId,
    CustomerRecord,
    SubscriptionRecord,
    ConnectAccountRecord,
    GenePurchaseRecord,
} from '../types.js';

export class InMemoryPaymentStorage implements PaymentStorage {
    private customers = new Map<string, CustomerRecord>();
    private customersByStripeId = new Map<string, string>();
    private subscriptions = new Map<string, SubscriptionRecord>();
    private subscriptionsByStripeId = new Map<string, string>();
    private connectAccounts = new Map<string, ConnectAccountRecord>();
    private purchases = new Map<string, GenePurchaseRecord>();
    private purchasesByIntent = new Map<string, string>();

    // ─── Customers ───────────────────────────────────────

    async saveCustomer(record: CustomerRecord): Promise<void> {
        this.customers.set(record.userId, record);
        this.customersByStripeId.set(record.stripeCustomerId, record.userId);
    }

    async getCustomerByUserId(userId: string): Promise<CustomerRecord | null> {
        return this.customers.get(userId) ?? null;
    }

    async getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null> {
        const userId = this.customersByStripeId.get(stripeCustomerId);
        if (!userId) return null;
        return this.customers.get(userId) ?? null;
    }

    async updateCustomerPlan(userId: string, plan: PlanId): Promise<void> {
        const customer = this.customers.get(userId);
        if (customer) {
            customer.plan = plan;
        }
    }

    // ─── Subscriptions ───────────────────────────────────

    async saveSubscription(record: SubscriptionRecord): Promise<void> {
        this.subscriptions.set(record.userId, record);
        this.subscriptionsByStripeId.set(record.stripeSubscriptionId, record.userId);
    }

    async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
        return this.subscriptions.get(userId) ?? null;
    }

    async updateSubscriptionStatus(
        stripeSubscriptionId: string,
        status: SubscriptionRecord['status'],
        periodEnd?: Date,
    ): Promise<void> {
        const userId = this.subscriptionsByStripeId.get(stripeSubscriptionId);
        if (!userId) return;
        const sub = this.subscriptions.get(userId);
        if (sub) {
            sub.status = status;
            if (periodEnd) sub.currentPeriodEnd = periodEnd;
        }
    }

    // ─── Connect Accounts ────────────────────────────────

    async saveConnectAccount(record: ConnectAccountRecord): Promise<void> {
        this.connectAccounts.set(record.userId, record);
    }

    async getConnectAccount(userId: string): Promise<ConnectAccountRecord | null> {
        return this.connectAccounts.get(userId) ?? null;
    }

    async updateConnectStatus(
        userId: string,
        onboardingComplete: boolean,
        payoutsEnabled: boolean,
    ): Promise<void> {
        const account = this.connectAccounts.get(userId);
        if (account) {
            account.onboardingComplete = onboardingComplete;
            account.payoutsEnabled = payoutsEnabled;
        }
    }

    // ─── Gene Purchases ──────────────────────────────────

    async savePurchase(record: GenePurchaseRecord): Promise<void> {
        this.purchases.set(record.id, record);
        this.purchasesByIntent.set(record.stripePaymentIntentId, record.id);
    }

    async getPurchase(paymentIntentId: string): Promise<GenePurchaseRecord | null> {
        const id = this.purchasesByIntent.get(paymentIntentId);
        if (!id) return null;
        return this.purchases.get(id) ?? null;
    }

    async updatePurchaseStatus(
        paymentIntentId: string,
        status: GenePurchaseRecord['status'],
    ): Promise<void> {
        const id = this.purchasesByIntent.get(paymentIntentId);
        if (!id) return;
        const purchase = this.purchases.get(id);
        if (purchase) {
            purchase.status = status;
        }
    }

    async getPurchasesByBuyer(userId: string): Promise<GenePurchaseRecord[]> {
        return Array.from(this.purchases.values()).filter(p => p.buyerUserId === userId);
    }

    async getPurchasesBySeller(userId: string): Promise<GenePurchaseRecord[]> {
        return Array.from(this.purchases.values()).filter(p => p.sellerUserId === userId);
    }
}
