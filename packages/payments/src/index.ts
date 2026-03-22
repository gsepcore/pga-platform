/**
 * @gsep/payments — GSEP Payment System
 *
 * Stripe subscriptions, Connect payouts, and gene marketplace checkout.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

// ─── Main Facade ─────────────────────────────────────────
export { StripePayments } from './StripePayments.js';

// ─── Types ───────────────────────────────────────────────
export type {
    StripePaymentsConfig,
    PlanId,
    CustomerRecord,
    SubscriptionRecord,
    ConnectAccountRecord,
    GenePurchaseRecord,
    StripeInstance,
} from './types.js';
export { COMMISSION_RATES } from './types.js';

// ─── Storage ─────────────────────────────────────────────
export type { PaymentStorage } from './storage/PaymentStorage.js';
export { InMemoryPaymentStorage } from './storage/InMemoryPaymentStorage.js';

// ─── Components (for advanced usage) ────────────────────
export { CustomerManager } from './customers/CustomerManager.js';
export { SubscriptionManager } from './subscriptions/SubscriptionManager.js';
export { ConnectManager } from './marketplace/ConnectManager.js';
export { GeneCheckout } from './marketplace/GeneCheckout.js';
export { WebhookHandler } from './webhooks/WebhookHandler.js';
export type { WebhookResult } from './webhooks/WebhookHandler.js';
