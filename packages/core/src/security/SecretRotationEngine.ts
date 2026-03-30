/**
 * SecretRotationEngine — Automatic credential rotation for Genome Shield Enterprise.
 *
 * Rotates API keys and tokens on a configurable schedule.
 * Required by PCI DSS and SOC 2 compliance.
 *
 * @module security/enterprise
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';
import { KeychainAdapter } from './KeychainAdapter.js';

// ─── Types ──────────────────────────────────────────────

export interface RotationPolicy {
    /** Key name in Keychain */
    keyName: string;
    /** Rotation interval in days */
    intervalDays: number;
    /** Callback to generate new secret (e.g., call provider API) */
    rotator: () => Promise<string>;
    /** Last rotation timestamp */
    lastRotatedAt?: Date;
    /** Whether rotation is enabled */
    enabled: boolean;
}

export interface RotationResult {
    keyName: string;
    success: boolean;
    rotatedAt?: Date;
    error?: string;
    nextRotationAt?: Date;
}

export interface RotationStatus {
    totalPolicies: number;
    enabled: number;
    overdue: number;
    lastCheck?: Date;
    policies: Array<{
        keyName: string;
        enabled: boolean;
        intervalDays: number;
        lastRotatedAt?: Date;
        nextRotationAt?: Date;
        overdue: boolean;
    }>;
}

// ─── Engine ─────────────────────────────────────────────

/**
 * Automatic secret rotation engine.
 *
 * Usage:
 * ```typescript
 * const rotation = new SecretRotationEngine(eventBus, keychain);
 *
 * rotation.addPolicy({
 *   keyName: 'OPENAI_API_KEY',
 *   intervalDays: 90,
 *   rotator: async () => {
 *     // Call OpenAI API to generate new key
 *     return 'sk-new-key-...';
 *   },
 *   enabled: true,
 * });
 *
 * // Check and rotate overdue secrets
 * const results = await rotation.rotateOverdue();
 * ```
 */
export class SecretRotationEngine {
    private eventBus: SecurityEventBus;
    private keychain: KeychainAdapter;
    private policies: Map<string, RotationPolicy> = new Map();
    private timer?: ReturnType<typeof setInterval>;

    constructor(eventBus: SecurityEventBus, keychain: KeychainAdapter) {
        this.eventBus = eventBus;
        this.keychain = keychain;
    }

    /**
     * Add a rotation policy for a secret.
     */
    addPolicy(policy: RotationPolicy): void {
        this.policies.set(policy.keyName, policy);
    }

    /**
     * Remove a rotation policy.
     */
    removePolicy(keyName: string): boolean {
        return this.policies.delete(keyName);
    }

    /**
     * Rotate a specific secret now.
     */
    async rotate(keyName: string): Promise<RotationResult> {
        const policy = this.policies.get(keyName);
        if (!policy) {
            return { keyName, success: false, error: 'No policy found for this key' };
        }

        try {
            const newSecret = await policy.rotator();

            if (!newSecret || newSecret.length === 0) {
                return { keyName, success: false, error: 'Rotator returned empty secret' };
            }

            // Store new secret in Keychain
            await this.keychain.set(keyName, newSecret);

            // Update policy
            policy.lastRotatedAt = new Date();
            const nextRotationAt = new Date(Date.now() + policy.intervalDays * 86_400_000);

            this.eventBus.emit({
                type: 'security:audit-entry',
                timestamp: new Date(),
                layer: 3,
                decision: 'info',
                actor: {},
                resource: { type: 'credential', id: keyName, detail: `Rotated. Next: ${nextRotationAt.toISOString().slice(0, 10)}` },
                severity: 'info',
            });

            return { keyName, success: true, rotatedAt: policy.lastRotatedAt, nextRotationAt };
        } catch (err) {
            const error = (err as Error).message;

            this.eventBus.emitDeny('security:audit-entry' as never, 3, {
                type: 'credential',
                id: keyName,
                detail: `Rotation failed: ${error}`,
            }, 'high');

            return { keyName, success: false, error };
        }
    }

    /**
     * Check and rotate all overdue secrets.
     */
    async rotateOverdue(): Promise<RotationResult[]> {
        const results: RotationResult[] = [];

        for (const [keyName, policy] of this.policies) {
            if (!policy.enabled) continue;
            if (this.isOverdue(policy)) {
                const result = await this.rotate(keyName);
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Get rotation status for all policies.
     */
    getStatus(): RotationStatus {
        const policies = [...this.policies.values()].map(p => ({
            keyName: p.keyName,
            enabled: p.enabled,
            intervalDays: p.intervalDays,
            lastRotatedAt: p.lastRotatedAt,
            nextRotationAt: p.lastRotatedAt
                ? new Date(p.lastRotatedAt.getTime() + p.intervalDays * 86_400_000)
                : undefined,
            overdue: this.isOverdue(p),
        }));

        return {
            totalPolicies: this.policies.size,
            enabled: policies.filter(p => p.enabled).length,
            overdue: policies.filter(p => p.overdue).length,
            lastCheck: new Date(),
            policies,
        };
    }

    /**
     * Start automatic rotation checks (runs every 24 hours).
     */
    startAutoRotation(intervalMs = 86_400_000): void {
        this.stopAutoRotation();
        this.timer = setInterval(() => {
            this.rotateOverdue().catch(() => {});
        }, intervalMs);
    }

    /**
     * Stop automatic rotation checks.
     */
    stopAutoRotation(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    // ─── Internal ───────────────────────────────────────

    private isOverdue(policy: RotationPolicy): boolean {
        if (!policy.enabled) return false;
        if (!policy.lastRotatedAt) return true; // never rotated
        const elapsed = Date.now() - policy.lastRotatedAt.getTime();
        return elapsed > policy.intervalDays * 86_400_000;
    }
}
