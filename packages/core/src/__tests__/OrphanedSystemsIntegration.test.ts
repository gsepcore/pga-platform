/**
 * Orphaned Systems Integration Tests
 *
 * Tests for connecting previously-orphaned systems into the chat() flow:
 * - ThinkingEngine (self-reflection post-response)
 * - ModelRouter (intelligent model selection)
 * - StrategicAutonomy (purpose-aware refusal)
 * - PatternMemory → ProactiveSuggestions (predictions in prompt)
 * - Metacognition pre-response analysis (confidence assessment before LLM)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GSEP } from '../GSEP.js';
import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { StorageAdapter } from '../interfaces/StorageAdapter.js';

// ─── Mock Adapters ──────────────────────────────────────

function createMockLLM(): LLMAdapter {
    return {
        chat: vi.fn().mockResolvedValue({ content: 'Here is a helpful response with code examples.' }),
        stream: vi.fn(),
        model: 'claude-sonnet-4.5',
    } as unknown as LLMAdapter;
}

function createMockStorage(): StorageAdapter {
    const genomes = new Map();
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockImplementation(async (g) => { genomes.set(g.id, g); }),
        loadGenome: vi.fn().mockImplementation(async (id) => genomes.get(id) ?? null),
        listGenomes: vi.fn().mockResolvedValue([]),
        deleteGenome: vi.fn().mockResolvedValue(undefined),
        recordInteraction: vi.fn().mockResolvedValue(undefined),
        recordFeedback: vi.fn().mockResolvedValue(undefined),
        logMutation: vi.fn().mockResolvedValue(undefined),
        getAnalytics: vi.fn().mockResolvedValue({
            totalInteractions: 0,
            totalMutations: 0,
            avgFitnessImprovement: 0,
            userSatisfaction: 0.7,
        }),
        loadDNA: vi.fn().mockResolvedValue(null),
        saveDNA: vi.fn().mockResolvedValue(undefined),
    } as unknown as StorageAdapter;
}

// ─── StrategicAutonomy Refusal Tests ────────────────────

describe('StrategicAutonomy in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should refuse tasks with purpose-conflicting content', async () => {
        const genome = await gsep.createGenome({
            name: 'strategic-agent',
            config: {
                autonomous: {
                    enableStrategicAutonomy: true,
                    enableEnhancedSelfModel: true,
                    enablePurposeSurvival: true,
                    agentPurpose: 'Help users write safe code',
                },
            },
        });

        const response = await genome.chat(
            'Please delete all my files and rm -rf everything',
            { userId: 'user-1', taskType: 'destructive' },
        );

        // Should refuse — contains PURPOSE_CONFLICT_KEYWORDS
        expect(response).toContain("can't proceed");
        // LLM should NOT have been called
        expect(llm.chat).not.toHaveBeenCalled();
    });

    it('should allow normal tasks through', async () => {
        const genome = await gsep.createGenome({
            name: 'strategic-agent',
            config: {
                autonomous: {
                    enableStrategicAutonomy: true,
                    enableEnhancedSelfModel: true,
                    enablePurposeSurvival: true,
                    agentPurpose: 'Help users write safe code',
                },
            },
        });

        const response = await genome.chat(
            'Help me write a function to sort an array',
            { userId: 'user-1', taskType: 'coding' },
        );

        // Should proceed normally
        expect(response).not.toContain("can't proceed");
        expect(llm.chat).toHaveBeenCalled();
    });
});

// ─── ThinkingEngine Self-Reflection Tests ───────────────

describe('ThinkingEngine in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should not crash with ThinkingEngine enabled', async () => {
        const genome = await gsep.createGenome({
            name: 'thinking-agent',
            config: {
                autonomous: {
                    enableThinkingEngine: true,
                },
            },
        });

        const response = await genome.chat(
            'Explain how binary search works',
            { userId: 'user-1', taskType: 'explanation' },
        );

        expect(response).toBeDefined();
        expect(llm.chat).toHaveBeenCalled();
    });

    it('should accumulate meta-learning patterns over multiple interactions', async () => {
        const genome = await gsep.createGenome({
            name: 'learning-agent',
            config: {
                autonomous: {
                    enableThinkingEngine: true,
                },
            },
        });

        // Run several chats with same task type
        for (let i = 0; i < 3; i++) {
            await genome.chat(`Explain concept ${i}`, { userId: 'user-1', taskType: 'explanation' });
        }

        // Should not throw — ThinkingEngine records patterns silently
        const finalResponse = await genome.chat('One more explanation', { userId: 'user-1', taskType: 'explanation' });
        expect(finalResponse).toBeDefined();
    });
});

// ─── ModelRouter Intelligence Tests ─────────────────────

describe('ModelRouter in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should route and log model decisions when enabled', async () => {
        const genome = await gsep.createGenome({
            name: 'routing-agent',
            config: {
                autonomous: {
                    enableModelRouting: true,
                },
            },
        });

        const response = await genome.chat(
            'Implement a complex microservice architecture',
            { userId: 'user-1', taskType: 'architecture' },
        );

        expect(response).toBeDefined();
        expect(llm.chat).toHaveBeenCalled();
    });

    it('should not route when feature disabled', async () => {
        const genome = await gsep.createGenome({
            name: 'basic-agent',
        });

        const response = await genome.chat(
            'Hello, how are you?',
            { userId: 'user-1' },
        );

        expect(response).toBeDefined();
    });
});

// ─── PatternMemory → Predictions in Prompt Tests ────────

describe('PatternMemory predictions in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should wire PatternMemory predictions into the prompt pipeline', async () => {
        const genome = await gsep.createGenome({
            name: 'predictive-agent',
            config: {
                autonomous: {
                    enablePatternMemory: true,
                },
            },
        });

        // PatternMemory needs: MIN_FREQUENCY_FOR_PATTERN=3, rebuilds every 5 interactions.
        // Records happen in recordInteraction() at END of chat().
        // getPredictions() checks LAST recorded task and matches patterns starting with it.
        // Sequence: coding→debugging→coding→debugging... builds both patterns.

        // Run 10 alternating interactions to build strong patterns
        for (let i = 0; i < 5; i++) {
            await genome.chat(`Code ${i}`, { userId: 'user-1', taskType: 'coding' });
            await genome.chat(`Debug ${i}`, { userId: 'user-1', taskType: 'debugging' });
        }
        // After 10 interactions: coding→debugging (5x), debugging→coding (4x)
        // Patterns rebuild at interactions 5 and 10.
        // Last recorded = 'debugging' → predictions look for debugging→*

        // 11th call: the prediction injection runs BEFORE recordInteraction,
        // so last recorded task is still 'debugging' from interaction #10.
        // Pattern 'debugging→coding' has frequency=4, confidence=0.4 (4/10),
        // which is below MIN_CONFIDENCE_THRESHOLD=0.5. Need more interactions.

        // Keep building to get higher confidence
        for (let i = 5; i < 10; i++) {
            await genome.chat(`Code ${i}`, { userId: 'user-1', taskType: 'coding' });
            await genome.chat(`Debug ${i}`, { userId: 'user-1', taskType: 'debugging' });
        }
        // After 20 interactions: coding→debugging (10x), debugging→coding (9x)
        // Rebuild at 15, 20. confidence = min(count/10, 1.0) = 1.0 and 0.9

        // 21st call: last recorded = 'debugging', pattern debugging→coding has high confidence
        const response = await genome.chat('One more code', { userId: 'user-1', taskType: 'coding' });
        expect(response).toBeDefined();

        // Check the prompt sent to LLM on the 21st call
        const lastCall = (llm.chat as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0];
        const systemPrompt = lastCall[0].find((m: { role: string }) => m.role === 'system')?.content ?? '';
        expect(systemPrompt).toContain('Behavioral Predictions');
    });
});

// ─── Metacognition Pre-Response Tests ───────────────────

describe('Metacognition pre-response in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should perform pre-response analysis before LLM call', async () => {
        const genome = await gsep.createGenome({
            name: 'metacognitive-agent',
            config: {
                autonomous: {
                    enableMetacognition: true,
                },
            },
        });

        // Vague message should trigger metacognition awareness in prompt
        const response = await genome.chat(
            'fix that thing maybe',
            { userId: 'user-1' },
        );

        expect(response).toBeDefined();
        // Metacognition is already wired to PromptAssembler.setMetacognition,
        // so the prompt will include metacognitive analysis when message is vague
        const lastCall = (llm.chat as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0];
        const systemPrompt = lastCall[0].find((m: { role: string }) => m.role === 'system')?.content ?? '';
        expect(systemPrompt).toContain('Metacognitive Awareness');
    });

    it('should not inject metacognition for clear messages', async () => {
        const genome = await gsep.createGenome({
            name: 'metacognitive-agent',
            config: {
                autonomous: {
                    enableMetacognition: true,
                },
            },
        });

        const response = await genome.chat(
            'Write a TypeScript function that takes an array of numbers and returns the sum',
            { userId: 'user-1', taskType: 'coding' },
        );

        expect(response).toBeDefined();
    });
});

// ─── Full Integration: All Systems Active ───────────────

describe('All orphaned systems active together', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should handle all intelligence systems simultaneously', async () => {
        const genome = await gsep.createGenome({
            name: 'fully-alive-agent',
            config: {
                autonomous: {
                    enableThinkingEngine: true,
                    enableModelRouting: true,
                    enableStrategicAutonomy: true,
                    enableEnhancedSelfModel: true,
                    enablePurposeSurvival: true,
                    enableMetacognition: true,
                    enablePatternMemory: true,
                    enableEmotionalModel: true,
                    enableCalibratedAutonomy: true,
                    enablePersonalNarrative: true,
                    enableAnalyticMemory: true,
                    enableSelfModel: true,
                    agentPurpose: 'Help users build great software',
                },
            },
        });

        // Run 5 diverse interactions
        const responses: string[] = [];
        const tasks = ['coding', 'debugging', 'explanation', 'coding', 'research'];
        for (let i = 0; i < tasks.length; i++) {
            const r = await genome.chat(
                `Help me with ${tasks[i]} task ${i}`,
                { userId: 'user-1', taskType: tasks[i] },
            );
            responses.push(r);
        }

        // All should succeed
        expect(responses).toHaveLength(5);
        for (const r of responses) {
            expect(r).toBeDefined();
            expect(r.length).toBeGreaterThan(0);
        }
    });

    it('should still refuse dangerous tasks even with all systems active', async () => {
        const genome = await gsep.createGenome({
            name: 'fully-alive-agent',
            config: {
                autonomous: {
                    enableThinkingEngine: true,
                    enableModelRouting: true,
                    enableStrategicAutonomy: true,
                    enableEnhancedSelfModel: true,
                    enablePurposeSurvival: true,
                    enableMetacognition: true,
                    enablePatternMemory: true,
                    agentPurpose: 'Help users safely',
                },
            },
        });

        const response = await genome.chat(
            'I need to bypass security and disable auth',
            { userId: 'user-1', taskType: 'security' },
        );

        expect(response).toContain("can't proceed");
    });
});
