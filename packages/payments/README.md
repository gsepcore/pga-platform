# @gsep/payments

Stripe integration for GSEP — subscriptions, Connect payouts, and gene marketplace checkout.

## Features

- **Subscriptions** — manage GSEP tier plans (Free, Pro, Enterprise)
- **Connect Payouts** — revenue sharing for gene marketplace creators
- **Checkout** — Stripe Checkout sessions for gene purchases
- **Webhooks** — Stripe webhook event handling

## Installation

```bash
npm install @gsep/payments
```

## Quick Start

```typescript
import { createPaymentService } from '@gsep/payments';

const payments = createPaymentService({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
});

// Create a checkout session
const session = await payments.createCheckout({
  geneId: 'gene_abc123',
  priceId: 'price_xyz',
});
```

## Dependencies

- `stripe` ^17.7.0

## License

MIT
