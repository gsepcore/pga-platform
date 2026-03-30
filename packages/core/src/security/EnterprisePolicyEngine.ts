/**
 * EnterprisePolicyEngine — YAML-based enterprise policy management.
 *
 * Admin defines signed policies that ALL agents respect.
 * Supports role-based policies, time restrictions, data classification,
 * network rules, and compliance settings.
 *
 * @module security/enterprise
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { SecurityEventBus } from './SecurityEventBus.js';
// Types from RBACEngine used in policy definitions

// ─── Types ──────────────────────────────────────────────

export interface EnterprisePolicy {
    version: string;
    organization: string;
    effectiveDate: string;
    signature?: string;

    globalSettings: {
        securityLevel: 'paranoid' | 'secure' | 'standard';
        mfaRequired: boolean;
        sessionTimeoutMinutes: number;
        maxConcurrentSessions: number;
        auditRetentionDays: number;
        encryptionRequired: boolean;
    };

    roles: Record<string, RolePolicy>;

    compliance: {
        gdpr: { enabled: boolean; dataRetentionDays: number; consentRequired: boolean };
        soc2: { enabled: boolean; accessReviewIntervalDays: number };
        hipaa: { enabled: boolean; phiEncryptionRequired: boolean; minimumNecessaryRule: boolean };
    };

    alerts: AlertRule[];
}

export interface RolePolicy {
    inherits?: string;
    skills: { allowed: string[]; denied: string[] };
    execution: { securityLevel: string; maxCommandsPerHour: number; requireApprovalFor: string[] };
    dataAccess: { classifications: string[]; piiAccess: boolean };
    network: { allowedDomains: string[]; deniedDomains: string[] };
    filesystem: { allowedPaths: string[]; deniedPaths: string[] };
}

export interface AlertRule {
    type: string;
    threshold: number;
    windowMinutes: number;
    action: 'alert_admin' | 'lock_account' | 'disable_skill' | 'log_only';
}

export interface PolicyValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ─── Default Policy ─────────────────────────────────────

const DEFAULT_POLICY: EnterprisePolicy = {
    version: '1.0',
    organization: 'Default',
    effectiveDate: new Date().toISOString().slice(0, 10),

    globalSettings: {
        securityLevel: 'secure',
        mfaRequired: false,
        sessionTimeoutMinutes: 480,
        maxConcurrentSessions: 3,
        auditRetentionDays: 90,
        encryptionRequired: true,
    },

    roles: {
        standard: {
            skills: { allowed: ['*:bundled'], denied: ['1password', 'coding-agent'] },
            execution: { securityLevel: 'allowlist', maxCommandsPerHour: 200, requireApprovalFor: ['rm *', 'sudo *'] },
            dataAccess: { classifications: ['public', 'internal'], piiAccess: false },
            network: { allowedDomains: ['*.openai.com', '*.anthropic.com'], deniedDomains: [] },
            filesystem: { allowedPaths: ['~/Documents/**', '~/.genome/**'], deniedPaths: ['~/.ssh/**', '~/.gnupg/**'] },
        },
    },

    compliance: {
        gdpr: { enabled: false, dataRetentionDays: 90, consentRequired: true },
        soc2: { enabled: false, accessReviewIntervalDays: 90 },
        hipaa: { enabled: false, phiEncryptionRequired: true, minimumNecessaryRule: true },
    },

    alerts: [
        { type: 'security:exec-blocked', threshold: 20, windowMinutes: 30, action: 'alert_admin' },
        { type: 'security:net-blocked', threshold: 50, windowMinutes: 60, action: 'alert_admin' },
        { type: 'security:inbound-blocked', threshold: 10, windowMinutes: 15, action: 'alert_admin' },
    ],
};

// ─── Engine ─────────────────────────────────────────────

/**
 * Enterprise policy management engine.
 *
 * Usage:
 * ```typescript
 * const engine = new EnterprisePolicyEngine(eventBus);
 *
 * // Load from YAML/JSON file
 * await engine.loadFromFile('~/.genome/enterprise-policy.json');
 *
 * // Or set programmatically
 * engine.setPolicy(myPolicy);
 *
 * // Check what a role can do
 * const rolePolicy = engine.getRolePolicy('standard');
 *
 * // Check if a skill is allowed for a role
 * engine.isSkillAllowed('standard', '1password'); // false
 * ```
 */
