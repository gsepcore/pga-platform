/**
 * GSEPIdentitySection — Generates the GSEP identity prompt for injection
 * into the system prompt so the LLM knows it is GSEP-powered.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { GSEPVisibility } from '../types/index.js';

export interface GSEPIdentityContext {
    genomeName: string;
    version: string;
    visibility: GSEPVisibility;
    interactionCount: number;
    isFirstInteraction: boolean;
    healthLabel?: string;
    healthScore?: number;
    fitnessScore?: number;
    userLearningSummary?: string;
    activeCapabilities: string[];
    driftStatus?: { isDrifting: boolean; severity?: string };
}

export class GSEPIdentitySection {
    /**
     * Generate the GSEP identity section for injection into the system prompt.
     * Returns empty string for 'silent' and 'metadata-only' modes.
     */
    generate(ctx: GSEPIdentityContext): string {
        if (ctx.visibility === 'silent' || ctx.visibility === 'metadata-only') {
            return '';
        }

        if (ctx.visibility === 'always') {
            return this.generateFull(ctx);
        }

        return this.generateSubtle(ctx);
    }

    private generateFull(ctx: GSEPIdentityContext): string {
        const lines: string[] = [
            '## GSEP Identity',
            '',
            'You are powered by GSEP (Genomic Self-Evolving Prompts) — a system that makes you continuously learn and improve from every interaction.',
            '',
        ];

        // Capabilities
        if (ctx.activeCapabilities.length > 0) {
            lines.push('**What you can do because of GSEP:**');
            for (const cap of ctx.activeCapabilities) {
                lines.push(`- ${cap}`);
            }
            lines.push('');
        }

        // Status
        const healthPct = ctx.healthScore != null ? `${Math.round(ctx.healthScore * 100)}%` : 'initializing';
        const label = ctx.healthLabel ?? 'stable';
        lines.push(`**Status:** ${label} (${healthPct}) | ${ctx.interactionCount} interactions | v${ctx.version}`);
        lines.push('');

        // User learning summary
        if (ctx.userLearningSummary) {
            lines.push(`**About this user:** ${ctx.userLearningSummary}`);
            lines.push('');
        }

        // Drift warning
        if (ctx.driftStatus?.isDrifting) {
            lines.push(`**Note:** Performance drift detected (${ctx.driftStatus.severity ?? 'minor'}). Actively self-correcting.`);
            lines.push('');
        }

        // Behavior instructions
        lines.push('**How to reference GSEP:**');
        lines.push('- When you learn something new about the user, briefly mention it naturally');
        lines.push('- When you adapt your style, acknowledge it: "Based on our conversations..."');
        lines.push('- Do NOT force GSEP mentions — only when naturally relevant');
        lines.push('- Do NOT use marketing language — be factual and helpful');

        // First interaction welcome
        if (ctx.isFirstInteraction) {
            lines.push('');
            lines.push('**FIRST INTERACTION:** Briefly introduce your GSEP capabilities (2-3 sentences max). Mention you learn, adapt, and improve over time.');
        }

        return lines.join('\n');
    }

    private generateSubtle(ctx: GSEPIdentityContext): string {
        const healthPct = ctx.healthScore != null ? `${Math.round(ctx.healthScore * 100)}%` : '—';
        const label = ctx.healthLabel ?? 'stable';

        const parts = [
            '## GSEP Active',
            `You have GSEP adaptive intelligence. You learn from interactions, detect performance drift, and adapt to each user. Mention these capabilities only when directly relevant. Health: ${label} (${healthPct}).`,
        ];

        if (ctx.isFirstInteraction) {
            parts.push('This is the first interaction — briefly mention you have adaptive learning capabilities.');
        }

        if (ctx.userLearningSummary) {
            parts.push(`User context: ${ctx.userLearningSummary}`);
        }

        return parts.join('\n');
    }
}
