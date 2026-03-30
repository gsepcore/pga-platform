import { describe, it, expect } from 'vitest';
import { EnterprisePolicyEngine } from '../EnterprisePolicyEngine.js';
import { SecretRotationEngine } from '../SecretRotationEngine.js';
import { GDPREngine } from '../GDPREngine.js';
import { SOC2Controls } from '../SOC2Controls.js';
import { SecurityEventBus } from '../SecurityEventBus.js';
import { DataAccessTracker } from '../DataAccessTracker.js';
import { KeychainAdapter } from '../KeychainAdapter.js';

const bus = () => new SecurityEventBus();

// ─── EnterprisePolicyEngine ──────────────────────────────

describe('EnterprisePolicyEngine', () => {
    it('should load with default policy', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const policy = engine.getPolicy();
        expect(policy.version).toBe('1.0');
        expect(policy.globalSettings.securityLevel).toBe('secure');
    });

    it('should validate policies', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const policy = engine.getPolicy();
        const result = engine.validate(policy);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid policies', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const result = engine.validate({
            version: '',
            organization: '',
            effectiveDate: '',
            globalSettings: { securityLevel: 'invalid' as never, mfaRequired: false, sessionTimeoutMinutes: -1, maxConcurrentSessions: 1, auditRetentionDays: 0, encryptionRequired: false },
            roles: {},
            compliance: { gdpr: { enabled: false, dataRetentionDays: 90, consentRequired: false }, soc2: { enabled: false, accessReviewIntervalDays: 90 }, hipaa: { enabled: false, phiEncryptionRequired: false, minimumNecessaryRule: false } },
            alerts: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check skill permissions per role', () => {
        const engine = new EnterprisePolicyEngine(bus());
        expect(engine.isSkillAllowed('standard', 'weather')).toBe(true); // bundled
        expect(engine.isSkillAllowed('standard', '1password')).toBe(false); // denied
    });

    it('should check domain permissions per role', () => {
        const engine = new EnterprisePolicyEngine(bus());
        expect(engine.isDomainAllowed('standard', 'api.openai.com')).toBe(true);
        expect(engine.isDomainAllowed('standard', 'evil.com')).toBe(false);
    });

    it('should check path permissions per role', () => {
        const engine = new EnterprisePolicyEngine(bus());
        expect(engine.isPathAllowed('standard', '~/Documents/report.pdf')).toBe(true);
        expect(engine.isPathAllowed('standard', '~/.ssh/id_rsa')).toBe(false);
    });

    it('should return compliance settings', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const compliance = engine.getCompliance();
        expect(compliance.gdpr).toBeDefined();
        expect(compliance.soc2).toBeDefined();
        expect(compliance.hipaa).toBeDefined();
    });

    it('should sign policies with HMAC', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const signature = engine.signPolicy('my-secret-key');
        expect(signature).toBeDefined();
        expect(signature.length).toBe(64); // SHA-256 hex
    });

    it('should reject HIPAA without encryption', () => {
        const engine = new EnterprisePolicyEngine(bus());
        const policy = engine.getPolicy();
        policy.compliance.hipaa.enabled = true;
        policy.globalSettings.encryptionRequired = false;
        const result = engine.validate(policy);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('HIPAA'))).toBe(true);
    });
});

// ─── SecretRotationEngine ────────────────────────────────

