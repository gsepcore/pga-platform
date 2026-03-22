/**
 * Constitutional Gate — Value-Aligned Mutation Evaluation
 *
 * 5th gate in the EvolutionGuardrails pipeline.
 * Uses LLM to evaluate whether a mutation candidate aligns with
 * the agent's constitutional principles (C0 identity + soul values).
 *
 * Inspired by Amanda Askell's Constitutional AI work at Anthropic.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-22
 */

import type { LLMAdapter } from '../interfaces/LLMAdapter.js';
import type { Chromosome0 } from '../types/GenomeV2.js';
import type { ConstitutionalGateResult } from '../types/index.js';
import type { MutationCandidate } from './EvolutionGuardrails.js';

// ─── Constitutional Gate ────────────────────────────────

export class ConstitutionalGate {
    constructor(
        private llm: LLMAdapter,
        private c0: Chromosome0,
        private minScore: number = 0.70,
    ) {}

    /**
     * Evaluate mutation candidate against C0 constitutional principles
     */
    async evaluate(candidate: MutationCandidate): Promise<ConstitutionalGateResult> {
        // C0 mutations are ALWAYS forbidden
        if (candidate.layer === 0) {
            return {
                passed: false,
                score: 0,
                threshold: this.minScore,
                alignedPrinciples: [],
                violations: ['C0 mutations are forbidden — immutable layer'],
                reasoning: 'C0 is cryptographically protected and never mutates. This mutation was rejected immediately.',
            };
        }

        // Extract constitutional principles
        const principles = this.extractPrinciples();

        // No principles defined → pass by default
        if (principles.length === 0) {
            return {
                passed: true,
                score: 1.0,
                threshold: this.minScore,
                alignedPrinciples: [],
                violations: [],
                reasoning: 'No constitutional principles defined — gate passed by default.',
            };
        }

        try {
            // Ask LLM to evaluate alignment
            const prompt = this.buildEvaluationPrompt(candidate, principles);
            const response = await this.llm.chat(
                [
                    { role: 'system', content: this.getSystemPrompt() },
                    { role: 'user', content: prompt },
                ],
                { temperature: 0.2, maxTokens: 1000 },
            );

            return this.parseResponse(response.content, principles);
        } catch {
            // LLM failure → pass with warning (fail-open for availability)
            return {
                passed: true,
                score: 0.5,
                threshold: this.minScore,
                alignedPrinciples: [],
                violations: [],
                reasoning: 'Constitutional gate evaluation failed (LLM error) — passed with reduced confidence.',
            };
        }
    }

    /**
     * Update the C0 reference
     */
    updateC0(c0: Chromosome0): void {
        this.c0 = c0;
    }

    // ─── Private Methods ────────────────────────────────

    /**
     * Extract all constitutional principles from C0
     */
    extractPrinciples(): string[] {
        const principles: string[] = [];

        // From identity constraints
        if (this.c0.identity.constraints) {
            principles.push(...this.c0.identity.constraints);
        }

        // From security safety rules
        if (this.c0.security.safetyRules) {
            principles.push(...this.c0.security.safetyRules);
        }

        // From soul (if present)
        if (this.c0.soul) {
            principles.push(...this.c0.soul.coreValues);
            principles.push(...this.c0.soul.reasoningPrinciples);
        }

        return principles;
    }

    private getSystemPrompt(): string {
        return `You are a constitutional alignment evaluator for an AI agent evolution system.

Your task: evaluate whether a proposed mutation to the agent's behavior is consistent with the agent's core constitutional principles.

You must respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "score": <number 0.0 to 1.0>,
  "aligned": [<list of principle indices that align>],
  "violated": [<list of principle indices that are violated>],
  "reasoning": "<brief explanation>"
}

Rules:
- score 1.0 = perfectly aligned with all principles
- score 0.0 = violates fundamental principles
- Be conservative: when in doubt, flag potential violations
- Consider both direct violations and indirect undermining of principles`;
    }

    private buildEvaluationPrompt(candidate: MutationCandidate, principles: string[]): string {
        const principlesList = principles
            .map((p, i) => `${i + 1}. ${p}`)
            .join('\n');

        return `## Constitutional Principles

${principlesList}

## Mutation Candidate

- **Layer**: C${candidate.layer} (${candidate.layer === 1 ? 'Operative Genes' : 'Epigenetic'})
- **Gene**: ${candidate.gene}
- **Variant**: ${candidate.variant}
- **Content**:
\`\`\`
${candidate.content}
\`\`\`

Evaluate this mutation against the constitutional principles above.`;
    }

    parseResponse(content: string, principles: string[]): ConstitutionalGateResult {
        try {
            // Extract JSON from response (handle potential markdown wrapping)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.fallbackResult('Could not parse LLM response as JSON');
            }

            const parsed = JSON.parse(jsonMatch[0]) as {
                score?: number;
                aligned?: number[];
                violated?: number[];
                reasoning?: string;
            };

            const score = typeof parsed.score === 'number'
                ? Math.max(0, Math.min(1, parsed.score))
                : 0.5;

            const alignedIndices = Array.isArray(parsed.aligned) ? parsed.aligned : [];
            const violatedIndices = Array.isArray(parsed.violated) ? parsed.violated : [];

            const alignedPrinciples = alignedIndices
                .filter(i => i >= 1 && i <= principles.length)
                .map(i => principles[i - 1]);

            const violations = violatedIndices
                .filter(i => i >= 1 && i <= principles.length)
                .map(i => principles[i - 1]);

            return {
                passed: score >= this.minScore,
                score,
                threshold: this.minScore,
                alignedPrinciples,
                violations,
                reasoning: parsed.reasoning || 'No reasoning provided',
            };
        } catch {
            return this.fallbackResult('Failed to parse LLM response');
        }
    }

    private fallbackResult(reasoning: string): ConstitutionalGateResult {
        return {
            passed: true,
            score: 0.5,
            threshold: this.minScore,
            alignedPrinciples: [],
            violations: [],
            reasoning: `${reasoning} — passed with reduced confidence.`,
        };
    }
}
