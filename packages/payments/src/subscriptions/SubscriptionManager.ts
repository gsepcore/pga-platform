/**
 * SubscriptionManager — Stripe subscription lifecycle
 *
 * Creates checkout sessions for Pro/Team plans,
 * billing portal sessions, and processes subscription webhooks.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type Stripe from 'stripe';
import type { PaymentStorage } from '../storage/PaymentStorage.js';
import type { CustomerManager } from '../customers/CustomerManager.js';
import type { StripePaymentsConfig, PlanId, SubscriptionRecord } from '../types.js';

export class SubscriptionManager {
    constructor(
        private stripe: Stripe,
        private storage: PaymentStorage,
        private customers: CustomerManager,
        private config: StripePaymentsConfig,
    ) {}

    /**
     * Create a Stripe Checkout Session for a subscription plan.
     * Returns the session URL for redirect.
     */
    async createCheckoutSession(
        userId: string,
        email: string,
        plan: 'pro' | 'team',
        name?: string,
    ): Promise<{ sessionId: string; url: string }> {
        const customer = await this.customers.getOrCreateCustomer(userId, email, name);
        const priceId = plan === 'pro' ? this.config.prices.pro : this.config.prices.team;

        const session = await this.stripe.checkout.sessions.create({
            customer: customer.stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: this.config.urls.success,
            cancel_url: this.config.urls.cancel,
            metadata: { userId, plan },
            subscription_data: {
                metadata: { userId, plan },
            },
        });

        return { sessionId: session.id, url: session.url! };
    }

    /**
     * Create a Stripe Billing Portal session for subscription management.
     */
    async createBillingPortalSession(userId: string): Promise<{ url: string }> {
        const customer = await this.storage.getCustomerByUserId(userId);
        if (!customer) {
            throw new Error(`No customer found for user ${userId}`);
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: customer.stripeCustomerId,
            return_url: this.config.urls.success,
        });

        return { url: session.url };
    }

    /**
     * Handle checkout.session.completed for subscription purchases.
     */
    async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanId | undefined;
        if (!userId || !plan) return;

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) return;

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

        const record: SubscriptionRecord = {
            userId,
            stripeSubscriptionId: subscriptionId,
            plan,
            status: 'active',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            seats: 1,
            createdAt: new Date(),
        };

        await this.storage.saveSubscription(record);
        await this.customers.updatePlan(userId, plan);
    }

    /**
     * Handle customer.subscription.updated event.
     */
    async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const status = this.mapSubscriptionStatus(subscription.status);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await this.storage.updateSubscriptionStatus(
            subscription.id,
            status,
            periodEnd,
        );
    }

    /**
     * Handle customer.subscription.deleted event.
     */
    async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        await this.storage.updateSubscriptionStatus(subscription.id, 'canceled');

        const userId = subscription.metadata?.userId;
        if (userId) {
            await this.customers.updatePlan(userId, 'community');
        }
    }

    /**
     * Handle invoice.payment_failed event.
     */
    async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) return;

        await this.storage.updateSubscriptionStatus(subscriptionId, 'past_due');
    }

    private mapSubscriptionStatus(
        stripeStatus: Stripe.Subscription.Status,
    ): SubscriptionRecord['status'] {
        switch (stripeStatus) {
            case 'active': return 'active';
            case 'canceled': return 'canceled';
            case 'past_due': return 'past_due';
            case 'trialing': return 'trialing';
            default: return 'incomplete';
        }
    }
}
