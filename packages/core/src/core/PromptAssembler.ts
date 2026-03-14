/**
 * PromptAssembler — Assembles prompts from three-layer genome
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Handles Layer 0 (Immutable) + Layer 1 (Operative) + Layer 2 (Epigenome)
 * selection and assembly into final system prompt.
 */

import type { StorageAdapter } from '../interfaces/StorageAdapter.js';
import type { Genome, SelectionContext } from '../types/index.js';
import type { ContentSource } from '../types/GenomeV2.js';
import { ContextMemory } from './ContextMemory.js';
import { ProactiveSuggestions } from './ProactiveSuggestions.js';
import { estimateTokenCount, tokenEfficiency } from '../utils/tokens.js';
import type { SelfModel } from '../advanced-ai/SelfModel.js';
import type { PatternMemory } from '../memory/PatternMemory.js';
import type { Metacognition } from '../reasoning/Metacognition.js';
import type { EmotionalModel } from '../advanced-ai/EmotionalModel.js';
import type { CalibratedAutonomy } from '../advanced-ai/CalibratedAutonomy.js';
import type { PersonalNarrative } from '../memory/PersonalNarrative.js';
import type { AnalyticMemoryEngine } from '../memory/AnalyticMemoryEngine.js';
import type { ContentFirewall } from '../firewall/ContentFirewall.js';
import type { GSEPIdentitySection, GSEPIdentityContext } from './GSEPIdentitySection.js';

const DEFAULT_C1_TOKEN_BUDGET = 2000;
const getC1Budget = (genome: Genome): number =>
    genome.config.compression?.c1TokenBudget ?? DEFAULT_C1_TOKEN_BUDGET;

export class PromptAssembler {
    private contextMemory: ContextMemory;
    private proactiveSuggestions: ProactiveSuggestions;
    private selfModel?: SelfModel;
    private patternMemory?: PatternMemory;
    private metacognition?: Metacognition;
    private emotionalModel?: EmotionalModel;
    private calibratedAutonomy?: CalibratedAutonomy;
    private personalNarrative?: PersonalNarrative;
    private analyticMemory?: AnalyticMemoryEngine;
    private firewall?: ContentFirewall;
    private gsepIdentity?: GSEPIdentitySection;
    private gsepIdentityContext?: GSEPIdentityContext;

    constructor(
        storage: StorageAdapter,
        private genome: Genome,
    ) {
        this.contextMemory = new ContextMemory(storage);
        this.proactiveSuggestions = new ProactiveSuggestions(storage);
    }

    /**
     * Set C3 Content Firewall for prompt injection protection.
     */
    setFirewall(firewall: ContentFirewall): void {
        this.firewall = firewall;
    }

    /**
     * Set SelfModel for metacognition prompt injection.
     */
    setSelfModel(selfModel: SelfModel): void {
        this.selfModel = selfModel;
    }

    /**
     * Set PatternMemory for predictive prompt injection.
     */
    setPatternMemory(patternMemory: PatternMemory): void {
        this.patternMemory = patternMemory;
    }

    /**
     * Set Metacognition for pre-response analysis injection.
     */
    setMetacognition(metacognition: Metacognition): void {
        this.metacognition = metacognition;
    }

    /**
     * Set EmotionalModel for empathetic response adaptation.
     */
    setEmotionalModel(emotionalModel: EmotionalModel): void {
        this.emotionalModel = emotionalModel;
    }

    /**
     * Set CalibratedAutonomy for autonomy guidance injection.
     */
    setCalibratedAutonomy(calibratedAutonomy: CalibratedAutonomy): void {
        this.calibratedAutonomy = calibratedAutonomy;
    }

    /**
     * Set PersonalNarrative for relationship context injection.
     */
    setPersonalNarrative(personalNarrative: PersonalNarrative): void {
        this.personalNarrative = personalNarrative;
    }

    /**
     * Set AnalyticMemoryEngine for knowledge graph injection.
     */
    setAnalyticMemory(analyticMemory: AnalyticMemoryEngine): void {
        this.analyticMemory = analyticMemory;
    }

    /**
     * Set GSEPIdentitySection for GSEP visibility in system prompt.
     */
    setGSEPIdentity(identity: GSEPIdentitySection, context: GSEPIdentityContext): void {
        this.gsepIdentity = identity;
        this.gsepIdentityContext = context;
    }