describe('SecretRotationEngine', () => {
    // Mock KeychainAdapter for tests
    class MockKeychain {
        private store = new Map<string, string>();
        async get(key: string) { return this.store.get(key) ?? null; }
        async set(key: string, value: string) { this.store.set(key, value); }
        async delete(key: string) { return this.store.delete(key); }
        async has(key: string) { return this.store.has(key); }
    }

    it('should add rotation policies', () => {
        const engine = new SecretRotationEngine(bus(), new MockKeychain() as unknown as KeychainAdapter);
        engine.addPolicy({
            keyName: 'OPENAI_API_KEY',
            intervalDays: 90,
            rotator: async () => 'sk-new-key',
            enabled: true,
        });
        const status = engine.getStatus();
        expect(status.totalPolicies).toBe(1);
        expect(status.enabled).toBe(1);
    });

    it('should detect overdue rotations', () => {
        const engine = new SecretRotationEngine(bus(), new MockKeychain() as unknown as KeychainAdapter);
        engine.addPolicy({
            keyName: 'OLD_KEY',
            intervalDays: 1,
            rotator: async () => 'new-value',
            enabled: true,
            // No lastRotatedAt = never rotated = overdue
        });
        const status = engine.getStatus();
        expect(status.overdue).toBe(1);
    });

    it('should rotate secrets', async () => {
        const keychain = new MockKeychain();
        const engine = new SecretRotationEngine(bus(), keychain as unknown as KeychainAdapter);

        engine.addPolicy({
            keyName: 'TEST_KEY',
            intervalDays: 1,
            rotator: async () => 'rotated-secret-123',
            enabled: true,
        });

        const result = await engine.rotate('TEST_KEY');
        expect(result.success).toBe(true);
        expect(result.rotatedAt).toBeDefined();

        const stored = await keychain.get('TEST_KEY');
        expect(stored).toBe('rotated-secret-123');
    });

    it('should rotate all overdue', async () => {
        const engine = new SecretRotationEngine(bus(), new MockKeychain() as unknown as KeychainAdapter);
        engine.addPolicy({ keyName: 'KEY1', intervalDays: 1, rotator: async () => 'v1', enabled: true });
        engine.addPolicy({ keyName: 'KEY2', intervalDays: 1, rotator: async () => 'v2', enabled: true });
        engine.addPolicy({ keyName: 'KEY3', intervalDays: 1, rotator: async () => 'v3', enabled: false }); // disabled

        const results = await engine.rotateOverdue();
        expect(results).toHaveLength(2); // KEY3 disabled, not rotated
        expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle rotation failure', async () => {
        const engine = new SecretRotationEngine(bus(), new MockKeychain() as unknown as KeychainAdapter);
        engine.addPolicy({
            keyName: 'FAIL_KEY',
            intervalDays: 1,
            rotator: async () => { throw new Error('API error'); },
            enabled: true,
        });

        const result = await engine.rotate('FAIL_KEY');
        expect(result.success).toBe(false);
        expect(result.error).toContain('API error');
    });

    it('should remove policies', () => {
        const engine = new SecretRotationEngine(bus(), new MockKeychain() as unknown as KeychainAdapter);
        engine.addPolicy({ keyName: 'X', intervalDays: 1, rotator: async () => '', enabled: true });
        expect(engine.getStatus().totalPolicies).toBe(1);
        engine.removePolicy('X');
        expect(engine.getStatus().totalPolicies).toBe(0);
    });
});

// ─── GDPREngine ──────────────────────────────────────────