export class EnterprisePolicyEngine {
    private eventBus: SecurityEventBus;
    private policy: EnterprisePolicy;
    private alertCounters: Map<string, { count: number; windowStart: number }> = new Map();

    constructor(eventBus: SecurityEventBus, policy?: EnterprisePolicy) {
        this.eventBus = eventBus;
        this.policy = policy ?? { ...DEFAULT_POLICY };

        // Subscribe to security events for alert rules
        eventBus.onAny((event) => {
            if (event.decision === 'deny') {
                this.checkAlertRules(event.type);
            }
        });
    }

    /**
     * Load policy from a JSON file.
     */
    async loadFromFile(filePath: string): Promise<PolicyValidationResult> {
        const content = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as EnterprisePolicy;
        return this.setPolicy(parsed);
    }

    /**
     * Set policy programmatically. Validates before applying.
     */
    setPolicy(policy: EnterprisePolicy): PolicyValidationResult {
        const validation = this.validate(policy);
        if (!validation.valid) return validation;

        // Verify signature if present
        if (policy.signature) {
            // In production, verify with admin's public key
            // For now, just check it's present
        }

        this.policy = policy;

        this.eventBus.emit({
            type: 'security:profile-changed',
            timestamp: new Date(),
            layer: 4,
            decision: 'info',
            actor: {},
            resource: { type: 'policy', id: policy.organization, detail: `v${policy.version} effective ${policy.effectiveDate}` },
            severity: 'info',
        });

        return validation;
    }

    /**
     * Get the current policy.
     */
    getPolicy(): EnterprisePolicy {
        return { ...this.policy };
    }

    /**
     * Get policy for a specific role.
     */
    getRolePolicy(roleName: string): RolePolicy | null {
        const rolePolicy = this.policy.roles[roleName];
        if (!rolePolicy) return null;

        // Resolve inheritance
        if (rolePolicy.inherits) {
            const parent = this.policy.roles[rolePolicy.inherits];
            if (parent) {
                return this.mergeRolePolicies(parent, rolePolicy);
            }
        }

        return rolePolicy;
    }

    /**
     * Check if a skill is allowed for a role.
     */
    isSkillAllowed(roleName: string, skillName: string): boolean {
        const rolePolicy = this.getRolePolicy(roleName);
        if (!rolePolicy) return false;

        // Check denied first
        if (rolePolicy.skills.denied.includes(skillName)) return false;
        if (rolePolicy.skills.denied.includes('*')) return false;

        // Check allowed
        if (rolePolicy.skills.allowed.includes('*')) return true;
        if (rolePolicy.skills.allowed.includes(skillName)) return true;
        if (rolePolicy.skills.allowed.includes('*:bundled') && !skillName.includes('/')) return true;

        return false;
    }

    /**
     * Check if a domain is allowed for a role.
     */
    isDomainAllowed(roleName: string, domain: string): boolean {
        const rolePolicy = this.getRolePolicy(roleName);
        if (!rolePolicy) return false;

        // Check denied
        for (const denied of rolePolicy.network.deniedDomains) {
            if (this.matchDomain(domain, denied)) return false;
        }

        // Check allowed
        if (rolePolicy.network.allowedDomains.length === 0) return true;
        return rolePolicy.network.allowedDomains.some(allowed => this.matchDomain(domain, allowed));
    }

    /**
     * Check if a path is allowed for a role.
     */
    isPathAllowed(roleName: string, path: string): boolean {
        const rolePolicy = this.getRolePolicy(roleName);
        if (!rolePolicy) return false;

        for (const denied of rolePolicy.filesystem.deniedPaths) {
            if (this.matchPath(path, denied)) return false;
        }

        if (rolePolicy.filesystem.allowedPaths.length === 0) return true;
        return rolePolicy.filesystem.allowedPaths.some(allowed => this.matchPath(path, allowed));
    }

    /**
     * Get global settings.
     */
    getGlobalSettings(): EnterprisePolicy['globalSettings'] {
        return { ...this.policy.globalSettings };
    }

    /**
     * Get compliance settings.
     */
    getCompliance(): EnterprisePolicy['compliance'] {
        return { ...this.policy.compliance };
    }

