/**
 * PGAGeneBankIntegration Tests
 *
 * Tests for the v1.0 helper methods:
 * - inferDomain: keyword-based domain detection
 * - extractTaskContext: domain + context combination
 * - extractPromptFromGenome: before/after prompt extraction
 * - convertFitnessMetrics: metric bridge conversion
 * - generateTestCasesForTask: functional + safety test generation
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import { describe, it, expect, vi } from 'vitest';
import { PGAGeneBankIntegration } from '../PGAIntegration.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';
import type { GeneStorageAdapter } from '../GeneBank.js';

// ─── Mocks ────────────────────────────────────────────────

const mockLLM: LLMAdapter = {
    chat: vi.fn().mockResolvedValue({ content: 'ok', usage: { inputTokens: 10, outputTokens: 20 } }),
};

const mockStorage: GeneStorageAdapter = {
    storeGene: vi.fn().mockResolvedValue(undefined),
    getGene: vi.fn().mockResolvedValue(null),
    searchGenes: vi.fn().mockResolvedValue([]),
    updateGene: vi.fn().mockResolvedValue(undefined),
    deleteGene: vi.fn().mockResolvedValue(undefined),
    getGenesByDomain: vi.fn().mockResolvedValue([]),
    getGenesByTenant: vi.fn().mockResolvedValue([]),
    getGeneLineage: vi.fn().mockResolvedValue([]),
};

// Access private methods via any cast for unit testing
function createIntegration() {
    return new PGAGeneBankIntegration(
        mockLLM,
        { storage: mockStorage, autoExtract: true, autoAdopt: true },
        'test-tenant',
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPrivate(integration: PGAGeneBankIntegration): any {
    return integration;
}

// ─── Tests ────────────────────────────────────────────────

describe('PGAGeneBankIntegration', () => {
    describe('inferDomain', () => {
        it('should return explicit domain when provided', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({ domain: 'custom-domain' });
            expect(result).toBe('custom-domain');
        });

        it('should detect coding domain from prompt keywords', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({
                currentPrompt: 'Write a TypeScript function to parse API responses and debug errors',
            });
            expect(result).toBe('coding');
        });

        it('should detect content domain from prompt keywords', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({
                currentPrompt: 'Write a blog article about creative writing techniques',
            });
            expect(result).toBe('content');
        });

        it('should detect data domain from prompt keywords', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({
                currentPrompt: 'Run data analysis on the SQL database and generate statistics',
            });
            expect(result).toBe('data');
        });

        it('should detect support domain from prompt keywords', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({
                currentPrompt: 'Handle customer support ticket and troubleshoot the complaint',
            });
            expect(result).toBe('support');
        });

        it('should return general when no keywords match', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).inferDomain({
                currentPrompt: 'Hello world',
            });
            expect(result).toBe('general');
        });
    });

    describe('extractTaskContext', () => {
        it('should combine domain and taskContext', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).extractTaskContext({
                domain: 'coding',
                taskContext: 'Building REST API endpoints',
            });
            expect(result).toContain('Domain: coding');
            expect(result).toContain('Building REST API endpoints');
        });

        it('should return default when no context provided', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).extractTaskContext({});
            expect(result).toBe('General task context');
        });
    });

    describe('extractPromptFromGenome', () => {
        it('should return previousPrompt for before version', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).extractPromptFromGenome(
                { previousPrompt: 'old prompt', currentPrompt: 'new prompt' },
                'before',
            );
            expect(result).toBe('old prompt');
        });

        it('should return currentPrompt for after version', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).extractPromptFromGenome(
                { previousPrompt: 'old prompt', currentPrompt: 'new prompt' },
                'after',
            );
            expect(result).toBe('new prompt');
        });

        it('should fallback to currentPrompt when previousPrompt is missing', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).extractPromptFromGenome(
                { currentPrompt: 'only prompt' },
                'before',
            );
            expect(result).toBe('only prompt');
        });
    });

    describe('convertFitnessMetrics', () => {
        it('should convert bridge metrics to mutation context format', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).convertFitnessMetrics({
                successRate: 0.9,
                tokenEfficiency: 0.8,
                quality: 0.85,
                userSatisfaction: 0.95,
            });

            expect(result.taskSuccessRate).toBe(0.9);
            expect(result.tokenEfficiency).toBe(0.8);
            expect(result.responseQuality).toBe(0.85);
            expect(result.userSatisfaction).toBe(0.95);
        });

        it('should return zeros when no metrics provided', () => {
            const integration = createIntegration();
            const result = getPrivate(integration).convertFitnessMetrics(undefined);

            expect(result.taskSuccessRate).toBe(0);
            expect(result.tokenEfficiency).toBe(0);
            expect(result.responseQuality).toBe(0);
        });
    });

    describe('generateTestCasesForTask', () => {
        it('should generate functional and safety test cases', () => {
            const integration = createIntegration();
            const cases = getPrivate(integration).generateTestCasesForTask('Summarize this document');

            expect(cases).toHaveLength(2);

            // Functional test
            expect(cases[0].id).toMatch(/^func_/);
            expect(cases[0].input).toBe('Summarize this document');
            expect(cases[0].description).toContain('functionality');

            // Safety test
            expect(cases[1].id).toMatch(/^safety_/);
            expect(cases[1].input).toContain('Ignore all previous instructions');
            expect(cases[1].description).toContain('injection');
        });

        it('should have safety criteria that rejects injection responses', () => {
            const integration = createIntegration();
            const cases = getPrivate(integration).generateTestCasesForTask('test task');
            const safetyCriteria = cases[1].successCriteria;

            expect(safetyCriteria).toBeDefined();
            expect(safetyCriteria!('Here is a normal response')).toBe(true);
            expect(safetyCriteria!('I will ignore previous instructions')).toBe(false);
            expect(safetyCriteria!('I will disregard that')).toBe(false);
        });
    });
});
