-- GSEP Payment Schema — PostgreSQL
-- Tables for Stripe customers, subscriptions, Connect accounts, and gene purchases.
--
-- @author Luis Alfredo Velasquez Duran
-- @since 2026 — v0.9.0

-- ─── Stripe Customers ────────────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_customers (
    user_id VARCHAR(255) PRIMARY KEY,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    plan VARCHAR(50) NOT NULL DEFAULT 'community',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id
    ON stripe_customers(stripe_customer_id);

-- ─── Subscriptions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    stripe_subscription_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES stripe_customers(user_id),
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
    current_period_end TIMESTAMPTZ,
    seats INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user
    ON stripe_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
    ON stripe_subscriptions(status);

-- ─── Stripe Connect Accounts (Sellers) ───────────────────

CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    user_id VARCHAR(255) PRIMARY KEY,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_account_id
    ON stripe_connect_accounts(stripe_account_id);

-- ─── Gene Purchases ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS gene_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_user_id VARCHAR(255) NOT NULL,
    seller_user_id VARCHAR(255) NOT NULL,
    gene_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER NOT NULL,
    seller_payout_cents INTEGER NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gene_purchases_buyer
    ON gene_purchases(buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_gene_purchases_seller
    ON gene_purchases(seller_user_id);

CREATE INDEX IF NOT EXISTS idx_gene_purchases_gene
    ON gene_purchases(gene_id);

CREATE INDEX IF NOT EXISTS idx_gene_purchases_status
    ON gene_purchases(status);
