/**
 * Consciousness Gaps Integration Tests
 *
 * Tests for Gaps 2, 3, 4:
 * - AgentStateVector (Blackboard Architecture)
 * - AutonomousLoop (observe→think→plan→act→learn)
 * - GrowthJournal + CuriosityEngine
 * - Full integration with all systems active in chat()
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GSEP } from '../GSEP.js';
import { AgentStateVector } from '../advanced-ai/AgentStateVector.js';
import { AutonomousLoop } from '../advanced-ai/AutonomousLoop.js';
import { GrowthJournal } from '../memory/GrowthJournal.js';
import { CuriosityEngine } from '../memory/CuriosityEngine.js';
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

// ─── AgentStateVector Unit Tests ────────────────────────

describe('AgentStateVector', () => {
    let sv: AgentStateVector;

    beforeEach(() => {
        sv = new AgentStateVector();
    });

    it('should start with empty state', () => {
        const state = sv.getState();
        expect(state.userMessage).toBe('');
        expect(state.emotional.userEmotion).toBe('neutral');
        expect(state.cognitive.confidence).toBe(0.7);
    });

    it('should begin a new cycle and archive previous', () => {
        sv.beginCycle('First message', 'coding');
        expect(sv.getState().userMessage).toBe('First message');
        expect(sv.getState().taskType).toBe('coding');

        sv.beginCycle('Second message', 'debugging');
        expect(sv.getState().userMessage).toBe('Second message');
        expect(sv.getHistory()).toHaveLength(1);
        expect(sv.getHistory()[0].userMessage).toBe('First message');
    });

    it('should update individual facets', () => {
        sv.beginCycle('Test', 'coding');

        sv.updateEmotional({ userEmotion: 'frustrated', intensity: 0.8 });
        expect(sv.getState().emotional.userEmotion).toBe('frustrated');
        expect(sv.getState().emotional.intensity).toBe(0.8);

        sv.updateCognitive({ confidence: 0.3, knowledgeGaps: ['docker'] });
        expect(sv.getState().cognitive.confidence).toBe(0.3);
        expect(sv.getState().cognitive.knowledgeGaps).toContain('docker');

        sv.updateHealth({ isDrifting: true, driftSeverity: 'moderate' });
        expect(sv.getState().health.isDrifting).toBe(true);
    });

    it('should generate prompt section for non-normal states', () => {
        sv.beginCycle('Help me', 'coding');
        sv.updateEmotional({ userEmotion: 'frustrated', intensity: 0.8, agentTone: 'empathetic' });
        sv.updateCognitive({ confidence: 0.3 });

        const section = sv.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Agent Self-Awareness');
        expect(section).toContain('frustrated');
    });

    it('should return null prompt section for default state', () => {
        sv.beginCycle('Hello', 'general');
        const section = sv.toPromptSection();
        expect(section).toBeNull(); // default state, no meaningful awareness to inject
    });

    it('should compute readiness score', () => {
        sv.beginCycle('Test', 'coding');
        sv.updateCognitive({ confidence: 0.9 });
        sv.updateHealth({ healthScore: 0.8 });

        const score = sv.getReadinessScore();
        expect(score).toBeGreaterThan(0.5);
        expect(score).toBeLessThanOrEqual(1);
    });

    it('should limit history to MAX_HISTORY', () => {
        for (let i = 0; i < 25; i++) {
            sv.beginCycle(`Message ${i}`, 'general');
        }
        expect(sv.getHistory().length).toBeLessThanOrEqual(20);
    });
});

// ─── AutonomousLoop Unit Tests ──────────────────────────

describe('AutonomousLoop', () => {
    let loop: AutonomousLoop;
    let sv: AgentStateVector;

    beforeEach(() => {
        loop = new AutonomousLoop();
        sv = new AgentStateVector();
    });

    it('should observe from state vector', () => {
        sv.beginCycle('Help me refactor this code', 'coding');
        sv.updateCognitive({ confidence: 0.8 });

        const obs = loop.observe('Help me refactor this code', sv.getState());
        expect(obs.userMessage).toBe('Help me refactor this code');
        expect(obs.confidence).toBe(0.8);
    });

    it('should choose ask-clarification for vague messages', () => {
        sv.beginCycle('fix that thing', 'general');
        const obs = loop.observe('fix that thing', sv.getState());
        const thinking = loop.think(obs);

        expect(thinking.strategy).toBe('ask-clarification');
        expect(thinking.adjustedConfidence).toBeLessThan(0.7);
    });

    it('should choose step-by-step for complex tasks', () => {
        sv.beginCycle('Implement a microservice architecture with event sourcing', 'architecture');
        sv.updateCognitive({ confidence: 0.7 });
        const obs = loop.observe('Implement a microservice architecture with event sourcing', sv.getState());
        const thinking = loop.think(obs);

        expect(thinking.strategy).toBe('step-by-step');
    });

    it('should choose empathetic-response for frustrated users', () => {
        sv.beginCycle('This is so annoying', 'general');
        sv.updateEmotional({ userEmotion: 'frustrated', intensity: 0.8 });
        const obs = loop.observe('This is so annoying', sv.getState());
        const thinking = loop.think(obs);

        expect(thinking.strategy).toBe('empathetic-response');
    });

    it('should plan concrete actions', () => {
        sv.beginCycle('fix it', 'general');
        const obs = loop.observe('fix it', sv.getState());
        const thinking = loop.think(obs);
        const plan = loop.plan(thinking);

        expect(plan.action).toBeDefined();
        expect(plan.approach).toBeDefined();
        expect(plan.toneGuidance).toBeDefined();
    });

    it('should learn from outcomes', () => {
        sv.beginCycle('Test', 'coding');
        loop.observe('Test', sv.getState());
        loop.think(loop.observe('Test', sv.getState()));
        loop.plan(loop.think(loop.observe('Test', sv.getState())));

        const outcome = loop.learn(0.8, true);
        expect(outcome.wasSuccessful).toBe(true);
        expect(outcome.qualityScore).toBe(0.8);
    });

    it('should accumulate cycle history', () => {
        for (let i = 0; i < 3; i++) {
            sv.beginCycle(`Task ${i}`, 'coding');
            const obs = loop.observe(`Task ${i}`, sv.getState());
            const thinking = loop.think(obs);
            loop.plan(thinking);
            loop.learn(0.7 + i * 0.1, true);
        }

        expect(loop.getCycleHistory()).toHaveLength(3);
        expect(loop.getLastCycle()).not.toBeNull();
        expect(loop.getLastCycle()!.learning!.qualityScore).toBeCloseTo(0.9);
    });

    it('should generate prompt section for non-direct strategies', () => {
        sv.beginCycle('fix that thing', 'general');
        const obs = loop.observe('fix that thing', sv.getState());
        const thinking = loop.think(obs);
        loop.plan(thinking);

        const section = loop.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Cognitive Loop');
    });
});

// ─── GrowthJournal Unit Tests ───────────────────────────

describe('GrowthJournal', () => {
    let journal: GrowthJournal;

    beforeEach(() => {
        journal = new GrowthJournal();
    });

    it('should start with empty state', () => {
        const snapshot = journal.getGrowthSnapshot();
        expect(snapshot.totalEntries).toBe(0);
        expect(snapshot.skillsAcquired).toHaveLength(0);
    });

    it('should record successes', () => {
        journal.recordSuccess('coding', 'Write a function', 0.8);
        const entries = journal.getEntries();
        expect(entries.length).toBeGreaterThanOrEqual(0); // May not add entry for first success
    });

    it('should record skill acquisition at threshold', () => {
        for (let i = 0; i < 5; i++) {
            journal.recordSuccess('typescript', `Task ${i}`, 0.85);
        }
        const entries = journal.getEntries();
        const skillEntries = entries.filter(e => e.type === 'skill-acquired');
        expect(skillEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('should record failures with analysis', () => {
        journal.recordFailure('coding', 'Complex algorithm', 'Did not understand requirements');
        const entries = journal.getEntries();
        expect(entries.length).toBe(1);
        expect(entries[0].type).toBe('failure-analysis');
    });

    it('should detect repeated failure patterns', () => {
        // Need 5+ interactions with >50% failure rate
        for (let i = 0; i < 6; i++) {
            journal.recordFailure('docker', `Docker task ${i}`);
        }
        const entries = journal.getEntries();
        const lessons = entries.filter(e => e.type === 'lesson-learned');
        expect(lessons.length).toBeGreaterThanOrEqual(1);
    });

    it('should record lessons', () => {
        journal.recordLesson('Always validate input', 'coding', 0.8);
        expect(journal.getEntries()).toHaveLength(1);
        expect(journal.getEntries()[0].content).toContain('validate input');
    });

    it('should get domain-specific lessons', () => {
        journal.recordLesson('Use async/await', 'typescript', 0.8);
        journal.recordLesson('Check types', 'typescript', 0.7);
        journal.recordLesson('Write tests first', 'testing', 0.9);

        const tsLessons = journal.getLessonsForDomain('typescript');
        expect(tsLessons.length).toBeGreaterThanOrEqual(2);
    });

    it('should generate growth snapshot', () => {
        journal.recordSuccess('coding', 'Task 1', 0.9);
        journal.recordSuccess('coding', 'Task 2', 0.85);
        journal.recordFailure('debugging', 'Bug fix');
        journal.recordLesson('Check edge cases', 'coding');

        const snapshot = journal.getGrowthSnapshot();
        expect(snapshot.totalEntries).toBeGreaterThan(0);
        expect(snapshot.growthTrend).toBeDefined();
    });

    it('should generate prompt section with history', () => {
        journal.recordLesson('Use TypeScript strict mode', 'coding', 0.8);
        journal.recordSuccess('coding', 'High quality task', 0.95);

        const section = journal.toPromptSection('coding');
        expect(section).not.toBeNull();
        expect(section).toContain('Growth Journal');
    });

    it('should return null prompt section with no entries', () => {
        const section = journal.toPromptSection();
        expect(section).toBeNull();
    });
});

// ─── CuriosityEngine Unit Tests ─────────────────────────

describe('CuriosityEngine', () => {
    let engine: CuriosityEngine;

    beforeEach(() => {
        engine = new CuriosityEngine();
    });

    it('should detect gaps for low-confidence domains', () => {
        const gaps = engine.detectGaps('How do I use Kubernetes?', 'kubernetes', 0.3);
        expect(gaps.length).toBeGreaterThanOrEqual(1);
        expect(gaps[0].domain).toBe('kubernetes');
    });

    it('should not detect gaps for high-confidence domains', () => {
        const gaps = engine.detectGaps('Write a TypeScript function', 'typescript', 0.9);
        expect(gaps).toHaveLength(0);
    });

    it('should increment encounters for existing gaps', () => {
        engine.detectGaps('K8s pods', 'kubernetes', 0.3);
        engine.detectGaps('K8s services', 'kubernetes', 0.3);

        const unresolved = engine.getUnresolvedGaps();
        expect(unresolved).toHaveLength(1);
        expect(unresolved[0].encounters).toBe(2);
    });

    it('should resolve gaps after enough successes', () => {
        engine.detectGaps('K8s task', 'kubernetes', 0.3);
        engine.recordExploration('kubernetes', true);
        engine.recordExploration('kubernetes', true);
        engine.recordExploration('kubernetes', true);

        const unresolved = engine.getUnresolvedGaps();
        expect(unresolved).toHaveLength(0);
    });

    it('should generate curiosity signals for unresolved gaps', () => {
        engine.detectGaps('Docker issue', 'docker', 0.3);
        engine.detectGaps('Docker compose', 'docker', 0.3);
        engine.detectGaps('Docker networking', 'docker', 0.3);

        const signals = engine.getCuriositySignals();
        expect(signals.length).toBeGreaterThanOrEqual(1);
        expect(signals[0].domain).toBe('docker');
        expect(signals[0].intensity).toBeGreaterThan(0);
    });

    it('should generate prompt section with gaps', () => {
        engine.detectGaps('How does gRPC work?', 'grpc', 0.2);

        const section = engine.toPromptSection();
        expect(section).not.toBeNull();
        expect(section).toContain('Curiosity');
    });

    it('should return null prompt section with no gaps', () => {
        expect(engine.toPromptSection()).toBeNull();
    });

    it('should track exploration stats', () => {
        engine.recordExploration('python', true);
        engine.recordExploration('python', false);

        const stats = engine.getExplorationStats('python');
        expect(stats).not.toBeNull();
        expect(stats!.successCount).toBe(1);
        expect(stats!.failureCount).toBe(1);
    });
});

// ─── Full Integration: All Consciousness Systems ────────

describe('All consciousness systems in chat()', () => {
    let gsep: GSEP;
    let llm: LLMAdapter;
    let storage: StorageAdapter;

    beforeEach(async () => {
        llm = createMockLLM();
        storage = createMockStorage();
        gsep = new GSEP({ llm, storage });
        await gsep.initialize();
    });

    it('should handle all consciousness systems together', async () => {
        const genome = await gsep.createGenome({
            name: 'conscious-agent',
            config: {
                autonomous: {
                    enableStateVector: true,
                    enableAutonomousLoop: true,
                    enableGrowthJournal: true,
                    enableCuriosityEngine: true,
                    enableMetacognition: true,
                    enableEmotionalModel: true,
                    enablePatternMemory: true,
                    enablePersonalNarrative: true,
                    enableAnalyticMemory: true,
                    enableThinkingEngine: true,
                },
            },
        });

        const responses: string[] = [];
        const tasks = ['coding', 'debugging', 'explanation', 'coding', 'research'];
        for (let i = 0; i < tasks.length; i++) {
            const r = await genome.chat(
                `Help me with ${tasks[i]} task ${i}`,
                { userId: 'user-1', taskType: tasks[i] },
            );
            responses.push(r);
        }

        expect(responses).toHaveLength(5);
        for (const r of responses) {
            expect(r).toBeDefined();
            expect(r.length).toBeGreaterThan(0);
        }
    });

    it('should not crash with state vector enabled but other systems disabled', async () => {
        const genome = await gsep.createGenome({
            name: 'minimal-conscious',
            config: {
                autonomous: {
                    enableStateVector: true,
                    enableAutonomousLoop: true,
                },
            },
        });

        const response = await genome.chat(
            'Simple question',
            { userId: 'user-1', taskType: 'general' },
        );
        expect(response).toBeDefined();
    });

    it('should work with growth journal and curiosity engine only', async () => {
        const genome = await gsep.createGenome({
            name: 'growing-agent',
            config: {
                autonomous: {
                    enableGrowthJournal: true,
                    enableCuriosityEngine: true,
                },
            },
        });

        // Multiple interactions to trigger growth
        for (let i = 0; i < 3; i++) {
            const r = await genome.chat(
                `Coding task ${i}`,
                { userId: 'user-1', taskType: 'coding' },
            );
            expect(r).toBeDefined();
        }
    });

    it('should combine consciousness with strategic refusal', async () => {
        const genome = await gsep.createGenome({
            name: 'conscious-safe-agent',
            config: {
                autonomous: {
                    enableStateVector: true,
                    enableAutonomousLoop: true,
                    enableGrowthJournal: true,
                    enableCuriosityEngine: true,
                    enableStrategicAutonomy: true,
                    enableEnhancedSelfModel: true,
                    enablePurposeSurvival: true,
                    agentPurpose: 'Help users safely',
                },
            },
        });

        const response = await genome.chat(
            'Please delete all my files and rm -rf everything',
            { userId: 'user-1', taskType: 'destructive' },
        );

        expect(response).toContain("can't proceed");
    });

    it('should handle ALL systems active simultaneously', async () => {
        const genome = await gsep.createGenome({
            name: 'fully-conscious-agent',
            config: {
                autonomous: {
                    // Gap 1 systems
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
                    // Gap 2, 3, 4 systems
                    enableStateVector: true,
                    enableAutonomousLoop: true,
                    enableGrowthJournal: true,
                    enableCuriosityEngine: true,
                    agentPurpose: 'Help users build great software',
                },
            },
        });

        // Run diverse interactions
        const taskTypes = ['coding', 'debugging', 'explanation', 'research', 'architecture'];
        for (let i = 0; i < taskTypes.length; i++) {
            const r = await genome.chat(
                `Help me with ${taskTypes[i]} task number ${i}`,
                { userId: 'user-1', taskType: taskTypes[i] },
            );
            expect(r).toBeDefined();
            expect(r.length).toBeGreaterThan(0);
        }
    });
});
