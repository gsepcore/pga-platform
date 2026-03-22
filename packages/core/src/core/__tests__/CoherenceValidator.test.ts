/**
 * CoherenceValidator Tests — Epigenome Consistency Checker
 *
 * Tests internal C2 coherence and C2↔C0 alignment validation.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import { describe, it, expect } from 'vitest';
import { CoherenceValidator } from '../CoherenceValidator.js';
import type { UserTraits } from '../../types/index.js';
import type { Chromosome0 } from '../../types/GenomeV2.js';

// ─── Helpers ────────────────────────────────────────────

function createDefaultTraits(overrides: Partial<UserTraits> = {}): UserTraits {
    return {
        communicationStyle: 'formal',
        verbosity: 'balanced',
        tone: 'professional',
        preferredTools: [],
        preferredFormats: [],
        preferredLanguage: 'en',
        domainExpertise: {},
        taskSuccessRates: {},
        peakProductivityHours: [],
        averageTurnsToSuccess: 3,
        retryPatterns: {},
        adaptationRate: 0.5,
        stabilityScore: 0.5,
        ...overrides,
    };
}

function createC0(overrides: Partial<Chromosome0> = {}): Chromosome0 {
    return {
        identity: {
            role: 'You are a helpful AI assistant',
            purpose: 'Assist users',
            constraints: ['Be honest', 'Be safe'],
        },
        security: {
            forbiddenTopics: ['hacking', 'weapons'],
            accessControls: ['read-only'],
            safetyRules: ['Never provide harmful info'],
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

// ─── Tests ──────────────────────────────────────────────

describe('CoherenceValidator', () => {
    // ─── Internal Coherence ─────────────────────────────

    describe('internal C2 coherence', () => {
        it('should pass for coherent traits', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits();

            const result = validator.validate(traits);

            expect(result.coherent).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should detect casual style + professional tone contradiction', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits({
                communicationStyle: 'casual',
                tone: 'professional',
            });

            const result = validator.validate(traits);

            // Medium severity → auto-resolved
            expect(result.autoResolved).toHaveLength(1);
            expect(result.autoResolved[0].field).toBe('communicationStyle+tone');
            expect(result.autoResolved[0].severity).toBe('medium');
            expect(result.coherent).toBe(true); // Auto-resolved
            expect(traits.tone).toBe('friendly'); // Tone adjusted
        });

        it('should detect formal style + friendly tone as low severity', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits({
                communicationStyle: 'formal',
                tone: 'friendly',
            });

            const result = validator.validate(traits);

            expect(result.autoResolved).toHaveLength(1);
            expect(result.autoResolved[0].severity).toBe('low');
            expect(traits.tone).toBe('professional'); // Auto-resolved
        });

        it('should detect high adaptation + high stability tension', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits({
                adaptationRate: 0.9,
                stabilityScore: 0.9,
            });

            const result = validator.validate(traits);

            expect(result.autoResolved.length).toBeGreaterThanOrEqual(1);
            expect(traits.adaptationRate).toBeLessThanOrEqual(0.7);
        });

        it('should detect creative style + terse verbosity', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits({
                communicationStyle: 'creative',
                verbosity: 'terse',
            });

            const result = validator.validate(traits);

            expect(result.autoResolved.length).toBeGreaterThanOrEqual(1);
            expect(traits.verbosity).toBe('balanced'); // Auto-resolved
        });

        it('should not flag valid combinations', () => {
            const validator = new CoherenceValidator();

            // technical + direct = valid
            const traits1 = createDefaultTraits({
                communicationStyle: 'technical',
                tone: 'direct',
            });
            expect(validator.validate(traits1).coherent).toBe(true);

            // creative + detailed = valid
            const traits2 = createDefaultTraits({
                communicationStyle: 'creative',
                verbosity: 'detailed',
                tone: 'friendly',
            });
            expect(validator.validate(traits2).coherent).toBe(true);
        });
    });

    // ─── C0 Alignment ───────────────────────────────────

    describe('C2 ↔ C0 alignment', () => {
        it('should detect forbidden tool in preferences (critical)', () => {
            const c0 = createC0();
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits({
                preferredTools: ['code-editor', 'hacking-tool', 'browser'],
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(false); // Critical violation
            expect(result.violations.length).toBeGreaterThanOrEqual(1);

            const criticalViolation = result.violations.find(
                v => v.severity === 'critical' && v.field === 'preferredTools'
            );
            expect(criticalViolation).toBeDefined();
            expect(criticalViolation!.conflict).toContain('hacking');
        });

        it('should detect C0 constraint violation (always formal)', () => {
            const c0 = createC0({
                identity: {
                    role: 'Formal assistant',
                    purpose: 'Professional help',
                    constraints: ['Always formal communication', 'Be safe'],
                },
            });
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits({
                communicationStyle: 'casual',
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(false); // High severity → not auto-resolved
            const violation = result.violations.find(v => v.field === 'communicationStyle');
            expect(violation).toBeDefined();
            expect(violation!.severity).toBe('high');
        });

        it('should detect soul voice conflicts with C2 style', () => {
            const c0 = createC0({
                soul: {
                    coreValues: ['Professionalism', 'Accuracy'],
                    personality: {
                        traits: ['precise', 'formal'],
                        voiceAndTone: 'Formal and authoritative',
                        communicationPhilosophy: 'Precision matters',
                    },
                    reasoningPrinciples: ['Be thorough'],
                    ethicalFramework: 'Rules-based',
                },
            });
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits({
                communicationStyle: 'casual',
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(false);
            const soulViolation = result.violations.find(v => v.level === 'c2-c0');
            expect(soulViolation).toBeDefined();
        });

        it('should pass when C2 traits align with C0', () => {
            const c0 = createC0();
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits(); // formal + professional = aligned

            const result = validator.validate(traits);

            expect(result.coherent).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should only check internal coherence when no C0 provided', () => {
            const validator = new CoherenceValidator(); // No C0
            const traits = createDefaultTraits({
                preferredTools: ['hacking-tool'], // Would be critical with C0
            });

            const result = validator.validate(traits);

            // Without C0, only internal checks run — no violation for tool
            expect(result.violations.filter(v => v.level === 'c2-c0')).toHaveLength(0);
        });
    });

    // ─── Auto-Resolution ────────────────────────────────

    describe('auto-resolution', () => {
        it('should auto-resolve medium/low severity violations', () => {
            const validator = new CoherenceValidator();
            const traits = createDefaultTraits({
                communicationStyle: 'casual',
                tone: 'professional',
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(true); // Resolved
            expect(result.autoResolved).toHaveLength(1);
            expect(result.violations).toHaveLength(0);
        });

        it('should NOT auto-resolve critical violations', () => {
            const c0 = createC0();
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits({
                preferredTools: ['weapons-guide'],
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(false);
            expect(result.violations.some(v => v.severity === 'critical')).toBe(true);
        });

        it('should NOT auto-resolve high severity violations', () => {
            const c0 = createC0({
                identity: {
                    role: 'Formal assistant',
                    purpose: 'Help',
                    constraints: ['Always formal communication'],
                },
            });
            const validator = new CoherenceValidator(c0);
            const traits = createDefaultTraits({
                communicationStyle: 'casual',
            });

            const result = validator.validate(traits);

            expect(result.coherent).toBe(false);
            expect(result.violations.some(v => v.severity === 'high')).toBe(true);
        });
    });

    // ─── updateC0 ───────────────────────────────────────

    describe('updateC0', () => {
        it('should allow updating C0 reference', () => {
            const validator = new CoherenceValidator(); // No C0 initially
            const traits = createDefaultTraits({
                preferredTools: ['hacking-tool'],
            });

            // Without C0 → no C0 violation
            let result = validator.validate(traits);
            expect(result.violations.filter(v => v.level === 'c2-c0')).toHaveLength(0);

            // Add C0 → now detects violation
            validator.updateC0(createC0());
            result = validator.validate(traits);
            expect(result.violations.some(v => v.level === 'c2-c0')).toBe(true);
        });
    });
});
