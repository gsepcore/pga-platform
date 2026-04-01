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

    it('before() should return enhanced prompt and sanitized message', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        const result = await mw.before('Hello, how are you?', {
            userId: 'user-1',
            taskType: 'general',
        });

        expect(result.prompt).toBeDefined();
        expect(result.prompt.length).toBeGreaterThan(0);
        expect(result.sanitizedMessage).toBeDefined();
        expect(result.blocked).toBe(false);
    });

    it('after() should return fitness and safety status', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        const result = await mw.after(
            'Hello',
            'Hi there! How can I help?',
            { userId: 'user-1', taskType: 'general' },
        );

        expect(result.safe).toBe(true);
        expect(result.threats).toEqual([]);
        expect(typeof result.fitness).toBe('number');
        expect(result.fitness).toBeGreaterThan(0);
        expect(result.response).toBe('Hi there! How can I help?');
    });

    it('after() should track multiple interactions for evolution', async () => {
        const mw = await GSEPMiddleware.create({
            llm: mockLLM as never,
        });

        // Record multiple interactions
        for (let i = 0; i < 5; i++) {
            await mw.after(`Question ${i}`, `Answer ${i}`, { userId: 'user-1' });
        }

        // Should not throw, fitness should still compute
        const result = await mw.after('Final question', 'Final answer', { userId: 'user-1' });
        expect(result.fitness).toBeGreaterThan(0);
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
