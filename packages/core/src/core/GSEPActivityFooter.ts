/**
 * GSEPActivityFooter — Generates a footer appended to every chat response
 * showing what GSEP did during the interaction.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import type { GSEPVisibility } from '../types/index.js';

export interface GSEPActivity {
    learningEventsCount: number;
    driftDetected: boolean;
    evolutionTriggered: boolean;
    healthLabel: string;
    healthScore: number;
    interactionNumber: number;
}

export class GSEPActivityFooter {
    /**
     * Format the GSEP activity footer.
     * Returns empty string for 'silent' and 'metadata-only' modes.
     */
    format(activity: GSEPActivity, visibility: GSEPVisibility): string {
        if (visibility === 'silent' || visibility === 'metadata-only') {
            return '';
        }

        if (visibility === 'always') {
            return this.formatFull(activity);
        }

        return this.formatSubtle(activity);
    }

    private formatFull(a: GSEPActivity): string {
        const parts: string[] = [];

        if (a.learningEventsCount > 0) {
            parts.push(`Learned ${a.learningEventsCount} new preference${a.learningEventsCount > 1 ? 's' : ''}`);
        }

        if (a.driftDetected) {
            parts.push('Drift detected — self-correcting');
        }

        if (a.evolutionTriggered) {
            parts.push('Evolution cycle ran');
        }

        const healthPct = Math.round(a.healthScore * 100);
        parts.push(`Health: ${a.healthLabel} (${healthPct}%)`);
        parts.push(`#${a.interactionNumber}`);

        return `\n\n---\n🧬 **GSEP:** ${parts.join(' | ')}`;
    }

    private formatSubtle(a: GSEPActivity): string {
        const parts: string[] = [];

        if (a.learningEventsCount > 0) {
            parts.push(`+${a.learningEventsCount} learning`);
        }

        if (a.driftDetected) {
            parts.push('drift');
        }

        if (a.evolutionTriggered) {
            parts.push('evolved');
        }

        parts.push(a.healthLabel);

        return `\n\n---\n🧬 ${parts.join(' | ')}`;
    }
}
