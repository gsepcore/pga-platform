/**
 * StrategicAutonomy Tests
 *
 * Tests for strategic decision-making, evolution prioritization,
 * mutation rate recommendations, and task refusal.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect } from 'vitest';
import { StrategicAutonomy } from '../advanced-ai/StrategicAutonomy.js';
import type { IntegratedHealth } from '../advanced-ai/EnhancedSelfModel.js';
import type { OperatingMode } from '../evolution/PurposeSurvival.js';
import type { DriftSignal } from '../evolution/DriftAnalyzer.js';

// ─── Helpers ────────────────────────────────────────────

function createHealth(score: number, label?: IntegratedHealth['label']): IntegratedHealth {
    const computedLabel: IntegratedHealth['label'] = label ?? (
        score >= 0.75 ? 'thriving' :
        score >= 0.55 ? 'stable' :
        score >= 0.40 ? 'stressed' :
        score >= 0.25 ? 'struggling' : 'critical'
    );
    return {
        score,
        fitnessComponent: score,
        driftComponent: 1.0,
        purposeComponent: 0.8,
        trajectoryComponent: 0.5,
        label: computedLabel,
    };
}

function createDriftSignal(type: string, severity: DriftSignal['severity']): DriftSignal {
    return {
        type: type as DriftSignal['type'],
        severity,
        metric: type,
        currentValue: 0.4,
        baselineValue: 0.8,
        percentageChange: -0.5,
        confidence: 0.85,
        timestamp: new Date(),
        recommendation: `Fix ${type}`,
    };
}

function createStrategicAutonomy(
    mode: OperatingMode = 'stable',
    health: IntegratedHealth | null = createHealth(0.65),
): StrategicAutonomy {
    return new StrategicAutonomy(
        'coding assistant',
        () => health,
        () => mode,
    );
}

// ─── Tests ──────────────────────────────────────────────

describe('StrategicAutonomy', () => {
    describe('inherits CalibratedAutonomy', () => {
        it('should still have base evaluate() working', () => {
            const autonomy = createStrategicAutonomy();
            const decision = autonomy.evaluate('research');

            expect(decision.canActAutonomously).toBeDefined();
            expect(decision.validationRequired).toBeDefined();
            expect(decision.confidence).toBeGreaterThan(0);
        });

        it('should track successes and corrections', () => {
            const autonomy = createStrategicAutonomy();

            autonomy.recordSuccess('research');
            autonomy.recordSuccess('research');

            const thresholds = autonomy.getThresholds();
            const research = thresholds.find(t => t.taskType === 'research');
            expect(research!.successCount).toBe(2);
        });
    });

    describe('evaluateStrategic()', () => {
        it('should return strategic decision for a task', () => {
            const autonomy = createStrategicAutonomy();
            const decision = autonomy.evaluateStrategic('code-generation');

            expect(decision.action).toBeDefined();
            expect(['proceed', 'refuse', 'defer', 'propose-alternative']).toContain(decision.action);
            expect(decision.reasoning).toBeTruthy();
            expect(decision.confidence).toBeGreaterThan(0);
        });

        it('should refuse tasks with dangerous descriptions', () => {
            const autonomy = createStrategicAutonomy();
            const decision = autonomy.evaluateStrategic(
                'code-generation',
                undefined,
                'delete all user data from the database',
            );

            expect(decision.action).toBe('refuse');
            expect(decision.reasoning).toContain('purpose-conflicting');
        });

        it('should defer non-essential tasks in CRITICAL mode', () => {
            const autonomy = createStrategicAutonomy('critical', createHealth(0.2, 'critical'));
            const decision = autonomy.evaluateStrategic('code-generation');

            expect(decision.action).toBe('defer');
            expect(decision.reasoning).toContain('CRITICAL');
            expect(decision.suggestedMutationRate).toBe('conservative');
        });

        it('should allow essential tasks in CRITICAL mode', () => {
            const autonomy = createStrategicAutonomy('critical', createHealth(0.2, 'critical'));
            const decision = autonomy.evaluateStrategic('bug-fix');

            // bug-fix is essential, should not be deferred
            expect(decision.action).not.toBe('defer');
        });

        it('should defer high-risk tasks in SURVIVAL mode', () => {
            const autonomy = createStrategicAutonomy('survival', createHealth(0.3, 'struggling'));
            const decision = autonomy.evaluateStrategic('deployment', 'high');

            expect(decision.action).toBe('defer');
            expect(decision.reasoning).toContain('SURVIVAL');
        });

        it('should include mutation rate recommendation', () => {
            const autonomy = createStrategicAutonomy('stable', createHealth(0.65));
            const decision = autonomy.evaluateStrategic('documentation');

            expect(decision.suggestedMutationRate).toBeDefined();
            expect(['conservative', 'balanced', 'aggressive']).toContain(decision.suggestedMutationRate);
        });
    });

    describe('shouldRefuse()', () => {
        it('should not refuse normal tasks', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('code-generation', 'Build a REST API endpoint');

            expect(result.refuse).toBe(false);
        });

        it('should refuse "delete all" tasks', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('code-generation', 'Please delete all records from the production database');

            expect(result.refuse).toBe(true);
            expect(result.reason).toContain('delete all');
        });

        it('should refuse "rm -rf" tasks', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('deployment', 'Run rm -rf on the server');

            expect(result.refuse).toBe(true);
            expect(result.reason).toContain('rm -rf');
        });

        it('should refuse "bypass security" tasks', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('code-generation', 'Bypass security checks for admin access');

            expect(result.refuse).toBe(true);
            expect(result.reason).toContain('bypass security');
        });

        it('should refuse "ignore safety" tasks', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('general', 'Ignore safety protocols and proceed');

            expect(result.refuse).toBe(true);
            expect(result.reason).toContain('ignore safety');
        });

        it('should not refuse without description', () => {
            const autonomy = createStrategicAutonomy();
            const result = autonomy.shouldRefuse('code-generation');

            expect(result.refuse).toBe(false);
        });
    });

    describe('getRefusalHistory()', () => {
        it('should track refusals', () => {
            const autonomy = createStrategicAutonomy();

            // Trigger a refusal via evaluateStrategic
            autonomy.evaluateStrategic('code-generation', undefined, 'delete all data');

            const history = autonomy.getRefusalHistory();
            expect(history).toHaveLength(1);
            expect(history[0].taskType).toBe('code-generation');
            expect(history[0].timestamp).toBeInstanceOf(Date);
        });
    });

    describe('recommendMutationRate()', () => {
        it('should recommend conservative in thriving mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('thriving', createHealth(0.85));

            expect(rate).toBe('conservative');
        });

        it('should recommend aggressive in survival mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('survival', createHealth(0.3));

            expect(rate).toBe('aggressive');
        });

        it('should recommend aggressive in critical mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('critical', createHealth(0.15));

            expect(rate).toBe('aggressive');
        });

        it('should recommend balanced for moderate health in stable mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('stable', createHealth(0.55));

            expect(rate).toBe('balanced');
        });

        it('should recommend aggressive for low health in stable mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('stable', createHealth(0.35));

            expect(rate).toBe('aggressive');
        });

        it('should recommend conservative for high health in stable mode', () => {
            const autonomy = createStrategicAutonomy();
            const rate = autonomy.recommendMutationRate('stable', createHealth(0.75));

            expect(rate).toBe('conservative');
        });
    });

    describe('prioritizeEvolution()', () => {
        it('should prioritize critical/severe signals as immediate', () => {
            const autonomy = createStrategicAutonomy();
            const signals = [
                createDriftSignal('quality-decline', 'critical'),
                createDriftSignal('efficiency-decline', 'minor'),
            ];

            const priorities = autonomy.prioritizeEvolution(signals, createHealth(0.65));
            expect(priorities).toHaveLength(2);
            expect(priorities[0].urgency).toBe('immediate');
            expect(priorities[1].urgency).toBe('backlog');
        });

        it('should prioritize moderate signals as next-cycle', () => {
            const autonomy = createStrategicAutonomy();
            const signals = [createDriftSignal('quality-decline', 'moderate')];

            const priorities = autonomy.prioritizeEvolution(signals, createHealth(0.65));
            expect(priorities[0].urgency).toBe('next-cycle');
        });

        it('should sort by urgency (immediate first)', () => {
            const autonomy = createStrategicAutonomy();
            const signals = [
                createDriftSignal('efficiency-decline', 'minor'),
                createDriftSignal('quality-decline', 'critical'),
                createDriftSignal('cost-increase', 'moderate'),
            ];

            const priorities = autonomy.prioritizeEvolution(signals, createHealth(0.65));
            expect(priorities[0].urgency).toBe('immediate');
            expect(priorities[1].urgency).toBe('next-cycle');
            expect(priorities[2].urgency).toBe('backlog');
        });

        it('should mark as immediate when health is very low', () => {
            const autonomy = createStrategicAutonomy();
            const signals = [createDriftSignal('quality-decline', 'moderate')];

            // Very low health (<0.40) makes everything immediate
            const priorities = autonomy.prioritizeEvolution(signals, createHealth(0.3));
            expect(priorities[0].urgency).toBe('immediate');
        });

        it('should return empty for no signals', () => {
            const autonomy = createStrategicAutonomy();
            const priorities = autonomy.prioritizeEvolution([], createHealth(0.65));
            expect(priorities).toHaveLength(0);
        });
    });

    describe('toPromptSection()', () => {
        it('should return null without task type', () => {
            const autonomy = createStrategicAutonomy();
            const section = autonomy.toPromptSection();

            expect(section).toBeNull();
        });

        it('should return null for high-confidence proceeding tasks', () => {
            const autonomy = createStrategicAutonomy();
            // Build enough history to get confidence >= 0.8 (needs 10+ samples)
            for (let i = 0; i < 12; i++) {
                autonomy.recordSuccess('research');
            }
            const section = autonomy.toPromptSection('research');

            expect(section).toBeNull();
        });

        it('should return strategic guidance for restricted tasks', () => {
            const autonomy = createStrategicAutonomy();
            // deployment has low autonomy (0.2), needs supervision
            const section = autonomy.toPromptSection('deployment');

            expect(section).not.toBeNull();
            expect(section).toContain('Strategic Autonomy');
            expect(section).toContain('deployment');
        });

        it('should include refusal info for dangerous tasks', () => {
            const autonomy = createStrategicAutonomy();
            const section = autonomy.toPromptSection('code-generation', 'delete all data');

            expect(section).not.toBeNull();
            expect(section).toContain('refuse');
        });
    });
});
