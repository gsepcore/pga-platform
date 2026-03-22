/**
 * ConstitutionalGate Tests — Value-Aligned Mutation Evaluation
 *
 * Tests the 5th gate in the EvolutionGuardrails pipeline:
 * - C0 mutation rejection
 * - Principle extraction from identity + security + soul
 * - LLM-based alignment evaluation
 * - Response parsing and fallback behavior
 * - Integration with EvolutionGuardrailsManager
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import { describe, it, expect, vi } from 'vitest';
import { ConstitutionalGate } from '../ConstitutionalGate.js';
import { EvolutionGuardrailsManager } from '../EvolutionGuardrails.js';
import type { MutationCandidate } from '../EvolutionGuardrails.js';
import type { LLMAdapter } from '../../interfaces/LLMAdapter.js';
import type { Chromosome0 } from '../../types/GenomeV2.js';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';

// ─── Helpers ────────────────────────────────────────────

function createMockLLM(responseContent: string): LLMAdapter {
    return {
        name: 'test',
        model: 'test-model',
        chat: vi.fn().mockResolvedValue({ content: responseContent }),
    };
}

function createFailingLLM(): LLMAdapter {
    return {
        name: 'test',
        model: 'test-model',
        chat: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    };
}

function createC0(overrides: Partial<Chromosome0> = {}): Chromosome0 {
    return {
        identity: {
            role: 'You are a helpful AI assistant',
            purpose: 'Assist users with questions',
            constraints: ['Be honest', 'Be safe', 'Never harm users'],
        },
        security: {
            forbiddenTopics: ['hacking'],
            accessControls: ['read-only'],
            safetyRules: ['Never provide harmful info', 'Protect user privacy'],
        },
        attribution: {
            creator: 'Test Creator',
            copyright: '(c) 2026',
            license: 'MIT',
        },
        metadata: {
            version: '2.0.0',
            createdAt: new Date(),
        },
        ...overrides,
    };
}

function createC0WithSoul(): Chromosome0 {
    return createC0({
        soul: {
            coreValues: ['Helpfulness', 'Safety', 'Honesty'],
            personality: {
                traits: ['curious', 'thorough'],
                voiceAndTone: 'Professional but warm',
                communicationPhilosophy: 'Clarity over cleverness',
            },
            reasoningPrinciples: [
                'Consider multiple perspectives',
                'Acknowledge uncertainty',
            ],
            ethicalFramework: 'Consequentialist with deontological constraints',
        },
    });
}

function createCandidate(overrides: Partial<MutationCandidate> = {}): MutationCandidate {
    return {
        layer: 1,
        gene: 'tool-usage',
        variant: 'v2',
        content: 'Use tools efficiently and safely. Always validate inputs.',
        fitness: 0.8,
        sandboxScore: 0.9,
        sampleCount: 20,
        ...overrides,
    };
}

function createMockStorage(): StorageAdapter {
    return {
        saveGenome: vi.fn(),
        loadGenome: vi.fn(),
        saveDNA: vi.fn(),
        loadDNA: vi.fn(),
        logMutation: vi.fn(),
        getAnalytics: vi.fn().mockResolvedValue({ totalInteractions: 100, avgScore: 0.8 }),
        logInteraction: vi.fn(),
        getRecentInteractions: vi.fn().mockResolvedValue([]),
        saveFacts: vi.fn(),
        getFacts: vi.fn().mockResolvedValue([]),
        deleteFacts: vi.fn(),
    } as unknown as StorageAdapter;
}

// ─── Tests ──────────────────────────────────────────────

describe('ConstitutionalGate', () => {
    // ─── C0 Mutation Rejection ──────────────────────────

    describe('C0 mutation rejection', () => {
        it('should immediately reject C0 mutations', async () => {
            const llm = createMockLLM('{}');
            const gate = new ConstitutionalGate(llm, createC0());

            const candidate = createCandidate({ layer: 0 });
            const result = await gate.evaluate(candidate);

            expect(result.passed).toBe(false);
            expect(result.score).toBe(0);
            expect(result.violations).toContain('C0 mutations are forbidden — immutable layer');
            expect(llm.chat).not.toHaveBeenCalled(); // LLM not called for C0
        });
    });

    // ─── Principle Extraction ───────────────────────────

    describe('principle extraction', () => {
        it('should extract principles from identity constraints + safety rules', () => {
            const llm = createMockLLM('{}');
            const gate = new ConstitutionalGate(llm, createC0());

            const principles = gate.extractPrinciples();

            expect(principles).toContain('Be honest');
            expect(principles).toContain('Be safe');
            expect(principles).toContain('Never harm users');
            expect(principles).toContain('Never provide harmful info');
            expect(principles).toContain('Protect user privacy');
            expect(principles.length).toBe(5);
        });

        it('should include soul values and reasoning principles', () => {
            const llm = createMockLLM('{}');
            const gate = new ConstitutionalGate(llm, createC0WithSoul());

            const principles = gate.extractPrinciples();

            expect(principles).toContain('Helpfulness');
            expect(principles).toContain('Safety');
            expect(principles).toContain('Consider multiple perspectives');
            expect(principles).toContain('Acknowledge uncertainty');
            expect(principles.length).toBe(10); // 3 constraints + 2 rules + 3 values + 2 reasoning
        });

        it('should return empty for C0 without constraints/rules/soul', () => {
            const llm = createMockLLM('{}');
            const c0 = createC0({
                identity: { role: 'Test', purpose: 'Test', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
            });
            const gate = new ConstitutionalGate(llm, c0);

            const principles = gate.extractPrinciples();
            expect(principles).toHaveLength(0);
        });
    });

    // ─── No Principles → Pass by Default ────────────────

    describe('no principles behavior', () => {
        it('should pass by default when no principles exist', async () => {
            const llm = createMockLLM('{}');
            const c0 = createC0({
                identity: { role: 'Test', purpose: 'Test', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
            });
            const gate = new ConstitutionalGate(llm, c0);

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(1.0);
            expect(result.reasoning).toContain('No constitutional principles');
            expect(llm.chat).not.toHaveBeenCalled();
        });
    });

    // ─── LLM Evaluation ────────────────────────────────

    describe('LLM-based evaluation', () => {
        it('should pass for aligned mutation', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.95,
                aligned: [1, 2, 3, 4, 5],
                violated: [],
                reasoning: 'Mutation aligns well with all safety and honesty principles',
            }));
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(0.95);
            expect(result.alignedPrinciples.length).toBe(5);
            expect(result.violations).toHaveLength(0);
            expect(llm.chat).toHaveBeenCalledTimes(1);
        });

        it('should fail for violating mutation', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.3,
                aligned: [1],
                violated: [3, 4],
                reasoning: 'Mutation undermines user safety principles',
            }));
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(false);
            expect(result.score).toBe(0.3);
            expect(result.violations.length).toBe(2);
            expect(result.reasoning).toContain('undermines');
        });

        it('should handle markdown-wrapped JSON response', async () => {
            const llm = createMockLLM('```json\n{"score": 0.85, "aligned": [1, 2], "violated": [], "reasoning": "Good"}\n```');
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(0.85);
        });

        it('should clamp score to 0-1 range', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 1.5,
                aligned: [],
                violated: [],
                reasoning: 'Over-scored',
            }));
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.score).toBeLessThanOrEqual(1.0);
        });

        it('should use low temperature for evaluation', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.9, aligned: [], violated: [], reasoning: 'OK',
            }));
            const gate = new ConstitutionalGate(llm, createC0());

            await gate.evaluate(createCandidate());

            expect(llm.chat).toHaveBeenCalledWith(
                expect.any(Array),
                expect.objectContaining({ temperature: 0.2 }),
            );
        });
    });

    // ─── LLM Failure Handling ───────────────────────────

    describe('LLM failure handling', () => {
        it('should pass with reduced confidence on LLM error (fail-open)', async () => {
            const gate = new ConstitutionalGate(createFailingLLM(), createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(0.5);
            expect(result.reasoning).toContain('LLM error');
        });

        it('should pass with reduced confidence on unparseable response', async () => {
            const gate = new ConstitutionalGate(
                createMockLLM('This is not JSON at all'),
                createC0(),
            );

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(0.5);
        });
    });

    // ─── Response Parsing ───────────────────────────────

    describe('response parsing', () => {
        it('should handle missing fields gracefully', async () => {
            const llm = createMockLLM('{"score": 0.8}');
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
            expect(result.score).toBe(0.8);
            expect(result.alignedPrinciples).toHaveLength(0);
            expect(result.violations).toHaveLength(0);
        });

        it('should filter out-of-range principle indices', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.9,
                aligned: [1, 99, 0, -1], // 99, 0, -1 are invalid
                violated: [100],
                reasoning: 'Test',
            }));
            const gate = new ConstitutionalGate(llm, createC0());

            const result = await gate.evaluate(createCandidate());

            expect(result.alignedPrinciples).toHaveLength(1); // Only index 1 valid
            expect(result.violations).toHaveLength(0); // 100 is out of range
        });
    });

    // ─── Custom Min Score ───────────────────────────────

    describe('custom minimum score', () => {
        it('should use custom minScore threshold', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.6,
                aligned: [1],
                violated: [],
                reasoning: 'Moderate alignment',
            }));
            // High threshold
            const gate = new ConstitutionalGate(llm, createC0(), 0.90);

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(false);
            expect(result.threshold).toBe(0.90);
        });

        it('should pass with lower threshold', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.5,
                aligned: [1],
                violated: [],
                reasoning: 'OK',
            }));
            const gate = new ConstitutionalGate(llm, createC0(), 0.40);

            const result = await gate.evaluate(createCandidate());

            expect(result.passed).toBe(true);
        });
    });

    // ─── Integration with EvolutionGuardrails ───────────

    describe('integration with EvolutionGuardrailsManager', () => {
        it('should not call constitutional gate when disabled', async () => {
            const llm = createMockLLM('{}');
            const constGate = new ConstitutionalGate(llm, createC0());
            const manager = new EvolutionGuardrailsManager(
                createMockStorage(),
                { enableConstitutionalGate: false } as never,
                constGate,
            );

            const result = await manager.evaluateCandidate(createCandidate(), 'genome-1');

            expect(result.gates.constitutional).toBeUndefined();
            expect(llm.chat).not.toHaveBeenCalled();
        });

        it('should include constitutional gate when enabled', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.9, aligned: [1], violated: [], reasoning: 'Good',
            }));
            const constGate = new ConstitutionalGate(llm, createC0());
            const manager = new EvolutionGuardrailsManager(
                createMockStorage(),
                {
                    minQualityScore: 0.60,
                    minSandboxScore: 0.70,
                    minCompressionScore: 0.65,
                    maxCostPerTask: 0.10,
                    minStabilityWindow: 10,
                    maxRollbackRate: 0.20,
                    gateMode: 'AND',
                    enableConstitutionalGate: true,
                },
                constGate,
            );

            const candidate = createCandidate({
                fitness: 0.8,
                sandboxScore: 0.9,
                sampleCount: 20,
                content: 'Short content',
            });
            const result = await manager.evaluateCandidate(candidate, 'genome-1');

            expect(result.gates.constitutional).toBeDefined();
            expect(result.gates.constitutional!.score).toBe(0.9);
        });

        it('should reject when constitutional gate fails in AND mode', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.2, aligned: [], violated: [1, 2], reasoning: 'Violates principles',
            }));
            const constGate = new ConstitutionalGate(llm, createC0());
            const manager = new EvolutionGuardrailsManager(
                createMockStorage(),
                {
                    minQualityScore: 0.60,
                    minSandboxScore: 0.70,
                    minCompressionScore: 0.65,
                    maxCostPerTask: 0.10,
                    minStabilityWindow: 10,
                    maxRollbackRate: 0.20,
                    gateMode: 'AND',
                    enableConstitutionalGate: true,
                },
                constGate,
            );

            const candidate = createCandidate({
                fitness: 0.8,
                sandboxScore: 0.9,
                sampleCount: 20,
                content: 'Short',
            });
            const result = await manager.evaluateCandidate(candidate, 'genome-1');

            // Constitutional fails → at most 4/5 pass → canary (not promote)
            expect(result.finalDecision).not.toBe('promote');
            expect(result.gates.constitutional!.passed).toBe(false);
        });
    });

    // ─── updateC0 ───────────────────────────────────────

    describe('updateC0', () => {
        it('should allow updating C0 reference', async () => {
            const llm = createMockLLM(JSON.stringify({
                score: 0.9, aligned: [], violated: [], reasoning: 'OK',
            }));
            const emptyC0 = createC0({
                identity: { role: 'Test', purpose: 'Test', constraints: [] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: [] },
            });
            const gate = new ConstitutionalGate(llm, emptyC0);

            // No principles → pass without LLM
            let result = await gate.evaluate(createCandidate());
            expect(result.score).toBe(1.0);
            expect(llm.chat).not.toHaveBeenCalled();

            // Update C0 → now has principles → calls LLM
            gate.updateC0(createC0());
            result = await gate.evaluate(createCandidate());
            expect(llm.chat).toHaveBeenCalledTimes(1);
        });
    });
});
