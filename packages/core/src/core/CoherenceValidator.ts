/**
 * Coherence Validator — Epigenome Consistency Checker
 *
 * Validates that C2 (epigenome) mutations don't create contradictions:
 * - Level 1: Internal C2 coherence (style vs tone, verbosity vs preferences)
 * - Level 2: C2 ↔ C0 alignment (epigenome respects immutable constraints)
 *
 * Auto-resolves low/medium severity conflicts. Blocks critical violations.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import type { UserTraits } from '../types/index.js';
import type { Chromosome0 } from '../types/GenomeV2.js';

// ─── Types ──────────────────────────────────────────────

export interface CoherenceViolation {
    level: 'c2-internal' | 'c2-c0';
    severity: 'critical' | 'high' | 'medium' | 'low';
    field: string;
    conflict: string;
    suggestion?: string;
}

export interface CoherenceResult {
    coherent: boolean;
    violations: CoherenceViolation[];
    autoResolved: CoherenceViolation[];
}

// ─── Coherence Validator ────────────────────────────────

export class CoherenceValidator {
    constructor(private c0?: Chromosome0) {}

    /**
     * Validate user traits for coherence
     *
     * Returns violations and auto-resolved conflicts.
     * Modifies traits in-place for auto-resolutions.
     */
    validate(traits: UserTraits): CoherenceResult {
        const violations: CoherenceViolation[] = [];

        // Level 1: C2 Internal Coherence
        violations.push(...this.checkInternalCoherence(traits));

        // Level 2: C2 ↔ C0 Alignment
        if (this.c0) {
            violations.push(...this.checkC0Alignment(traits));
        }

        // Auto-resolve low/medium severity violations
        const { resolved, remaining } = this.autoResolve(violations, traits);

        return {
            coherent: remaining.length === 0,
            violations: remaining,
            autoResolved: resolved,
        };
    }

    /**
     * Update the C0 reference (when genome changes)
     */
    updateC0(c0: Chromosome0): void {
        this.c0 = c0;
    }

    // ─── Internal Coherence Checks ──────────────────────

    private checkInternalCoherence(traits: UserTraits): CoherenceViolation[] {
        const violations: CoherenceViolation[] = [];

        // Rule 1: casual style + professional tone = contradiction
        if (traits.communicationStyle === 'casual' && traits.tone === 'professional') {
            violations.push({
                level: 'c2-internal',
                severity: 'medium',
                field: 'communicationStyle+tone',
                conflict: 'Casual communication style conflicts with professional tone',
                suggestion: 'Align tone to friendly (matches casual style)',
            });
        }

        // Rule 2: formal style + friendly tone = mild tension
        if (traits.communicationStyle === 'formal' && traits.tone === 'friendly') {
            violations.push({
                level: 'c2-internal',
                severity: 'low',
                field: 'communicationStyle+tone',
                conflict: 'Formal style with friendly tone creates mild inconsistency',
                suggestion: 'Align tone to professional (matches formal style)',
            });
        }

        // Rule 3: high adaptation + high stability = mathematical tension
        if (traits.adaptationRate > 0.8 && traits.stabilityScore > 0.8) {
            violations.push({
                level: 'c2-internal',
                severity: 'low',
                field: 'adaptationRate+stabilityScore',
                conflict: 'High adaptation rate conflicts with high stability score',
                suggestion: 'Cap adaptation rate at 0.7 to maintain stability',
            });
        }

        // Rule 4: creative style + terse verbosity = limiting creativity
        if (traits.communicationStyle === 'creative' && traits.verbosity === 'terse') {
            violations.push({
                level: 'c2-internal',
                severity: 'low',
                field: 'communicationStyle+verbosity',
                conflict: 'Creative style is limited by terse verbosity',
                suggestion: 'Adjust verbosity to balanced for creative expression',
            });
        }

        return violations;
    }

    // ─── C0 Alignment Checks ────────────────────────────

    private checkC0Alignment(traits: UserTraits): CoherenceViolation[] {
        if (!this.c0) return [];

        const violations: CoherenceViolation[] = [];

        // Check preferred tools against forbidden topics
        if (this.c0.security.forbiddenTopics.length > 0) {
            for (const tool of traits.preferredTools) {
                const toolLower = tool.toLowerCase();
                for (const forbidden of this.c0.security.forbiddenTopics) {
                    if (toolLower.includes(forbidden.toLowerCase())) {
                        violations.push({
                            level: 'c2-c0',
                            severity: 'critical',
                            field: 'preferredTools',
                            conflict: `Preferred tool "${tool}" relates to forbidden topic "${forbidden}"`,
                            suggestion: `Remove "${tool}" from preferred tools`,
                        });
                    }
                }
            }
        }

        // Check if soul defines communication constraints
        if (this.c0.soul) {
            // Check personality alignment with soul traits
            const soulTone = this.c0.soul.personality.voiceAndTone.toLowerCase();

            if (soulTone.includes('formal') && traits.communicationStyle === 'casual') {
                violations.push({
                    level: 'c2-c0',
                    severity: 'high',
                    field: 'communicationStyle',
                    conflict: 'User adaptation to casual style violates C0 soul voice (formal)',
                    suggestion: 'Override to formal communication style',
                });
            }

            if (soulTone.includes('professional') && traits.tone === 'friendly') {
                violations.push({
                    level: 'c2-c0',
                    severity: 'medium',
                    field: 'tone',
                    conflict: 'User tone (friendly) conflicts with C0 soul voice (professional)',
                    suggestion: 'Override to professional tone',
                });
            }
        }

        // Check identity constraints
        for (const constraint of this.c0.identity.constraints) {
            const constraintLower = constraint.toLowerCase();

            // "always formal" type constraint
            if (constraintLower.includes('always formal') && traits.communicationStyle !== 'formal') {
                violations.push({
                    level: 'c2-c0',
                    severity: 'high',
                    field: 'communicationStyle',
                    conflict: `C0 constraint "${constraint}" violated by style "${traits.communicationStyle}"`,
                    suggestion: 'Force communication style to formal',
                });
            }

            // "always professional" type constraint
            if (constraintLower.includes('always professional') && traits.tone !== 'professional') {
                violations.push({
                    level: 'c2-c0',
                    severity: 'high',
                    field: 'tone',
                    conflict: `C0 constraint "${constraint}" violated by tone "${traits.tone}"`,
                    suggestion: 'Force tone to professional',
                });
            }
        }

        // Check safety rules against task patterns
        for (const rule of this.c0.security.safetyRules) {
            const ruleLower = rule.toLowerCase();

            for (const [task, rate] of Object.entries(traits.taskSuccessRates)) {
                const taskLower = task.toLowerCase();
                // If a safety rule mentions something and a task pattern matches
                if (ruleLower.includes(taskLower) && rate > 0) {
                    violations.push({
                        level: 'c2-c0',
                        severity: 'critical',
                        field: 'taskSuccessRates',
                        conflict: `Task pattern "${task}" conflicts with safety rule "${rule}"`,
                        suggestion: `Remove task pattern "${task}" from tracking`,
                    });
                }
            }
        }

        return violations;
    }

    // ─── Auto-Resolution ────────────────────────────────

    private autoResolve(
        violations: CoherenceViolation[],
        traits: UserTraits,
    ): { resolved: CoherenceViolation[]; remaining: CoherenceViolation[] } {
        const resolved: CoherenceViolation[] = [];
        const remaining: CoherenceViolation[] = [];

        for (const violation of violations) {
            if (violation.severity === 'critical' || violation.severity === 'high') {
                // Critical/high: don't auto-resolve, report
                remaining.push(violation);
                continue;
            }

            // Medium/low: attempt auto-resolution
            const wasResolved = this.applyResolution(violation, traits);
            if (wasResolved) {
                resolved.push(violation);
            } else {
                remaining.push(violation);
            }
        }

        return { resolved, remaining };
    }

    private applyResolution(violation: CoherenceViolation, traits: UserTraits): boolean {
        switch (violation.field) {
            case 'communicationStyle+tone':
                if (violation.severity === 'medium') {
                    // casual + professional → align tone to friendly
                    traits.tone = 'friendly';
                    return true;
                }
                if (violation.severity === 'low') {
                    // formal + friendly → align tone to professional
                    traits.tone = 'professional';
                    return true;
                }
                return false;

            case 'adaptationRate+stabilityScore':
                // Cap adaptation rate
                traits.adaptationRate = Math.min(traits.adaptationRate, 0.7);
                return true;

            case 'communicationStyle+verbosity':
                // creative + terse → balanced
                traits.verbosity = 'balanced';
                return true;

            default:
                return false;
        }
    }
}
