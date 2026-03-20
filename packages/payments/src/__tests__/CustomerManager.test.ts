/**
 * CustomerManager — Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerManager } from '../customers/CustomerManager.js';
import { InMemoryPaymentStorage } from '../storage/InMemoryPaymentStorage.js';
import type Stripe from 'stripe';

function createMockStripe() {
    return {
        customers: {
            create: vi.fn().mockResolvedValue({
                id: 'cus_test123',
                email: 'test@example.com',
            }),
        },
    } as unknown as Stripe;
}

describe('CustomerManager', () => {
    let stripe: Stripe;
    let storage: InMemoryPaymentStorage;
    let manager: CustomerManager;

    beforeEach(() => {
        stripe = createMockStripe();
        storage = new InMemoryPaymentStorage();
        manager = new CustomerManager(stripe, storage);
    });

    it('creates a new Stripe customer and stores record', async () => {
        const result = await manager.getOrCreateCustomer('user1', 'user@test.com', 'Test User');

        expect(result.userId).toBe('user1');
        expect(result.stripeCustomerId).toBe('cus_test123');
        expect(result.email).toBe('user@test.com');
        expect(result.plan).toBe('community');
        expect(stripe.customers.create).toHaveBeenCalledWith({
            email: 'user@test.com',
            name: 'Test User',
            metadata: { userId: 'user1' },
        });
    });

    it('returns existing customer without creating a new one', async () => {
        await manager.getOrCreateCustomer('user1', 'user@test.com');
        const second = await manager.getOrCreateCustomer('user1', 'user@test.com');

        expect(second.stripeCustomerId).toBe('cus_test123');
        expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    });

    it('returns community plan by default', async () => {
        const plan = await manager.getCustomerPlan('nonexistent');
        expect(plan).toBe('community');
    });

    it('returns correct plan after update', async () => {
        await manager.getOrCreateCustomer('user1', 'user@test.com');
        await manager.updatePlan('user1', 'pro');

        const plan = await manager.getCustomerPlan('user1');
        expect(plan).toBe('pro');
    });

    it('looks up customer by Stripe ID', async () => {
        await manager.getOrCreateCustomer('user1', 'user@test.com');
        const result = await manager.getByStripeId('cus_test123');

        expect(result).not.toBeNull();
        expect(result!.userId).toBe('user1');
    });

    it('returns null for unknown Stripe ID', async () => {
        const result = await manager.getByStripeId('cus_unknown');
        expect(result).toBeNull();
    });
});
