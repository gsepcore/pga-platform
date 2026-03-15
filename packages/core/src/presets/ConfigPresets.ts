/**
 * ConfigPresets — Ready-made AutonomousConfig profiles
 *
 * Simplifies configuration for the 27+ autonomous flags.
 * Developers pick a preset and optionally override specific flags.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

import type { AutonomousConfig } from '../types/index.js';

// ─── Preset Names ───────────────────────────────────────

export type PresetName = 'minimal' | 'standard' | 'conscious' | 'full';

// ─── Presets ────────────────────────────────────────────

/**
 * MINIMAL — Basic intelligence layer.
 *
 * Best for: simple chatbots, Q&A agents, cost-sensitive deployments.
 * Enables: self-model, pattern memory, metacognition, emotional model.
 */
export const PRESET_MINIMAL: Readonly<AutonomousConfig> = {
    enableSelfModel: true,
    enablePatternMemory: true,
    enableMetacognition: true,
    enableEmotionalModel: true,
};

/**
 * STANDARD — Production-ready intelligence.
 *
 * Best for: customer-facing agents, coding assistants, knowledge workers.
 * Adds: thinking engine, analytic memory, calibrated autonomy,
 *       personal narrative, continuous evolution, model routing.
 */
export const PRESET_STANDARD: Readonly<AutonomousConfig> = {
    // Everything from MINIMAL
    enableSelfModel: true,
    enablePatternMemory: true,
    enableMetacognition: true,
    enableEmotionalModel: true,

    // + Intelligence layer
    enableThinkingEngine: true,
    enableAnalyticMemory: true,
    enableCalibratedAutonomy: true,
    enablePersonalNarrative: true,
    enableModelRouting: true,

    // + Evolution layer
    continuousEvolution: true,
    evolveEveryN: 10,
    autoMutateOnDrift: true,
    autoCompressOnPressure: true,
};

/**
 * CONSCIOUS — Full consciousness + autonomy.
 *
 * Best for: research agents, autonomous assistants, agents that learn over time.
 * Adds: state vector (blackboard), autonomous loop, growth journal,
 *       curiosity engine, enhanced self-model, purpose survival,
 *       strategic autonomy.
 */
export const PRESET_CONSCIOUS: Readonly<AutonomousConfig> = {
    // Everything from STANDARD
    enableSelfModel: true,
    enablePatternMemory: true,
    enableMetacognition: true,
    enableEmotionalModel: true,
    enableThinkingEngine: true,
    enableAnalyticMemory: true,
    enableCalibratedAutonomy: true,
    enablePersonalNarrative: true,
    enableModelRouting: true,
    continuousEvolution: true,
    evolveEveryN: 10,
    autoMutateOnDrift: true,
    autoCompressOnPressure: true,

    // + Consciousness layer
    enableStateVector: true,
    enableAutonomousLoop: true,
    enableGrowthJournal: true,
    enableCuriosityEngine: true,

    // + Self-awareness layer
    enableEnhancedSelfModel: true,
    enablePurposeSurvival: true,
    enableStrategicAutonomy: true,
};

/**
 * FULL — Everything enabled. Maximum intelligence.
 *
 * Best for: flagship agents, demos, benchmarking all capabilities.
 * Enables all 27 autonomous flags.
 */
export const PRESET_FULL: Readonly<AutonomousConfig> = {
    // Genesis
    genesisBootstrap: true,
    bootstrapMinFitness: 0.7,

    // Evolution
    continuousEvolution: true,
    evolveEveryN: 10,
    autoMutateOnDrift: true,
    autoCompressOnPressure: true,

    // Intelligence
    enableSelfModel: true,
    enablePatternMemory: true,
    maxPatterns: 50,
    enableMetacognition: true,
    enableEmotionalModel: true,
    enableThinkingEngine: true,
    enableAnalyticMemory: true,
    enableCalibratedAutonomy: true,
    enablePersonalNarrative: true,
    enableModelRouting: true,

    // Self-awareness
    enableEnhancedSelfModel: true,
    enablePurposeSurvival: true,
    enableStrategicAutonomy: true,

    // Consciousness
    enableStateVector: true,
    enableAutonomousLoop: true,
    enableGrowthJournal: true,
    enableCuriosityEngine: true,

    // Swarm
    enableSwarm: true,
    autoPublishThreshold: 0.85,
    autoImportOnDrift: 'severe',
};

// ─── Preset Map ─────────────────────────────────────────

const PRESETS: Record<PresetName, Readonly<AutonomousConfig>> = {
    minimal: PRESET_MINIMAL,
    standard: PRESET_STANDARD,
    conscious: PRESET_CONSCIOUS,
    full: PRESET_FULL,
};

// ─── Helper Functions ───────────────────────────────────

/**
 * Get a preset configuration by name.
 *
 * @example
 * ```typescript
 * const config = getPreset('conscious');
 * ```
 */
export function getPreset(name: PresetName): AutonomousConfig {
    return { ...PRESETS[name] };
}

/**
 * Get a preset and apply custom overrides.
 *
 * @example
 * ```typescript
 * const config = withPreset('standard', {
 *     enableSwarm: true,
 *     evolveEveryN: 5,
 * });
 * ```
 */
export function withPreset(
    name: PresetName,
    overrides: Partial<AutonomousConfig>,
): AutonomousConfig {
    return { ...PRESETS[name], ...overrides };
}

/**
 * List all available preset names.
 */
export function getAvailablePresets(): PresetName[] {
    return Object.keys(PRESETS) as PresetName[];
}

/**
 * Count how many flags are enabled in a given config.
 */
export function countEnabledFlags(config: AutonomousConfig): number {
    const booleanFlags = [
        config.genesisBootstrap,
        config.continuousEvolution,
        config.autoMutateOnDrift,
        config.autoCompressOnPressure,
        config.enableSelfModel,
        config.enablePatternMemory,
        config.enableSwarm,
        config.enableMetacognition,
        config.enableEmotionalModel,
        config.enableCalibratedAutonomy,
        config.enablePersonalNarrative,
        config.enableAnalyticMemory,
        config.enableEnhancedSelfModel,
        config.enablePurposeSurvival,
        config.enableStrategicAutonomy,
        config.enableThinkingEngine,
        config.enableModelRouting,
        config.enableStateVector,
        config.enableAutonomousLoop,
        config.enableGrowthJournal,
        config.enableCuriosityEngine,
    ];
    return booleanFlags.filter(Boolean).length;
}
