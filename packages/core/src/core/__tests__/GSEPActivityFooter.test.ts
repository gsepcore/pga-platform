/**
 * GSEPActivityFooter Tests
 *
 * Tests for all 4 visibility modes and edge cases.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { describe, it, expect } from 'vitest';
import { GSEPActivityFooter, type GSEPActivity } from '../GSEPActivityFooter.js';

function createActivity(overrides: Partial<GSEPActivity> = {}): GSEPActivity {
    return {
        learningEventsCount: 1,
        driftDetected: false,
        evolutionTriggered: false,
        healthLabel: 'stable',
        healthScore: 0.87,
        interactionNumber: 43,
        ...overrides,
    };
}

describe('GSEPActivityFooter', () => {
    const footer = new GSEPActivityFooter();

    // ─── Silent Mode ─────────────────────────────────────

    it('returns empty string for silent mode', () => {
        expect(footer.format(createActivity(), 'silent')).toBe('');
    });

    // ─── Metadata-Only Mode ──────────────────────────────

    it('returns empty string for metadata-only mode', () => {
        expect(footer.format(createActivity(), 'metadata-only')).toBe('');
    });

    // ─── Always Mode ─────────────────────────────────────

    it('formats full footer in always mode', () => {
        const result = footer.format(createActivity(), 'always');
        expect(result).toContain('🧬 **GSEP:**');
        expect(result).toContain('Learned 1 new preference');
        expect(result).toContain('stable');
        expect(result).toContain('87%');
        expect(result).toContain('#43');
    });

    it('shows plural learning events', () => {
        const result = footer.format(createActivity({ learningEventsCount: 3 }), 'always');
        expect(result).toContain('Learned 3 new preferences');
    });

    it('shows drift detection', () => {
        const result = footer.format(createActivity({ driftDetected: true }), 'always');
        expect(result).toContain('Drift detected');
        expect(result).toContain('self-correcting');
    });

    it('shows evolution triggered', () => {
        const result = footer.format(createActivity({ evolutionTriggered: true }), 'always');
        expect(result).toContain('Evolution cycle ran');
    });

    it('omits learning when count is 0', () => {
        const result = footer.format(createActivity({ learningEventsCount: 0 }), 'always');
        expect(result).not.toContain('Learned');
        expect(result).toContain('Health');
    });

    it('shows all events combined', () => {
        const result = footer.format(createActivity({
            learningEventsCount: 2,
            driftDetected: true,
            evolutionTriggered: true,
        }), 'always');
        expect(result).toContain('Learned 2 new preferences');
        expect(result).toContain('Drift detected');
        expect(result).toContain('Evolution cycle ran');
        expect(result).toContain('stable');
    });

    // ─── Subtle Mode ─────────────────────────────────────

    it('formats compact footer in subtle mode', () => {
        const result = footer.format(createActivity(), 'subtle');
        expect(result).toContain('🧬');
        expect(result).toContain('+1 learning');
        expect(result).toContain('stable');
        expect(result).not.toContain('**GSEP:**');
    });

    it('shows drift in subtle mode', () => {
        const result = footer.format(createActivity({ driftDetected: true }), 'subtle');
        expect(result).toContain('drift');
    });

    it('shows evolved in subtle mode', () => {
        const result = footer.format(createActivity({ evolutionTriggered: true }), 'subtle');
        expect(result).toContain('evolved');
    });

    it('omits learning in subtle mode when count is 0', () => {
        const result = footer.format(createActivity({ learningEventsCount: 0 }), 'subtle');
        expect(result).not.toContain('learning');
        expect(result).toContain('stable');
    });

    // ─── Footer Format ───────────────────────────────────

    it('starts with separator in always mode', () => {
        const result = footer.format(createActivity(), 'always');
        expect(result).toMatch(/^\n\n---\n/);
    });

    it('starts with separator in subtle mode', () => {
        const result = footer.format(createActivity(), 'subtle');
        expect(result).toMatch(/^\n\n---\n/);
    });
});
