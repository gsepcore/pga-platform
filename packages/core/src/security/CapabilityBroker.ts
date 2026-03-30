/**
 * CapabilityBroker — Central enforcement point for skill permissions.
 *
 * JIT (Just-In-Time) capability grants. Deny by default.
 * Every grant/deny logged to SecurityEventBus.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';
import { type SkillManifestData, type CapabilityType } from './SkillManifest.js';
import { type SecurityConfig } from './SecurityPresets.js';

// ─── Types ──────────────────────────────────────────────

export interface CapabilityGrant {
    skillId: string;
    capability: CapabilityType;
    grantedAt: number;
    expiresAt: number;
}

export interface CapabilityCheckResult {
    allowed: boolean;
    reason?: string;
    grantId?: string;
}

// ─── Broker ─────────────────────────────────────────────

/**
 * Central enforcement for skill capabilities.
 *
 * Usage:
 * ```typescript
 * const broker = new CapabilityBroker(eventBus, securityConfig);
 *
 * // Register a skill's manifest
 * broker.registerSkill('file-manager', manifest);
 *
 * // Before skill executes an operation:
 * const check = broker.checkCapability('file-manager', 'fs:write');
 * if (!check.allowed) throw new Error(check.reason);
 *
 * // Grant expires automatically after skill execution
 * ```
 */
export class CapabilityBroker {
    private eventBus: SecurityEventBus;
    private config: SecurityConfig;
    private manifests: Map<string, SkillManifestData> = new Map();
    private activeGrants: Map<string, CapabilityGrant[]> = new Map();
    private grantTTLMs = 60_000; // 1 minute default TTL for JIT grants
    private stats = { totalChecks: 0, granted: 0, denied: 0 };

    constructor(eventBus: SecurityEventBus, config: SecurityConfig) {
        this.eventBus = eventBus;
        this.config = config;
    }

    /**
     * Register a skill's manifest for capability enforcement.
     */
    registerSkill(skillId: string, manifest: SkillManifestData): void {
        this.manifests.set(skillId, manifest);
    }

    /**
     * Check if a skill has a specific capability.
     */
    checkCapability(skillId: string, capability: CapabilityType): CapabilityCheckResult {
        this.stats.totalChecks++;

        // Developer mode — skip all checks
        if (!this.config.enableCapabilityBroker) {
            this.stats.granted++;
            return { allowed: true, reason: 'Capability broker disabled' };
        }

        const manifest = this.manifests.get(skillId);

        // No manifest — deny in Secure/Paranoid, allow in Standard/Developer
        if (!manifest) {
            if (this.config.skillVerification !== 'none') {
                this.stats.denied++;
                this.emitDeny(skillId, capability, 'No manifest registered');
                return { allowed: false, reason: `Skill "${skillId}" has no registered manifest.` };
            }
            this.stats.granted++;
            return { allowed: true, reason: 'No manifest required in current profile' };
        }

        // Check if capability is in required or optional list
        const isRequired = manifest.permissions.required.includes(capability);
        const isOptional = manifest.permissions.optional.includes(capability);

        if (!isRequired && !isOptional) {
            this.stats.denied++;
            this.emitDeny(skillId, capability, 'Capability not declared in manifest');
            return {
                allowed: false,
                reason: `Skill "${skillId}" did not declare capability "${capability}" in its manifest.`,
            };
        }

        // Check for active JIT grant
        const hasGrant = this.hasActiveGrant(skillId, capability);

        if (!hasGrant) {
            // Grant JIT capability
            const grant = this.grantCapability(skillId, capability);
            this.stats.granted++;
            this.emitGrant(skillId, capability);
            return { allowed: true, grantId: `${grant.skillId}:${grant.capability}` };
        }

        this.stats.granted++;
        return { allowed: true };
    }

    /**
     * Grant a JIT capability to a skill.
     */
    grantCapability(skillId: string, capability: CapabilityType): CapabilityGrant {
        const grant: CapabilityGrant = {
            skillId,
            capability,
            grantedAt: Date.now(),
            expiresAt: Date.now() + this.grantTTLMs,
        };

        const existing = this.activeGrants.get(skillId) || [];
        existing.push(grant);
        this.activeGrants.set(skillId, existing);

        return grant;
    }

    /**
     * Revoke all capabilities for a skill (call after skill execution).
     */
    revokeAll(skillId: string): number {
        const grants = this.activeGrants.get(skillId) || [];
        this.activeGrants.delete(skillId);
        return grants.length;
    }

    /**
     * Revoke a specific capability.
     */
    revoke(skillId: string, capability: CapabilityType): boolean {
        const grants = this.activeGrants.get(skillId);
        if (!grants) return false;
        const idx = grants.findIndex(g => g.capability === capability);
        if (idx === -1) return false;
        grants.splice(idx, 1);
        if (grants.length === 0) this.activeGrants.delete(skillId);
        return true;
    }

    /**
     * Check if a skill can access a data classification.
     */
    checkDataAccess(skillId: string, classification: string): boolean {
        const manifest = this.manifests.get(skillId);
        if (!manifest) return !this.config.enableCapabilityBroker;
        return manifest.dataAccess.includes(classification);
    }

    /**
     * Get all registered skill IDs.
     */
    getRegisteredSkills(): string[] {
        return [...this.manifests.keys()];
    }

    /**
     * Get active grants for a skill.
     */
    getActiveGrants(skillId: string): CapabilityGrant[] {
        this.cleanupExpiredGrants(skillId);
        return [...(this.activeGrants.get(skillId) || [])];
    }

    /**
     * Get stats.
     */
    getStats() {
        return { ...this.stats };
    }

    // ─── Internal ───────────────────────────────────────

    private hasActiveGrant(skillId: string, capability: CapabilityType): boolean {
        this.cleanupExpiredGrants(skillId);
        const grants = this.activeGrants.get(skillId) || [];
        return grants.some(g => g.capability === capability);
    }

    private cleanupExpiredGrants(skillId: string): void {
        const grants = this.activeGrants.get(skillId);
        if (!grants) return;
        const now = Date.now();
        const active = grants.filter(g => g.expiresAt > now);
        if (active.length === 0) {
            this.activeGrants.delete(skillId);
        } else {
            this.activeGrants.set(skillId, active);
        }
    }

    private emitGrant(skillId: string, capability: CapabilityType): void {
        this.eventBus.emitAllow('security:capability-granted', 4, {
            type: 'capability',
            id: capability,
            detail: `Granted to ${skillId}`,
        }, { skillId });
    }

    private emitDeny(skillId: string, capability: CapabilityType, reason: string): void {
        this.eventBus.emitDeny(
            'security:capability-denied',
            4,
            { type: 'capability', id: capability, detail: reason },
            'warning',
            { skillId },
        );
    }
}
