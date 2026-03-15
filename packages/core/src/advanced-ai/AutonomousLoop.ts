/**
 * AutonomousLoop — Observe → Think → Plan → Act → Learn
 *
 * Implements the agent's autonomous cognitive cycle. Each chat() call
 * runs through these five phases, collecting insights that accumulate
 * across interactions. The loop makes the agent genuinely autonomous
 * by giving it a structured "thought process" around every interaction.
 *
 * Phase 1: OBSERVE — gather signals from blackboard + message
 * Phase 2: THINK — assess confidence, identify gaps, pick strategy
 * Phase 3: PLAN — decide action (respond, ask, defer, refuse)
 * Phase 4: ACT — (handled by LLM call in PGA.ts)
 * Phase 5: LEARN — record outcomes, update models, grow
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import type { StateVector } from './AgentStateVector.js';

// ─── Types ──────────────────────────────────────────────

export interface Observation {
    userMessage: string;
    taskType: string | null;
    userEmotion: string;
    emotionIntensity: number;
    confidence: number;
    knowledgeGaps: string[];
    predictions: string[];
    healthScore: number;
    operatingMode: string;
    isDrifting: boolean;
}

export interface ThinkingResult {
    strategy: 'direct-response' | 'ask-clarification' | 'step-by-step' | 'careful-response' | 'empathetic-response';
    reasoning: string;
    adjustedConfidence: number;
    warnings: string[];
}

export interface Plan {
    action: 'respond' | 'ask' | 'refuse' | 'defer';
    approach: string;
    toneGuidance: string;
    prependToPrompt: string | null;
}

export interface LearningOutcome {
    wasSuccessful: boolean;
    qualityScore: number;
    lessonsLearned: string[];
    domainProgress: 'improved' | 'stable' | 'declined';
}

export interface CycleReport {
    cycleId: string;
    observation: Observation;
    thinking: ThinkingResult;
    plan: Plan;
    learning?: LearningOutcome;
    durationMs: number;
}

// ─── Constants ──────────────────────────────────────────

const MAX_CYCLE_HISTORY = 50;
const VAGUE_MESSAGE_PATTERNS = [
    /^(fix|do|help|change|update)\s+(that|this|it|the thing)/i,
    /^(idk|dunno|whatever|maybe|hmm)/i,
    /^.{1,15}$/,  // Very short messages
];

const COMPLEX_TASK_PATTERNS = [
    /\b(implement|architect|design|refactor|optimize|migrate)\b/i,
    /\b(system|infrastructure|pipeline|framework|architecture)\b/i,
];

// ─── AutonomousLoop ────────────────────────────────────

export class AutonomousLoop {
    private cycleHistory: CycleReport[] = [];
    private currentCycleId: string | null = null;
    private currentObservation: Observation | null = null;
    private currentThinking: ThinkingResult | null = null;
    private currentPlan: Plan | null = null;
    private cycleStartTime: number = 0;

    /**
     * Phase 1: OBSERVE — Gather all signals from the environment.
     *
     * Reads the blackboard (AgentStateVector) and the raw user message
     * to build a unified observation of the current situation.
     */
    observe(userMessage: string, stateVector: Readonly<StateVector>): Observation {
        this.cycleStartTime = Date.now();
        this.currentCycleId = stateVector.cycleId;

        this.currentObservation = {
            userMessage,
            taskType: stateVector.taskType,
            userEmotion: stateVector.emotional.userEmotion,
            emotionIntensity: stateVector.emotional.intensity,
            confidence: stateVector.cognitive.confidence,
            knowledgeGaps: [...stateVector.cognitive.knowledgeGaps],
            predictions: [...stateVector.memory.predictions],
            healthScore: stateVector.health.healthScore,
            operatingMode: stateVector.health.operatingMode,
            isDrifting: stateVector.health.isDrifting,
        };

        return this.currentObservation;
    }

    /**
     * Phase 2: THINK — Assess the situation and decide strategy.
     *
     * Analyzes the observation to determine the best response strategy,
     * adjusts confidence, and generates warnings if needed.
     */
    think(observation: Observation): ThinkingResult {
        const warnings: string[] = [];
        let strategy: ThinkingResult['strategy'] = 'direct-response';
        let adjustedConfidence = observation.confidence;

        // Check for vague/unclear messages
        const isVague = VAGUE_MESSAGE_PATTERNS.some(p => p.test(observation.userMessage));
        if (isVague) {
            strategy = 'ask-clarification';
            adjustedConfidence *= 0.6;
            warnings.push('Message is vague — consider asking for clarification');
        }

        // Check for complex tasks
        const isComplex = COMPLEX_TASK_PATTERNS.some(p => p.test(observation.userMessage));
        if (isComplex && !isVague) {
            strategy = 'step-by-step';
            warnings.push('Complex task detected — break down into steps');
        }

        // Check emotional state
        if (observation.userEmotion === 'frustrated' || observation.emotionIntensity > 0.7) {
            strategy = 'empathetic-response';
            warnings.push('User shows strong emotion — prioritize empathy');
        }

        // Check health/drift
        if (observation.isDrifting || observation.healthScore < 0.4) {
            adjustedConfidence *= 0.8;
            warnings.push('Agent health is low — be extra careful');
        }

        // Low confidence → careful response
        if (adjustedConfidence < 0.4 && strategy === 'direct-response') {
            strategy = 'careful-response';
            warnings.push('Low confidence — express uncertainty transparently');
        }

        // Knowledge gaps
        if (observation.knowledgeGaps.length > 0) {
            adjustedConfidence *= 0.9;
        }

        const reasoning = this.buildThinkingReasoning(observation, strategy, warnings);

        this.currentThinking = {
            strategy,
            reasoning,
            adjustedConfidence: Math.max(0, Math.min(1, adjustedConfidence)),
            warnings,
        };

        return this.currentThinking;
    }

    /**
     * Phase 3: PLAN — Decide concrete action and approach.
     *
     * Translates thinking strategy into an actionable plan with
     * tone guidance and optional prompt modifications.
     */
    plan(thinking: ThinkingResult): Plan {
        let action: Plan['action'] = 'respond';
        let approach: string;
        let toneGuidance: string;
        let prependToPrompt: string | null = null;

        switch (thinking.strategy) {
            case 'ask-clarification':
                action = 'respond'; // We still respond, but with questions
                approach = 'Ask 1-2 targeted clarifying questions before attempting to answer';
                toneGuidance = 'Helpful and patient — avoid making the user feel the message was bad';
                prependToPrompt = '[COGNITIVE NOTE: The message is unclear. Start by asking a brief clarifying question, then provide what help you can.]';
                break;

            case 'step-by-step':
                approach = 'Break the task into numbered steps. Address each systematically.';
                toneGuidance = 'Structured and methodical';
                prependToPrompt = '[COGNITIVE NOTE: Complex task detected. Use a step-by-step approach. Be thorough but organized.]';
                break;

            case 'empathetic-response':
                approach = 'Acknowledge the user\'s feelings first, then address their request';
                toneGuidance = 'Warm, understanding, supportive — avoid being dismissive';
                prependToPrompt = '[COGNITIVE NOTE: User shows emotional signals. Acknowledge their state before diving into the solution.]';
                break;

            case 'careful-response':
                approach = 'Be transparent about uncertainty. Provide best-effort answer with caveats.';
                toneGuidance = 'Honest and humble — express what you know and what you don\'t';
                prependToPrompt = '[COGNITIVE NOTE: Confidence is low for this topic. Be honest about uncertainty. Qualify statements appropriately.]';
                break;

            case 'direct-response':
            default:
                approach = 'Respond directly and confidently';
                toneGuidance = 'Clear and helpful';
                break;
        }

        // Add warnings to prompt if critical
        if (thinking.warnings.length > 0 && !prependToPrompt) {
            const warningText = thinking.warnings.map(w => `- ${w}`).join('\n');
            prependToPrompt = `[COGNITIVE WARNINGS:\n${warningText}]`;
        }

        this.currentPlan = { action, approach, toneGuidance, prependToPrompt };
        return this.currentPlan;
    }

    /**
     * Phase 5: LEARN — Record outcomes and extract lessons.
     *
     * Called after the LLM response. Analyzes the interaction result
     * and updates internal models.
     */
    learn(quality: number, success: boolean): LearningOutcome {
        const lessonsLearned: string[] = [];

        // Extract lessons from current cycle
        if (this.currentThinking) {
            if (this.currentThinking.strategy === 'ask-clarification' && success) {
                lessonsLearned.push('Asking clarification for vague messages leads to better outcomes');
            }
            if (this.currentThinking.strategy === 'empathetic-response' && success) {
                lessonsLearned.push('Empathetic approach worked well for emotional user');
            }
            if (!success && this.currentThinking.adjustedConfidence > 0.7) {
                lessonsLearned.push('Overconfident on this task — calibrate confidence down for similar tasks');
            }
            if (success && this.currentThinking.adjustedConfidence < 0.4) {
                lessonsLearned.push('Performed better than expected — may have underestimated capabilities');
            }
        }

        // Determine domain progress from recent history
        const recentCycles = this.cycleHistory.slice(-5);
        const recentQualities = recentCycles
            .filter(c => c.learning)
            .map(c => c.learning!.qualityScore);
        const avgRecent = recentQualities.length > 0
            ? recentQualities.reduce((s, q) => s + q, 0) / recentQualities.length
            : 0.5;

        let domainProgress: LearningOutcome['domainProgress'] = 'stable';
        if (quality > avgRecent + 0.1) domainProgress = 'improved';
        else if (quality < avgRecent - 0.1) domainProgress = 'declined';

        const outcome: LearningOutcome = {
            wasSuccessful: success,
            qualityScore: quality,
            lessonsLearned,
            domainProgress,
        };

        // Archive the complete cycle
        if (this.currentCycleId && this.currentObservation && this.currentThinking && this.currentPlan) {
            this.cycleHistory.push({
                cycleId: this.currentCycleId,
                observation: this.currentObservation,
                thinking: this.currentThinking,
                plan: this.currentPlan,
                learning: outcome,
                durationMs: Date.now() - this.cycleStartTime,
            });

            if (this.cycleHistory.length > MAX_CYCLE_HISTORY) {
                this.cycleHistory = this.cycleHistory.slice(-MAX_CYCLE_HISTORY);
            }
        }

        return outcome;
    }

    /**
     * Get the current plan's prompt prepend (for injection into system prompt).
     */
    getPromptPrepend(): string | null {
        return this.currentPlan?.prependToPrompt ?? null;
    }

    /**
     * Get cycle history.
     */
    getCycleHistory(): ReadonlyArray<Readonly<CycleReport>> {
        return this.cycleHistory;
    }

    /**
     * Get the most recent complete cycle report.
     */
    getLastCycle(): CycleReport | null {
        return this.cycleHistory.length > 0
            ? this.cycleHistory[this.cycleHistory.length - 1]
            : null;
    }

    /**
     * Generate a prompt section with cognitive loop awareness.
     */
    toPromptSection(): string | null {
        if (!this.currentThinking || !this.currentPlan) return null;

        // Only inject if there's meaningful guidance
        if (this.currentThinking.strategy === 'direct-response' && this.currentThinking.warnings.length === 0) {
            return null;
        }

        const lines: string[] = ['## Cognitive Loop'];
        lines.push(`**Strategy:** ${this.currentThinking.strategy}`);
        lines.push(`**Approach:** ${this.currentPlan.approach}`);
        lines.push(`**Tone:** ${this.currentPlan.toneGuidance}`);

        if (this.currentThinking.warnings.length > 0) {
            lines.push(`**Warnings:** ${this.currentThinking.warnings.join('; ')}`);
        }

        // Recent learning context
        const lastCycle = this.getLastCycle();
        if (lastCycle?.learning && lastCycle.learning.lessonsLearned.length > 0) {
            lines.push(`**Recent lesson:** ${lastCycle.learning.lessonsLearned[0]}`);
        }

        return lines.join('\n');
    }

    // ── Private ──────────────────────────────────────────

    private buildThinkingReasoning(
        observation: Observation,
        strategy: ThinkingResult['strategy'],
        warnings: string[],
    ): string {
        const parts: string[] = [];

        parts.push(`Observed: ${observation.taskType || 'general'} task`);
        parts.push(`confidence=${(observation.confidence * 100).toFixed(0)}%`);

        if (observation.userEmotion !== 'neutral') {
            parts.push(`user emotion: ${observation.userEmotion}`);
        }

        parts.push(`→ strategy: ${strategy}`);

        if (warnings.length > 0) {
            parts.push(`(${warnings.length} warning${warnings.length > 1 ? 's' : ''})`);
        }

        return parts.join(', ');
    }
}
