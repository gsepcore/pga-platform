/**
 * DNAProfile — User Cognitive Profile Builder
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Builds and maintains a unique "DNA" profile for each user:
 * - Communication style (formal, casual, technical, creative)
 * - Tool preferences
 * - Domain expertise
 * - Success/failure patterns
 * - Temporal preferences (peak productivity hours)
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { UserDNA, UserTraits, Interaction } from '../types/index.js';

export class DNAProfile {
    constructor(private storage: StorageAdapter) {}

    /**
     * Get user DNA (creates default if doesn't exist)
     */
    async getDNA(userId: string, genomeId: string): Promise<UserDNA> {
        const dna = await this.storage.loadDNA(userId, genomeId);

        if (!dna) {
            return this.createDefaultDNA(userId, genomeId);
        }

        return dna;
    }

    /**
     * Update DNA based on new interaction
     */
    async updateDNA(userId: string, genomeId: string, interaction: Interaction): Promise<UserDNA> {
        const currentDNA = await this.getDNA(userId, genomeId);

        // Extract new traits from interaction
        const newTraits = this.extractTraits(interaction, currentDNA);

        // Merge with current traits (incremental update)
        const updatedTraits = this.mergeTraits(currentDNA.traits, newTraits);
        const updatedConfidence = this.updateConfidence(currentDNA.confidence, newTraits);

        const updatedDNA: UserDNA = {
            userId,
            genomeId,
            traits: updatedTraits,
            confidence: updatedConfidence,
            generation: currentDNA.generation + 1,
            lastEvolved: new Date(),
        };

        // Save to storage
        await this.storage.saveDNA(userId, genomeId, updatedDNA);

        return updatedDNA;
    }

    /**
     * Export DNA for user transparency
     */
    async exportDNA(userId: string, genomeId: string): Promise<string> {
        const dna = await this.getDNA(userId, genomeId);
        return JSON.stringify(dna, null, 2);
    }

    // ─── Private Methods ────────────────────────────────────

    private createDefaultDNA(userId: string, genomeId?: string): UserDNA {
        return {
            userId,
            genomeId: genomeId || 'default',
            traits: {
                communicationStyle: 'formal',
                verbosity: 'balanced',
                tone: 'friendly',
                preferredTools: [],
                preferredFormats: [],
                preferredLanguage: 'en',
                domainExpertise: {},
                taskSuccessRates: {},
                peakProductivityHours: [],
                averageTurnsToSuccess: 0,
                retryPatterns: {},
                adaptationRate: 0.5,
                stabilityScore: 0.5,
            },
            confidence: {},
            generation: 0,
            lastEvolved: new Date(),
        };
    }

    private extractTraits(
        interaction: Interaction,
        currentDNA: UserDNA,
    ): Partial<UserTraits> {
        const newTraits: Partial<UserTraits> = {};

        // Detect communication style
        const style = this.detectCommunicationStyle(interaction.userMessage);
        if (style) newTraits.communicationStyle = style;

        // Detect verbosity
        const verbosity = this.detectVerbosity(
            interaction.assistantResponse,
            interaction.userMessage,
        );
        if (verbosity) newTraits.verbosity = verbosity;

        // Update tool preferences
        if (interaction.toolCalls.length > 0) {
            const tools = interaction.toolCalls.map(tc => tc.name);
            newTraits.preferredTools = this.updateToolPreferences(
                currentDNA.traits.preferredTools,
                tools,
            );
        }

        // Update task success rates
        if (interaction.taskType && interaction.score !== undefined) {
            newTraits.taskSuccessRates = {
                ...currentDNA.traits.taskSuccessRates,
                [interaction.taskType]: this.emaUpdate(
                    currentDNA.traits.taskSuccessRates[interaction.taskType] || 0.5,
                    interaction.score,
                ),
            };
        }

        // Update peak productivity hours
        if (interaction.score !== undefined && interaction.score >= 0.8) {
            const hour = interaction.timestamp.getHours();
            newTraits.peakProductivityHours = this.updatePeakHours(
                currentDNA.traits.peakProductivityHours,
                hour,
            );
        }

        return newTraits;
    }

    private detectCommunicationStyle(message: string): UserTraits['communicationStyle'] | null {
        const lower = message.toLowerCase();

        // Technical indicators
        if (/\b(function|class|interface|api|database|server)\b/.test(lower)) {
            return 'technical';
        }

        // Formal indicators
        if (/\b(please|kindly|would you|could you)\b/.test(lower)) {
            return 'formal';
        }

        // Casual indicators
        if (/\b(hey|yo|sup|cool|awesome)\b/.test(lower)) {
            return 'casual';
        }

        return null;
    }

    private detectVerbosity(response: string, userMessage: string): UserTraits['verbosity'] | null {
        const ratio = response.length / Math.max(userMessage.length, 1);

        if (ratio < 1.5) return 'terse';
        if (ratio > 4) return 'detailed';
        return 'balanced';
    }

    private updateToolPreferences(current: string[], newTools: string[]): string[] {
        const combined = [...current, ...newTools];
        const counts: Record<string, number> = {};

        for (const tool of combined) {
            counts[tool] = (counts[tool] || 0) + 1;
        }

        // Return top 10 most used tools
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tool]) => tool);
    }

    private updatePeakHours(current: number[], newHour: number): number[] {
        const combined = [...current, newHour];
        const counts: Record<number, number> = {};

        for (const hour of combined) {
            counts[hour] = (counts[hour] || 0) + 1;
        }

        // Return top 5 most productive hours
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hour]) => parseInt(hour));
    }

    private mergeTraits(current: UserTraits, newTraits: Partial<UserTraits>): UserTraits {
        return {
            ...current,
            ...newTraits,
        };
    }

    private updateConfidence(
        current: Record<string, number>,
        newTraits: Partial<UserTraits>,
    ): Record<string, number> {
        const updated = { ...current };

        for (const key of Object.keys(newTraits)) {
            // Increase confidence when trait is consistently detected
            updated[key] = Math.min((updated[key] || 0) + 0.1, 1.0);
        }

        return updated;
    }

    private emaUpdate(current: number, newValue: number, alpha: number = 0.1): number {
        return current * (1 - alpha) + newValue * alpha;
    }
}
