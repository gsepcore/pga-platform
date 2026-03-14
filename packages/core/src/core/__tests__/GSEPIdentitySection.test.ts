/**
 * GSEPIdentitySection Tests
 *
 * Tests for all 4 visibility modes, first interaction, and user context.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { describe, it, expect } from 'vitest';
import { GSEPIdentitySection, type GSEPIdentityContext } from '../GSEPIdentitySection.js';

function createContext(overrides: Partial<GSEPIdentityContext> = {}): GSEPIdentityContext {
    return {
        genomeName: 'test-agent',
        version: '1',
        visibility: 'always',
        interactionCount: 10,
        isFirstInteraction: false,
        healthLabel: 'stable',
        healthScore: 0.87,
        fitnessScore: 0.82,
        activeCapabilities: [
            'Adaptive memory — remembers your preferences',
            'Pattern recognition — predicts your needs',
        ],
        ...overrides,
    };
}

describe('GSEPIdentitySection', () => {
    const section = new GSEPIdentitySection();

    // ─── Silent Mode ─────────────────────────────────────

    it('returns empty string for silent mode', () => {
        const result = section.generate(createContext({ visibility: 'silent' }));
        expect(result).toBe('');
    });

    // ─── Metadata-Only Mode ──────────────────────────────

    it('returns empty string for metadata-only mode', () => {
        const result = section.generate(createContext({ visibility: 'metadata-only' }));
        expect(result).toBe('');
    });

    // ─── Always Mode ─────────────────────────────────────

    it('generates full identity for always mode', () => {
        const result = section.generate(createContext({ visibility: 'always' }));
        expect(result).toContain('GSEP Identity');
        expect(result).toContain('Genomic Self-Evolving Prompts');
        expect(result).toContain('Adaptive memory');
        expect(result).toContain('Pattern recognition');
        expect(result).toContain('87%');
        expect(result).toContain('stable');
    });

    it('includes first interaction welcome in always mode', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            isFirstInteraction: true,
        }));
        expect(result).toContain('FIRST INTERACTION');
        expect(result).toContain('GSEP capabilities');
    });

    it('includes user learning summary when provided', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            userLearningSummary: 'Prefers technical, concise responses. Expert in TypeScript.',
        }));
        expect(result).toContain('About this user');
        expect(result).toContain('TypeScript');
    });

    it('includes drift warning when drifting', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            driftStatus: { isDrifting: true, severity: 'moderate' },
        }));
        expect(result).toContain('Performance drift detected');
        expect(result).toContain('moderate');
    });

    it('does not include drift warning when not drifting', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            driftStatus: undefined,
        }));
        expect(result).not.toContain('drift detected');
    });

    it('includes behavior instructions in always mode', () => {
        const result = section.generate(createContext({ visibility: 'always' }));
        expect(result).toContain('How to reference GSEP');
        expect(result).toContain('Do NOT force GSEP mentions');
    });

    // ─── Subtle Mode ─────────────────────────────────────

    it('generates compact identity for subtle mode', () => {
        const result = section.generate(createContext({ visibility: 'subtle' }));
        expect(result).toContain('GSEP Active');
        expect(result).toContain('adaptive intelligence');
        expect(result).toContain('87%');
    });

    it('includes first interaction hint in subtle mode', () => {
        const result = section.generate(createContext({
            visibility: 'subtle',
            isFirstInteraction: true,
        }));
        expect(result).toContain('first interaction');
        expect(result).toContain('adaptive learning');
    });

    it('includes user context in subtle mode', () => {
        const result = section.generate(createContext({
            visibility: 'subtle',
            userLearningSummary: 'Expert in Python',
        }));
        expect(result).toContain('User context');
        expect(result).toContain('Python');
    });

    // ─── Edge Cases ──────────────────────────────────────

    it('handles missing healthScore gracefully', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            healthScore: undefined,
        }));
        expect(result).toContain('initializing');
    });

    it('handles empty capabilities list', () => {
        const result = section.generate(createContext({
            visibility: 'always',
            activeCapabilities: [],
        }));
        expect(result).toContain('GSEP Identity');
        expect(result).not.toContain('What you can do');
    });
});
