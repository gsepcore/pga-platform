/**
 * ConfigPresets — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
    PRESET_MINIMAL,
    PRESET_STANDARD,
    PRESET_CONSCIOUS,
    PRESET_FULL,
    getPreset,
    withPreset,
    getAvailablePresets,
    countEnabledFlags,
} from '../presets/ConfigPresets.js';
import type { AutonomousConfig } from '../types/index.js';

describe('ConfigPresets', () => {
    // ── Preset Constants ──────────────────────────────────

    describe('PRESET_MINIMAL', () => {
        it('enables exactly 4 intelligence flags', () => {
            expect(PRESET_MINIMAL.enableSelfModel).toBe(true);
            expect(PRESET_MINIMAL.enablePatternMemory).toBe(true);
            expect(PRESET_MINIMAL.enableMetacognition).toBe(true);
            expect(PRESET_MINIMAL.enableEmotionalModel).toBe(true);
            expect(countEnabledFlags(PRESET_MINIMAL as AutonomousConfig)).toBe(4);
        });

        it('does NOT enable consciousness systems', () => {
            expect(PRESET_MINIMAL.enableStateVector).toBeUndefined();
            expect(PRESET_MINIMAL.enableAutonomousLoop).toBeUndefined();
            expect(PRESET_MINIMAL.enableGrowthJournal).toBeUndefined();
            expect(PRESET_MINIMAL.enableCuriosityEngine).toBeUndefined();
        });
    });

    describe('PRESET_STANDARD', () => {
        it('includes all MINIMAL flags plus extras', () => {
            expect(PRESET_STANDARD.enableSelfModel).toBe(true);
            expect(PRESET_STANDARD.enablePatternMemory).toBe(true);
            expect(PRESET_STANDARD.enableThinkingEngine).toBe(true);
            expect(PRESET_STANDARD.enableAnalyticMemory).toBe(true);
            expect(PRESET_STANDARD.enableModelRouting).toBe(true);
        });

        it('enables continuous evolution', () => {
            expect(PRESET_STANDARD.continuousEvolution).toBe(true);
            expect(PRESET_STANDARD.autoMutateOnDrift).toBe(true);
            expect(PRESET_STANDARD.autoCompressOnPressure).toBe(true);
        });

        it('has more flags than MINIMAL', () => {
            expect(countEnabledFlags(PRESET_STANDARD as AutonomousConfig))
                .toBeGreaterThan(countEnabledFlags(PRESET_MINIMAL as AutonomousConfig));
        });
    });

    describe('PRESET_CONSCIOUS', () => {
        it('enables consciousness systems', () => {
            expect(PRESET_CONSCIOUS.enableStateVector).toBe(true);
            expect(PRESET_CONSCIOUS.enableAutonomousLoop).toBe(true);
            expect(PRESET_CONSCIOUS.enableGrowthJournal).toBe(true);
            expect(PRESET_CONSCIOUS.enableCuriosityEngine).toBe(true);
        });

        it('enables self-awareness layer', () => {
            expect(PRESET_CONSCIOUS.enableEnhancedSelfModel).toBe(true);
            expect(PRESET_CONSCIOUS.enablePurposeSurvival).toBe(true);
            expect(PRESET_CONSCIOUS.enableStrategicAutonomy).toBe(true);
        });

        it('has more flags than STANDARD', () => {
            expect(countEnabledFlags(PRESET_CONSCIOUS as AutonomousConfig))
                .toBeGreaterThan(countEnabledFlags(PRESET_STANDARD as AutonomousConfig));
        });
    });

    describe('PRESET_FULL', () => {
        it('enables everything including swarm', () => {
            expect(PRESET_FULL.enableSwarm).toBe(true);
            expect(PRESET_FULL.genesisBootstrap).toBe(true);
            expect(PRESET_FULL.autoPublishThreshold).toBe(0.85);
            expect(PRESET_FULL.autoImportOnDrift).toBe('severe');
        });

        it('has maximum flag count (21 boolean flags)', () => {
            expect(countEnabledFlags(PRESET_FULL as AutonomousConfig)).toBe(21);
        });
    });

    // ── Helper Functions ──────────────────────────────────

    describe('getPreset()', () => {
        it('returns a copy for each preset name', () => {
            const names = ['minimal', 'standard', 'conscious', 'full'] as const;
            for (const name of names) {
                const preset = getPreset(name);
                expect(preset).toBeDefined();
                expect(typeof preset).toBe('object');
            }
        });

        it('returns a new object each time (not shared reference)', () => {
            const a = getPreset('minimal');
            const b = getPreset('minimal');
            expect(a).not.toBe(b);
            expect(a).toEqual(b);
        });
    });

    describe('withPreset()', () => {
        it('applies overrides on top of preset', () => {
            const config = withPreset('minimal', { enableSwarm: true });
            expect(config.enableSelfModel).toBe(true); // from preset
            expect(config.enableSwarm).toBe(true); // from override
        });

        it('overrides can disable preset defaults', () => {
            const config = withPreset('standard', { enableModelRouting: false });
            expect(config.enableModelRouting).toBe(false);
        });

        it('overrides can change numeric values', () => {
            const config = withPreset('full', { evolveEveryN: 5, maxPatterns: 100 });
            expect(config.evolveEveryN).toBe(5);
            expect(config.maxPatterns).toBe(100);
        });
    });

    describe('getAvailablePresets()', () => {
        it('returns all 4 preset names', () => {
            const names = getAvailablePresets();
            expect(names).toEqual(['minimal', 'standard', 'conscious', 'full']);
        });
    });

    describe('countEnabledFlags()', () => {
        it('returns 0 for empty config', () => {
            expect(countEnabledFlags({})).toBe(0);
        });

        it('counts only boolean true flags', () => {
            const config: AutonomousConfig = {
                enableSelfModel: true,
                enablePatternMemory: false, // false should not count
                evolveEveryN: 10, // numeric should not count
            };
            expect(countEnabledFlags(config)).toBe(1);
        });

        it('handles undefined gracefully', () => {
            const config: AutonomousConfig = {
                enableSelfModel: true,
                enablePatternMemory: undefined,
            };
            expect(countEnabledFlags(config)).toBe(1);
        });
    });

    // ── Preset Hierarchy ──────────────────────────────────

    describe('Preset hierarchy', () => {
        it('flag counts increase monotonically: minimal < standard < conscious < full', () => {
            const counts = {
                minimal: countEnabledFlags(getPreset('minimal')),
                standard: countEnabledFlags(getPreset('standard')),
                conscious: countEnabledFlags(getPreset('conscious')),
                full: countEnabledFlags(getPreset('full')),
            };
            expect(counts.minimal).toBeLessThan(counts.standard);
            expect(counts.standard).toBeLessThan(counts.conscious);
            expect(counts.conscious).toBeLessThan(counts.full);
        });
    });
});
