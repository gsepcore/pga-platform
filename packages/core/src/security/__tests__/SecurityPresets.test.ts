import { describe, it, expect } from 'vitest';
import {
    getSecurityPreset,
    withSecurityPreset,
    getAvailableSecurityPresets,
    validateSecurityConfig,
    type SecurityPresetName,
} from '../SecurityPresets.js';

describe('SecurityPresets', () => {
    it('should return all 4 preset names', () => {
        const presets = getAvailableSecurityPresets();
        expect(presets).toEqual(['paranoid', 'secure', 'standard', 'developer']);
    });

    it.each(['paranoid', 'secure', 'standard', 'developer'] as SecurityPresetName[])(
        'should return valid config for %s preset',
        (name) => {
            const config = getSecurityPreset(name);
            expect(config.profile).toBe(name);
            expect(config.firewallMode).toBeDefined();
            expect(config.execPolicy).toBeDefined();
            expect(config.networkPolicy).toBeDefined();
            expect(config.auditLevel).toBeDefined();
        },
    );

    it('paranoid should be the most restrictive', () => {
        const config = getSecurityPreset('paranoid');
        expect(config.firewallMode).toBe('full-quarantine');
        expect(config.execPolicy).toBe('deny-all');
        expect(config.networkPolicy).toBe('localhost-only');
        expect(config.credentialPolicy).toBe('keychain-required');
        expect(config.blockUnsignedSkills).toBe(true);
        expect(config.enableProcessIsolation).toBe(true);
        expect(config.llmRouting).toBe('local-only');
        expect(config.sessionTimeoutMinutes).toBe(60);
    });

    it('secure should be the default recommended profile', () => {
        const config = getSecurityPreset('secure');
        expect(config.firewallMode).toBe('full-sanitize');
        expect(config.execPolicy).toBe('allowlist-ask');
        expect(config.networkPolicy).toBe('allowlist-strict');
        expect(config.enablePIIRedaction).toBe(true);
        expect(config.enableCapabilityBroker).toBe(true);
        expect(config.autoMigrateSecrets).toBe(true);
    });

    it('developer should be the least restrictive', () => {
        const config = getSecurityPreset('developer');
        expect(config.firewallMode).toBe('log-only');
        expect(config.execPolicy).toBe('unrestricted');
        expect(config.networkPolicy).toBe('unrestricted');
        expect(config.enablePIIRedaction).toBe(false);
        expect(config.blockUnsignedSkills).toBe(false);
        expect(config.enableProcessIsolation).toBe(false);
        expect(config.sessionTimeoutMinutes).toBe(0);
    });

    it('should allow overrides via withSecurityPreset', () => {
        const config = withSecurityPreset('secure', {
            sessionTimeoutMinutes: 120,
            enableProcessIsolation: false,
        });
        expect(config.profile).toBe('secure');
        expect(config.sessionTimeoutMinutes).toBe(120);
        expect(config.enableProcessIsolation).toBe(false);
        // Non-overridden values remain
        expect(config.enablePIIRedaction).toBe(true);
    });

    it('should return independent copies (no mutation)', () => {
        const a = getSecurityPreset('secure');
        const b = getSecurityPreset('secure');
        a.sessionTimeoutMinutes = 999;
        expect(b.sessionTimeoutMinutes).toBe(480);
    });

    it('should always deny sensitive paths in paranoid/secure/standard', () => {
        for (const name of ['paranoid', 'secure', 'standard'] as SecurityPresetName[]) {
            const config = getSecurityPreset(name);
            expect(config.deniedPaths).toContain('~/.ssh');
            expect(config.deniedPaths).toContain('~/.gnupg');
            expect(config.deniedPaths).toContain('~/Library/Keychains');
            expect(config.deniedPaths).toContain('~/.aws');
        }
    });

    it('developer should have empty denied paths', () => {
        const config = getSecurityPreset('developer');
        expect(config.deniedPaths).toEqual([]);
    });

    it('should validate conflicting settings', () => {
        const config = getSecurityPreset('secure');
        config.credentialPolicy = 'keychain-required';
        config.enableEncryptedConfig = false;
        const errors = validateSecurityConfig(config);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('enableEncryptedConfig');
    });

    it('should pass validation for default presets', () => {
        for (const name of getAvailableSecurityPresets()) {
            const config = getSecurityPreset(name);
            const errors = validateSecurityConfig(config);
            expect(errors).toEqual([]);
        }
    });
});