    /**
     * Update the GSEP identity context (called before each prompt assembly).
     */
    updateGSEPIdentityContext(context: GSEPIdentityContext): void {
        this.gsepIdentityContext = context;
    }

    /**
     * Assemble full prompt from all three layers + intelligence boost
     */
    async assemblePrompt(context?: SelectionContext, currentMessage?: string): Promise<string> {
        const sections: string[] = [];

        // C3 Content Trust Preamble (if firewall enabled)
        if (this.firewall) {
            const preamble = this.firewall.getContentTrustPreamble();
            if (preamble) {
                sections.push(preamble);
            }
        }

        // GSEP Identity Section (after C3 preamble, before C0)
        if (this.gsepIdentity && this.gsepIdentityContext) {
            const identityPrompt = this.gsepIdentity.generate(this.gsepIdentityContext);
            if (identityPrompt) {
                sections.push(this.processContent(identityPrompt, 'gsep-identity'));
            }
        }

        // Layer 0: Immutable DNA (security, core identity, ethics)
        for (const allele of this.genome.layers.layer0) {
            if (allele.status === 'active') {
                sections.push(this.processContent(allele.content, 'layer0'));
            }
        }

        // Layer 1: Operative Genes (tool usage, coding patterns, etc.)
        const layer1Content = await this.selectBestFromLayer(1, context);
        sections.push(...layer1Content.map(c => this.processContent(c, 'layer1')));

        // Layer 2: Epigenomes (user preferences, communication style, etc.)
        const layer2Content = await this.selectBestFromLayer(2, context);
        sections.push(...layer2Content.map(c => this.processContent(c, 'layer2')));

        // 🧠 INTELLIGENCE BOOST: Add context memory (if user provided)
        if (context?.userId) {
            const memoryPrompt = await this.contextMemory.getMemoryPrompt(
                context.userId,
                this.genome.id,
            );
            if (memoryPrompt) {
                sections.push(this.processContent(memoryPrompt, 'context-memory'));
            }

            // 🚀 PROACTIVE SUGGESTIONS: Add intelligent suggestions
            if (currentMessage) {
                const suggestions = await this.proactiveSuggestions.generateSuggestions(
                    context.userId,
                    this.genome.id,
                    currentMessage,
                );

                if (suggestions.length > 0) {
                    const suggestionsPrompt =
                        this.proactiveSuggestions.formatSuggestionsPrompt(suggestions);
                    sections.push(this.processContent(suggestionsPrompt, 'proactive-suggestions'));
                }
            }
        }

        // Metacognition: SelfModel prompt section
        if (this.selfModel) {
            const selfSection = this.selfModel.toPromptSection();
            if (selfSection) {
                sections.push(this.processContent(selfSection, 'self-model'));
            }
        }

        // Predictive: PatternMemory prompt section
        if (this.patternMemory) {
            const patternSection = this.patternMemory.toPromptSection();
            if (patternSection) {
                sections.push(this.processContent(patternSection, 'pattern-memory'));
            }
        }

        // Metacognition: Pre-response analysis
        if (this.metacognition && currentMessage) {
            const preAnalysis = this.metacognition.analyzePreResponse(currentMessage);
            const metaSection = this.metacognition.toPromptSection(preAnalysis);
            if (metaSection) {
                sections.push(this.processContent(metaSection, 'metacognition'));
            }
        }

        // Emotional awareness: adapt tone to user state
        if (this.emotionalModel && currentMessage) {
            const emotionalState = this.emotionalModel.inferEmotion(currentMessage);
            const emotionSection = this.emotionalModel.toPromptSection(emotionalState);
            if (emotionSection) {
                sections.push(this.processContent(emotionSection, 'emotional-model'));
            }
        }

        // Autonomy calibration: guide autonomous behavior
        if (this.calibratedAutonomy) {
            const taskType = context?.taskType || context?.metadata?.taskType as string | undefined;
            if (taskType) {
                const autonomySection = this.calibratedAutonomy.toPromptSection(taskType);
                if (autonomySection) {
                    sections.push(this.processContent(autonomySection, 'calibrated-autonomy'));
                }
            }
        }

        // Personal narrative: relationship context
        if (this.personalNarrative) {
            const narrativeSection = this.personalNarrative.toPromptSection();
            if (narrativeSection) {
                sections.push(this.processContent(narrativeSection, 'personal-narrative'));
            }
        }

        // Analytic memory: knowledge graph context
        if (this.analyticMemory) {
            const currentTopic = context?.taskType;
            const knowledgeSection = this.analyticMemory.toPromptSection(currentTopic);
            if (knowledgeSection) {
                sections.push(this.processContent(knowledgeSection, 'analytic-memory'));
            }
        }

        // Filter out empty sections (blocked by firewall)
        return sections.filter(s => s.length > 0).join('\n\n---\n\n');
    }

