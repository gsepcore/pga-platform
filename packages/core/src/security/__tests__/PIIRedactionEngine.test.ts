import { describe, it, expect } from 'vitest';
import { PIIRedactionEngine } from '../PIIRedactionEngine.js';

describe('PIIRedactionEngine', () => {
    // ─── Credit Cards ────────────────────────────────
    it('should redact Visa card numbers', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('My card is 4111-1111-1111-1111');
        expect(result.redacted).not.toContain('4111');
        expect(result.redacted).toContain('[REDACTED:CC:');
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].category).toBe('credit-card');
    });

    it('should redact Mastercard numbers', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Pay with 5500 0000 0000 0004');
        expect(result.matches).toHaveLength(1);
        expect(result.categories).toContain('credit-card');
    });

    it('should NOT redact invalid card numbers (fails Luhn)', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Not a card: 1234-5678-9012-3456');
        expect(result.matches.filter(m => m.category === 'credit-card')).toHaveLength(0);
    });

    // ─── SSN ─────────────────────────────────────────
    it('should redact US SSN', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('SSN: 123-45-6789');
        expect(result.redacted).toContain('[REDACTED:SSN:');
        expect(result.redacted).not.toContain('123-45-6789');
    });

    it('should NOT redact invalid SSN (area 000)', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Not SSN: 000-12-3456');
        expect(result.matches.filter(m => m.category === 'ssn')).toHaveLength(0);
    });

    // ─── Email ───────────────────────────────────────
    it('should redact email addresses', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Contact me at luis@example.com for info');
        expect(result.redacted).toContain('[REDACTED:EMAIL:');
        expect(result.redacted).not.toContain('luis@example.com');
    });

    // ─── Phone ───────────────────────────────────────
    it('should redact international phone numbers', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Call me at +49 170 1234567');
        expect(result.matches.some(m => m.category === 'phone')).toBe(true);
    });

    // ─── API Keys ────────────────────────────────────
    it('should redact OpenAI API keys', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('My key is sk-proj1234567890abcdefghij');
        expect(result.redacted).toContain('[REDACTED:KEY:');
        expect(result.matches[0].category).toBe('api-key');
    });

    it('should redact Anthropic API keys', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Using sk-ant-api03-abcdefghij1234567890');
        expect(result.matches.some(m => m.category === 'api-key')).toBe(true);
    });

    it('should redact GitHub tokens', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz');
        expect(result.matches.some(m => m.category === 'api-key')).toBe(true);
    });

    it('should redact AWS access keys', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('AWS key: AKIAIOSFODNN7EXAMPLE');
        expect(result.matches.some(m => m.category === 'api-key')).toBe(true);
    });

    // ─── IBAN ────────────────────────────────────────
    it('should redact valid IBAN numbers', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Transfer to DE89370400440532013000');
        expect(result.matches.some(m => m.category === 'iban')).toBe(true);
    });

    // ─── IP Address ──────────────────────────────────
    it('should redact IP addresses (not localhost)', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Server at 192.168.1.100');
        expect(result.matches.some(m => m.category === 'ip-address')).toBe(true);
    });

    it('should NOT redact localhost', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('Running on 127.0.0.1');
        expect(result.matches.filter(m => m.category === 'ip-address')).toHaveLength(0);
    });

    // ─── Multiple PII ────────────────────────────────
    it('should redact multiple PII types in one message', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact(
            'Name: Luis, Email: luis@test.com, Card: 4111-1111-1111-1111, SSN: 123-45-6789',
        );
        expect(result.matches.length).toBeGreaterThanOrEqual(3);
        expect(result.categories).toContain('email');
        expect(result.categories).toContain('credit-card');
        expect(result.categories).toContain('ssn');
    });

    // ─── Re-hydration ────────────────────────────────
    it('should re-hydrate redacted tokens', () => {
        const engine = new PIIRedactionEngine();
        const result = engine.redact('My email is luis@example.com');
        const rehydrated = engine.rehydrate(result.redacted);
        expect(rehydrated).toBe('My email is luis@example.com');
    });

    it('should re-hydrate multiple tokens', () => {
        const engine = new PIIRedactionEngine();
        const original = 'Card: 4111-1111-1111-1111, Email: test@test.com';
        const result = engine.redact(original);
        const rehydrated = engine.rehydrate(result.redacted);
        expect(rehydrated).toBe(original);
    });

    // ─── Category filtering ──────────────────────────
    it('should only redact enabled categories', () => {
        const engine = new PIIRedactionEngine({ categories: ['credit-card'] });
        const result = engine.redact('Card: 4111-1111-1111-1111, Email: test@test.com');
        expect(result.matches.filter(m => m.category === 'credit-card').length).toBeGreaterThanOrEqual(1);
        expect(result.matches.filter(m => m.category === 'email')).toHaveLength(0);
    });

    // ─── Scan (no vault) ─────────────────────────────
    it('should scan without storing in vault', () => {
        const engine = new PIIRedactionEngine();
        const scan = engine.scan('Card: 4111-1111-1111-1111');
        expect(scan.hasPII).toBe(true);
        expect(scan.categories).toContain('credit-card');
        expect(engine.getVaultSize()).toBe(0); // scan doesn't store
    });

    // ─── Stats ───────────────────────────────────────
    it('should track stats', () => {
        const engine = new PIIRedactionEngine();
        engine.redact('Card: 4111-1111-1111-1111');
        engine.redact('Email: test@test.com');

        const stats = engine.getStats();
        expect(stats.totalScanned).toBe(2);
        expect(stats.totalRedacted).toBeGreaterThanOrEqual(2);
    });

    // ─── Performance ─────────────────────────────────
    it('should process a typical message in under 5ms', () => {
        const engine = new PIIRedactionEngine();
        const message = 'Hello, my name is Luis. Please send payment to my account DE89370400440532013000. My phone is +49 170 1234567.';

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            engine.redact(message);
        }
        const elapsed = performance.now() - start;
        const avgMs = elapsed / 100;

        expect(avgMs).toBeLessThan(5);
    });
});
