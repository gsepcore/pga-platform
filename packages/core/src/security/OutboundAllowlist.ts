/**
 * OutboundAllowlist — Domain-level outbound network control for Genome Shield.
 *
 * Only whitelisted domains can be contacted. Blocks SSRF to private networks.
 * Every blocked request logged to SecurityEventBus.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export interface OutboundCheckResult {
    allowed: boolean;
    reason?: string;
    hostname: string;
}

export interface OutboundAllowlistConfig {
    /** Allowed domains (supports wildcards: *.openai.com) */
    allowedDomains: string[];
    /** Block requests to private/internal networks */
    blockPrivateNetworks: boolean;
    /** Policy mode */
    mode: 'strict' | 'broad' | 'unrestricted';
}

// ─── Private Network Ranges ─────────────────────────────

const PRIVATE_IP_PATTERNS = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,    // link-local
    /^0\./,
    /^::1$/,          // IPv6 loopback
    /^fc00:/i,        // IPv6 unique local
    /^fe80:/i,        // IPv6 link-local
];

const PRIVATE_HOSTNAMES = [
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',           // GCP metadata
    'instance-data.ec2.internal',         // AWS metadata
];

// ─── Allowlist ──────────────────────────────────────────

/**
 * Outbound network access control.
 *
 * Usage:
 * ```typescript
 * const allowlist = new OutboundAllowlist(eventBus, {
 *   allowedDomains: ['*.openai.com', 'api.anthropic.com', 'api.telegram.org'],
 *   blockPrivateNetworks: true,
 *   mode: 'strict',
 * });
 *
 * const check = allowlist.check('evil-server.com');
 * // check.allowed = false
 * ```
 */
export class OutboundAllowlist {
    private eventBus: SecurityEventBus;
    private allowedDomains: string[];
    private blockPrivateNetworks: boolean;
    private mode: OutboundAllowlistConfig['mode'];
    private stats = { totalChecks: 0, allowed: 0, blocked: 0 };

    constructor(eventBus: SecurityEventBus, config: OutboundAllowlistConfig) {
        this.eventBus = eventBus;
        this.allowedDomains = config.allowedDomains;
        this.blockPrivateNetworks = config.blockPrivateNetworks;
        this.mode = config.mode;
    }

    /**
     * Check if an outbound request to a hostname is allowed.
     */
    check(hostname: string, skillId?: string): OutboundCheckResult {
        this.stats.totalChecks++;

        // Unrestricted mode — allow everything
        if (this.mode === 'unrestricted') {
            this.stats.allowed++;
            return { allowed: true, hostname };
        }

        // Step 1: Block private networks (SSRF prevention)
        if (this.blockPrivateNetworks && this.isPrivateNetwork(hostname)) {
            this.stats.blocked++;
            this.eventBus.emitDeny(
                'security:net-blocked',
                6,
                { type: 'outbound', id: hostname, detail: 'Private network blocked (SSRF prevention)' },
                'high',
                { skillId },
            );
            return { allowed: false, reason: 'Private network access blocked', hostname };
        }

        // Step 2: Check allowlist
        if (this.mode === 'strict' && !this.isDomainAllowed(hostname)) {
            this.stats.blocked++;
            this.eventBus.emitDeny(
                'security:net-blocked',
                6,
                { type: 'outbound', id: hostname, detail: 'Domain not in allowlist' },
                'warning',
                { skillId },
            );
            return { allowed: false, reason: `Domain "${hostname}" not in allowlist`, hostname };
        }

        // Broad mode — allow most, only block suspicious
        if (this.mode === 'broad' && this.isSuspiciousDomain(hostname)) {
            this.stats.blocked++;
            this.eventBus.emitDeny(
                'security:net-blocked',
                6,
                { type: 'outbound', id: hostname, detail: 'Suspicious domain blocked' },
                'warning',
                { skillId },
            );
            return { allowed: false, reason: `Suspicious domain blocked: ${hostname}`, hostname };
        }

        this.stats.allowed++;
        this.eventBus.emitAllow('security:net-allowed', 6, {
            type: 'outbound',
            id: hostname,
        }, { skillId });

        return { allowed: true, hostname };
    }

    /**
     * Check from a full URL.
     */
    checkURL(url: string, skillId?: string): OutboundCheckResult {
        try {
            const parsed = new URL(url);
            return this.check(parsed.hostname, skillId);
        } catch {
            return { allowed: false, reason: 'Invalid URL', hostname: url };
        }
    }

    /**
     * Add a domain to the allowlist at runtime.
     */
    addDomain(domain: string): void {
        if (!this.allowedDomains.includes(domain)) {
            this.allowedDomains.push(domain);
        }
    }

    /**
     * Remove a domain from the allowlist.
     */
    removeDomain(domain: string): boolean {
        const idx = this.allowedDomains.indexOf(domain);
        if (idx === -1) return false;
        this.allowedDomains.splice(idx, 1);
        return true;
    }

    /**
     * Get current allowlist.
     */
    getDomains(): string[] {
        return [...this.allowedDomains];
    }

    /**
     * Get stats.
     */
    getStats() {
        return { ...this.stats };
    }

    // ─── Internal ───────────────────────────────────────

    private isPrivateNetwork(hostname: string): boolean {
        if (PRIVATE_HOSTNAMES.includes(hostname.toLowerCase())) return true;
        return PRIVATE_IP_PATTERNS.some(p => p.test(hostname));
    }

    private isDomainAllowed(hostname: string): boolean {
        const lower = hostname.toLowerCase();
        return this.allowedDomains.some(pattern => {
            const lowerPattern = pattern.toLowerCase();
            if (lowerPattern.startsWith('*.')) {
                // Wildcard: *.openai.com matches api.openai.com, chat.openai.com
                const suffix = lowerPattern.slice(1); // .openai.com
                return lower.endsWith(suffix) || lower === lowerPattern.slice(2);
            }
            return lower === lowerPattern;
        });
    }

    private isSuspiciousDomain(hostname: string): boolean {
        const suspicious = [
            /\.onion$/i,
            /\.i2p$/i,
            /\.bit$/i,
            /^(\d{1,3}\.){3}\d{1,3}$/,  // raw IP address
            /webhook|hook|exfil|collect|log|beacon/i,
        ];
        return suspicious.some(p => p.test(hostname));
    }
}
