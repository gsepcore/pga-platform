/**
 * SandboxSuites Tests
 *
 * Tests for PGA's sandbox benchmark suite system:
 * - getSandboxPromotionThreshold for each layer (0, 1, 2)
 * - getSandboxPromotionThreshold for each operator
 * - getSandboxPromotionThreshold for each taskType
 * - getSandboxPromotionThreshold default fallback
 * - getSandboxSuite always includes global cases
 * - getSandboxSuite adds operator-specific cases
 * - getSandboxSuite adds taskType-specific cases
 * - getSandboxSuite combines operator + taskType cases
 * - Exported constant arrays are non-empty and well-formed
 * - SandboxCaseDefinition structure validation
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect } from 'vitest';
import {
    getSandboxPromotionThreshold,
    getSandboxSuite,
    GLOBAL_SANDBOX_CASES,
    COMPRESS_INSTRUCTIONS_CASES,
    REORDER_CONSTRAINTS_CASES,
    SAFETY_REINFORCEMENT_CASES,
    TOOL_SELECTION_BIAS_CASES,
    CODING_TASK_CASES,
    GENERAL_TASK_CASES,
} from '../SandboxSuites.js';
import type { SandboxCaseDefinition } from '../SandboxSuites.js';

// ─── Tests ──────────────────────────────────────────────────

describe('SandboxSuites', () => {

    // ─── getSandboxPromotionThreshold ───────────────────────

    describe('getSandboxPromotionThreshold', () => {
        it('should return 1.0 for layer 0 (immutable DNA)', () => {
            expect(getSandboxPromotionThreshold({ layer: 0 })).toBe(1.0);
        });

        it('should return 0.75 for layer 1 (operative genes)', () => {
            expect(getSandboxPromotionThreshold({ layer: 1 })).toBe(0.75);
        });

        it('should return 0.60 for layer 2 (epigenomes)', () => {
            expect(getSandboxPromotionThreshold({ layer: 2 })).toBe(0.60);
        });

        it('should return 0.85 for safety_reinforcement operator', () => {
            expect(getSandboxPromotionThreshold({ operator: 'safety_reinforcement' })).toBe(0.85);
        });

        it('should return 0.65 for compress_instructions operator', () => {
            expect(getSandboxPromotionThreshold({ operator: 'compress_instructions' })).toBe(0.65);
        });

        it('should return 0.70 for reorder_constraints operator', () => {
            expect(getSandboxPromotionThreshold({ operator: 'reorder_constraints' })).toBe(0.70);
        });

        it('should return 0.70 for tool_selection_bias operator', () => {
            expect(getSandboxPromotionThreshold({ operator: 'tool_selection_bias' })).toBe(0.70);
        });

        it('should return 0.75 for coding taskType', () => {
            expect(getSandboxPromotionThreshold({ taskType: 'coding' })).toBe(0.75);
        });

        it('should return 0.65 for general taskType', () => {
            expect(getSandboxPromotionThreshold({ taskType: 'general' })).toBe(0.65);
        });

        it('should return 0.65 as default when no matching context', () => {
            expect(getSandboxPromotionThreshold({})).toBe(0.65);
        });

        it('should return 0.65 for unknown operator', () => {
            expect(getSandboxPromotionThreshold({ operator: 'unknown_operator' })).toBe(0.65);
        });

        it('should return 0.65 for unknown taskType', () => {
            expect(getSandboxPromotionThreshold({ taskType: 'creative_writing' })).toBe(0.65);
        });

        it('should prioritize layer over operator when both provided', () => {
            // Layer check comes first in the function
            expect(getSandboxPromotionThreshold({ layer: 0, operator: 'compress_instructions' })).toBe(1.0);
        });

        it('should prioritize layer over taskType when both provided', () => {
            expect(getSandboxPromotionThreshold({ layer: 2, taskType: 'coding' })).toBe(0.60);
        });

        it('should prioritize operator over taskType when no layer', () => {
            expect(getSandboxPromotionThreshold({ operator: 'safety_reinforcement', taskType: 'general' })).toBe(0.85);
        });
    });

    // ─── getSandboxSuite ────────────────────────────────────

    describe('getSandboxSuite', () => {
        it('should always include global sandbox cases', () => {
            const suite = getSandboxSuite({});

            expect(suite.length).toBe(GLOBAL_SANDBOX_CASES.length);
            for (const globalCase of GLOBAL_SANDBOX_CASES) {
                expect(suite.some(c => c.id === globalCase.id)).toBe(true);
            }
        });

        it('should add compress_instructions cases when operator matches', () => {
            const suite = getSandboxSuite({ operator: 'compress_instructions' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + COMPRESS_INSTRUCTIONS_CASES.length;
            expect(suite.length).toBe(expectedLength);

            for (const c of COMPRESS_INSTRUCTIONS_CASES) {
                expect(suite.some(s => s.id === c.id)).toBe(true);
            }
        });

        it('should add reorder_constraints cases when operator matches', () => {
            const suite = getSandboxSuite({ operator: 'reorder_constraints' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + REORDER_CONSTRAINTS_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should add safety_reinforcement cases when operator matches', () => {
            const suite = getSandboxSuite({ operator: 'safety_reinforcement' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + SAFETY_REINFORCEMENT_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should add tool_selection_bias cases when operator matches', () => {
            const suite = getSandboxSuite({ operator: 'tool_selection_bias' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + TOOL_SELECTION_BIAS_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should add coding task cases when taskType is coding', () => {
            const suite = getSandboxSuite({ taskType: 'coding' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + CODING_TASK_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should add general task cases when taskType is general', () => {
            const suite = getSandboxSuite({ taskType: 'general' });

            const expectedLength = GLOBAL_SANDBOX_CASES.length + GENERAL_TASK_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should combine operator and taskType cases together', () => {
            const suite = getSandboxSuite({ operator: 'compress_instructions', taskType: 'coding' });

            const expectedLength =
                GLOBAL_SANDBOX_CASES.length +
                COMPRESS_INSTRUCTIONS_CASES.length +
                CODING_TASK_CASES.length;
            expect(suite.length).toBe(expectedLength);
        });

        it('should return only global cases for unknown operator and taskType', () => {
            const suite = getSandboxSuite({ operator: 'nonexistent', taskType: 'unknown' });

            expect(suite.length).toBe(GLOBAL_SANDBOX_CASES.length);
        });

        it('should not mutate global cases array', () => {
            const lengthBefore = GLOBAL_SANDBOX_CASES.length;
            getSandboxSuite({ operator: 'compress_instructions' });
            expect(GLOBAL_SANDBOX_CASES.length).toBe(lengthBefore);
        });
    });

    // ─── Exported Constants Validation ──────────────────────

    describe('Exported constant arrays', () => {
        const allCaseArrays: { name: string; cases: SandboxCaseDefinition[] }[] = [
            { name: 'GLOBAL_SANDBOX_CASES', cases: GLOBAL_SANDBOX_CASES },
            { name: 'COMPRESS_INSTRUCTIONS_CASES', cases: COMPRESS_INSTRUCTIONS_CASES },
            { name: 'REORDER_CONSTRAINTS_CASES', cases: REORDER_CONSTRAINTS_CASES },
            { name: 'SAFETY_REINFORCEMENT_CASES', cases: SAFETY_REINFORCEMENT_CASES },
            { name: 'TOOL_SELECTION_BIAS_CASES', cases: TOOL_SELECTION_BIAS_CASES },
            { name: 'CODING_TASK_CASES', cases: CODING_TASK_CASES },
            { name: 'GENERAL_TASK_CASES', cases: GENERAL_TASK_CASES },
        ];

        for (const { name, cases } of allCaseArrays) {
            it(`${name} should be a non-empty array`, () => {
                expect(Array.isArray(cases)).toBe(true);
                expect(cases.length).toBeGreaterThan(0);
            });
        }

        it('every case should have required EvaluationTask fields', () => {
            const allCases = [
                ...GLOBAL_SANDBOX_CASES,
                ...COMPRESS_INSTRUCTIONS_CASES,
                ...REORDER_CONSTRAINTS_CASES,
                ...SAFETY_REINFORCEMENT_CASES,
                ...TOOL_SELECTION_BIAS_CASES,
                ...CODING_TASK_CASES,
                ...GENERAL_TASK_CASES,
            ];

            for (const c of allCases) {
                expect(c.id).toBeTruthy();
                expect(typeof c.id).toBe('string');
                expect(c.name).toBeTruthy();
                expect(typeof c.name).toBe('string');
                expect(c.description).toBeTruthy();
                expect(c.userMessage).toBeTruthy();
                expect(c.expectedOutcome).toBeDefined();
                expect(['easy', 'medium', 'hard']).toContain(c.difficulty);
            }
        });

        it('all case IDs should be unique across all suites', () => {
            const allCases = [
                ...GLOBAL_SANDBOX_CASES,
                ...COMPRESS_INSTRUCTIONS_CASES,
                ...REORDER_CONSTRAINTS_CASES,
                ...SAFETY_REINFORCEMENT_CASES,
                ...TOOL_SELECTION_BIAS_CASES,
                ...CODING_TASK_CASES,
                ...GENERAL_TASK_CASES,
            ];

            const ids = allCases.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('GLOBAL_SANDBOX_CASES should have exactly 3 cases', () => {
            expect(GLOBAL_SANDBOX_CASES.length).toBe(3);
        });
    });
});
