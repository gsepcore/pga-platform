/**
 * AgentStateVector — Blackboard Architecture for Agent Consciousness
 *
 * A shared state object (the "blackboard") that all cognitive modules
 * read from and write to during each chat() cycle. Implements the
 * Global Workspace Theory of consciousness: information becomes
 * "conscious" when it's broadcast to all modules via this shared state.
 *
 * Each module contributes a facet of the agent's current state.
 * The assembled vector gives the agent a unified "sense of self"
 * at any point in time.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

// ─── State Facets ────────────────────────────────────────

export interface EmotionalFacet {
    userEmotion: string;
    intensity: number;       // 0-1
    agentTone: string;       // empathetic, encouraging, direct, patient, neutral
}

export interface CognitiveFacet {
    confidence: number;      // 0-1: overall confidence for current task
    knowledgeGaps: string[]; // what we don't know
    suggestedAction: 'respond' | 'ask' | 'research';
    domain: string | null;   // detected domain of current message
}

export interface MemoryFacet {
    recentTopics: string[];         // from AnalyticMemory
    predictions: string[];          // from PatternMemory
    relationshipStage: string;      // from PersonalNarrative
    knowledgeSummary: string;       // from AnalyticMemory.getKnowledgeSummary
}

export interface HealthFacet {
    operatingMode: string;    // from PurposeSurvival: stable, stressed, survival, critical, thriving
    healthScore: number;      // 0-1
    healthLabel: string;      // excellent, stable, degraded, critical
    isDrifting: boolean;
    driftSeverity: string;
}

export interface EvolutionFacet {
    bestOperator: string | null;     // from MetaEvolution
    learningVelocity: string;        // converging, exploring, unstable
    interactionCount: number;
    lastEvolutionTriggered: boolean;
}

export interface AutonomyFacet {
    canActAutonomously: boolean;
    mutationRate: string;     // conservative, balanced, aggressive
    refusedCurrentTask: boolean;
    refusalReason: string | null;
}

// ─── Full State Vector ───────────────────────────────────

export interface StateVector {
    timestamp: Date;
    cycleId: string;           // unique ID for this chat() cycle
    userMessage: string;
    taskType: string | null;

    // Module facets
    emotional: EmotionalFacet;
    cognitive: CognitiveFacet;
    memory: MemoryFacet;
    health: HealthFacet;
    evolution: EvolutionFacet;
    autonomy: AutonomyFacet;
}

// ─── Defaults ────────────────────────────────────────────

const DEFAULT_EMOTIONAL: EmotionalFacet = {
    userEmotion: 'neutral',
    intensity: 0,
    agentTone: 'neutral',
};

const DEFAULT_COGNITIVE: CognitiveFacet = {
    confidence: 0.7,
    knowledgeGaps: [],
    suggestedAction: 'respond',
    domain: null,
};

const DEFAULT_MEMORY: MemoryFacet = {
    recentTopics: [],
    predictions: [],
    relationshipStage: 'new',
    knowledgeSummary: '',
};

const DEFAULT_HEALTH: HealthFacet = {
    operatingMode: 'stable',
    healthScore: 0.5,
    healthLabel: 'stable',
    isDrifting: false,
    driftSeverity: 'none',
};

const DEFAULT_EVOLUTION: EvolutionFacet = {
    bestOperator: null,
    learningVelocity: 'exploring',
    interactionCount: 0,
    lastEvolutionTriggered: false,
};

const DEFAULT_AUTONOMY: AutonomyFacet = {
    canActAutonomously: true,
    mutationRate: 'balanced',
    refusedCurrentTask: false,
    refusalReason: null,
};

// ─── AgentStateVector ────────────────────────────────────

const MAX_HISTORY = 20;

export class AgentStateVector {
    private current: StateVector;
    private history: StateVector[] = [];

    constructor() {
        this.current = this.createDefault('', '');
    }

    /**
     * Begin a new cycle — resets the state vector for a new chat() call.
     */
    beginCycle(userMessage: string, taskType?: string): void {
        // Archive current state (if it has a real message)
        if (this.current.userMessage) {
            this.history.push({ ...this.current });
            if (this.history.length > MAX_HISTORY) {
                this.history = this.history.slice(-MAX_HISTORY);
            }
        }

        this.current = this.createDefault(userMessage, taskType ?? null);
    }

    /**
     * Update a specific facet of the state vector.
     * Modules call this to broadcast their state to the blackboard.
     */
    updateEmotional(facet: Partial<EmotionalFacet>): void {
        Object.assign(this.current.emotional, facet);
    }

    updateCognitive(facet: Partial<CognitiveFacet>): void {
        Object.assign(this.current.cognitive, facet);
    }

    updateMemory(facet: Partial<MemoryFacet>): void {
        Object.assign(this.current.memory, facet);
    }

    updateHealth(facet: Partial<HealthFacet>): void {
        Object.assign(this.current.health, facet);
    }

    updateEvolution(facet: Partial<EvolutionFacet>): void {
        Object.assign(this.current.evolution, facet);
    }

    updateAutonomy(facet: Partial<AutonomyFacet>): void {
        Object.assign(this.current.autonomy, facet);
    }

    /**
     * Read the full current state vector.
     */
    getState(): Readonly<StateVector> {
        return this.current;
    }

    /**
     * Get the state history (last N cycles).
     */
    getHistory(): ReadonlyArray<Readonly<StateVector>> {
        return this.history;
    }

    /**
     * Generate a prompt section that injects the agent's self-awareness.
     * This is the "consciousness broadcast" — the agent knows its own state.
     */
    toPromptSection(): string | null {
        const s = this.current;

        // Don't inject if no real cycle has started
        if (!s.userMessage) return null;

        const lines: string[] = ['## Agent Self-Awareness'];

        // Emotional awareness
        if (s.emotional.userEmotion !== 'neutral') {
            lines.push(`**User state:** ${s.emotional.userEmotion} (intensity: ${(s.emotional.intensity * 100).toFixed(0)}%) → tone: ${s.emotional.agentTone}`);
        }

        // Cognitive state
        if (s.cognitive.confidence < 0.5 || s.cognitive.knowledgeGaps.length > 0) {
            lines.push(`**Confidence:** ${(s.cognitive.confidence * 100).toFixed(0)}%${s.cognitive.knowledgeGaps.length > 0 ? ` | Gaps: ${s.cognitive.knowledgeGaps.join(', ')}` : ''}`);
        }

        // Health awareness
        if (s.health.healthLabel !== 'stable' && s.health.healthLabel !== 'excellent') {
            lines.push(`**Health:** ${s.health.healthLabel} (${(s.health.healthScore * 100).toFixed(0)}%) | Mode: ${s.health.operatingMode}`);
        }
        if (s.health.isDrifting) {
            lines.push(`**Warning:** Performance drift detected (${s.health.driftSeverity})`);
        }

        // Memory context
        if (s.memory.predictions.length > 0) {
            lines.push(`**Predictions:** ${s.memory.predictions.slice(0, 2).join('; ')}`);
        }
        if (s.memory.relationshipStage !== 'new') {
            lines.push(`**Relationship:** ${s.memory.relationshipStage}`);
        }

        // Only return if there's meaningful self-awareness to inject
        return lines.length > 1 ? lines.join('\n') : null;
    }

    /**
     * Compute a summary score for the agent's overall readiness.
     * 0 = not ready at all, 1 = fully ready and confident.
     */
    getReadinessScore(): number {
        const s = this.current;
        let score = 0;

        // Cognitive readiness (40%)
        score += s.cognitive.confidence * 0.4;

        // Health readiness (30%)
        score += s.health.healthScore * 0.3;

        // Emotional appropriateness (15%)
        const emotionalPenalty = s.emotional.userEmotion === 'frustrated' ? 0.1 : 0;
        score += (1 - emotionalPenalty) * 0.15;

        // Autonomy (15%)
        score += (s.autonomy.canActAutonomously ? 1 : 0.3) * 0.15;

        return Math.max(0, Math.min(1, score));
    }

    // ── Private ──────────────────────────────────────────

    private createDefault(userMessage: string, taskType: string | null): StateVector {
        return {
            timestamp: new Date(),
            cycleId: `cycle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userMessage,
            taskType,
            emotional: { ...DEFAULT_EMOTIONAL },
            cognitive: { ...DEFAULT_COGNITIVE },
            memory: { ...DEFAULT_MEMORY },
            health: { ...DEFAULT_HEALTH },
            evolution: { ...DEFAULT_EVOLUTION },
            autonomy: { ...DEFAULT_AUTONOMY },
        };
    }
}
