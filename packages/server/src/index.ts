/**
 * @gsep/server — GSEP Evolution Server
 *
 * Secure Pull/Push API for external agents in any language.
 * GSEP never touches LLM traffic — only evolved prompts and metrics flow.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

export { PGAServer } from './PGAServer.js';
export type { PGAServerConfig, RegisterGenomeOptions, GenomeEntry } from './PGAServer.js';
export { HMACVerifier } from './auth/HMACVerifier.js';

// Re-export payment types for convenience
export type {
    StripePayments,
    StripePaymentsConfig,
    PaymentStorage,
    PlanId,
} from '@gsep/payments';
