import { describe, it, expect } from 'vitest';
import { GSEPMiddleware } from '../GSEPMiddleware.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Hello from middleware!',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('GSEPMiddleware', () => {
    it('should create a middleware instance', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
            name: 'test-middleware',
        });

        expect(mw).toBeDefined();
        expect(mw.getGenome()).toBeDefined();
    });

    it('before() should return enhanced prompt', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        const result = await mw.before('You are helpful', {
            message: 'Hello',
            userId: 'user-1',
        });

        expect(result.prompt).toContain('You are helpful');
        expect(result.rejected).toBe(false);
        expect(typeof result.anomalyDetected).toBe('boolean');
    });

    it('after() should not throw on valid feedback', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        await expect(
            mw.after('response text', { userId: 'user-1', feedback: 'good' }),
        ).resolves.not.toThrow();
    });

    it('after() should handle numeric feedback', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        await expect(
            mw.after('response text', { userId: 'user-1', feedback: 0.9 }),
        ).resolves.not.toThrow();
    });

    it('should generate reports', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        const report = mw.generateReport();
        expect(report).toBeDefined();
        expect(report.conversations).toBeDefined();
        expect(report.quality).toBeDefined();
    });

    it('should expose anomaly analytics', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        const analytics = mw.getAnomalyAnalytics();
        expect(analytics).toBeDefined();
        expect(analytics.totalAnalyzed).toBe(0);
    });

    it('should expose the genome', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
            name: 'exposed-genome',
        });

        const genome = mw.getGenome();
        expect(genome).toBeDefined();
        const exported = await genome.export();
        expect(exported.name).toBe('exposed-genome');
    });
});
