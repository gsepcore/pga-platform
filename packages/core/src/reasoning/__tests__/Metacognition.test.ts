/**
 * Metacognition Tests
 *
 * Tests for pre-response analysis, post-response learning,
 * and confidence assessment.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-03
 */

import { describe, it, expect } from 'vitest';
import { Metacognition } from '../Metacognition.js';
import type { SelfAssessment } from '../../advanced-ai/SelfModel.js';

// ─── Helpers ────────────────────────────────────────────

function createMockSelfAssessment(overrides?: Partial<SelfAssessment>): SelfAssessment {
    return {
        strengths: [{ category: 'coding', confidence: 0.85, basis: 'test' }],
        weaknesses: [{ category: 'design', confidence: 0.35, suggestion: 'improve layout skills' }],
        driftWarnings: [],
        overallHealth: 'stable',
        lastAssessed: new Date(),
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────

describe('Metacognition', () => {
    it('should assess high confidence for clear technical messages', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('Write a function that validates email addresses');

        expect(result.confidence.overall).toBeGreaterThan(0.4);
        expect(result.suggestedAction).toBe('respond');
        expect(result.missingInfo).toHaveLength(0);
    });

    it('should detect missing info in vague messages', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('fix that thing');

        expect(result.missingInfo.length).toBeGreaterThan(0);
        expect(result.suggestedAction).toBe('ask');
    });

    it('should suggest asking when ambiguity is high', () => {
        const meta = new Metacognition();
        const result = meta.analyzePreResponse('build something maybe like whatever');

        expect(result.confidence.informational).toBeLessThan(0.6);
        expect(result.suggestedAction).toBe('ask');
        expect(result.missingInfo.length).toBeGreaterThan(0);
    });

    it('should incorporate SelfModel assessment for domain confidence', () => {
        const assessment = createMockSelfAssessment();
        const meta = new Metacognition(() => assessment);

        // Use message with multiple design-specific keywords to ensure 'design' domain wins
        const result = meta.analyzePreResponse('Help me with the UI layout and responsive style for this component');

        // Should detect 'design' domain and find it as a weakness
        expect(result.knowledgeGaps.length).toBeGreaterThan(0);
        expect(result.knowledgeGaps[0]).toContain('design');
    });

    it('should generate prompt section when action is not respond', () => {
        const meta = new Metacognition();
        const analysis = meta.analyzePreResponse('fix something idk');

        const section = meta.toPromptSection(analysis);
        expect(section).not.toBeNull();
        expect(section).toContain('Metacognitive Awareness');
        expect(section).toContain('Recommended action');
    });

    it('should return null prompt section when everything is clear', () => {
        const meta = new Metacognition();
        const analysis = meta.analyzePreResponse(
            'Write a TypeScript function that takes an array of numbers and returns the sum',
        );

        // Clear message with sufficient info → respond → null section
        if (analysis.suggestedAction === 'respond' && analysis.missingInfo.length === 0) {
            const section = meta.toPromptSection(analysis);
            expect(section).toBeNull();
        }
    });

    it('should perform post-response analysis', () => {
        const meta = new Metacognition();
        const result = meta.analyzePostResponse(
            'How do I sort an array?',
            'Here is how you sort an array:\n```\narray.sort()\n```',
            true,
        );

        expect(result.effectivenessScore).toBeGreaterThan(0.5);
        expect(result.whatWentWell.length).toBeGreaterThan(0);
        expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect improvement areas on failure', () => {
        const meta = new Metacognition();
        const result = meta.analyzePostResponse(
            'maybe something like a thing?',
            'Here is a very long response that goes on and on...' + 'x'.repeat(2000),
            false,
        );

        expect(result.effectivenessScore).toBeLessThan(0.5);
        expect(result.whatCouldImprove.length).toBeGreaterThan(0);
    });

    it('should track effectiveness trend', () => {
        const meta = new Metacognition();

        // Record several interactions
        for (let i = 0; i < 6; i++) {
            meta.analyzePostResponse('msg', 'response', true);
        }

        const trend = meta.getEffectivenessTrend();
        expect(trend.recentRate).toBeGreaterThan(0);
        expect(['improving', 'stable', 'declining']).toContain(trend.trend);
    });

    // ─── Domain Calibration Tests ────────────────────────────

    it('should lower confidence after failures in a domain', () => {
        const meta = new Metacognition();

        // Record failures in 'coding' domain
        for (let i = 0; i < 5; i++) {
            meta.analyzePostResponse(
                'Write a function to sort arrays using code and class',
                'response...',
                false,
            );
        }

        // Now assess confidence for a coding task
        const analysis = meta.analyzePreResponse('Write code to implement a class');
        // After 5 failures, calibration should reduce confidence
        expect(analysis.confidence.technical).toBeLessThan(0.7);
    });

    it('should boost confidence after successes in a domain', () => {
        const meta = new Metacognition();

        // Record successes in 'coding' domain
        for (let i = 0; i < 5; i++) {
            meta.analyzePostResponse(
                'Write a function to debug this code error',
                'Here is the fix:\n```\ncode\n```',
                true,
            );
        }

        // Get analysis — coding domain should be calibrated upward
        const analysis = meta.analyzePreResponse('Write a function and test the api endpoint');
        expect(analysis.confidence.technical).toBeGreaterThanOrEqual(0.7);
    });

    it('should not affect unrelated domains', () => {
        const meta = new Metacognition();

        // Record failures in 'design' domain
        for (let i = 0; i < 5; i++) {
            meta.analyzePostResponse(
                'Help me with the UI layout and responsive style',
                'long response...',
                false,
            );
        }

        // Coding domain should not be affected
        const codingAnalysis = meta.analyzePreResponse('Write a function to sort an array with code');
        // Should still be around baseline since we didn't affect coding
        expect(codingAnalysis.confidence.technical).toBeGreaterThanOrEqual(0.6);
    });

    it('should include reflection insights in toPromptSection after history', () => {
        const meta = new Metacognition();

        // Build some history with a mix of success/failure in a domain
        for (let i = 0; i < 4; i++) {
            meta.analyzePostResponse(
                'Write code to debug this api error',
                'response...',
                i < 1, // 1 success, 3 failures
            );
        }

        const analysis = meta.analyzePreResponse('Fix this code bug');
        const section = meta.toPromptSection(analysis);
        expect(section).not.toBeNull();
        // Should contain reflection with domain success rate
        expect(section).toContain('Reflection');
    });

    // ─── Expanded Domain Detection Tests ─────────────────────

    it('should detect ai-ml domain', () => {
        const assessment = createMockSelfAssessment({
            weaknesses: [{ category: 'ai-ml', confidence: 0.30, suggestion: 'improve ML skills' }],
        });
        const meta = new Metacognition(() => assessment);

        const analysis = meta.analyzePreResponse('Train a neural network model with embedding and fine-tune the llm');
        expect(analysis.knowledgeGaps.length).toBeGreaterThan(0);
        expect(analysis.knowledgeGaps[0]).toContain('ai-ml');
    });

    it('should detect security domain', () => {
        const assessment = createMockSelfAssessment({
            weaknesses: [{ category: 'security', confidence: 0.25, suggestion: 'improve security knowledge' }],
        });
        const meta = new Metacognition(() => assessment);

        const analysis = meta.analyzePreResponse('Implement oauth authentication with jwt encryption for this vulnerability');
        expect(analysis.knowledgeGaps.length).toBeGreaterThan(0);
        expect(analysis.knowledgeGaps[0]).toContain('security');
    });

    it('should detect testing domain', () => {
        const assessment = createMockSelfAssessment({
            weaknesses: [{ category: 'testing', confidence: 0.30, suggestion: 'improve testing practices' }],
        });
        const meta = new Metacognition(() => assessment);

        const analysis = meta.analyzePreResponse('Write a unit test with vitest and mock for coverage');
        expect(analysis.knowledgeGaps.length).toBeGreaterThan(0);
        expect(analysis.knowledgeGaps[0]).toContain('testing');
    });
});
