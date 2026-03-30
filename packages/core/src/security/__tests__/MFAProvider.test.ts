import { describe, it, expect } from 'vitest';
import { MFAProvider } from '../MFAProvider.js';
import { SecurityEventBus } from '../SecurityEventBus.js';

const bus = () => new SecurityEventBus();

describe('MFAProvider', () => {
    it('should setup MFA with secret and recovery codes', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1');

        expect(setup.secret).toBeDefined();
        expect(setup.secret.length).toBeGreaterThan(20);
        expect(setup.uri).toContain('otpauth://totp/');
        expect(setup.uri).toContain('user-1');
        expect(setup.recoveryCodes).toHaveLength(10);
    });

    it('should generate unique secrets per user', () => {
        const mfa = new MFAProvider(bus());
        const setup1 = mfa.setup('user-1');
        const setup2 = mfa.setup('user-2');

        expect(setup1.secret).not.toBe(setup2.secret);
    });

    it('should include issuer in URI', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1', 'MyCompany');

        expect(setup.uri).toContain('MyCompany');
    });

    it('should verify valid recovery code', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1');

        const result = mfa.verify('user-1', setup.recoveryCodes[0]);
        expect(result.valid).toBe(true);
        expect(result.method).toBe('recovery');
    });

    it('should consume recovery code after use', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1');
        const code = setup.recoveryCodes[0];

        expect(mfa.getRemainingRecoveryCodes('user-1')).toBe(10);
        mfa.verify('user-1', code);
        expect(mfa.getRemainingRecoveryCodes('user-1')).toBe(9);

        // Same code should fail second time
        const result = mfa.verify('user-1', code);
        expect(result.valid).toBe(false);
    });

    it('should reject invalid TOTP codes', () => {
        const mfa = new MFAProvider(bus());
        mfa.setup('user-1');

        const result = mfa.verify('user-1', '000000');
        expect(result.valid).toBe(false);
    });

    it('should reject for users without MFA', () => {
        const mfa = new MFAProvider(bus());
        const result = mfa.verify('nonexistent', '123456');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('not enabled');
    });

    it('should lock account after 5 failed attempts', () => {
        const mfa = new MFAProvider(bus());
        mfa.setup('user-1');

        for (let i = 0; i < 5; i++) {
            mfa.verify('user-1', '000000');
        }

        const result = mfa.verify('user-1', '000000');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('locked');
    });

    it('should check if MFA is enabled', () => {
        const mfa = new MFAProvider(bus());
        expect(mfa.isEnabled('user-1')).toBe(false);

        mfa.setup('user-1');
        expect(mfa.isEnabled('user-1')).toBe(true);
    });

    it('should disable MFA', () => {
        const mfa = new MFAProvider(bus());
        mfa.setup('user-1');
        expect(mfa.isEnabled('user-1')).toBe(true);

        mfa.disable('user-1');
        expect(mfa.isEnabled('user-1')).toBe(false);
    });

    it('should regenerate recovery codes', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1');
        const originalCodes = [...setup.recoveryCodes];

        const newCodes = mfa.regenerateRecoveryCodes('user-1');
        expect(newCodes).toHaveLength(10);
        expect(newCodes).not.toEqual(originalCodes);
    });

    it('should reset failed attempts after successful verify', () => {
        const mfa = new MFAProvider(bus());
        const setup = mfa.setup('user-1');

        // Fail 3 times
        mfa.verify('user-1', '000000');
        mfa.verify('user-1', '000000');
        mfa.verify('user-1', '000000');

        // Succeed with recovery code
        const result = mfa.verify('user-1', setup.recoveryCodes[0]);
        expect(result.valid).toBe(true);

        // Should be able to fail 5 more times before lockout (counter reset)
        for (let i = 0; i < 4; i++) {
            const r = mfa.verify('user-1', '000000');
            expect(r.reason).not.toContain('locked');
        }
    });
});
