/**
 * @gsep/server — GSEP Evolution Server
 *
 * Secure Pull/Push API for external agents in any language.
 * GSEP never touches LLM traffic — only evolved prompts and metrics flow.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

export { GSEPServer } from './GSEPServer.js';
export type { GSEPServerConfig, RegisterGenomeOptions, GenomeEntry } from './GSEPServer.js';
export { HMACVerifier } from './auth/HMACVerifier.js';

// Backward compatibility aliases
/** @deprecated Use GSEPServer instead */
export { GSEPServer as PGAServer } from './GSEPServer.js';
/** @deprecated Use GSEPServerConfig instead */
export type { GSEPServerConfig as PGAServerConfig } from './GSEPServer.js';

// Re-export payment types for convenience
export type {
    StripePayments,
    StripePaymentsConfig,
    PaymentStorage,
    PlanId,
} from '@gsep/payments';
