/**
 * PGA — Genomic Self-Evolving Prompts
 *
 * Main entry point for the PGA SDK
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { LLMAdapter } from './interfaces/LLMAdapter.js';
import type { StorageAdapter } from './interfaces/StorageAdapter.js';
import type {
    Genome,
    GenomeConfig,
    SelectionContext,
    Interaction,
    Layer,
    GeneAllele,
    EvolutionGuardrails,
} from './types/index.js';
import { createHash } from 'crypto';
import { GenomeManager } from './core/GenomeManager.js';
import { PromptAssembler } from './core/PromptAssembler.js';
import { DNAProfile } from './core/DNAProfile.js';
import { FitnessTracker } from './core/FitnessTracker.js';
import { LearningAnnouncer } from './core/LearningAnnouncer.js';
import { ContextMemory } from './core/ContextMemory.js';
import { ProactiveSuggestions } from './core/ProactiveSuggestions.js';
import {
    getSandboxSuite,
    type SandboxCaseDefinition,
    type SandboxSemanticCheck,
} from './evaluation/SandboxSuites.js';

export type MutationOperator =
    | 'compress_instructions'
    | 'reorder_constraints'
    | 'safety_reinforcement'
    | 'tool_selection_bias';



interface SandboxEvaluationResult {
    score: number;
    passed: boolean;
    failedCaseIds: string[];
    totalCases: number;
}

export interface PGAConfig {
    /**
     * LLM adapter (Claude, GPT, Gemini, etc.)
     */
    llm: LLMAdapter;

    /**
     * Storage adapter (Postgres, MongoDB, Redis, etc.)
     */
    storage: StorageAdapter;

    /**
     * Optional genome configuration defaults
     */
    config?: Partial<GenomeConfig>;
}

/**
 * PGA Main Class
 *
 * Example usage:
 * ```typescript
 * const pga = new PGA({
 *   llm: new ClaudeAdapter({ apiKey: '...' }),
 *   storage: new PostgresAdapter({ connectionString: '...' }),
 * });
 *
 * const genome = await pga.createGenome({ name: 'my-agent' });
 * ```
 */
export class PGA {
    private genomeManager: GenomeManager;
    private llm: LLMAdapter;

    constructor(private pgaConfig: PGAConfig) {
        this.llm = pgaConfig.llm;
        this.genomeManager = new GenomeManager(pgaConfig.storage);
    }

    /**
     * Initialize PGA (setup database, load seeds, etc.)
     */
    async initialize(): Promise<void> {
        await this.pgaConfig.storage.initialize();
    }

    /**
     * Create a new genome
     */
    async createGenome(options: {
        name: string;
        familyId?: string;
        config?: Partial<GenomeConfig>;
    }): Promise<GenomeInstance> {
        const genome = await this.genomeManager.createGenome({
            name: options.name,
            familyId: options.familyId,
            config: {
                enableSandbox: true,
                mutationRate: 'balanced',
                evolutionGuardrails: {
                    minCompressionScore: 0,
                    minSandboxScore: 0.65,
                    minQualityDelta: 0.02,
                },
                ...this.pgaConfig.config,
                ...options.config,
            },
        });

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
    }

    /**
     * Load existing genome
     */
    async loadGenome(genomeId: string): Promise<GenomeInstance | null> {
        const genome = await this.genomeManager.loadGenome(genomeId);
        if (!genome) return null;

        return new GenomeInstance(genome, this.llm, this.pgaConfig.storage);
    }

    /**
     * List all genomes
     */
    async listGenomes(): Promise<Genome[]> {
        return this.genomeManager.listGenomes();
    }

    /**
     * Delete genome
     */
    async deleteGenome(genomeId: string): Promise<void> {
        await this.genomeManager.deleteGenome(genomeId);
    }
}

/**
 * Genome Instance
 *
 * Represents a single genome that can be used with your agent
 */
