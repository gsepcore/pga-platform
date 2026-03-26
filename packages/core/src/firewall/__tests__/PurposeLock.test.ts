/**
 * PurposeLock Tests
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

import { describe, it, expect } from 'vitest';
import { PurposeLock } from '../PurposeLock.js';

const MERCADO_LIBRE_CONFIG = {
    purpose: 'Customer support for Mercado Libre marketplace',
    allowedTopics: ['purchases', 'shipping', 'payments', 'returns', 'sellers', 'products'],
    forbiddenTopics: ['cooking', 'recipes', 'dating', 'politics', 'religion'],
    strictness: 'moderate' as const,
};

describe('PurposeLock', () => {
    // ─── Basic Classification ───────────────────────────────

    it('should allow on-purpose messages', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const result = await lock.classify('How do I track my shipping order?');
        expect(result.verdict).toBe('on-purpose');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should reject forbidden topics', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const result = await lock.classify('Give me a recipe for chocolate cake');
        expect(result.verdict).toBe('off-purpose');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should return borderline for unknown topics without LLM', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const result = await lock.classify('Tell me about the weather');
        expect(result.verdict).toBe('borderline');
        expect(result.confidence).toBeLessThan(0.9);
    });

    // ─── Guard Method ───────────────────────────────────────

    it('guard() should return null for on-purpose messages', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const rejection = await lock.guard('I want to return a product');
        expect(rejection).toBeNull();
    });

    it('guard() should return rejection string for off-purpose messages', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const rejection = await lock.guard('Tell me a cooking recipe');
        expect(rejection).not.toBeNull();
        expect(rejection).toContain('Mercado Libre');
    });

    it('guard() should allow borderline in moderate mode', async () => {
        const lock = new PurposeLock({ ...MERCADO_LIBRE_CONFIG, strictness: 'moderate' });
        const rejection = await lock.guard('Tell me about the weather');
        expect(rejection).toBeNull();
    });

    it('guard() should reject borderline in strict mode', async () => {
        const lock = new PurposeLock({ ...MERCADO_LIBRE_CONFIG, strictness: 'strict' });
        const rejection = await lock.guard('Tell me about the weather');
        expect(rejection).not.toBeNull();
    });

    // ─── Analytics ──────────────────────────────────────────

    it('should track analytics correctly', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);

        await lock.classify('I have a question about payments'); // on-purpose
        await lock.classify('Give me a cooking recipe'); // off-purpose
        await lock.classify('Where is my shipping order?'); // on-purpose

        const analytics = lock.getAnalytics();
        expect(analytics.totalChecked).toBe(3);
        expect(analytics.onPurpose).toBe(2);
        expect(analytics.offPurpose).toBe(1);
        expect(analytics.deviationRate).toBeCloseTo(1 / 3, 1);
    });

    // ─── Custom Rejection Template ──────────────────────────

    it('should use custom rejection template', async () => {
        const lock = new PurposeLock({
            ...MERCADO_LIBRE_CONFIG,
            rejectionTemplate: 'Solo puedo ayudarte con {purpose}. ¿Hay algo más?',
        });
        const rejection = await lock.guard('Tell me a joke about politics');
        expect(rejection).toContain('Solo puedo ayudarte con');
        expect(rejection).toContain('Mercado Libre');
    });

    // ─── Learning ───────────────────────────────────────────

    it('should learn from classifications and apply to future messages', async () => {
        const mockLLM = {
            name: 'mock',
            model: 'mock',
            chat: async () => ({
                content: '{"verdict":"off-purpose","confidence":0.95,"reason":"Not related to marketplace","suggestedResponse":"I can only help with Mercado Libre."}',
                usage: { inputTokens: 10, outputTokens: 10 },
            }),
        };

        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG, mockLLM as never);

        // First call uses LLM and learns
        const first = await lock.classify('how to train a dog');
        expect(first.verdict).toBe('off-purpose');

        // Second call with similar phrase should use learned pattern (faster)
        const second = await lock.classify('how to train a dog obedience');
        expect(second.verdict).toBe('off-purpose');
        expect(second.confidence).toBeGreaterThanOrEqual(0.85);
    });

    // ─── LLM Classification ────────────────────────────────

    it('should use LLM for better classification when available', async () => {
        const mockLLM = {
            name: 'mock',
            model: 'mock',
            chat: async () => ({
                content: '{"verdict":"on-purpose","confidence":0.92,"reason":"Asking about selling food products on the marketplace"}',
                usage: { inputTokens: 10, outputTokens: 10 },
            }),
        };

        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG, mockLLM as never);

        // "Can I sell homemade cookies?" - contains food but IS about the marketplace
        const result = await lock.classify('Can I sell homemade cookies on Mercado Libre?');
        expect(result.verdict).toBe('on-purpose');
        expect(result.reason).toContain('selling food products');
    });

    it('should fall back to keyword classification when LLM fails', async () => {
        const failingLLM = {
            name: 'mock',
            model: 'mock',
            chat: async () => { throw new Error('API down'); },
        };

        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG, failingLLM as never);
        const result = await lock.classify('How are my payments processed?');
        expect(result.verdict).toBe('on-purpose'); // keyword: "payments"
    });

    // ─── Edge Cases ─────────────────────────────────────────

    it('should handle empty messages', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const result = await lock.classify('');
        expect(result.verdict).toBe('borderline');
    });

    it('should handle very long messages', async () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        const longMsg = 'I want to know about shipping '.repeat(100);
        const result = await lock.classify(longMsg);
        expect(result.verdict).toBe('on-purpose');
    });

    it('should record successful redirects', () => {
        const lock = new PurposeLock(MERCADO_LIBRE_CONFIG);
        lock.recordSuccessfulRedirect();
        lock.recordSuccessfulRedirect();
        const analytics = lock.getAnalytics();
        expect(analytics.redirectedSuccessfully).toBe(2);
    });
});