    /**
     * Process content through C3 Content Firewall.
     * If no firewall is set, content passes through unchanged (backward compatible).
     */
    private processContent(content: string, source: ContentSource): string {
        if (!this.firewall) return content;

        const result = this.firewall.scan(content, source);

        if (!result.allowed) {
            // Content blocked — return empty (filtered out in assemblePrompt)
            return '';
        }

        return result.taggedContent;
    }

    /**
     * Select best alleles from a specific layer using epsilon-greedy
     */
    private async selectBestFromLayer(
        layer: 1 | 2,
        _context?: SelectionContext,
    ): Promise<string[]> {
        const alleles = layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;
        const active = alleles.filter(a => a.status === 'active');

        if (active.length === 0) return [];

        // Group by gene
        const byGene = new Map<string, typeof active>();
        for (const allele of active) {
            if (!byGene.has(allele.gene)) {
                byGene.set(allele.gene, []);
            }
            byGene.get(allele.gene)!.push(allele);
        }

        // Select best variant for each gene
        const candidates: Array<{ content: string; fitness: number; tokenCount: number }> = [];
        for (const [_gene, variants] of byGene) {
            const best = this.selectByEpsilonGreedy(
                variants,
                this.genome.config.epsilonExplore || 0.1,
            );
            candidates.push({
                content: best.content,
                fitness: best.fitness,
                tokenCount: estimateTokenCount(best.content),
            });
        }

        // Token budget enforcement for layer 1
        if (layer === 1) {
            return this.applyTokenBudget(candidates, getC1Budget(this.genome));
        }

        return candidates.map(c => c.content);
    }

    /**
     * Apply token budget: if total tokens exceed budget, rank by
     * token efficiency (fitness/tokens) and fill greedily.
     */
    private applyTokenBudget(
        candidates: Array<{ content: string; fitness: number; tokenCount: number }>,
        budget: number,
    ): string[] {
        const totalTokens = candidates.reduce((sum, c) => sum + c.tokenCount, 0);

        // Under budget → include all
        if (totalTokens <= budget) {
            return candidates.map(c => c.content);
        }

        // Over budget → rank by value-per-token and fill greedily
        const ranked = [...candidates].sort((a, b) => {
            const effA = tokenEfficiency(a.fitness, a.tokenCount);
            const effB = tokenEfficiency(b.fitness, b.tokenCount);
            return effB - effA; // Higher efficiency first
        });

        const selected: string[] = [];
        let usedTokens = 0;

        for (const candidate of ranked) {
            if (usedTokens + candidate.tokenCount <= budget) {
                selected.push(candidate.content);
                usedTokens += candidate.tokenCount;
            }
        }

        return selected;
    }

    /**
     * Epsilon-greedy selection: exploit best with probability (1-ε), explore random with probability ε
     */
    private selectByEpsilonGreedy<T extends { fitness: number }>(
        candidates: T[],
        epsilon: number,
    ): T {
        if (candidates.length === 0) {
            throw new Error('Cannot select from empty candidates');
        }

        if (candidates.length === 1) {
            return candidates[0];
        }

        // Sort by fitness descending
        const sorted = [...candidates].sort((a, b) => b.fitness - a.fitness);

        // With probability epsilon, explore (select random non-best)
        if (Math.random() < epsilon) {
            const nonBest = sorted.slice(1);
            if (nonBest.length > 0) {
                return nonBest[Math.floor(Math.random() * nonBest.length)];
            }
        }

        // Exploit: select best
        return sorted[0];
    }
}
