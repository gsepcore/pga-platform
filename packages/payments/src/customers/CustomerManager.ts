/**
 * CustomerManager — Stripe customer lifecycle
 *
 * Creates and retrieves Stripe customers, maps them to GSEP user IDs.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';
import type { PaymentStorage } from '../storage/PaymentStorage.js';
import type { CustomerRecord, PlanId } from '../types.js';

export class CustomerManager {
    constructor(
        private stripe: Stripe,
        private storage: PaymentStorage,
    ) {}

    /**
     * Get existing customer or create a new one in Stripe + storage.
     */
    async getOrCreateCustomer(
        userId: string,
        email: string,
        name?: string,
    ): Promise<CustomerRecord> {
        const existing = await this.storage.getCustomerByUserId(userId);
        if (existing) return existing;

        const stripeCustomer = await this.stripe.customers.create({
            email,
            name,
            metadata: { userId },
        });

        const record: CustomerRecord = {
            userId,
            stripeCustomerId: stripeCustomer.id,
            email,
            name,
            plan: 'community',
            createdAt: new Date(),
        };

        await this.storage.saveCustomer(record);
        return record;
    }

    /**
     * Get customer plan (defaults to 'community' if not found).
     */
    async getCustomerPlan(userId: string): Promise<PlanId> {
        const customer = await this.storage.getCustomerByUserId(userId);
        return customer?.plan ?? 'community';
    }

    /**
     * Lookup customer by Stripe Customer ID.
     */
    async getByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null> {
        return this.storage.getCustomerByStripeId(stripeCustomerId);
    }

    /**
     * Update customer's plan tier.
     */
    async updatePlan(userId: string, plan: PlanId): Promise<void> {
        await this.storage.updateCustomerPlan(userId, plan);
    }
}