describe('GDPREngine', () => {
    function createGDPR() {
        const b = bus();
        const tracker = new DataAccessTracker(b);
        return { gdpr: new GDPREngine(b, tracker), tracker, bus: b };
    }

    it('should record consent', () => {
        const { gdpr } = createGDPR();
        gdpr.recordConsent('user-1', 'ai-processing', true);
        expect(gdpr.hasConsent('user-1', 'ai-processing')).toBe(true);
    });

    it('should withdraw consent', () => {
        const { gdpr } = createGDPR();
        gdpr.recordConsent('user-1', 'ai-processing', true);
        gdpr.withdrawConsent('user-1', 'ai-processing');
        expect(gdpr.hasConsent('user-1', 'ai-processing')).toBe(false);
    });

    it('should list consent status', () => {
        const { gdpr } = createGDPR();
        gdpr.recordConsent('user-1', 'ai-processing', true);
        gdpr.recordConsent('user-1', 'data-sharing', false);

        const status = gdpr.getConsentStatus('user-1');
        expect(status).toHaveLength(2);
        expect(status.find(s => s.purpose === 'ai-processing')?.granted).toBe(true);
        expect(status.find(s => s.purpose === 'data-sharing')?.granted).toBe(false);
    });

    it('should erase user data (Art. 17)', async () => {
        const { gdpr } = createGDPR();
        gdpr.recordConsent('user-1', 'ai-processing', true);

        const report = await gdpr.eraseUserData('user-1');
        expect(report.complete).toBe(true);
        expect(report.certificate).toContain('GDPR-ERASURE');
        expect(gdpr.isErased('user-1')).toBe(true);
    });

    it('should export user data (Art. 20)', () => {
        const { gdpr, tracker } = createGDPR();
        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 's', description: 'd', sentToCloud: false, itemCount: 3 });

        const exportData = gdpr.exportUserData('user-1', 'json');
        expect(exportData.format).toBe('json');
        expect(exportData.content).toContain('user-1');
    });

    it('should export as CSV', () => {
        const { gdpr, tracker } = createGDPR();
        tracker.record({ source: 'imessage', category: 'messages', skillId: 's', description: 'd', sentToCloud: true, itemCount: 5 });

        const exportData = gdpr.exportUserData('user-1', 'csv');
        expect(exportData.format).toBe('csv');
        expect(exportData.content).toContain('Timestamp');
    });

    it('should provide user data summary (Art. 15)', () => {
        const { gdpr } = createGDPR();
        gdpr.recordConsent('user-1', 'ai', true);
        const summary = gdpr.getUserDataSummary('user-1');
        expect(summary.userId).toBe('user-1');
        expect(summary.retentionPolicy).toContain('90');
    });

    it('should generate DPIA (Art. 35)', () => {
        const { gdpr } = createGDPR();
        const dpia = gdpr.generateDPIA('AI processing', ['financial', 'pii'], 'Legitimate interest');
        expect(dpia.riskLevel).toBe('high'); // financial = high risk
        expect(dpia.mitigations.length).toBeGreaterThan(0);
        expect(dpia.recommendation).toContain('Paranoid');
    });

    it('should assess low risk for public data', () => {
        const { gdpr } = createGDPR();
        const dpia = gdpr.generateDPIA('Public FAQ', ['public'], 'Consent');
        expect(dpia.riskLevel).toBe('low');
    });
});

// ─── SOC2Controls ────────────────────────────────────────

describe('SOC2Controls', () => {
    it('should have 16 controls mapped', () => {
        const soc2 = new SOC2Controls(bus());
        const controls = soc2.getControls();
        expect(controls.length).toBe(17);
    });

    it('should generate compliance report', () => {
        const soc2 = new SOC2Controls(bus());
        const report = soc2.generateReport('Acme Corp', new Date('2026-01-01'), new Date('2026-12-31'));

        expect(report.organization).toBe('Acme Corp');
        expect(report.totalControls).toBe(17);
        expect(report.implemented).toBeGreaterThan(0);
        expect(report.summary).toContain('%');
    });

    it('should have high compliance percentage', () => {
        const soc2 = new SOC2Controls(bus());
        expect(soc2.getCompliancePercentage()).toBe(100); // all implemented
    });

    it('should filter controls by criteria', () => {
        const soc2 = new SOC2Controls(bus());
        const cc6 = soc2.getControlsByCriteria('CC6');
        expect(cc6.length).toBeGreaterThan(0);
        expect(cc6.every(c => c.criteria.includes('CC6'))).toBe(true);
    });

    it('should filter controls by status', () => {
        const soc2 = new SOC2Controls(bus());
        const implemented = soc2.getControlsByStatus('implemented');
        expect(implemented.length).toBe(17);
    });

    it('should update control status', () => {
        const soc2 = new SOC2Controls(bus());
        const updated = soc2.updateControlStatus('CC1.1', 'partial');
        expect(updated).toBe(true);

        const controls = soc2.getControlsByStatus('partial');
        expect(controls).toHaveLength(1);
        expect(controls[0].id).toBe('CC1.1');
    });

    it('should reference Genome Shield modules', () => {
        const soc2 = new SOC2Controls(bus());
        const controls = soc2.getControls();
        const withModules = controls.filter(c => c.genomeShieldModule);
        expect(withModules.length).toBe(17); // all should reference a module
    });

    it('should recalculate compliance after status change', () => {
        const soc2 = new SOC2Controls(bus());
        expect(soc2.getCompliancePercentage()).toBe(100);

        soc2.updateControlStatus('CC1.1', 'not-implemented');
        expect(soc2.getCompliancePercentage()).toBeLessThan(100);
    });
});
