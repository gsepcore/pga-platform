/**
 * StripePayments — Main facade for all payment operations
 *
 * Initializes Stripe SDK and wires together all payment components:
 * customers, subscriptions, Connect, gene checkout, and webhooks.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import Stripe from 'stripe';
import type { StripePaymentsConfig } from './types.js';
import type { PaymentStorage } from './storage/PaymentStorage.js';
import { CustomerManager } from './customers/CustomerManager.js';
import { SubscriptionManager } from './subscriptions/SubscriptionManager.js';
import { ConnectManager } from './marketplace/ConnectManager.js';
import { GeneCheckout } from './marketplace/GeneCheckout.js';
import { WebhookHandler } from './webhooks/WebhookHandler.js';

export class StripePayments {
    readonly customers: CustomerManager;
    readonly subscriptions: SubscriptionManager;
    readonly connect: ConnectManager;
    readonly geneCheckout: GeneCheckout;
    readonly webhooks: WebhookHandler;

    private stripe: Stripe;

    constructor(config: StripePaymentsConfig, storage: PaymentStorage) {
        this.stripe = new Stripe(config.secretKey);

        this.customers = new CustomerManager(this.stripe, storage);
        this.subscriptions = new SubscriptionManager(
            this.stripe, storage, this.customers, config,
        );
        this.connect = new ConnectManager(this.stripe, storage, config);
        this.geneCheckout = new GeneCheckout(
            this.stripe, storage, this.customers, this.connect, config,
        );
        this.webhooks = new WebhookHandler(
            this.stripe, config, this.subscriptions, this.connect, this.geneCheckout,
        );
    }
}