    /**
     * Validate a policy object.
     */
    validate(policy: EnterprisePolicy): PolicyValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!policy.version) errors.push('Missing version');
        if (!policy.organization) errors.push('Missing organization');
        if (!policy.globalSettings) errors.push('Missing globalSettings');

        if (policy.globalSettings) {
            const gs = policy.globalSettings;
            if (!['paranoid', 'secure', 'standard'].includes(gs.securityLevel)) {
                errors.push(`Invalid securityLevel: ${gs.securityLevel}`);
            }
            if (gs.sessionTimeoutMinutes < 0) errors.push('sessionTimeoutMinutes must be >= 0');
            if (gs.auditRetentionDays < 1) errors.push('auditRetentionDays must be >= 1');
        }

        if (policy.compliance?.hipaa?.enabled && !policy.globalSettings?.encryptionRequired) {
            errors.push('HIPAA requires encryptionRequired=true');
        }

        if (policy.globalSettings?.mfaRequired && policy.globalSettings?.securityLevel === 'standard') {
            warnings.push('MFA required with standard security level — consider upgrading to secure');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Sign a policy with HMAC (for tamper detection).
     */
    signPolicy(signingKey: string): string {
        const payload = JSON.stringify({
            ...this.policy,
            signature: undefined,
        });
        const signature = createHmac('sha256', signingKey).update(payload).digest('hex');
        this.policy.signature = signature;
        return signature;
    }

    // ─── Internal ───────────────────────────────────────

    private mergeRolePolicies(parent: RolePolicy, child: RolePolicy): RolePolicy {
        return {
            skills: {
                allowed: [...new Set([...parent.skills.allowed, ...child.skills.allowed])],
                denied: [...new Set([...parent.skills.denied, ...child.skills.denied])],
            },
            execution: { ...parent.execution, ...child.execution },
            dataAccess: {
                classifications: [...new Set([...parent.dataAccess.classifications, ...child.dataAccess.classifications])],
                piiAccess: child.dataAccess.piiAccess || parent.dataAccess.piiAccess,
            },
            network: {
                allowedDomains: [...new Set([...parent.network.allowedDomains, ...child.network.allowedDomains])],
                deniedDomains: [...new Set([...parent.network.deniedDomains, ...child.network.deniedDomains])],
            },
            filesystem: {
                allowedPaths: [...new Set([...parent.filesystem.allowedPaths, ...child.filesystem.allowedPaths])],
                deniedPaths: [...new Set([...parent.filesystem.deniedPaths, ...child.filesystem.deniedPaths])],
            },
        };
    }

    private matchDomain(domain: string, pattern: string): boolean {
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(1);
            return domain.endsWith(suffix) || domain === pattern.slice(2);
        }
        return domain === pattern;
    }

    private matchPath(path: string, pattern: string): boolean {
        if (pattern.endsWith('/**')) {
            return path.startsWith(pattern.slice(0, -3));
        }
        if (pattern.endsWith('/*')) {
            const dir = pattern.slice(0, -2);
            return path.startsWith(dir) && !path.slice(dir.length + 1).includes('/');
        }
        return path === pattern || path.startsWith(pattern + '/');
    }

    private checkAlertRules(eventType: string): void {
        const now = Date.now();

        for (const rule of this.policy.alerts) {
            if (rule.type !== eventType) continue;

            const key = `${rule.type}:${rule.windowMinutes}`;
            const counter = this.alertCounters.get(key) ?? { count: 0, windowStart: now };

            if (now - counter.windowStart > rule.windowMinutes * 60_000) {
                counter.count = 1;
                counter.windowStart = now;
            } else {
                counter.count++;
            }

            this.alertCounters.set(key, counter);

            if (counter.count >= rule.threshold) {
                this.eventBus.emit({
                    type: 'security:audit-entry',
                    timestamp: new Date(),
                    layer: 7,
                    decision: 'deny',
                    actor: {},
                    resource: {
                        type: 'alert',
                        id: rule.type,
                        detail: `${counter.count} events in ${rule.windowMinutes}m — action: ${rule.action}`,
                    },
                    severity: 'critical',
                });
                counter.count = 0; // reset after alert
            }
        }
    }
}