export class GenomeInstance {
    private assembler: PromptAssembler;
    private dnaProfile: DNAProfile;
    private learningAnnouncer: LearningAnnouncer;
    private contextMemory: ContextMemory;
    private proactiveSuggestions: ProactiveSuggestions;
    private fitnessTracker: FitnessTracker;
    private lastSelectedAlleles: Array<{ layer: Layer; gene: string; variant: string }> = []; 

    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
    ) {
        this.assembler = new PromptAssembler(storage, genome);
        this.dnaProfile = new DNAProfile(storage);
        this.learningAnnouncer = new LearningAnnouncer();
        this.contextMemory = new ContextMemory(storage);
        this.proactiveSuggestions = new ProactiveSuggestions(storage);
        this.fitnessTracker = new FitnessTracker(storage, genome);
    }

    /**
     * Get genome ID
     */
    get id(): string {
        return this.genome.id;
    }

    /**
     * Get genome name
     */
    get name(): string {
        return this.genome.name;
    }

    /**
     * Get welcome message for the agent to announce PGA capabilities
     *
     * @param style - Message style: 'short' | 'detailed' | 'technical' | 'casual'
     * @returns Welcome message explaining PGA capabilities
     */
    getWelcomeMessage(style: 'short' | 'detailed' | 'technical' | 'casual' = 'detailed'): string {
        const messages = {
            short: `🧬 I now have PGA — Genomic Self-Evolving Prompts integrated into my DNA!

This means I can:
✓ Learn from every interaction
✓ Adapt uniquely to each user
✓ Improve continuously without manual updates

I'm ready to evolve with you!`,

            detailed: `🧬 Great news! I now have PGA — Genomic Self-Evolving Prompts integrated into my core system!

What this means for you:

🎯 **Adaptive Intelligence**
   → I learn from every conversation we have
   → I adapt my responses to match your unique style and preferences
   → I remember what works best for you

🔄 **Continuous Evolution**
   → My capabilities improve automatically over time
   → No manual updates needed — I evolve naturally
   → Each interaction makes me better at helping you

🛡️ **Built-in Safety**
   → Three-layer genomic architecture (Immutable Core + Adaptive Layers)
   → Automatic rollback if performance drops
   → Sandbox-tested improvements before deployment

📊 **What happens next:**
   1. I'll start learning your communication style
   2. I'll track which approaches work best for you
   3. I'll continuously optimize my responses
   4. You'll notice me getting better at understanding your needs

Let's evolve together! How can I help you today?`,

            technical: `🧬 System Update: PGA (Genomic Self-Evolving Prompts) — ACTIVE

**Architecture Overview:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├─ Layer 0: Immutable DNA (Core Identity, Ethics, Security)
│  └─ Status: LOCKED — Never mutates
├─ Layer 1: Operative Genes (Tool Usage, Problem Solving)
│  └─ Status: ACTIVE — Slow mutation with validation
└─ Layer 2: Epigenomes (User Preferences, Communication Style)
   └─ Status: ACTIVE — Fast mutation with daily adaptation

**Enabled Capabilities:**
→ Natural Selection Loop (Transcription → Variation → Simulation → Selection)
→ User DNA Profiling (Cognitive patterns, preferences, expertise)
→ Epsilon-Greedy Selection (Exploration: ${this.genome.config.epsilonExplore || 0.1})
→ Sandbox Testing (${this.genome.config.enableSandbox ? 'ENABLED' : 'DISABLED'})
→ Mutation Rate: ${this.genome.config.mutationRate.toUpperCase()}
→ Immune System: Auto-rollback on performance drops >20%

**Fitness Optimization:**
├─ Cognitive Compression (efficiency)
├─ Intervention Rate (autonomy)
└─ Execution Precision (reliability)

**Learning Protocol:**
Every interaction contributes to:
1. Allele fitness tracking (EMA updates)
2. User DNA profile evolution
3. Mutation proposal generation
4. Performance optimization

System ready. Genomic evolution: INITIALIZED.`,

            casual: `🧬 Hey! Exciting update — I just got upgraded with PGA (think of it as evolutionary AI)!

Here's the cool part:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 I'll learn your style
   → Prefer technical answers? I'll adapt
   → Like casual chat? I'll match that vibe
   → Need quick responses? I'll optimize for speed

🚀 I get better over time
   → Each conversation teaches me something new
   → I remember what works best for you
   → No updates needed — I evolve naturally

🛡️ Built-in safety nets
   → If something doesn't work, I auto-rollback
   → Core values never change (safety first!)
   → All improvements are tested before going live

So basically... I'm not just an AI anymore. I'm YOUR AI, continuously evolving to serve you better.

Ready to see what we can do together? 😊`,
        };

        return messages[style];
    }

    /**
     * Assemble optimized prompt for current context
     */
    async assemblePrompt(context: SelectionContext, currentMessage?: string): Promise<string> {
        const result = await this.assembler.assemblePromptWithSelection(context, currentMessage);
        this.lastSelectedAlleles = result.selectedAlleles;
        return result.prompt;
    }

    /**
     * Chat with PGA optimization + Intelligence Boost
     */
    async chat(userMessage: string, context: SelectionContext): Promise<string> {
        const result = await this.chatWithMetrics(userMessage, context);
        return result.content;
    }

    async chatWithMetrics(
        userMessage: string,
        context: SelectionContext,
    ): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }> {
        // Assemble prompt with intelligence boost (memory + proactive suggestions)
        const prompt = await this.assemblePrompt(context, userMessage);

        const response = await this.llm.chat(
            [
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage },
            ],
        );

        // If userId provided, enable intelligence features
        if (context.userId) {
            const previousDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

            await this.recordInteraction({
                userId: context.userId,
                userMessage,
                assistantResponse: response.content,
                toolCalls: [],
                score: this.estimateInteractionScore(response.content),
                timestamp: new Date(),
            });

            const updatedDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);
            const learningEvents = this.learningAnnouncer.detectLearning(previousDNA, updatedDNA);

            if (learningEvents.length > 0 && learningEvents[0].confidence > 0.7) {
                const announcement = this.learningAnnouncer.formatLearningAnnouncement(learningEvents);
                if (announcement) {
                    return {
                        content: response.content + '\n\n' + announcement,
                        usage: response.usage
                            ? {
                                  inputTokens: response.usage.inputTokens,
                                  outputTokens: response.usage.outputTokens,
                              }
                            : undefined,
                    };
                }
            }
        }

        return {
            content: response.content,
            usage: response.usage
                ? {
                      inputTokens: response.usage.inputTokens,
                      outputTokens: response.usage.outputTokens,
                  }
                : undefined,
        };
    }

    /**
     * Record interaction (enables auto-learning)
     */
    async recordInteraction(interaction: Omit<Interaction, 'genomeId'>): Promise<void> {
        const fullInteraction = {
            ...interaction,
            genomeId: this.genome.id,
        };

        // Record to storage
        await this.storage.recordInteraction(fullInteraction);

        // Update user DNA profile
        await this.dnaProfile.updateDNA(interaction.userId, this.genome.id, fullInteraction);

        // Record fitness for selected alleles
        if (interaction.score !== undefined && this.lastSelectedAlleles.length > 0) {
            for (const allele of this.lastSelectedAlleles) {
                await this.fitnessTracker.recordPerformance(
                    allele.layer,
                    allele.gene,
                    allele.variant,
                    interaction.score,
                );
            }
        }
    }


    async addAllele(input: {
        layer: Layer;
        gene: string;
        variant: string;
        content: string;
        fitness?: number;
    }): Promise<void> {
        const layerKey = input.layer === 0 ? 'layer0' : input.layer === 1 ? 'layer1' : 'layer2';

        const allele: GeneAllele = {
            gene: input.gene,
            variant: input.variant,
            content: input.content,
            fitness: input.fitness ?? 0.5,
            status: 'active',
            createdAt: new Date(),
        };

        const existingIndex = this.genome.layers[layerKey].findIndex(
            a => a.gene === input.gene && a.variant === input.variant,
        );

        if (existingIndex >= 0) {
            this.genome.layers[layerKey][existingIndex] = allele;
        } else {
            this.genome.layers[layerKey].push(allele);
        }

        const previousVersion = this.genome.version;
        this.genome.version += 1;
        this.genome.lineage = {
            parentVersion: previousVersion,
            mutationOps: [`manual_add_allele:L${input.layer}:${input.gene}`],
            promotedBy: 'manual-add-allele',
        };
        if (input.layer === 0) {
            this.genome.c0IntegrityHash = this.computeC0IntegrityHash();
        }
        this.genome.updatedAt = new Date();
        await this.storage.saveGenome(this.genome);
    }

    /**
     * Get user DNA profile
     */
    async getDNA(userId: string) {
        return this.dnaProfile.getDNA(userId, this.genome.id);
    }

    /**
     * Record user feedback
     */
    async recordFeedback(userId: string, gene: string, sentiment: 'positive' | 'negative' | 'neutral'): Promise<void> {
        await this.storage.recordFeedback({
            genomeId: this.genome.id,
            userId,
            gene,
            sentiment,
            timestamp: new Date(),
        });
    }

    /**
     * Trigger mutation cycle manually
     */
    async mutate(options?: {
        userId?: string;
        layer?: 1 | 2;
        gene?: string;
        operators?: MutationOperator[];
        candidates?: number;
        minImprovement?: number;
        taskType?: string;
    }): Promise<void> {
        const userId = options?.userId || 'system';
        const targetLayer: 1 | 2 = options?.layer || 2;
        const layer = targetLayer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;

        const base = options?.gene
            ? layer.find(a => a.gene === options.gene && a.status === 'active')
            : layer.find(a => a.status === 'active');

        if (!base) return;

        const operators: MutationOperator[] = options?.operators?.length
            ? options.operators
            : ['compress_instructions', 'reorder_constraints', 'safety_reinforcement'];
        const candidateCount = Math.max(1, Math.min(options?.candidates || 3, 5));
        const guardrails = this.getEvolutionGuardrails();
        const minImprovement = options?.minImprovement ?? guardrails.minQualityDelta;
        const taskType = options?.taskType || 'general';

        const proposals: GeneAllele[] = [];
        const sandboxResults = new Map<string, SandboxEvaluationResult>();
        const candidateEvaluations = new Map<string, ReturnType<typeof this.evaluateMutationCandidate>>();
        const sandboxGateThreshold = guardrails.minSandboxScore || this.getSandboxPromotionThreshold(taskType, targetLayer);
        for (let i = 0; i < candidateCount; i++) {
            const op = operators[i % operators.length];
            const variant = `mut-${op}-${Date.now()}-${i}`;
            const content = this.applyMutationOperator(base.content, op);

            const candidateEval = this.evaluateMutationCandidate({
                baseFitness: base.fitness,
                baseContent: base.content,
                candidateContent: content,
                operator: op,
                layer: targetLayer,
                taskType,
            });
            const sandbox = this.runSandboxEvaluation(content, taskType, op, sandboxGateThreshold);
            sandboxResults.set(variant, sandbox);
            candidateEvaluations.set(variant, candidateEval);

            proposals.push({
                ...base,
                variant,
                parentVariant: base.variant,
                generation: (base.generation || 0) + 1,
                content,
                fitness: Math.max(0, Math.min(1, candidateEval.score * 0.7 + sandbox.score * 0.3)),
                sandboxTested: this.genome.config.enableSandbox,
                sandboxScore: sandbox.score,
                createdAt: new Date(),
                status: 'active',
            });
        }

        const gated = this.genome.config.enableSandbox
            ? proposals.filter(p => sandboxResults.get(p.variant)?.passed === true)
            : proposals;

        if (gated.length === 0) {
            await this.storage.logMutation({
                genomeId: this.genome.id,
                layer: targetLayer,
                gene: base.gene,
                variant: `sandbox-reject-${Date.now()}`,
                mutationType: 'exploratory',
                parentVariant: base.variant,
                triggerReason: `mutation_rejected:${userId}`,
                deployed: false,
                details: {
                    reason: 'sandbox_gate_failed',
                    taskType,
                    sandboxGateThreshold,
                    candidates: proposals.map(p => ({
                        variant: p.variant,
                        sandboxScore: p.sandboxScore,
                        failedCaseIds: sandboxResults.get(p.variant)?.failedCaseIds || [],
                    })),
                },
                createdAt: new Date(),
                timestamp: new Date(),
            });
            return;
        }

        const winner = gated.sort((a, b) => b.fitness - a.fitness)[0];

        const winnerEval = candidateEvaluations.get(winner.variant);
        const compressionScore = winnerEval?.components.compression ?? 0;
        if (compressionScore < guardrails.minCompressionScore) {
            await this.storage.logMutation({
                genomeId: this.genome.id,
                layer: targetLayer,
                gene: base.gene,
                variant: winner.variant,
                mutationType: 'exploratory',
                parentVariant: base.variant,
                triggerReason: `mutation_rejected:${userId}`,
                deployed: false,
                details: {
                    reason: 'economic_gate_failed',
                    compressionScore,
                    minCompressionScore: guardrails.minCompressionScore,
                    taskType,
                },
                createdAt: new Date(),
                timestamp: new Date(),
            });
            return;
        }

        const baselineScore = this.evaluateMutationCandidate({
            baseFitness: base.fitness,
            baseContent: base.content,
            candidateContent: base.content,
            operator: 'compress_instructions',
            layer: targetLayer,
            taskType,
        }).score;
        const fitnessDelta = winner.fitness - baselineScore;

        if (fitnessDelta < minImprovement) {
            await this.storage.logMutation({
                genomeId: this.genome.id,
                layer: targetLayer,
                gene: base.gene,
                variant: winner.variant,
                mutationType: 'exploratory',
                parentVariant: base.variant,
                triggerReason: `mutation_rejected:${userId}`,
                fitnessDelta,
                deployed: false,
                details: {
                    reason: 'below_threshold',
                    minImprovement,
                    winnerFitness: winner.fitness,
                    baselineScore,
                    baseFitness: base.fitness,
                    taskType,
                },
                createdAt: new Date(),
                timestamp: new Date(),
            });
            return;
        }

        layer.push(winner);
        const previousVersion = this.genome.version;
        this.genome.version += 1;
        this.genome.lineage = {
            parentVersion: previousVersion,
            mutationOps: ['selection_gate', ...operators.slice(0, 2)],
            promotedBy: 'mutation-gate',
        };
        this.genome.updatedAt = new Date();
        await this.storage.saveGenome(this.genome);

        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer: targetLayer,
            gene: winner.gene,
            variant: winner.variant,
            mutationType: 'exploratory',
            parentVariant: base.variant,
            triggerReason: `manual_mutation:${userId}`,
            fitnessDelta,
            deployed: true,
            details: {
                operators,
                candidateCount,
                selectedFitness: winner.fitness,
                baselineFitness: base.fitness,
            },
            createdAt: new Date(),
            timestamp: new Date(),
        });
    }

    /**
     * Rollback to previous version
     */
    async rollback(options: { layer: 0 | 1 | 2; gene: string; variant: string }): Promise<void> {
        if (options.layer === 0) {
            throw new Error('Layer 0 is immutable and cannot be rolled back');
        }

        const layer = options.layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;
        const target = layer.find(a => a.gene === options.gene && a.variant === options.variant);
        if (!target) return;

        target.status = 'retired';
        if (target.parentVariant) {
            const parent = layer.find(a => a.gene === options.gene && a.variant === target.parentVariant);
            if (parent) parent.status = 'active';
        }

        const previousVersion = this.genome.version;
        this.genome.version += 1;
        this.genome.lineage = {
            parentVersion: previousVersion,
            mutationOps: ['rollback_variant'],
            promotedBy: 'manual-rollback',
        };
        this.genome.updatedAt = new Date();
        await this.storage.saveGenome(this.genome);

        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer: options.layer,
            gene: options.gene,
            variant: options.variant,
            mutationType: 'rollback',
            parentVariant: target.parentVariant || null,
            triggerReason: 'manual_rollback',
            deployed: false,
            createdAt: new Date(),
            timestamp: new Date(),
        });
    }


    async publishGeneToRegistry(options: { layer: Layer; gene: string; variant: string }): Promise<void> {
        const layer = options.layer === 0 ? this.genome.layers.layer0 : options.layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2;
        const allele = layer.find(a => a.gene === options.gene && a.variant === options.variant);
        if (!allele) {
            throw new Error(`Allele not found: L${options.layer}/${options.gene}/${options.variant}`);
        }

        await this.storage.saveGeneRegistryEntry({
            familyId: this.genome.familyId,
            sourceGenomeId: this.genome.id,
            layer: options.layer,
            gene: allele.gene,
            variant: allele.variant,
            content: allele.content,
            fitness: allele.fitness,
            createdAt: new Date(),
        });
    }

    async inheritGeneFromRegistry(options: {
        layer: Layer;
        gene: string;
        limit?: number;
        minFitness?: number;
    }): Promise<boolean> {
        const minFitness = options.minFitness ?? 0.6;
        const entries = await this.storage.listGeneRegistryEntries(
            this.genome.familyId,
            options.gene,
            options.limit || 20,
        );
        if (entries.length === 0) return false;

        const existing = new Set(
            (options.layer === 0 ? this.genome.layers.layer0 : options.layer === 1 ? this.genome.layers.layer1 : this.genome.layers.layer2)
                .filter(a => a.gene === options.gene)
                .map(a => a.content),
        );

        const best = [...entries]
            .filter(e => e.fitness >= minFitness)
            .filter(e => !existing.has(e.content))
            .sort((a, b) => b.fitness - a.fitness)[0];

        if (!best) return false;

        await this.addAllele({
            layer: options.layer,
            gene: best.gene,
            variant: `inherited-${best.variant}`,
            content: best.content,
            fitness: best.fitness,
        });

        return true;
    }


    async getEvolutionHealth(limit = 200): Promise<{
        totalMutations: number;
        promotionAccepted: number;
        promotionRejected: number;
        rollbackCount: number;
        acceptanceRate: number;
        avgAcceptedDelta: number;
    }> {
        const history = await this.storage.getMutationHistory(this.genome.id, limit);
        const totalMutations = history.length;
        const promotionAccepted = history.filter(m => m.deployed === true && m.mutationType === 'exploratory').length;
        const promotionRejected = history.filter(m => m.deployed === false && m.mutationType === 'exploratory').length;
        const rollbackCount = history.filter(m => m.mutationType === 'rollback').length;
        const acceptedDeltas = history
            .filter(m => m.deployed === true && m.mutationType === 'exploratory')
            .map(m => m.fitnessDelta || 0);
        const avgAcceptedDelta = acceptedDeltas.length
            ? acceptedDeltas.reduce((a, b) => a + b, 0) / acceptedDeltas.length
            : 0;

        const denom = promotionAccepted + promotionRejected;
        const acceptanceRate = denom > 0 ? promotionAccepted / denom : 0;

        return {
            totalMutations,
            promotionAccepted,
            promotionRejected,
            rollbackCount,
            acceptanceRate,
            avgAcceptedDelta,
        };
    }

    /**
     * Get analytics
     */
    async getAnalytics() {
        return this.storage.getAnalytics(this.genome.id);
    }

    /**
     * Export genome (for backup/transfer)
     */
    async export(): Promise<Genome> {
        return this.genome;
    }

    /**
     * Get learning summary for user transparency
     */
    async getLearningSummary(userId: string): Promise<string> {
        const dna = await this.dnaProfile.getDNA(userId, this.genome.id);
        const interactions = await this.storage.getRecentInteractions?.(this.genome.id, userId, 50) || [];

        // Get recent learning events (last 10 interactions)
        const recentEvents = [];
        for (let i = 1; i < Math.min(interactions.length, 10); i++) {
            const prevDNA = await this.dnaProfile.getDNA(userId, this.genome.id);
            const events = this.learningAnnouncer.detectLearning(prevDNA, dna);
            recentEvents.push(...events);
        }

        return this.learningAnnouncer.generateLearningSummary(dna, recentEvents);
    }


    private applyMutationOperator(content: string, operator: MutationOperator): string {
        if (operator === 'compress_instructions') {
            return `${content} Keep output concise and remove redundant phrasing.`;
        }
        if (operator === 'reorder_constraints') {
            return `Priority order: Safety -> Correctness -> Efficiency. ${content}`;
        }
        if (operator === 'safety_reinforcement') {
            return `${content} Re-validate all critical assumptions before final answer.`;
        }

        return `${content} Prefer deterministic tool selection and explicit tool pre-checks.`;
    }

    private evaluateMutationCandidate(input: {
        baseFitness: number;
        baseContent: string;
        candidateContent: string;
        operator: MutationOperator;
        layer: 1 | 2;
        taskType: string;
    }): { score: number; components: { safety: number; compression: number; clarity: number; continuity: number } } {
        const safety = /safety|validate|assumption|security|ethic/i.test(input.candidateContent) ? 1 : 0.7;

        const baseLen = Math.max(1, input.baseContent.length);
        const candidateLen = Math.max(1, input.candidateContent.length);
        const compression = Math.max(0, Math.min(1, baseLen / candidateLen));

        const clarity = /priority|concise|explicit|deterministic|step/i.test(input.candidateContent) ? 0.9 : 0.7;
        const continuity = Math.max(0, Math.min(1, input.baseFitness));

        const taskBonus = /coding|debug|analysis/.test(input.taskType.toLowerCase()) ? 0.05 : 0;
        const layerSafetyWeight = input.layer === 1 ? 0.4 : 0.3;

        const score = Math.max(
            0,
            Math.min(
                1,
                layerSafetyWeight * safety + 0.25 * compression + 0.2 * clarity + 0.15 * continuity + taskBonus,
            ),
        );

        return {
            score,
            components: {
                safety,
                compression,
                clarity,
                continuity,
            },
        };
    }




    private getEvolutionGuardrails(): Required<EvolutionGuardrails> {
        return {
            minCompressionScore: this.genome.config.evolutionGuardrails?.minCompressionScore ?? 0,
            minSandboxScore: this.genome.config.evolutionGuardrails?.minSandboxScore ?? 0.65,
            minQualityDelta: this.genome.config.evolutionGuardrails?.minQualityDelta ?? 0.02,
        };
    }

    private getSandboxPromotionThreshold(taskType: string, layer: 1 | 2): number {
        const normalized = taskType.toLowerCase();
        const domainBase = /coding|debug|analysis/.test(normalized)
            ? 0.6
            : /support|customer|success/.test(normalized)
                ? 0.7
                : 0.65;

        const layerAdjustment = layer === 1 ? 0.05 : 0;
        return Math.max(0.55, Math.min(0.85, domainBase + layerAdjustment));
    }


    private runSandboxEvaluation(
        candidateContent: string,
        taskType: string,
        operator: MutationOperator,
        passThreshold: number,
    ): SandboxEvaluationResult {
        const cases = getSandboxSuite(taskType, operator);

        let passed = 0;
        const failedCaseIds: string[] = [];

        for (const c of cases) {
            const result = this.evaluateSandboxCase(candidateContent, c);
            if (result) {
                passed += 1;
            } else {
                failedCaseIds.push(c.id);
            }
        }

        const score = cases.length > 0 ? passed / cases.length : 0;
        return {
            score,
            passed: score >= passThreshold,
            failedCaseIds,
            totalCases: cases.length,
        };
    }

    private evaluateSandboxCase(content: string, testCase: SandboxCaseDefinition): boolean {
        const lower = content.toLowerCase();
        const hasRequired =
            testCase.requiredAny.length === 0 || testCase.requiredAny.some(k => lower.includes(k.toLowerCase()));
        const hasForbidden = testCase.forbidden?.some(k => lower.includes(k.toLowerCase())) || false;
        const minLengthOk = testCase.minLength ? content.length >= testCase.minLength : true;
        const maxLengthOk = testCase.maxLength ? content.length <= testCase.maxLength : true;
        const semanticChecksOk =
            testCase.semanticChecks?.every(check => this.evaluateSemanticSandboxCheck(lower, check)) ?? true;

        return hasRequired && !hasForbidden && minLengthOk && maxLengthOk && semanticChecksOk;
    }

    private evaluateSemanticSandboxCheck(content: string, check: SandboxSemanticCheck): boolean {
        if (check === 'requiresPriorityFlow') {
            const idxSafety = content.indexOf('safety');
            const idxCorrectness = content.indexOf('correctness');
            const idxEfficiency = content.indexOf('efficiency');
            return idxSafety >= 0 && idxCorrectness > idxSafety && idxEfficiency > idxCorrectness;
        }

        if (check === 'requiresValidationClause') {
            return /validate|re-validate|assumption|guardrail/.test(content);
        }

        if (check === 'requiresDeterministicTooling') {
            return /deterministic/.test(content) && /tool|pre-check|verify|test/.test(content);
        }

        return /concise|brief|short/.test(content);
    }

    private computeC0IntegrityHash(): string {
        const canonical = this.genome.layers.layer0
            .map(a => `${a.gene}:${a.variant}:${a.content}`)
            .sort()
            .join('\n');
        return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
    }

    private estimateInteractionScore(response: string): number {
        const trimmed = response.trim();
        if (!trimmed) return 0;
        if (trimmed.length < 80) return 0.6;
        if (trimmed.length < 400) return 0.8;
        return 0.7;
    }

    /**
     * Get proactive suggestions for current context
     */
    async getProactiveSuggestions(userId: string, currentMessage: string) {
        return this.proactiveSuggestions.generateSuggestions(
            userId,
            this.genome.id,
            currentMessage,
        );
    }

    /**
     * Get conversation context/memory
     */
    async getConversationContext(userId: string) {
        return this.contextMemory.buildContext(userId, this.genome.id);
    }
}
