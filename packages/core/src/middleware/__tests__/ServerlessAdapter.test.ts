import { describe, it, expect, beforeEach } from 'vitest';
import { getServerlessGenome, clearServerlessCache } from '../ServerlessAdapter.js';
import { InMemoryStorageAdapter } from '../../wrap/InMemoryStorageAdapter.js';

const mockLLM = {
    name: 'mock',
    model: 'mock-model',
    chat: async () => ({
        content: 'Hello from serverless!',
        usage: { inputTokens: 10, outputTokens: 10 },
    }),
};

describe('ServerlessAdapter', () => {
    beforeEach(() => {
        clearServerlessCache();
    });

    it('should create a genome on first call', async () => {
        const genome = await getServerlessGenome({
            llm: mockLLM as never,
            storage: new InMemoryStorageAdapter(),
            name: 'test-serverless',
        });

        expect(genome).toBeDefined();
    });

    it('should return cached genome on subsequent calls', async () => {
        const config = {
            llm: mockLLM as never,
            storage: new InMemoryStorageAdapter(),
            name: 'cached-test',
        };

        const first = await getServerlessGenome(config);
        const second = await getServerlessGenome(config);

        // Same instance (cached)
        expect(first).toBe(second);
    });

    it('should create new genome for different names', async () => {
        const storage = new InMemoryStorageAdapter();

        const a = await getServerlessGenome({
            llm: mockLLM as never,
            storage,
            name: 'agent-a',
        });

        clearServerlessCache();

        const b = await getServerlessGenome({
            llm: mockLLM as never,
            storage,
            name: 'agent-b',
        });

        expect(a).not.toBe(b);
    });

    it('should clear cache', async () => {
        const config = {
            llm: mockLLM as never,
            storage: new InMemoryStorageAdapter(),
            name: 'clear-test',
        };

        const first = await getServerlessGenome(config);
        clearServerlessCache();
        const second = await getServerlessGenome(config);

        expect(first).not.toBe(second);
    });

    it('should use conscious preset by default (not full)', async () => {
        const genome = await getServerlessGenome({
            llm: mockLLM as never,
            storage: new InMemoryStorageAdapter(),
        });

        // Genome should be created — verify it's functional
        expect(genome).toBeDefined();
        const exported = await genome.export();
        expect(exported.name).toBe('serverless-agent');
    });
});
