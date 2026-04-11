/**
 * EnterprisePolicyEngine — Comprehensive Tests
 *
 * Covers: policy validation, role policies, inheritance, skill/domain/path
 * permissions, compliance, signing, alert rules, and edge cases.
 *
 * Target: boost from 58% to 85%+ statement coverage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnterprisePolicyEngine, type EnterprisePolicy, type RolePolicy } from '../EnterprisePolicyEngine.js';
import { SecurityEventBus } from '../SecurityEventBus.js';

// ─── Helpers ───────────────────────────────────────────────

function createBus(): SecurityEventBus {
    return new SecurityEventBus();
}

function createFullPolicy(overrides?: Partial<EnterprisePolicy>): EnterprisePolicy {
    return {
        version: '2.0',
        organization: 'Acme Corp',
        effectiveDate: '2026-01-01',
        globalSettings: {
            securityLevel: 'secure',
            mfaRequired: true,
            sessionTimeoutMinutes: 60,
            maxConcurrentSessions: 5,
            auditRetentionDays: 365,
            encryptionRequired: true,
        },
        roles: {
            admin: {
                skills: { allowed: ['*'], denied: [] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 1000, requireApprovalFor: [] },
                dataAccess: { classifications: ['public', 'internal', 'confidential', 'restricted'], piiAccess: true },
                network: { allowedDomains: ['*'], deniedDomains: [] },
                filesystem: { allowedPaths: ['**'], deniedPaths: [] },
            },
            developer: {
                inherits: 'standard',
                skills: { allowed: ['coding-agent', 'github'], denied: ['1password'] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 500, requireApprovalFor: ['sudo *'] },
                dataAccess: { classifications: ['public', 'internal'], piiAccess: false },
                network: { allowedDomains: ['*.github.com', '*.npmjs.org'], deniedDomains: ['*.darkweb.com'] },
                filesystem: { allowedPaths: ['~/Projects/**'], deniedPaths: ['~/.ssh/**'] },
            },
            standard: {
                skills: { allowed: ['*:bundled'], denied: ['1password', 'coding-agent'] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 200, requireApprovalFor: ['rm *', 'sudo *'] },
                dataAccess: { classifications: ['public', 'internal'], piiAccess: false },
                network: { allowedDomains: ['*.openai.com', '*.anthropic.com'], deniedDomains: [] },
                filesystem: { allowedPaths: ['~/Documents/**', '~/.genome/**'], deniedPaths: ['~/.ssh/**', '~/.gnupg/**'] },
            },
        },
        compliance: {
            gdpr: { enabled: true, dataRetentionDays: 90, consentRequired: true },
            soc2: { enabled: true, accessReviewIntervalDays: 90 },
            hipaa: { enabled: false, phiEncryptionRequired: true, minimumNecessaryRule: true },
        },
        alerts: [
            { type: 'security:exec-blocked', threshold: 5, windowMinutes: 10, action: 'alert_admin' },
            { type: 'security:net-blocked', threshold: 10, windowMinutes: 30, action: 'lock_account' },
        ],
        ...overrides,
    };
}

// ─── Tests ─────────────────────────────────────────────────

describe('EnterprisePolicyEngine', () => {
    let bus: SecurityEventBus;
    let engine: EnterprisePolicyEngine;

    beforeEach(() => {
        bus = createBus();
        engine = new EnterprisePolicyEngine(bus);
    });

    // ─── Construction & Defaults ───────────────────────────

    describe('construction', () => {
        it('should initialize with default policy', () => {
            const policy = engine.getPolicy();
            expect(policy.version).toBe('1.0');
            expect(policy.organization).toBe('Default');
            expect(policy.globalSettings.securityLevel).toBe('secure');
        });

        it('should accept initial policy', () => {
            const custom = createFullPolicy();
            const customEngine = new EnterprisePolicyEngine(bus, custom);
            expect(customEngine.getPolicy().organization).toBe('Acme Corp');
        });
    });

    // ─── setPolicy ─────────────────────────────────────────

    describe('setPolicy', () => {
        it('should set a valid policy', () => {
            const policy = createFullPolicy();
            const result = engine.setPolicy(policy);
            expect(result.valid).toBe(true);
            expect(engine.getPolicy().organization).toBe('Acme Corp');
        });

        it('should reject an invalid policy', () => {
            const result = engine.setPolicy({
                version: '',
                organization: '',
                effectiveDate: '',
                globalSettings: {
                    securityLevel: 'invalid' as never,
                    mfaRequired: false,
                    sessionTimeoutMinutes: -1,
                    maxConcurrentSessions: 1,
                    auditRetentionDays: 0,
                    encryptionRequired: false,
                },
                roles: {},
                compliance: {
                    gdpr: { enabled: false, dataRetentionDays: 90, consentRequired: false },
                    soc2: { enabled: false, accessReviewIntervalDays: 90 },
                    hipaa: { enabled: false, phiEncryptionRequired: false, minimumNecessaryRule: false },
                },
                alerts: [],
            });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should emit security:profile-changed event on valid policy', () => {
            const events: string[] = [];
            bus.onAny(e => events.push(e.type));

            engine.setPolicy(createFullPolicy());
            expect(events).toContain('security:profile-changed');
        });

        it('should NOT emit event on invalid policy', () => {
            const events: string[] = [];
            bus.onAny(e => events.push(e.type));

            engine.setPolicy({
                version: '',
                organization: '',
                effectiveDate: '',
                globalSettings: { securityLevel: 'invalid' as never, mfaRequired: false, sessionTimeoutMinutes: -1, maxConcurrentSessions: 1, auditRetentionDays: 0, encryptionRequired: false },
                roles: {},
                compliance: { gdpr: { enabled: false, dataRetentionDays: 90, consentRequired: false }, soc2: { enabled: false, accessReviewIntervalDays: 90 }, hipaa: { enabled: false, phiEncryptionRequired: false, minimumNecessaryRule: false } },
                alerts: [],
            });
            expect(events).not.toContain('security:profile-changed');
        });

        it('should accept policy with signature', () => {
            const policy = createFullPolicy({ signature: 'abc123' });
            const result = engine.setPolicy(policy);
            expect(result.valid).toBe(true);
        });
    });

    // ─── validate ──────────────────────────────────────────

    describe('validate', () => {
        it('should pass valid policy', () => {
            const result = engine.validate(createFullPolicy());
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject missing version', () => {
            const result = engine.validate(createFullPolicy({ version: '' }));
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing version');
        });

        it('should reject missing organization', () => {
            const result = engine.validate(createFullPolicy({ organization: '' }));
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing organization');
        });

        it('should reject invalid securityLevel', () => {
            const policy = createFullPolicy();
            policy.globalSettings.securityLevel = 'weak' as never;
            const result = engine.validate(policy);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('securityLevel'))).toBe(true);
        });

        it('should reject negative sessionTimeoutMinutes', () => {
            const policy = createFullPolicy();
            policy.globalSettings.sessionTimeoutMinutes = -1;
            const result = engine.validate(policy);
            expect(result.errors.some(e => e.includes('sessionTimeoutMinutes'))).toBe(true);
        });

        it('should reject auditRetentionDays < 1', () => {
            const policy = createFullPolicy();
            policy.globalSettings.auditRetentionDays = 0;
            const result = engine.validate(policy);
            expect(result.errors.some(e => e.includes('auditRetentionDays'))).toBe(true);
        });

        it('should reject HIPAA without encryption', () => {
            const policy = createFullPolicy();
            policy.compliance.hipaa.enabled = true;
            policy.globalSettings.encryptionRequired = false;
            const result = engine.validate(policy);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('HIPAA'))).toBe(true);
        });

        it('should warn about MFA with standard security', () => {
            const policy = createFullPolicy();
            policy.globalSettings.mfaRequired = true;
            policy.globalSettings.securityLevel = 'standard';
            const result = engine.validate(policy);
            expect(result.warnings.some(w => w.includes('MFA'))).toBe(true);
        });

        it('should reject missing globalSettings', () => {
            const policy = createFullPolicy();
            (policy as Record<string, unknown>).globalSettings = undefined;
            const result = engine.validate(policy);
            expect(result.valid).toBe(false);
        });
    });

    // ─── getRolePolicy ─────────────────────────────────────

    describe('getRolePolicy', () => {
        beforeEach(() => {
            engine.setPolicy(createFullPolicy());
        });

        it('should return role policy for existing role', () => {
            const role = engine.getRolePolicy('admin');
            expect(role).not.toBeNull();
            expect(role!.skills.allowed).toContain('*');
        });

        it('should return null for non-existent role', () => {
            expect(engine.getRolePolicy('nonexistent')).toBeNull();
        });

        it('should resolve inheritance (developer inherits standard)', () => {
            const role = engine.getRolePolicy('developer');
            expect(role).not.toBeNull();
            // Should merge parent (standard) skills with child (developer) skills
            expect(role!.skills.allowed).toContain('*:bundled'); // from standard
            expect(role!.skills.allowed).toContain('coding-agent'); // from developer
            expect(role!.skills.denied).toContain('1password'); // from both
        });

        it('should merge data classifications from parent and child', () => {
            const role = engine.getRolePolicy('developer');
            expect(role!.dataAccess.classifications).toContain('public');
            expect(role!.dataAccess.classifications).toContain('internal');
        });

        it('should merge network domains from parent and child', () => {
            const role = engine.getRolePolicy('developer');
            expect(role!.network.allowedDomains).toContain('*.openai.com'); // from standard
            expect(role!.network.allowedDomains).toContain('*.github.com'); // from developer
            expect(role!.network.deniedDomains).toContain('*.darkweb.com'); // from developer
        });

        it('should merge filesystem paths from parent and child', () => {
            const role = engine.getRolePolicy('developer');
            expect(role!.filesystem.allowedPaths).toContain('~/Documents/**'); // from standard
            expect(role!.filesystem.allowedPaths).toContain('~/Projects/**'); // from developer
            expect(role!.filesystem.deniedPaths).toContain('~/.ssh/**'); // from both
        });
    });

    // ─── isSkillAllowed ────────────────────────────────────

    describe('isSkillAllowed', () => {
        beforeEach(() => {
            engine.setPolicy(createFullPolicy());
        });

        it('should return false for unknown role', () => {
            expect(engine.isSkillAllowed('ghost', 'anything')).toBe(false);
        });

        it('should deny explicitly denied skill', () => {
            expect(engine.isSkillAllowed('standard', '1password')).toBe(false);
        });

        it('should allow wildcard (*)', () => {
            expect(engine.isSkillAllowed('admin', 'anything')).toBe(true);
        });

        it('should allow bundled skills with *:bundled', () => {
            expect(engine.isSkillAllowed('standard', 'weather')).toBe(true);
        });

        it('should deny non-bundled skills when only *:bundled is allowed', () => {
            // Skills with "/" are considered external
            expect(engine.isSkillAllowed('standard', 'external/plugin')).toBe(false);
        });

        it('should allow explicitly named skill for admin', () => {
            expect(engine.isSkillAllowed('admin', 'coding-agent')).toBe(true);
        });

        it('should deny skill that is in merged denied list from inheritance', () => {
            // developer inherits standard which denies coding-agent
            // even though developer allows coding-agent, denied takes precedence
            expect(engine.isSkillAllowed('developer', 'coding-agent')).toBe(false);
        });

        it('should deny skill on wildcard deny', () => {
            const policy = createFullPolicy();
            policy.roles['lockdown'] = {
                skills: { allowed: [], denied: ['*'] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 0, requireApprovalFor: [] },
                dataAccess: { classifications: [], piiAccess: false },
                network: { allowedDomains: [], deniedDomains: [] },
                filesystem: { allowedPaths: [], deniedPaths: [] },
            };
            engine.setPolicy(policy);
            expect(engine.isSkillAllowed('lockdown', 'anything')).toBe(false);
        });
    });

    // ─── isDomainAllowed ───────────────────────────────────

    describe('isDomainAllowed', () => {
        beforeEach(() => {
            engine.setPolicy(createFullPolicy());
        });

        it('should return false for unknown role', () => {
            expect(engine.isDomainAllowed('ghost', 'api.openai.com')).toBe(false);
        });

        it('should allow domain matching wildcard pattern', () => {
            expect(engine.isDomainAllowed('standard', 'api.openai.com')).toBe(true);
        });

        it('should allow exact domain match from wildcard (*.openai.com -> openai.com)', () => {
            expect(engine.isDomainAllowed('standard', 'openai.com')).toBe(true);
        });

        it('should deny domain not in allowedDomains', () => {
            expect(engine.isDomainAllowed('standard', 'evil.com')).toBe(false);
        });

        it('should deny domain in deniedDomains', () => {
            expect(engine.isDomainAllowed('developer', 'x.darkweb.com')).toBe(false);
        });

        it('should allow all domains when allowedDomains is empty and no deniedDomains match', () => {
            const policy = createFullPolicy();
            policy.roles['open'] = {
                skills: { allowed: [], denied: [] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 100, requireApprovalFor: [] },
                dataAccess: { classifications: [], piiAccess: false },
                network: { allowedDomains: [], deniedDomains: [] },
                filesystem: { allowedPaths: [], deniedPaths: [] },
            };
            engine.setPolicy(policy);
            expect(engine.isDomainAllowed('open', 'any-domain.com')).toBe(true);
        });

        it('should handle admin wildcard domain (*) — matchDomain only handles *.suffix', () => {
            // Admin has allowedDomains: ['*'] but matchDomain only handles *.suffix patterns
            // So standalone '*' won't match arbitrary domains via the current implementation
            // This tests the actual behavior
            expect(engine.isDomainAllowed('admin', 'anything.anywhere.com')).toBe(false);
        });
    });

    // ─── isPathAllowed ─────────────────────────────────────

    describe('isPathAllowed', () => {
        beforeEach(() => {
            engine.setPolicy(createFullPolicy());
        });

        it('should return false for unknown role', () => {
            expect(engine.isPathAllowed('ghost', '~/anything')).toBe(false);
        });

        it('should allow path matching ** pattern', () => {
            expect(engine.isPathAllowed('standard', '~/Documents/report.pdf')).toBe(true);
        });

        it('should deny path in deniedPaths', () => {
            expect(engine.isPathAllowed('standard', '~/.ssh/id_rsa')).toBe(false);
        });

        it('should deny path not matching any allowed pattern', () => {
            expect(engine.isPathAllowed('standard', '/etc/passwd')).toBe(false);
        });

        it('should allow all paths when allowedPaths is empty and not in deniedPaths', () => {
            const policy = createFullPolicy();
            policy.roles['open'] = {
                skills: { allowed: [], denied: [] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 100, requireApprovalFor: [] },
                dataAccess: { classifications: [], piiAccess: false },
                network: { allowedDomains: [], deniedDomains: [] },
                filesystem: { allowedPaths: [], deniedPaths: [] },
            };
            engine.setPolicy(policy);
            expect(engine.isPathAllowed('open', '/any/path/file.txt')).toBe(true);
        });

        it('should handle /* (single-level wildcard) correctly', () => {
            const policy = createFullPolicy();
            policy.roles['limited'] = {
                skills: { allowed: [], denied: [] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 100, requireApprovalFor: [] },
                dataAccess: { classifications: [], piiAccess: false },
                network: { allowedDomains: [], deniedDomains: [] },
                filesystem: { allowedPaths: ['~/work/*'], deniedPaths: [] },
            };
            engine.setPolicy(policy);
            expect(engine.isPathAllowed('limited', '~/work/file.txt')).toBe(true);
            // Nested path should NOT match /* pattern
            expect(engine.isPathAllowed('limited', '~/work/sub/file.txt')).toBe(false);
        });

        it('should match exact path', () => {
            const policy = createFullPolicy();
            policy.roles['exact'] = {
                skills: { allowed: [], denied: [] },
                execution: { securityLevel: 'allowlist', maxCommandsPerHour: 100, requireApprovalFor: [] },
                dataAccess: { classifications: [], piiAccess: false },
                network: { allowedDomains: [], deniedDomains: [] },
                filesystem: { allowedPaths: ['~/config.json'], deniedPaths: [] },
            };
            engine.setPolicy(policy);
            expect(engine.isPathAllowed('exact', '~/config.json')).toBe(true);
            expect(engine.isPathAllowed('exact', '~/other.json')).toBe(false);
        });
    });

    // ─── getGlobalSettings & getCompliance ──────────────────

    describe('getGlobalSettings', () => {
        it('should return copy of global settings', () => {
            const settings = engine.getGlobalSettings();
            expect(settings.securityLevel).toBe('secure');
            settings.securityLevel = 'paranoid';
            // Should not mutate original
            expect(engine.getGlobalSettings().securityLevel).toBe('secure');
        });
    });

    describe('getCompliance', () => {
        it('should return compliance settings', () => {
            const compliance = engine.getCompliance();
            expect(compliance.gdpr).toBeDefined();
            expect(compliance.soc2).toBeDefined();
            expect(compliance.hipaa).toBeDefined();
        });
    });

    // ─── signPolicy ────────────────────────────────────────

    describe('signPolicy', () => {
        it('should produce a 64-char hex signature', () => {
            const sig = engine.signPolicy('my-secret');
            expect(sig).toHaveLength(64);
            expect(/^[0-9a-f]{64}$/.test(sig)).toBe(true);
        });

        it('should produce different signatures for different keys', () => {
            const sig1 = engine.signPolicy('key-1');
            const engine2 = new EnterprisePolicyEngine(bus);
            const sig2 = engine2.signPolicy('key-2');
            expect(sig1).not.toBe(sig2);
        });

        it('should set the signature on the policy', () => {
            engine.signPolicy('my-secret');
            const policy = engine.getPolicy();
            expect(policy.signature).toBeDefined();
            expect(policy.signature!.length).toBe(64);
        });
    });

    // ─── Alert Rules ───────────────────────────────────────

    describe('alert rules', () => {
        it('should trigger alert when deny events exceed threshold', () => {
            const policy = createFullPolicy();
            policy.alerts = [
                { type: 'security:exec-blocked', threshold: 3, windowMinutes: 60, action: 'alert_admin' },
            ];
            engine.setPolicy(policy);

            const alerts: string[] = [];
            bus.onAny(e => {
                if (e.severity === 'critical') alerts.push(e.resource.id);
            });

            // Emit 3 deny events of matching type
            for (let i = 0; i < 3; i++) {
                bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: `cmd-${i}` });
            }

            expect(alerts).toContain('security:exec-blocked');
        });

        it('should not trigger alert below threshold', () => {
            const policy = createFullPolicy();
            policy.alerts = [
                { type: 'security:exec-blocked', threshold: 10, windowMinutes: 60, action: 'alert_admin' },
            ];
            engine.setPolicy(policy);

            const alerts: string[] = [];
            bus.onAny(e => {
                if (e.severity === 'critical') alerts.push(e.resource.id);
            });

            bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'cmd-1' });
            bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'cmd-2' });

            expect(alerts).not.toContain('security:exec-blocked');
        });

        it('should ignore events with non-matching type', () => {
            const policy = createFullPolicy();
            policy.alerts = [
                { type: 'security:exec-blocked', threshold: 2, windowMinutes: 60, action: 'alert_admin' },
            ];
            engine.setPolicy(policy);

            const alerts: string[] = [];
            bus.onAny(e => {
                if (e.severity === 'critical') alerts.push(e.resource.id);
            });

            // Emit different event type
            bus.emitDeny('security:net-blocked', 6, { type: 'outbound', id: 'evil.com' });
            bus.emitDeny('security:net-blocked', 6, { type: 'outbound', id: 'evil2.com' });
            bus.emitDeny('security:net-blocked', 6, { type: 'outbound', id: 'evil3.com' });

            expect(alerts).not.toContain('security:exec-blocked');
        });

        it('should reset counter after alert fires', () => {
            const policy = createFullPolicy();
            policy.alerts = [
                { type: 'security:exec-blocked', threshold: 2, windowMinutes: 60, action: 'alert_admin' },
            ];
            engine.setPolicy(policy);

            let criticalCount = 0;
            bus.onAny(e => {
                if (e.severity === 'critical') criticalCount++;
            });

            // Trigger first alert
            bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'cmd-1' });
            bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'cmd-2' });

            const firstCount = criticalCount;

            // Should need another 2 to trigger again
            bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'cmd-3' });

            expect(criticalCount).toBe(firstCount); // no new alert yet after only 1 more
        });
    });
});
