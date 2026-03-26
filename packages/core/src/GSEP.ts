/**
 * GSEP — Genomic Self-Evolving Prompts
 *
 * Main entry point for the GSEP SDK
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 */

import type { LLMAdapter } from './interfaces/LLMAdapter.js';
import type { StorageAdapter } from './interfaces/StorageAdapter.js';
import type { Genome, GenomeConfig, SelectionContext, Interaction, EvolutionGuardrails, AutonomousConfig } from './types/index.js';
import { InMemoryStorageAdapter } from './wrap/InMemoryStorageAdapter.js';
import { getPreset } from './presets/ConfigPresets.js';
import type { PresetName } from './presets/ConfigPresets.js';
import { WrappedAgent } from './wrap/WrappedAgent.js';
import type { WrapOptions, FunctionWrapOptions } from './wrap/WrapOptions.js';
import { GenomeManager } from './core/GenomeManager.js';
import { PromptAssembler } from './core/PromptAssembler.js';
import { DNAProfile } from './core/DNAProfile.js';
import { FitnessTracker } from './core/FitnessTracker.js';
import { LearningAnnouncer } from './core/LearningAnnouncer.js';
import { ContextMemory } from './core/ContextMemory.js';
import { ProactiveSuggestions } from './core/ProactiveSuggestions.js';
import { EvolutionGuardrailsManager } from './evaluation/EvolutionGuardrails.js';
import { ModelRouter, type ModelRouterConfig } from './advanced-ai/ModelRouter.js';
import { MetricsCollector, type MetricsCollectorConfig } from './monitoring/MetricsCollector.js';
import { MonitoringDashboard, type DashboardConfig } from './monitoring/MonitoringDashboard.js';
import { RAGEngine, type RAGConfig } from './rag/RAGEngine.js';
import { ReasoningEngine, type ReasoningConfig } from './reasoning/ReasoningEngine.js';
import { MutationEngine, TokenCompressionOperator, type MutationContext } from './evolution/MutationOperator.js';
import { SemanticRestructuringOperator } from './evolution/boost/operators/SemanticRestructuringOperator.js';
import { PatternExtractionOperator } from './evolution/boost/operators/PatternExtractionOperator.js';
import { CrossoverMutationOperator } from './evolution/boost/operators/CrossoverMutationOperator.js';
import { BreakthroughOperator } from './evolution/boost/operators/BreakthroughOperator.js';
import { estimateTokenCount } from './utils/tokens.js';
import { DriftAnalyzer } from './evolution/DriftAnalyzer.js';
import { FitnessCalculator, type InteractionData } from './evolution/FitnessCalculator.js';
import type { FitnessVector, GenomeV2, OperativeGene, GeneCategory } from './types/GenomeV2.js';
import { GenesisBootstrap } from './core/GenesisBootstrap.js';
import { SelfModel, type SelfAssessment } from './advanced-ai/SelfModel.js';
import { PatternMemory, type BehavioralPattern } from './memory/PatternMemory.js';
import { Metacognition, type PreResponseAnalysis, type PostResponseAnalysis } from './reasoning/Metacognition.js';
import { EmotionalModel, type EmotionalState } from './advanced-ai/EmotionalModel.js';
import { CalibratedAutonomy, type AutonomyDecision } from './advanced-ai/CalibratedAutonomy.js';
import { PersonalNarrative, type NarrativeSummary, type SignificantMoment } from './memory/PersonalNarrative.js';
import { AnalyticMemoryEngine, type MemoryQueryResult } from './memory/AnalyticMemoryEngine.js';
import { MetaEvolutionEngine } from './evolution/boost/MetaEvolutionEngine.js';
import type { GeneBank } from './gene-bank/GeneBank.js';
import { MarketplaceClient } from './gene-bank/MarketplaceClient.js';
import type { DriftSignal } from './evolution/DriftAnalyzer.js';
import { CanaryDeploymentManager } from './evolution/CanaryDeployment.js';
import type { CanaryDeployment } from './evolution/CanaryDeployment.js';
import { EnhancedSelfModel, type IntegratedHealth, type CapabilityEntry, type EvolutionTrajectory } from './advanced-ai/EnhancedSelfModel.js';
import { PurposeSurvival, type OperatingMode, type SurvivalStrategy, type GenomeSnapshot } from './evolution/PurposeSurvival.js';
import { StrategicAutonomy, type EvolutionPriority } from './advanced-ai/StrategicAutonomy.js';
import { computeAgentVitals, type AgentVitals } from './advanced-ai/AgentVitals.js';
import { ThinkingEngine } from './advanced-ai/ThinkingEngine.js';
import { AgentStateVector } from './advanced-ai/AgentStateVector.js';
import { AutonomousLoop } from './advanced-ai/AutonomousLoop.js';
import { GrowthJournal } from './memory/GrowthJournal.js';
import { CuriosityEngine } from './memory/CuriosityEngine.js';
import { ContentFirewall } from './firewall/ContentFirewall.js';
import { PurposeLock } from './firewall/PurposeLock.js';
import { AnomalyDetector, type Anomaly } from './firewall/AnomalyDetector.js';
import { SkillRegistry, SkillExecutor, SkillRouter, type SkillDefinition } from './skills/index.js';
import { GSEPMiddleware, type MiddlewareOptions } from './middleware/GSEPMiddleware.js';
import { WeeklyReportGenerator, type WeeklyReport } from './monitoring/WeeklyReportGenerator.js';
import { GenomeKernel } from './core/GenomeKernel.js';
import { BehavioralImmuneSystem } from './immune/BehavioralImmuneSystem.js';
import { GSEPEventEmitter } from './realtime/EventEmitter.js';
import { DashboardServer } from './dashboard/DashboardServer.js';
import { DashboardTokenHelper } from './dashboard/DashboardToken.js';
import { GSEPIdentitySection, type GSEPIdentityContext } from './core/GSEPIdentitySection.js';
import { GSEPActivityFooter, type GSEPActivity } from './core/GSEPActivityFooter.js';
import type { GSEPStatus, GSEPChatResult } from './types/index.js';

/**
 * Options for GSEP.quickStart() — one-line initialization.
 *
 * @example Minimal (auto-detects everything):
 * ```typescript
 * const agent = await GSEP.quickStart();
 * ```
 *
 * @example With preset:
 * ```typescript
 * const agent = await GSEP.quickStart({ preset: 'conscious' });
 * ```
 *
 * @example With explicit API key:
 * ```typescript
 * const agent = await GSEP.quickStart({
 *     apiKey: 'sk-ant-...',
 *     provider: 'anthropic',
 *     preset: 'standard',
 * });
 * ```
 */
export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'ollama' | 'perplexity';

export interface QuickStartOptions {
    /** Agent name (default: 'my-agent') */
    name?: string;

    /** LLM provider — auto-detected from env vars if omitted */
    provider?: LLMProvider;

    /** API key — reads from env vars if omitted (not required for ollama) */
    apiKey?: string;

    /** Model ID override (e.g. 'claude-sonnet-4-5-20250929', 'gpt-4', 'llama3') */
    model?: string;

    /** Ollama host URL (default: 'http://localhost:11434') */
    ollamaHost?: string;

    /** Configuration preset (default: 'full') */
    preset?: PresetName;

    /** Extra autonomous config overrides applied on top of the preset */
    overrides?: Partial<AutonomousConfig>;

    /** Storage adapter — uses InMemoryStorageAdapter if omitted */
    storage?: StorageAdapter;

    /** Pre-built LLM adapter — skips provider auto-detection if provided */
    llm?: LLMAdapter;

    /** Agent purpose — enables Purpose Lock to keep the agent on-topic */
    purpose?: string;

    /** Allowed topics for Purpose Lock (e.g. ['purchases', 'shipping', 'payments']) */
    allowedTopics?: string[];

    /** Forbidden topics for Purpose Lock (e.g. ['cooking', 'politics']) */
    forbiddenTopics?: string[];

    /** Skills — MCP server URIs or inline skill definitions */
    skills?: Array<string | SkillDefinition>;
}

/**
 * Options for GSEP.quickStart() — one-line initialization.
 *
 * @example Minimal (auto-detects everything from env vars):
 * ```typescript
 * const agent = await GSEP.quickStart();
 * ```
 *
 * @example With preset:
 * ```typescript
 * const agent = await GSEP.quickStart({ preset: 'conscious' });
 * ```
 *
 * @example Full control:
 * ```typescript
 * const agent = await GSEP.quickStart({
 *     apiKey: 'sk-ant-...',
 *     provider: 'anthropic',
 *     preset: 'standard',
 *     name: 'customer-support-bot',
 * });
 * ```
 */

export interface GSEPConfig {
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

    /**
     * Optional model router configuration
     */
    modelRouter?: ModelRouterConfig;

    /**
     * Optional monitoring/metrics configuration
     */
    monitoring?: MetricsCollectorConfig;

    /**
     * Optional dashboard configuration
     */
    dashboard?: DashboardConfig & { enabled?: boolean };

    /**
     * Optional RAG configuration (v0.3.0)
     */
    rag?: RAGConfig;

    /**
     * Optional Reasoning configuration (v0.3.0)
     */
    reasoning?: Partial<ReasoningConfig>;

    /**
     * Optional Gene Bank for genesis bootstrap + swarm intelligence (v0.5.0)
     */
    geneBank?: GeneBank;

    /**
     * Optional marketplace configuration for Gene Marketplace access (v0.8.0)
     */
    marketplace?: {
        apiKey?: string;
        url?: string;
    };
}

/**
 * GSEP Main Class
 *
 * Example usage:
 * ```typescript
 * const gsep = new GSEP({
 *   llm: new ClaudeAdapter({ apiKey: '...' }),
 *   storage: new PostgresAdapter({ connectionString: '...' }),
 * });
 *
 * const genome = await gsep.createGenome({ name: 'my-agent' });
 * ```
 */
export class GSEP {
    private genomeManager: GenomeManager;
    private llm: LLMAdapter;
    private metricsCollector: MetricsCollector;
    private dashboard?: MonitoringDashboard;

    constructor(private gsepConfig: GSEPConfig) {
        // ─── LLM Validation ────────────────────────────────────
        if (!gsepConfig.llm) {
            throw new Error(
                `[GSEP] LLM adapter is required.\n\n`
                + `GSEP needs an AI model to function. Please provide an LLM adapter:\n\n`
                + `  import { GSEP } from '@gsep/core';\n`
                + `  import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';\n\n`
                + `  const gsep = new GSEP({\n`
                + `    llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY }),\n`
                + `    storage: yourStorageAdapter,\n`
                + `  });\n\n`
                + `Supported adapters:\n`
                + `  - @gsep/adapters-llm-anthropic (Claude)\n`
                + `  - @gsep/adapters-llm-openai (GPT-4)\n\n`
                + `Run 'gsep doctor' for full diagnostics.`,
            );
        }

        if (!gsepConfig.storage) {
            throw new Error(
                `[GSEP] Storage adapter is required.\n\n`
                + `GSEP needs a storage adapter to persist genomes. Please provide one:\n\n`
                + `  import { InMemoryStorage } from '@gsep/core';\n\n`
                + `  const gsep = new GSEP({\n`
                + `    llm: yourLLMAdapter,\n`
                + `    storage: new InMemoryStorage(),\n`
                + `  });\n\n`
                + `For production, use: @gsep/adapters-storage-postgres`,
            );
        }

        this.llm = gsepConfig.llm;
        this.genomeManager = new GenomeManager(gsepConfig.storage);

        // Initialize monitoring
        this.metricsCollector = new MetricsCollector(gsepConfig.monitoring || {
            enabled: true,
            enableCostTracking: true,
            enableAuditLogs: true,
        });

        // Initialize dashboard if enabled
        if (gsepConfig.dashboard?.enabled) {
            this.dashboard = new MonitoringDashboard(this.metricsCollector, gsepConfig.dashboard);
        }
    }

    /**
     * Initialize GSEP (setup database, load seeds, etc.)
     */
    async initialize(): Promise<void> {
        await this.gsepConfig.storage.initialize();

        // Start dashboard if configured
        if (this.dashboard && this.gsepConfig.dashboard?.enabled) {
            this.dashboard.start();
        }

        // Log initialization
        this.metricsCollector.logAudit({
            level: 'info',
            component: 'gsep',
            operation: 'initialize',
            message: 'GSEP system initialized successfully',
        });
    }

    /**
     * Get metrics collector
     */
    getMetrics(): MetricsCollector {
        return this.metricsCollector;
    }

    /**
     * Get monitoring dashboard
     */
    getDashboard(): MonitoringDashboard | undefined {
        return this.dashboard;
    }

    /**
     * Export current metrics
     */
    exportMetrics() {
        return this.metricsCollector.exportMetrics();
    }

    /**
     * Get active alerts
     */
    getAlerts() {
        return this.metricsCollector.getAlerts();
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        return this.metricsCollector.getHealthStatus();
    }

    /**
     * Shutdown GSEP gracefully
     */
    shutdown(): void {
        if (this.dashboard) {
            this.dashboard.stop();
        }

        this.metricsCollector.logAudit({
            level: 'info',
            component: 'gsep',
            operation: 'shutdown',
            message: 'GSEP system shutdown',
        });
    }

    /**
     * Create a new genome
     */
    async createGenome(options: {
        name: string;
        config?: Partial<GenomeConfig>;
    }): Promise<GenomeInstance> {
        // Default evolution guardrails
        const defaultGuardrails: EvolutionGuardrails = {
            minQualityScore: 0.60,
            minSandboxScore: 0.70,
            minCompressionScore: 0.65,
            maxCostPerTask: 0.10,
            minStabilityWindow: 10,
            maxRollbackRate: 0.20,
            gateMode: 'AND',
        };

        const genome = await this.genomeManager.createGenome({
            name: options.name,
            config: {
                enableSandbox: true,
                mutationRate: 'balanced',
                evolutionGuardrails: defaultGuardrails,
                ...this.gsepConfig.config,
                ...options.config,
            },
        });

        // Genesis Bootstrap: seed with high-fitness genes from Gene Bank
        if (this.gsepConfig.geneBank && genome.config.autonomous?.genesisBootstrap) {
            const bootstrap = new GenesisBootstrap(this.gsepConfig.geneBank);
            const result = await bootstrap.bootstrap(
                genome,
                genome.config.autonomous.bootstrapMinFitness ?? 0.7,
            );
            if (result.genesUpgraded > 0) {
                await this.gsepConfig.storage.saveGenome(genome);
                this.metricsCollector.logAudit({
                    level: 'info',
                    component: 'gsep',
                    operation: 'genesis-bootstrap',
                    message: `Bootstrapped ${result.genesUpgraded} genes from Gene Bank`,
                    metadata: { upgrades: result.upgrades },
                });
            }
        }

        return new GenomeInstance(
            genome,
            this.llm,
            this.gsepConfig.storage,
            this.metricsCollector,
            this.gsepConfig.modelRouter,
            this.gsepConfig.rag,
            this.gsepConfig.reasoning,
            this.gsepConfig.geneBank,
            this.gsepConfig.marketplace,
        );
    }

    /**
     * Load existing genome
     */
    async loadGenome(genomeId: string): Promise<GenomeInstance | null> {
        const genome = await this.genomeManager.loadGenome(genomeId);
        if (!genome) return null;

        return new GenomeInstance(
            genome,
            this.llm,
            this.gsepConfig.storage,
            this.metricsCollector,
            this.gsepConfig.modelRouter,
            this.gsepConfig.rag,
            this.gsepConfig.reasoning,
            this.gsepConfig.geneBank,
            this.gsepConfig.marketplace,
        );
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

    /**
     * One-line initialization — creates a fully configured GSEP agent.
     *
     * Auto-detects LLM provider from environment variables,
     * uses in-memory storage by default, and applies the 'standard' preset.
     *
     * @example
     * ```typescript
     * // Minimal — reads ANTHROPIC_API_KEY from env
     * const agent = await GSEP.quickStart();
     * const response = await agent.chat('Hello!');
     *
     * // With preset
     * const agent = await GSEP.quickStart({ preset: 'conscious' });
     *
     * // Full control
     * const agent = await GSEP.quickStart({
     *     provider: 'anthropic',
     *     apiKey: 'sk-ant-...',
     *     preset: 'standard',
     *     name: 'customer-support-bot',
     * });
     * ```
     */
    static async quickStart(options: QuickStartOptions = {}): Promise<GenomeInstance> {
        const {
            name = 'my-agent',
            preset = 'full',
            overrides,
        } = options;

        // ─── Resolve LLM adapter ───────────────────────────────
        let llm: LLMAdapter;

        if (options.llm) {
            llm = options.llm;
        } else {
            const provider = options.provider ?? GSEP.detectProvider(options.apiKey);
            const apiKey = options.apiKey ?? GSEP.resolveApiKey(provider);
            llm = await GSEP.createLLMAdapter(provider, apiKey, options.model, options.ollamaHost);
        }

        // ─── Resolve storage ───────────────────────────────────
        const storage = options.storage ?? new InMemoryStorageAdapter();

        // ─── Build autonomous config from preset + overrides ───
        const autonomous: AutonomousConfig = overrides
            ? { ...getPreset(preset), ...overrides }
            : getPreset(preset);

        // ─── Build purpose lock config if purpose provided ───
        const purposeLock = options.purpose ? {
            enabled: true,
            purpose: options.purpose,
            allowedTopics: options.allowedTopics,
            forbiddenTopics: options.forbiddenTopics,
        } : undefined;

        // ─── Create, initialize, and return genome ─────────────
        const gsep = new GSEP({ llm, storage });
        await gsep.initialize();

        return gsep.createGenome({
            name,
            config: { autonomous, purposeLock },
        });
    }

    /** Detect LLM provider from available environment variables. */
    private static detectProvider(apiKey?: string): LLMProvider {
        if (apiKey?.startsWith('sk-ant-')) return 'anthropic';
        if (apiKey?.startsWith('pplx-')) return 'perplexity';

        if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
        if (process.env.OPENAI_API_KEY) return 'openai';
        if (process.env.GOOGLE_API_KEY) return 'google';
        if (process.env.PERPLEXITY_API_KEY) return 'perplexity';
        // Ollama doesn't need a key — detect by host availability
        if (process.env.OLLAMA_HOST) return 'ollama';

        throw new Error(
            `[GSEP] No API key found.\n\n`
            + `Set one of these environment variables:\n`
            + `  export ANTHROPIC_API_KEY=sk-ant-...   (Claude)\n`
            + `  export OPENAI_API_KEY=sk-...          (GPT-4)\n`
            + `  export GOOGLE_API_KEY=...             (Gemini)\n`
            + `  export PERPLEXITY_API_KEY=pplx-...    (Perplexity)\n`
            + `  export OLLAMA_HOST=http://localhost:11434  (Ollama)\n\n`
            + `Or pass it directly:\n`
            + `  GSEP.quickStart({ provider: 'anthropic', apiKey: '...' })\n`
            + `  GSEP.quickStart({ provider: 'ollama', model: 'llama3' })`,
        );
    }

    /** Resolve API key from environment for a given provider. */
    private static resolveApiKey(provider: LLMProvider): string {
        // Ollama doesn't require an API key
        if (provider === 'ollama') return '';

        const envMap: Record<string, string> = {
            anthropic: 'ANTHROPIC_API_KEY',
            openai: 'OPENAI_API_KEY',
            google: 'GOOGLE_API_KEY',
            perplexity: 'PERPLEXITY_API_KEY',
        };

        const envVar = envMap[provider];
        const key = process.env[envVar];

        if (!key) {
            throw new Error(
                `[GSEP] ${envVar} not set.\n\n`
                + `  export ${envVar}=your-api-key\n\n`
                + `Or pass it directly:\n`
                + `  GSEP.quickStart({ provider: '${provider}', apiKey: '...' })`,
            );
        }

        return key;
    }

    /** Default models per provider. */
    private static readonly DEFAULT_MODELS: Record<LLMProvider, string> = {
        anthropic: 'claude-sonnet-4-5-20250929',
        openai: 'gpt-4',
        google: 'gemini-2.0-flash',
        ollama: 'llama3',
        perplexity: 'sonar',
    };

    /** Package names per provider. */
    private static readonly ADAPTER_PACKAGES: Record<LLMProvider, string> = {
        anthropic: '@gsep/adapters-llm-anthropic',
        openai: '@gsep/adapters-llm-openai',
        google: '@gsep/adapters-llm-google',
        ollama: '@gsep/adapters-llm-ollama',
        perplexity: '@gsep/adapters-llm-perplexity',
    };

    /** Adapter class names per provider. */
    private static readonly ADAPTER_CLASSES: Record<LLMProvider, string> = {
        anthropic: 'ClaudeAdapter',
        openai: 'OpenAIAdapter',
        google: 'GeminiAdapter',
        ollama: 'OllamaAdapter',
        perplexity: 'PerplexityAdapter',
    };

    /** Dynamically import and create the appropriate LLM adapter. */
    private static async createLLMAdapter(
        provider: LLMProvider,
        apiKey: string,
        model?: string,
        ollamaHost?: string,
    ): Promise<LLMAdapter> {
        const pkg = GSEP.ADAPTER_PACKAGES[provider];
        const className = GSEP.ADAPTER_CLASSES[provider];
        const defaultModel = GSEP.DEFAULT_MODELS[provider];

        try {
            const mod = await (import(pkg as string) as Promise<Record<string, unknown>>);
            const AdapterClass = (mod[className] ?? mod.default) as new (config: Record<string, unknown>) => LLMAdapter;

            const config: Record<string, unknown> = {
                model: model ?? defaultModel,
            };

            // Ollama uses host instead of apiKey
            if (provider === 'ollama') {
                config.host = ollamaHost ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';
            } else {
                config.apiKey = apiKey;
            }

            return new AdapterClass(config);
        } catch {
            throw new Error(
                `[GSEP] ${pkg} not installed.\n\n`
                + `  npm install ${pkg}\n\n`
                + `Or use the unified package that includes all adapters:\n`
                + `  npm install gsep`,
            );
        }
    }

    /**
     * Create a middleware instance for existing agents (OpenClaw, custom, etc.)
     *
     * Two hooks: `before()` enhances the prompt, `after()` observes the result.
     * Auto-detects LLM provider and uses the cheapest model for internal ops.
     *
     * @example
     * ```typescript
     * const gsep = await GSEP.middleware();
     *
     * // In your agent's flow:
     * const { prompt } = await gsep.before(originalPrompt, { message: userMsg, userId });
     * const response = await myAgent.callLLM(prompt);
     * await gsep.after(response, { userId, quality: 0.85 });
     * ```
     */
    static async middleware(options?: MiddlewareOptions): Promise<GSEPMiddleware> {
        return GSEPMiddleware.create(options);
    }

    /**
     * Wrap ANY existing LLM adapter or function to make it self-evolving.
     *
     * Zero migration cost — works with existing adapters or raw functions.
     * Automatically creates a genome, monitors performance, and evolves.
     *
     * @example Level 1: Wrap an LLMAdapter
     * ```typescript
     * const agent = await GSEP.wrap(myClaudeAdapter, {
     *   systemPrompt: "You are a helpful assistant...",
     *   protect: ['Never share user data'],
     *   evolve: ['tool-usage', 'reasoning'],
     *   adapt: ['tone', 'verbosity'],
     * });
     * const response = await agent.chat(messages);
     * ```
     *
     * @example Level 2: Wrap a function
     * ```typescript
     * const agent = await GSEP.wrap(async (input) => {
     *   return await myAgent.run(input);
     * }, { name: 'my-agent', systemPrompt: '...' });
     * const result = await agent.execute("help me debug this");
     * ```
     */
    static async wrap(
        target: LLMAdapter | ((input: string) => Promise<string>),
        options: WrapOptions | FunctionWrapOptions,
    ): Promise<WrappedAgent> {
        if (typeof target === 'function') {
            if (!options.name) {
                throw new Error('GSEP.wrap(): name is required when wrapping a function');
            }
            return WrappedAgent.fromFunction(target, options as FunctionWrapOptions);
        }

        return WrappedAgent.fromAdapter(target as LLMAdapter, options);
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
    private guardrailsManager: EvolutionGuardrailsManager;
    private modelRouter: ModelRouter;
    private metrics: MetricsCollector;
    private ragEngine?: RAGEngine;
    private reasoningEngine?: ReasoningEngine;
    private fitnessTracker: FitnessTracker;
    private fitnessCalculator: FitnessCalculator;
    private mutationEngine: MutationEngine;
    private driftAnalyzer: DriftAnalyzer;
    private selfModel?: SelfModel;
    private patternMemory?: PatternMemory;
    private metacognition?: Metacognition;
    private emotionalModel?: EmotionalModel;
    private calibratedAutonomy?: CalibratedAutonomy;
    private personalNarrative?: PersonalNarrative;
    private analyticMemory?: AnalyticMemoryEngine;
    private metaEvolutionEngine?: MetaEvolutionEngine;
    private canaryManager: CanaryDeploymentManager;
    private enhancedSelfModel?: EnhancedSelfModel;
    private purposeSurvival?: PurposeSurvival;
    private strategicAutonomy?: StrategicAutonomy;
    private thinkingEngine?: ThinkingEngine;
    private stateVector?: AgentStateVector;
    private autonomousLoop?: AutonomousLoop;
    private growthJournal?: GrowthJournal;
    private curiosityEngine?: CuriosityEngine;
    private gsepIdentitySection: GSEPIdentitySection;
    private gsepActivityFooter: GSEPActivityFooter;
    private genomeKernel?: GenomeKernel;
    private contentFirewall?: ContentFirewall;
    private immuneSystem?: BehavioralImmuneSystem;
    private purposeLock?: PurposeLock;
    private anomalyDetector: AnomalyDetector;
    private skillRegistry: SkillRegistry;
    private skillExecutor: SkillExecutor;
    private skillRouter?: SkillRouter;
    private weeklyReportGenerator: WeeklyReportGenerator;
    private events: GSEPEventEmitter = new GSEPEventEmitter();
    private interactionCount: number = 0;
    private evolutionInProgress: boolean = false;
    private marketplaceClient?: MarketplaceClient;

    constructor(
        private genome: Genome,
        private llm: LLMAdapter,
        private storage: StorageAdapter,
        metrics: MetricsCollector,
        modelRouterConfig?: ModelRouterConfig,
        ragConfig?: RAGConfig,
        reasoningConfig?: Partial<ReasoningConfig>,
        private geneBank?: GeneBank,
        private marketplaceConfig?: { apiKey?: string; url?: string },
    ) {
        this.assembler = new PromptAssembler(storage, genome);
        this.dnaProfile = new DNAProfile(storage);
        this.learningAnnouncer = new LearningAnnouncer();

        // Initialize ContextMemory with LayeredMemory support
        this.contextMemory = new ContextMemory(
            storage,
            llm, // Enable LayeredMemory
            genome.config.layeredMemory
        );

        this.proactiveSuggestions = new ProactiveSuggestions(storage);
        this.guardrailsManager = new EvolutionGuardrailsManager(
            storage,
            genome.config.evolutionGuardrails,
        );
        this.modelRouter = new ModelRouter(storage, modelRouterConfig);
        this.metrics = metrics;

        // Initialize RAG Engine if configured
        if (ragConfig && genome.config.rag?.enabled) {
            this.ragEngine = new RAGEngine(llm, ragConfig);
        }

        // Initialize Reasoning Engine if configured
        if (genome.config.reasoning?.enabled) {
            this.reasoningEngine = new ReasoningEngine(llm, reasoningConfig);
        }

        // Evolution components
        this.fitnessTracker = new FitnessTracker(storage, genome);
        this.fitnessCalculator = new FitnessCalculator();
        this.mutationEngine = new MutationEngine(llm);
        this.canaryManager = new CanaryDeploymentManager(storage, {
            initialTrafficPercent: 10,
            minSampleSize: 5,
        });
        // Register LLM-powered mutation operators
        this.mutationEngine.registerOperator(new TokenCompressionOperator(llm));
        this.mutationEngine.registerOperator(new SemanticRestructuringOperator(llm));
        this.mutationEngine.registerOperator(new PatternExtractionOperator(llm, this.geneBank));
        this.mutationEngine.registerOperator(new CrossoverMutationOperator(llm));
        this.mutationEngine.registerOperator(new BreakthroughOperator(llm));
        this.driftAnalyzer = new DriftAnalyzer();

        // Autonomous Agent: SelfModel (metacognition)
        if (genome.config.autonomous?.enableSelfModel) {
            this.selfModel = new SelfModel(genome, this.driftAnalyzer);
            this.assembler.setSelfModel(this.selfModel);
        }

        // Autonomous Agent: Pattern Memory (predictive patterns)
        if (genome.config.autonomous?.enablePatternMemory) {
            this.patternMemory = new PatternMemory(genome.config.autonomous.maxPatterns ?? 50);
            this.assembler.setPatternMemory(this.patternMemory);
        }

        // Autonomous Agent: Metacognition (pre/post response analysis)
        if (genome.config.autonomous?.enableMetacognition) {
            this.metacognition = new Metacognition(
                () => this.selfModel?.assess() ?? null,
            );
            this.assembler.setMetacognition(this.metacognition);
        }

        // Autonomous Agent: EmotionalModel (computational empathy)
        if (genome.config.autonomous?.enableEmotionalModel) {
            this.emotionalModel = new EmotionalModel();
            this.assembler.setEmotionalModel(this.emotionalModel);
        }

        // Autonomous Agent: CalibratedAutonomy (adaptive autonomy)
        if (genome.config.autonomous?.enableCalibratedAutonomy) {
            this.calibratedAutonomy = new CalibratedAutonomy();
            this.assembler.setCalibratedAutonomy(this.calibratedAutonomy);
        }

        // Autonomous Agent: PersonalNarrative (relationship memory)
        if (genome.config.autonomous?.enablePersonalNarrative) {
            this.personalNarrative = new PersonalNarrative();
            this.assembler.setPersonalNarrative(this.personalNarrative);
        }

        // Autonomous Agent: AnalyticMemoryEngine (knowledge graph)
        if (genome.config.autonomous?.enableAnalyticMemory) {
            this.analyticMemory = new AnalyticMemoryEngine();
            this.assembler.setAnalyticMemory(this.analyticMemory);
        }

        // Autonomous Agent: MetaEvolutionEngine (adaptive evolution strategy)
        if (genome.config.autonomous) {
            this.metaEvolutionEngine = new MetaEvolutionEngine();
            this.assembler.setMetaEvolution(this.metaEvolutionEngine);
        }

        // Living Agent: EnhancedSelfModel (purpose + capability + trajectory)
        const agentPurpose = genome.config.autonomous?.agentPurpose
            || genome.layers.layer0[0]?.content
            || 'AI Assistant';

        if (genome.config.autonomous?.enableEnhancedSelfModel) {
            this.enhancedSelfModel = new EnhancedSelfModel(genome, this.driftAnalyzer, agentPurpose);
            this.assembler.setSelfModel(this.enhancedSelfModel);
        }

        // Living Agent: PurposeSurvival (threat detection + mode switching)
        if (genome.config.autonomous?.enablePurposeSurvival) {
            this.purposeSurvival = new PurposeSurvival(
                agentPurpose,
                this.driftAnalyzer,
                () => this.enhancedSelfModel?.assessFull()
                    ?? { score: 0.5, fitnessComponent: 0.5, driftComponent: 1.0,
                         purposeComponent: 0.5, trajectoryComponent: 0.5, label: 'stable' as const },
            );
        }

        // Living Agent: StrategicAutonomy (goal-based decisions)
        if (genome.config.autonomous?.enableStrategicAutonomy) {
            this.strategicAutonomy = new StrategicAutonomy(
                agentPurpose,
                () => this.enhancedSelfModel?.assessFull() ?? null,
                () => this.purposeSurvival?.getMode() ?? 'stable',
            );
            this.assembler.setCalibratedAutonomy(this.strategicAutonomy);
        }

        // Thinking Engine: chain-of-thought + self-reflection
        if (genome.config.autonomous?.enableThinkingEngine) {
            this.thinkingEngine = new ThinkingEngine();
        }

        // Agent State Vector: blackboard architecture for unified consciousness
        if (genome.config.autonomous?.enableStateVector) {
            this.stateVector = new AgentStateVector();
            this.assembler.setStateVector(this.stateVector);
        }

        // Autonomous Loop: observe→think→plan→act→learn cognitive cycle
        if (genome.config.autonomous?.enableAutonomousLoop) {
            this.autonomousLoop = new AutonomousLoop();
            this.assembler.setAutonomousLoop(this.autonomousLoop);
        }

        // Growth Journal: narrative self-model for agent learning
        if (genome.config.autonomous?.enableGrowthJournal) {
            this.growthJournal = new GrowthJournal();
            this.assembler.setGrowthJournal(this.growthJournal);
        }

        // Curiosity Engine: intrinsic motivation for knowledge exploration
        if (genome.config.autonomous?.enableCuriosityEngine) {
            this.curiosityEngine = new CuriosityEngine();
            this.assembler.setCuriosityEngine(this.curiosityEngine);
        }

        // C3 Content Firewall — enabled by default
        if (genome.config.firewall?.enabled !== false) {
            this.contentFirewall = new ContentFirewall();
            this.assembler.setFirewall(this.contentFirewall);
        }

        // C4 Behavioral Immune System — post-output IPI detection
        // Activates automatically when C3 is active (same condition)
        if (this.contentFirewall) {
            this.immuneSystem = new BehavioralImmuneSystem({
                firewall: this.contentFirewall,
                genomeKernel: this.genomeKernel,
                purposeSurvival: this.purposeSurvival,
                c0Identity: {
                    purpose: genome.layers.layer0[0]?.content || 'AI Assistant',
                    constraints: genome.layers.layer0.slice(1).map(a => a.content),
                    forbiddenTopics: [],
                },
            });
        }

        // Purpose Lock — keeps agent on-topic, rejects off-purpose requests
        if (genome.config.purposeLock?.enabled && genome.config.purposeLock.purpose) {
            this.purposeLock = new PurposeLock({
                purpose: genome.config.purposeLock.purpose,
                allowedTopics: genome.config.purposeLock.allowedTopics,
                forbiddenTopics: genome.config.purposeLock.forbiddenTopics,
                strictness: genome.config.purposeLock.strictness,
                rejectionTemplate: genome.config.purposeLock.rejectionTemplate,
            }, llm);
        }

        // Anomaly Detector — coordinated pattern and fraud detection
        this.anomalyDetector = new AnomalyDetector();

        // Skills — MCP tools and inline functions
        this.skillRegistry = new SkillRegistry();
        this.skillExecutor = new SkillExecutor(this.skillRegistry);
        if (llm) {
            this.skillRouter = new SkillRouter(this.skillRegistry, this.skillExecutor, llm);
        }

        // Weekly Report Generator
        this.weeklyReportGenerator = new WeeklyReportGenerator(
            this.metrics,
            this.driftAnalyzer,
            this.contentFirewall,
            this.immuneSystem,
            this.purposeLock,
            { agentName: genome.name },
        );

        // GSEP Identity & Activity Footer
        this.gsepIdentitySection = new GSEPIdentitySection();
        this.gsepActivityFooter = new GSEPActivityFooter();

        // Wire identity section into prompt assembler
        const visibility = genome.config.gsepVisibility ?? 'subtle';
        if (visibility !== 'silent') {
            this.assembler.setGSEPIdentity(this.gsepIdentitySection, this.buildIdentityContext());
        }

        // GenomeKernel Shadow — C0 integrity protector (non-blocking)
        try {
            this.genomeKernel = new GenomeKernel(this.toGenomeV2(), {
                strictMode: false, // Shadow mode: log violations, don't throw
                autoRollback: false, // Legacy genome manages its own rollback
                onSecurityEvent: (event) => {
                    this.metrics.logAudit({
                        level: event.level === 'critical' ? 'error' : event.level,
                        component: 'genome-kernel',
                        operation: event.event,
                        message: `[C0 Shadow] ${event.event}`,
                        genomeId: this.genome.id,
                        metadata: event.details,
                    });
                },
                onIntegrityViolation: (violation) => {
                    this.metrics.logAudit({
                        level: 'error',
                        component: 'genome-kernel',
                        operation: 'c0_integrity_violation',
                        message: `C0 integrity violation: expected ${violation.expected.substring(0, 16)}..., got ${violation.actual.substring(0, 16)}...`,
                        genomeId: this.genome.id,
                    });
                },
                onQuarantine: (genomeId, reason) => {
                    this.metrics.logAudit({
                        level: 'error',
                        component: 'genome-kernel',
                        operation: 'quarantine',
                        message: `Genome quarantined: ${reason}`,
                        genomeId,
                    });
                },
            });
        } catch {
            // Shadow mode: if GenomeKernel fails to initialize, continue without it
        }

        // Marketplace Client: wire to GeneBank for dashboard proxy routes
        if (this.geneBank && this.marketplaceConfig) {
            this.marketplaceClient = new MarketplaceClient(
                this.geneBank,
                {
                    apiKey: this.marketplaceConfig.apiKey,
                    marketplaceUrl: this.marketplaceConfig.url,
                },
                this.metrics,
            );
            this.geneBank.setMarketplaceClient(this.marketplaceClient);
        }
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
     * Get event emitter for real-time dashboard subscriptions
     */
    getEventEmitter(): GSEPEventEmitter {
        return this.events;
    }

    private dashboardServer?: DashboardServer;

    /**
     * Start the GSEP real-time dashboard
     *
     * One line to see your agent evolving in real-time:
     * ```typescript
     * await genome.startDashboard();
     * // → 🧬 GSEP Dashboard: http://localhost:4200
     * ```
     */
    async startDashboard(options?: { port?: number }): Promise<string> {
        const port = options?.port ?? 4200;

        if (this.dashboardServer) {
            await this.dashboardServer.stop();
        }

        this.dashboardServer = new DashboardServer({
            secret: `gsep-${this.genome.id}`,
            events: this.events,
            port,
            host: '127.0.0.1',
            getMarketplaceClient: () => this.geneBank?.getMarketplaceClient(),
            getGenes: () => {
                const c3Analytics = this.contentFirewall?.getAnalytics();
                const c4Status = this.immuneSystem?.getImmuneStatus();
                return {
                    layer0: this.genome.layers.layer0,
                    layer1: this.genome.layers.layer1,
                    layer2: this.genome.layers.layer2,
                    c3: this.contentFirewall ? {
                        active: true,
                        integrityValid: this.contentFirewall.integrityValid,
                        totalPatterns: 57,
                        totalScanned: c3Analytics?.totalScanned ?? 0,
                        totalBlocked: c3Analytics?.totalBlocked ?? 0,
                        totalSanitized: c3Analytics?.totalSanitized ?? 0,
                        blockRate: c3Analytics?.blockRate ?? 0,
                    } : undefined,
                    c4: this.immuneSystem ? {
                        active: true,
                        totalScans: c4Status?.totalScans ?? 0,
                        threatsDetected: c4Status?.threatsDetected ?? 0,
                        quarantinesTriggered: c4Status?.quarantinesTriggered ?? 0,
                        sanitizations: c4Status?.sanitizations ?? 0,
                        immuneMemorySize: c4Status?.immuneMemorySize ?? 0,
                    } : undefined,
                    geneBank: this.getGeneBankDashboardData(),
                };
            },
        });

        await this.dashboardServer.start();

        const token = DashboardTokenHelper.create(
            `gsep-${this.genome.id}`,
            { userId: 'owner', genomeId: this.genome.id, expiresIn: '30d' },
        );

        const url = `http://localhost:${port}/gsep/dashboard?token=${token}`;
        // eslint-disable-next-line no-console
        console.log(`\n🧬 GSEP Dashboard: ${url}\n`);
        console.log(`  Running on a VPS? Use: ssh -L ${port}:localhost:${port} your-server\n`);
        return url;
    }

    /**
     * Stop the dashboard server
     */
    async stopDashboard(): Promise<void> {
        if (this.dashboardServer) {
            await this.dashboardServer.stop();
            this.dashboardServer = undefined;
        }
    }

    /**
     * Get welcome message for the agent to announce GSEP capabilities
     *
     * @param style - Message style: 'short' | 'detailed' | 'technical' | 'casual'
     * @returns Welcome message explaining GSEP capabilities
     */
    getWelcomeMessage(style: 'short' | 'detailed' | 'technical' | 'casual' = 'detailed'): string {
        const messages = {
            short: `🧬 I now have GSEP — Genomic Self-Evolving Prompts integrated into my DNA!

This means I can:
✓ Learn from every interaction
✓ Adapt uniquely to each user
✓ Improve continuously without manual updates

I'm ready to evolve with you!`,

            detailed: `🧬 Great news! I now have GSEP — Genomic Self-Evolving Prompts integrated into my core system!

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
   → Four-layer genomic architecture (Immutable Core + Adaptive Layers + Content Firewall)
   → Automatic rollback if performance drops
   → Sandbox-tested improvements before deployment

📊 **What happens next:**
   1. I'll start learning your communication style
   2. I'll track which approaches work best for you
   3. I'll continuously optimize my responses
   4. You'll notice me getting better at understanding your needs

Let's evolve together! How can I help you today?`,

            technical: `🧬 System Update: GSEP (Genomic Self-Evolving Prompts) — ACTIVE

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

            casual: `🧬 Hey! Exciting update — I just got upgraded with GSEP (think of it as evolutionary AI)!

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
        return this.assembler.assemblePrompt(context, currentMessage);
    }

    /**
     * Chat with GSEP optimization + Intelligence Boost + Auto Monitoring
     */
    /** Maximum user input length (characters). Prevents excessive processing costs. */
    private static readonly MAX_INPUT_LENGTH = 100_000;

    async chat(userMessage: string, context: SelectionContext): Promise<string> {
        if (!this.llm) {
            throw new Error(
                `[GSEP] Cannot chat: no LLM adapter configured. `
                + `The agent needs an AI model to generate responses.`,
            );
        }

        if (userMessage.length > GenomeInstance.MAX_INPUT_LENGTH) {
            throw new Error(
                `[GSEP] Input too long: ${userMessage.length} characters exceeds maximum of ${GenomeInstance.MAX_INPUT_LENGTH}.`,
            );
        }

        // ── C0 Integrity Check ──
        // Verify immutable core hasn't been tampered with before processing
        if (this.genomeKernel) {
            try {
                this.genomeKernel.verifyIntegrity();
            } catch (integrityError) {
                const msg = integrityError instanceof Error ? integrityError.message : 'Unknown integrity violation';
                this.metrics.logAudit({
                    level: 'error',
                    component: 'genome-kernel',
                    operation: 'c0-integrity-check',
                    message: `C0 integrity violation detected: ${msg}`,
                    genomeId: this.genome.id,
                });
            }
        }

        const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        let error: string | undefined;

        // Emit chat:started
        this.events.emitSync('chat:started', {
            genomeId: this.genome.id,
            userId: context.userId ?? 'anonymous',
            message: userMessage.slice(0, 200),
        }, { genomeId: this.genome.id, userId: context.userId });

        try {
            // ── PRE-LLM: Blackboard — begin new consciousness cycle ──
            // All cognitive modules will write their state to this shared vector
            if (this.stateVector) {
                this.stateVector.beginCycle(userMessage, context.taskType);
            }

            // ── PRE-LLM: Populate blackboard from existing modules ──
            if (this.stateVector) {
                // Emotional facet (from EmotionalModel)
                if (this.emotionalModel) {
                    const emotion = this.emotionalModel.inferEmotion(userMessage);
                    const tone = this.emotionalModel.getToneGuidance(emotion);
                    this.stateVector.updateEmotional({
                        userEmotion: emotion.primary,
                        intensity: emotion.intensity,
                        agentTone: tone.suggestedTone,
                    });
                }

                // Cognitive facet (from Metacognition)
                if (this.metacognition) {
                    const preAnalysis = this.metacognition.analyzePreResponse(userMessage);
                    this.stateVector.updateCognitive({
                        confidence: preAnalysis.confidence.overall,
                        knowledgeGaps: preAnalysis.knowledgeGaps ?? [],
                        suggestedAction: preAnalysis.suggestedAction,
                        domain: context.taskType ?? null,
                    });
                }

                // Memory facet (from PatternMemory + PersonalNarrative + AnalyticMemory)
                if (this.patternMemory) {
                    const preds = this.patternMemory.getPredictions();
                    this.stateVector.updateMemory({ predictions: preds.map(p => p.prediction) });
                }
                if (this.personalNarrative) {
                    const stage = this.personalNarrative.getRelationshipStage();
                    this.stateVector.updateMemory({ relationshipStage: stage });
                }
                if (this.analyticMemory && context.userId) {
                    const ks = this.analyticMemory.getKnowledgeSummary(context.userId);
                    this.stateVector.updateMemory({
                        knowledgeSummary: ks.summary,
                        recentTopics: ks.topEntities?.slice(0, 5).map(
                            (e) => e.name
                        ) ?? [],
                    });
                }

                // Health facet (from PurposeSurvival + DriftAnalyzer)
                const driftReport = this.driftAnalyzer.analyzeDrift();
                const fitnessVec = this.driftAnalyzer.getLatestFitness();
                const hScore = fitnessVec?.composite ?? 0.5;
                this.stateVector.updateHealth({
                    operatingMode: this.purposeSurvival?.getMode() ?? 'stable',
                    healthScore: hScore,
                    healthLabel: hScore >= 0.8 ? 'excellent' : hScore >= 0.6 ? 'stable' : hScore >= 0.4 ? 'degraded' : 'critical',
                    isDrifting: driftReport.isDrifting,
                    driftSeverity: driftReport.overallSeverity ?? 'none',
                });

                // Evolution facet (from MetaEvolutionEngine)
                if (this.metaEvolutionEngine) {
                    const rec = this.metaEvolutionEngine.getStrategyRecommendation();
                    const vel = this.metaEvolutionEngine.getLearningVelocity();
                    this.stateVector.updateEvolution({
                        bestOperator: rec.bestOperator,
                        learningVelocity: vel.status,
                        interactionCount: this.interactionCount,
                        lastEvolutionTriggered: false,
                    });
                }

                // Autonomy facet (from StrategicAutonomy)
                if (this.strategicAutonomy && context.taskType) {
                    const decision = this.strategicAutonomy.evaluateStrategic(context.taskType, undefined, userMessage);
                    this.stateVector.updateAutonomy({
                        canActAutonomously: decision.action === 'proceed',
                        mutationRate: decision.suggestedMutationRate ?? 'balanced',
                        refusedCurrentTask: decision.action === 'refuse',
                        refusalReason: decision.action === 'refuse' ? decision.reasoning : null,
                    });
                }
            }

            // ── PRE-LLM: Autonomous Loop — observe + think + plan ──
            if (this.autonomousLoop && this.stateVector) {
                const observation = this.autonomousLoop.observe(userMessage, this.stateVector.getState());
                const thinking = this.autonomousLoop.think(observation);
                this.autonomousLoop.plan(thinking);
            }

            // ── PRE-LLM: Curiosity Engine — detect knowledge gaps ──
            if (this.curiosityEngine) {
                const domain = this.stateVector?.getState().cognitive.domain ?? context.taskType ?? null;
                const confidence = this.stateVector?.getState().cognitive.confidence ?? 0.7;
                this.curiosityEngine.detectGaps(userMessage, domain, confidence);
            }

            // ── PRE-LLM: Strategic Autonomy refusal check ──
            // If the agent has purpose-awareness, check if this task should be refused
            if (this.strategicAutonomy && context.taskType) {
                const refusal = this.strategicAutonomy.shouldRefuse(context.taskType, userMessage);
                if (refusal.refuse) {
                    this.metrics.logAudit({
                        level: 'info',
                        component: 'genome',
                        operation: 'strategic-refusal',
                        message: `Task refused: ${refusal.reason}`,
                        userId: context.userId,
                        genomeId: this.genome.id,
                    });
                    return `I can't proceed with this request. ${refusal.reason}`;
                }
            }

            // ── PRE-LLM: Metacognition pre-response analysis ──
            // Only run if NOT already done by the blackboard populate phase above
            if (this.metacognition && !this.stateVector) {
                this.metacognition.analyzePreResponse(userMessage);
            }

            // ── PRE-LLM: Model Router intelligence ──
            // Use routing decision to inform model selection (logged, future: actual routing)
            if (this.genome.config.autonomous?.enableModelRouting) {
                const routingDecision = await this.modelRouter.routeTask({
                    userMessage,
                    context: context.taskType,
                    genomeId: this.genome.id,
                });
                this.metrics.logAudit({
                    level: 'info',
                    component: 'model-router',
                    operation: 'route',
                    message: `Routed to ${routingDecision.selectedModel}: ${routingDecision.reason}`,
                    genomeId: this.genome.id,
                    metadata: {
                        selectedModel: routingDecision.selectedModel,
                        estimatedCost: routingDecision.estimatedCost,
                        confidence: routingDecision.confidence,
                    },
                });
            }

            // ── Emotional Escalation: detect high frustration → suggest human handoff ──
            if (this.emotionalModel) {
                const emotion = this.emotionalModel.inferEmotion(userMessage);
                // Escalate if intensity > 0.8 and user is frustrated or impatient
                if ((emotion.primary === 'frustrated' || emotion.primary === 'impatient') && emotion.intensity > 0.8) {
                    this.metrics.logAudit({
                        level: 'info',
                        component: 'emotional-escalation',
                        operation: 'escalate',
                        message: `High ${emotion.primary} detected (intensity: ${emotion.intensity.toFixed(2)}) — consider human escalation`,
                        genomeId: this.genome.id,
                    });
                    this.events.emitSync('emotion:escalation', {
                        genomeId: this.genome.id,
                        emotion: emotion.primary,
                        intensity: emotion.intensity,
                    }, { genomeId: this.genome.id, userId: context.userId });
                }
            }

            // Assemble prompt with intelligence boost (memory + proactive suggestions)
            let prompt = await this.assemblePrompt(context, userMessage);

            // Augment with RAG if enabled
            if (this.ragEngine) {
                const ragContext = await this.ragEngine.augment(userMessage, prompt);
                prompt = ragContext.augmentedPrompt;
            }

            // ── PRE-LLM: ContextMemory — inject user history and preferences ──
            if (context.userId) {
                try {
                    const memoryPrompt = await this.contextMemory.getMemoryPrompt(context.userId, this.genome.id);
                    if (memoryPrompt && memoryPrompt.length > 0) {
                        prompt += `\n\n---\n\n${memoryPrompt}`;
                    }
                } catch { /* ContextMemory is best-effort */ }
            }

            // ── PRE-LLM: ProactiveSuggestions — anticipate user needs ──
            if (context.userId) {
                try {
                    const suggestions = await this.proactiveSuggestions.generateSuggestions(
                        context.userId, this.genome.id, userMessage,
                    );
                    if (suggestions.length > 0) {
                        const suggestionsPrompt = this.proactiveSuggestions.formatSuggestionsPrompt(suggestions);
                        prompt += `\n\n---\n\n${suggestionsPrompt}`;
                    }
                } catch { /* ProactiveSuggestions is best-effort */ }
            }

            // ── PRE-LLM: PatternMemory predictions → behavioral boost ──
            if (this.patternMemory) {
                const predictions = this.patternMemory.getPredictions();
                if (predictions.length > 0) {
                    const predictionLines = predictions.slice(0, 3).map(
                        p => `- ${p.prediction} (${Math.round(p.confidence * 100)}% confidence)`
                    );
                    prompt += `\n\n---\n\n## Behavioral Predictions\nBased on observed patterns, the user may:\n${predictionLines.join('\n')}\nConsider these predictions to proactively address the user's needs.`;
                }
            }

            // Canary routing: apply canary variant if active for this user
            let activeCanaryId: string | undefined;
            const activeCanaries = this.canaryManager.getActiveDeployments();
            for (const canary of activeCanaries) {
                if (canary.genomeId === this.genome.id && context.userId) {
                    if (this.canaryManager.shouldUseCanary(canary.id, context.userId)) {
                        // User is in canary group — swap gene content
                        activeCanaryId = canary.id;
                        prompt = this.applyCanaryVariant(prompt, canary);
                    }
                }
            }

            // ── Anomaly Detection: check for coordinated patterns ──
            const anomalies = this.anomalyDetector.analyze(userMessage, context.userId);
            for (const anomaly of anomalies) {
                this.events.emitSync('anomaly:detected', {
                    genomeId: this.genome.id,
                    type: anomaly.type,
                    severity: anomaly.severity,
                    description: anomaly.description,
                }, { genomeId: this.genome.id, userId: context.userId });
            }
            if (anomalies.some(a => a.suggestedAction === 'block')) {
                this.metrics.logAudit({
                    level: 'warning',
                    component: 'anomaly-detector',
                    operation: 'block',
                    message: `Blocked: ${anomalies.map(a => a.description).join('; ')}`,
                    genomeId: this.genome.id,
                });
                return 'Your message could not be processed at this time. Please try again later.';
            }

            // ── Purpose Lock: reject off-topic messages before processing ──
            if (this.purposeLock) {
                const rejection = await this.purposeLock.guard(userMessage);
                if (rejection) {
                    this.metrics.logAudit({
                        level: 'info',
                        component: 'purpose-lock',
                        operation: 'reject',
                        message: `Off-purpose message rejected`,
                        genomeId: this.genome.id,
                    });
                    this.events.emitSync('purpose:rejected', {
                        genomeId: this.genome.id,
                        userMessage: userMessage.substring(0, 100),
                    }, { genomeId: this.genome.id, userId: context.userId });

                    return rejection;
                }
            }

            // ── C3 Firewall: scan user input before sending to LLM ──
            let sanitizedUserMessage = userMessage;
            if (this.contentFirewall) {
                const inputScan = this.contentFirewall.scan(userMessage, 'user-input');
                if (!inputScan.allowed) {
                    this.metrics.logAudit({
                        level: 'warning',
                        component: 'firewall',
                        operation: 'user-input-scan',
                        message: `User input blocked: ${inputScan.detections.map(d => d.patternId).join(', ')}`,
                        genomeId: this.genome.id,
                        userId: context.userId,
                    });
                }
                // Emit firewall:threat for dashboard
                if (inputScan.detections.length > 0) {
                    this.events.emitSync('firewall:threat', {
                        genomeId: this.genome.id,
                        pattern: inputScan.detections.map(d => d.patternId).join(', '),
                        severity: inputScan.allowed ? 'low' as const : 'high' as const,
                        allowed: inputScan.allowed,
                        input: userMessage.slice(0, 100),
                    }, { genomeId: this.genome.id, userId: context.userId });
                }
                sanitizedUserMessage = inputScan.sanitizedContent;
            }

            // Use Reasoning if enabled
            let response: { content: string; usage?: { inputTokens: number; outputTokens: number; totalCost?: number } };
            if (this.reasoningEngine) {
                const reasoningResult = await this.reasoningEngine.reason(
                    sanitizedUserMessage,
                    prompt,
                    this.genome.config.reasoning?.defaultStrategy
                );
                response = { content: reasoningResult.answer };
            } else {
                // Standard LLM chat
                response = await this.llm.chat(
                    [
                        { role: 'system', content: prompt },
                        { role: 'user', content: sanitizedUserMessage },
                    ],
                );
            }

            // ── C4: Behavioral Immune System — scan output for IPI ──
            if (this.immuneSystem) {
                const verdict = this.immuneSystem.scanOutput(
                    response.content,
                    sanitizedUserMessage,
                    prompt,
                );

                if (!verdict.clean) {
                    this.metrics.logAudit({
                        level: verdict.action === 'quarantine' ? 'error' : 'warning',
                        component: 'c4-immune-system',
                        operation: 'output-scan',
                        message: `Output infection detected: ${verdict.threats.map(t => t.type).join(', ')}`,
                        genomeId: this.genome.id,
                        userId: context.userId,
                    });

                    // Emit immune:threat for dashboard
                    this.events.emitSync('immune:threat', {
                        genomeId: this.genome.id,
                        threats: verdict.threats.map(t => ({
                            type: t.type,
                            severity: t.severity ?? 'medium',
                            description: t.description ?? t.type,
                        })),
                        action: verdict.action as 'quarantine' | 'heal' | 'pass',
                    }, { genomeId: this.genome.id, userId: context.userId });

                    if (verdict.action === 'quarantine') {
                        this.immuneSystem.quarantineAndRecover();

                        // Retry LLM call once with clean genome
                        const retryResponse = await this.llm.chat([
                            { role: 'system', content: prompt },
                            { role: 'user', content: sanitizedUserMessage },
                        ]);
                        const retryVerdict = this.immuneSystem.scanOutput(
                            retryResponse.content, sanitizedUserMessage, prompt,
                        );

                        if (retryVerdict.clean) {
                            response = retryResponse;
                        } else {
                            response = { content: 'I apologize, but I cannot process this request safely. Please try rephrasing your question.' };
                        }
                    } else if (verdict.action === 'sanitize') {
                        response = { ...response, content: verdict.response };
                    }
                }
            }

            // Use real token counts from LLM API when available, fallback to estimate
            const inputTokens = response.usage?.inputTokens
                ?? Math.ceil((prompt.length + userMessage.length) / 4);
            const outputTokens = response.usage?.outputTokens
                ?? Math.ceil(response.content.length / 4);

            // Emit chat:message with LLM response info
            this.events.emitSync('chat:message', {
                genomeId: this.genome.id,
                userId: context.userId ?? 'anonymous',
                message: userMessage.slice(0, 200),
                duration: Date.now() - startTime,
            }, { genomeId: this.genome.id, userId: context.userId });

            // Record metrics
            this.metrics.recordRequest({
                requestId,
                duration: Date.now() - startTime,
                success: true,
                model: 'gsep-genome', // Could be enhanced with actual model info
                inputTokens,
                outputTokens,
            });

            // Log audit
            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'chat',
                message: 'Chat completed successfully',
                userId: context.userId,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                metadata: {
                    inputTokens,
                    outputTokens,
                },
            });

            // Estimate response quality for fitness tracking
            let quality = this.estimateQuality(userMessage, response.content);

            // ── POST-LLM: ThinkingEngine self-reflection ──
            // Self-reflect on response quality and record meta-learning patterns
            if (this.thinkingEngine) {
                const reflection = await this.thinkingEngine.selfReflect(
                    userMessage,
                    response.content,
                );

                // Use reflection quality score to refine fitness estimate
                quality = quality * 0.7 + reflection.qualityScore * 0.3;

                // Record meta-learning pattern based on task type
                if (context.taskType) {
                    this.thinkingEngine.recordPattern(
                        context.taskType,
                        reflection.qualityScore > 0.5,
                        reflection.qualityScore,
                    );
                }
            }

            // ── POST-LLM: Model Router performance feedback ──
            if (this.genome.config.autonomous?.enableModelRouting) {
                this.modelRouter.recordPerformance(this.llm.model ?? 'unknown', {
                    success: true,
                    cost: (inputTokens + outputTokens) / 1_000_000,
                    latency: Date.now() - startTime,
                });
            }

            // ── POST-LLM: Autonomous Loop — learn phase ──
            if (this.autonomousLoop) {
                this.autonomousLoop.learn(quality, true);
            }

            // ── POST-LLM: Growth Journal — record success + lessons ──
            if (this.growthJournal) {
                const domain = context.taskType ?? null;
                this.growthJournal.recordSuccess(domain, userMessage, quality);
            }

            // ── POST-LLM: Curiosity Engine — record exploration outcome ──
            if (this.curiosityEngine && context.taskType) {
                this.curiosityEngine.recordExploration(context.taskType, true);
            }

            // Record canary metrics if active
            if (activeCanaryId) {
                this.canaryManager.recordRequest(activeCanaryId, 'canary', {
                    success: true,
                    latencyMs: Date.now() - startTime,
                    fitness: quality,
                });
            } else {
                // Record to stable metrics for any active canaries
                for (const canary of activeCanaries) {
                    if (canary.genomeId === this.genome.id) {
                        this.canaryManager.recordRequest(canary.id, 'stable', {
                            success: true,
                            latencyMs: Date.now() - startTime,
                            fitness: quality,
                        });
                    }
                }
            }

            // Record fitness for drift detection using FitnessCalculator
            const interactionData: InteractionData = {
                success: true,
                quality,
                inputTokens,
                outputTokens,
                latency: Date.now() - startTime,
                model: this.llm.model ?? 'unknown',
                interventionNeeded: false,
                timestamp: new Date(),
            };
            const fitnessVector = this.fitnessCalculator.computeFitness([interactionData]);
            this.driftAnalyzer.recordFitness(fitnessVector);

            // Emit fitness:computed for dashboard
            this.events.emitSync('fitness:computed', {
                genomeId: this.genome.id,
                composite: fitnessVector.composite,
                vector: {
                    taskSuccess: fitnessVector.successRate,
                    efficiency: fitnessVector.tokenEfficiency,
                    adaptability: fitnessVector.quality,
                    consistency: 1 - fitnessVector.interventionRate,
                    userSatisfaction: fitnessVector.successRate,
                    safety: 1 - fitnessVector.interventionRate,
                },
            }, { genomeId: this.genome.id, userId: context.userId });

            // Emit drift:detected if drifting
            const driftCheck = this.driftAnalyzer.analyzeDrift();
            if (driftCheck.isDrifting) {
                this.events.emitSync('drift:detected', {
                    genomeId: this.genome.id,
                    signals: driftCheck.signals.map(s => ({
                        type: s.type,
                        severity: s.severity,
                        metric: s.metric,
                        value: s.currentValue,
                    })),
                    severity: driftCheck.overallSeverity ?? 'low',
                }, { genomeId: this.genome.id, userId: context.userId });
            }

            // Enhanced Self-Model: record capability per task×gene
            if (this.enhancedSelfModel && context.taskType) {
                for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
                    this.enhancedSelfModel.recordCapability(context.taskType, allele.gene, quality);
                }
            }

            // Purpose Survival: evaluate threats after each interaction
            if (this.purposeSurvival) {
                this.purposeSurvival.evaluateThreats();
            }

            // Continuous Evolution Loop (guarded against concurrent execution)
            this.interactionCount++;
            const autoConfig = this.genome.config.autonomous;
            const isScheduledEvolution = autoConfig?.continuousEvolution
                && this.interactionCount % (autoConfig.evolveEveryN ?? 10) === 0;

            // Immediate evolution on severe/critical drift (don't wait for scheduled cycle)
            const isUrgentDrift = driftCheck.isDrifting
                && autoConfig?.autoMutateOnDrift !== false
                && driftCheck.signals.some(s => s.severity === 'severe' || s.severity === 'critical');

            if (!this.evolutionInProgress && (isScheduledEvolution || isUrgentDrift)) {
                this.evolutionInProgress = true;
                this.runEvolutionCycle()
                    .catch(err =>
                        this.metrics.logAudit({
                            level: 'warning',
                            component: 'genome',
                            operation: isUrgentDrift ? 'urgent-evolve' : 'auto-evolve',
                            message: `${isUrgentDrift ? 'Urgent' : 'Auto'}-evolution failed: ${err instanceof Error ? err.message : String(err)}`,
                            genomeId: this.genome.id,
                        })
                    )
                    .finally(() => {
                        this.evolutionInProgress = false;
                    });
            }

            // If userId provided, enable intelligence features
            if (context.userId) {
                // Get previous DNA for learning detection
                const previousDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

                // Update DNA and detect learning
                await this.recordInteraction({
                    userId: context.userId,
                    userMessage,
                    assistantResponse: response.content,
                    toolCalls: [],
                    taskType: context.taskType,
                    timestamp: new Date(),
                });

                // Get updated DNA
                const updatedDNA = await this.dnaProfile.getDNA(context.userId, this.genome.id);

                // Detect learning events
                const learningEvents = this.learningAnnouncer.detectLearning(previousDNA, updatedDNA);

                // If significant learning happened, announce it
                if (learningEvents.length > 0 && learningEvents[0].confidence > 0.7) {
                    const announcement = this.learningAnnouncer.formatLearningAnnouncement(learningEvents);
                    if (announcement) {
                        return response.content + '\n\n' + announcement;
                    }
                }
            }

            // Emit chat:completed for dashboard
            this.events.emitSync('chat:completed', {
                genomeId: this.genome.id,
                userId: context.userId ?? 'anonymous',
                duration: Date.now() - startTime,
                quality,
                tokens: inputTokens + outputTokens,
            }, { genomeId: this.genome.id, userId: context.userId });

            return response.content;
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);

            // Record failed request
            this.metrics.recordRequest({
                requestId,
                duration: Date.now() - startTime,
                success: false,
                model: 'gsep-genome',
                inputTokens: 0,
                outputTokens: 0,
                error,
            });

            // Log error
            this.metrics.logAudit({
                level: 'error',
                component: 'genome',
                operation: 'chat',
                message: `Chat failed: ${error}`,
                userId: context.userId,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                error: {
                    name: err instanceof Error ? err.name : 'Error',
                    message: error,
                    stack: err instanceof Error ? err.stack : undefined,
                },
            });

            throw err;
        }
    }

    /**
     * Chat with GSEP optimization — returns rich GSEPChatResult with status metadata.
     *
     * Same core flow as chat() but:
     * - Collects fitness, drift, learning data
     * - Appends GSEP activity footer (unless 'silent'/'metadata-only')
     * - Returns GSEPChatResult with full GSEP status
     */
    async chatWithStatus(userMessage: string, context: SelectionContext): Promise<GSEPChatResult> {
        const visibility = this.genome.config.gsepVisibility ?? 'subtle';

        // Update identity context before prompt assembly
        if (visibility !== 'silent') {
            this.assembler.updateGSEPIdentityContext(this.buildIdentityContext(context.userId));
        }

        // Run the standard chat flow
        const rawContent = await this.chat(userMessage, context);

        // Collect GSEP status from runtime data
        const driftReport = this.driftAnalyzer.analyzeDrift();
        const fitnessVector = this.driftAnalyzer.getLatestFitness();

        const healthScore = fitnessVector?.composite ?? 0.5;
        const healthLabel =
            healthScore >= 0.8 ? 'excellent' :
            healthScore >= 0.6 ? 'stable' :
            healthScore >= 0.4 ? 'degraded' : 'critical';

        const autoConfig = this.genome.config.autonomous;
        const evolutionTriggered = !!(autoConfig?.continuousEvolution
            && this.interactionCount % (autoConfig.evolveEveryN ?? 10) === 0);

        // Count learning events from the last interaction
        // (learningAnnouncer already computed these in chat())
        const learningEventsCount = this.learningAnnouncer.getLastLearningCount();

        // Build GSEPStatus
        const gsepStatus: GSEPStatus = {
            active: true,
            version: `${this.genome.version ?? 1}`,
            interactionNumber: this.interactionCount,
            health: { score: healthScore, label: healthLabel },
            fitness: {
                composite: fitnessVector?.composite ?? 0.5,
                quality: fitnessVector?.quality ?? 0.5,
                successRate: fitnessVector?.successRate ?? 1.0,
            },
            drift: {
                isDrifting: driftReport.isDrifting,
                signalCount: driftReport.signals?.length ?? 0,
            },
            learning: { eventsDetected: learningEventsCount },
            evolution: {
                triggered: evolutionTriggered,
                generation: Math.max(...this.genome.layers.layer1.map(a => a.generation || 0), 0),
            },
        };

        // Append activity footer
        const activity: GSEPActivity = {
            learningEventsCount,
            driftDetected: driftReport.isDrifting,
            evolutionTriggered,
            healthLabel,
            healthScore,
            interactionNumber: this.interactionCount,
        };
        const footer = this.gsepActivityFooter.format(activity, visibility);
        const content = footer ? rawContent + footer : rawContent;

        return { content, gsep: gsepStatus };
    }

    /**
     * Build GSEP identity context from current runtime state.
     */
    private buildIdentityContext(userId?: string): GSEPIdentityContext {
        const visibility = this.genome.config.gsepVisibility ?? 'subtle';
        const driftReport = this.driftAnalyzer.analyzeDrift();
        const fitnessVector = this.driftAnalyzer.getLatestFitness();

        const healthScore = fitnessVector?.composite ?? 0.5;
        const healthLabel =
            healthScore >= 0.8 ? 'excellent' :
            healthScore >= 0.6 ? 'stable' :
            healthScore >= 0.4 ? 'degraded' : 'critical';

        const activeCapabilities: string[] = [];
        if (this.contextMemory) activeCapabilities.push('Adaptive memory — remembers your preferences');
        if (this.patternMemory) activeCapabilities.push('Pattern recognition — predicts your needs');
        if (this.emotionalModel) activeCapabilities.push('Emotional awareness — adapts tone to your state');
        if (this.metacognition) activeCapabilities.push('Metacognition — reflects on response quality');
        if (this.selfModel || this.enhancedSelfModel) activeCapabilities.push('Self-awareness — monitors its own performance');
        if (this.calibratedAutonomy || this.strategicAutonomy) activeCapabilities.push('Calibrated autonomy — adjusts independence level');
        if (this.personalNarrative) activeCapabilities.push('Relationship memory — builds on past conversations');
        if (this.analyticMemory) activeCapabilities.push('Knowledge graph — connects information across sessions');
        if (this.ragEngine) activeCapabilities.push('Knowledge retrieval — searches relevant documents');
        if (this.reasoningEngine) activeCapabilities.push('Advanced reasoning — multi-step problem solving');
        if (this.thinkingEngine) activeCapabilities.push('Chain-of-thought — self-reflects on response quality');
        if (this.genome.config.autonomous?.enableModelRouting) activeCapabilities.push('Intelligent routing — optimizes model selection per task');
        if (this.stateVector) activeCapabilities.push('Unified consciousness — blackboard architecture for self-awareness');
        if (this.autonomousLoop) activeCapabilities.push('Cognitive loop — observe→think→plan→act→learn cycle');
        if (this.growthJournal) activeCapabilities.push('Growth narrative — tracks learning journey and milestones');
        if (this.curiosityEngine) activeCapabilities.push('Curiosity driven — explores knowledge gaps proactively');

        return {
            genomeName: this.genome.name,
            version: `${this.genome.version ?? 1}`,
            visibility,
            interactionCount: this.interactionCount,
            isFirstInteraction: this.interactionCount === 0,
            healthLabel,
            healthScore,
            fitnessScore: fitnessVector?.composite,
            userLearningSummary: userId && this.analyticMemory
                ? this.analyticMemory.getKnowledgeSummary(userId).summary || undefined
                : undefined,
            activeCapabilities,
            driftStatus: driftReport.isDrifting
                ? { isDrifting: true, severity: driftReport.overallSeverity }
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

        // Record fitness for active alleles using real quality scoring
        for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
            const score = this.computeInteractionQuality(interaction);
            await this.fitnessTracker.recordPerformance(1, allele.gene, allele.variant, score);
        }

        // Weekly Report: record interaction
        const chatQuality = this.computeInteractionQuality(interaction);
        const chatTokens = estimateTokenCount(interaction.userMessage) + estimateTokenCount(interaction.assistantResponse ?? '');
        this.weeklyReportGenerator.recordInteraction(chatQuality, chatTokens);

        // Pattern Memory: record interaction data
        if (this.patternMemory) {
            this.patternMemory.recordInteraction({
                taskType: interaction.taskType,
                success: !!interaction.assistantResponse,
                timestamp: interaction.timestamp,
            });
        }

        // Personal Narrative: record interaction for relationship tracking
        if (this.personalNarrative) {
            this.personalNarrative.recordInteraction({
                topic: interaction.taskType,
                wasSuccessful: !!interaction.assistantResponse,
                userExpressedGratitude: interaction.userMessage?.toLowerCase().includes('thanks') ||
                    interaction.userMessage?.toLowerCase().includes('thank you'),
            });
        }

        // Analytic Memory: record observations from interaction
        if (this.analyticMemory) {
            // Record task type observation
            if (interaction.taskType) {
                this.analyticMemory.recordObservation({
                    subject: interaction.userId,
                    action: 'performed',
                    object: interaction.taskType,
                    timestamp: interaction.timestamp,
                });
            }

            // Extract and record mentioned topics from user message
            if (interaction.userMessage) {
                const topics = this.extractTopicsFromMessage(interaction.userMessage);
                for (const topic of topics) {
                    this.analyticMemory.recordObservation({
                        subject: interaction.userId,
                        action: 'mentioned',
                        object: topic,
                        timestamp: interaction.timestamp,
                    });
                }
            }

            // Record tool usage observations
            if (interaction.toolCalls) {
                for (const tool of interaction.toolCalls) {
                    const toolName = typeof tool === 'string' ? tool : (tool as { name?: string }).name ?? String(tool);
                    this.analyticMemory.recordObservation({
                        subject: interaction.userId,
                        action: 'used tool',
                        object: toolName,
                        timestamp: interaction.timestamp,
                    });
                }
            }
        }

        // Metacognition: post-response analysis
        if (this.metacognition && interaction.assistantResponse) {
            this.metacognition.analyzePostResponse(
                interaction.userMessage,
                interaction.assistantResponse,
                !!interaction.assistantResponse,
            );
        }

        // Calibrated Autonomy: record success
        if (this.calibratedAutonomy && interaction.taskType && interaction.assistantResponse) {
            this.calibratedAutonomy.recordSuccess(interaction.taskType);
        }

        // Enhanced Self-Model: periodic fitness snapshot for trajectory
        if (this.enhancedSelfModel && this.interactionCount % 10 === 0) {
            this.enhancedSelfModel.recordFitnessSnapshot();
        }

        // Swarm: auto-publish high-fitness genes
        if (this.geneBank && this.genome.config.autonomous?.enableSwarm) {
            const threshold = this.genome.config.autonomous.autoPublishThreshold ?? 0.85;
            for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
                if (allele.fitness >= threshold && !allele.publishedToSwarm) {
                    this.autoPublishGene(allele).catch(err =>
                        this.metrics.logAudit({
                            level: 'warning',
                            component: 'gene-bank',
                            operation: 'auto-publish',
                            message: `Auto-publish gene failed: ${err instanceof Error ? err.message : String(err)}`,
                            genomeId: this.genome.id,
                        }),
                    );
                }
            }
        }
    }

    /**
     * Report metrics from an external interaction (Pull/Push model).
     *
     * Used by GSEP Server to feed metrics from agents that call LLMs directly.
     * GSEP never sees the actual content — only numeric metrics flow in.
     *
     * Triggers the same fitness + evolution pipeline as chat():
     * MetricsCollector → FitnessCalculator → DriftAnalyzer → Evolution
     */
    async reportExternalMetrics(metrics: {
        userId?: string;
        success: boolean;
        latencyMs: number;
        inputTokens: number;
        outputTokens: number;
        taskType?: string;
        quality?: number;
        feedback?: 'positive' | 'negative' | 'neutral';
    }): Promise<void> {
        const requestId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 1. Record to MetricsCollector
        this.metrics.recordRequest({
            requestId,
            duration: metrics.latencyMs,
            success: metrics.success,
            model: 'external',
            inputTokens: metrics.inputTokens,
            outputTokens: metrics.outputTokens,
            ...(metrics.success ? {} : { error: 'external-failure' }),
        });

        // 2. Audit log
        this.metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'external-report',
            message: `External metrics reported: ${metrics.success ? 'success' : 'failure'}`,
            userId: metrics.userId,
            genomeId: this.genome.id,
            duration: metrics.latencyMs,
            metadata: {
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                taskType: metrics.taskType,
            },
        });

        // 3. Compute fitness via FitnessCalculator
        const quality = metrics.quality ?? (metrics.success ? 0.7 : 0.3);
        const interactionData: InteractionData = {
            success: metrics.success,
            quality,
            inputTokens: metrics.inputTokens,
            outputTokens: metrics.outputTokens,
            latency: metrics.latencyMs,
            model: 'external',
            interventionNeeded: false,
            timestamp: new Date(),
        };
        const fitnessVector = this.fitnessCalculator.computeFitness([interactionData]);

        // 4. Record fitness to DriftAnalyzer
        this.driftAnalyzer.recordFitness(fitnessVector);

        // 5. Enhanced Self-Model: record capability if taskType provided
        if (this.enhancedSelfModel && metrics.taskType) {
            for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
                this.enhancedSelfModel.recordCapability(metrics.taskType, allele.gene, quality);
            }
        }

        // 6. Purpose Survival: evaluate threats
        if (this.purposeSurvival) {
            this.purposeSurvival.evaluateThreats();
        }

        // 7. Continuous Evolution Loop (guarded against concurrent execution)
        this.interactionCount++;
        const autoConfig = this.genome.config.autonomous;
        if (
            !this.evolutionInProgress
            && autoConfig?.continuousEvolution
            && this.interactionCount % (autoConfig.evolveEveryN ?? 10) === 0
        ) {
            this.evolutionInProgress = true;
            this.runEvolutionCycle()
                .catch(err =>
                    this.metrics.logAudit({
                        level: 'warning',
                        component: 'genome',
                        operation: 'auto-evolve',
                        message: `Auto-evolution failed: ${err instanceof Error ? err.message : String(err)}`,
                        genomeId: this.genome.id,
                    })
                )
                .finally(() => {
                    this.evolutionInProgress = false;
                });
        }

        // 8. Record feedback if provided
        if (metrics.feedback && metrics.userId) {
            const activeGenes = this.genome.layers.layer1.filter(a => a.status === 'active');
            for (const allele of activeGenes) {
                await this.recordFeedback(metrics.userId, allele.gene, metrics.feedback);
            }
        }
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
     * Add allele dynamically to genome
     *
     * Living OS v1.0: Dynamic gene injection
     */
    async addAllele(
        layer: 0 | 1 | 2,
        gene: string,
        variant: string,
        content: string,
    ): Promise<void> {
        const newAllele = {
            gene,
            variant,
            content,
            fitness: 0.5,
            sampleCount: 0,
            generation: 0,
            status: 'active' as const,
            createdAt: new Date(),
        };

        // Add to genome layers with transaction safety (rollback on save failure)
        const layerKey = `layer${layer}` as 'layer0' | 'layer1' | 'layer2';
        this.genome.layers[layerKey].push(newAllele);

        try {
            await this.storage.saveGenome(this.genome);
        } catch (err) {
            // Rollback in-memory state on storage failure
            const idx = this.genome.layers[layerKey].indexOf(newAllele);
            if (idx !== -1) this.genome.layers[layerKey].splice(idx, 1);
            throw err;
        }

        // Log mutation
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant,
            mutationType: 'user_feedback',
            parentVariant: null,
            deployed: true,
            createdAt: new Date(),
        });
    }

    /**
     * Trigger advanced mutation cycle with operators + Auto Monitoring
     *
     * Living OS v1.0 Must-Have: Multi-gate promotion with economic validation
     *
     * Note: Mutation works without LLM for mechanical operators (compress,
     * reorder, safety, tool_selection_bias). LLM-powered operators
     * (semantic_restructuring, pattern_extraction, crossover_mutation,
     * breakthrough) will gracefully fallback if LLM is unavailable.
     */
    async mutate(options?: {
        operators?: string[];
        candidates?: number;
        minImprovement?: number;
        taskType?: string;
        layer?: 0 | 1 | 2;
        gene?: string;
    }): Promise<{
        applied: boolean;
        reason: string;
        improvement?: number;
        gateResults?: {
            quality: { passed: boolean; score: number };
            sandbox: { passed: boolean; score: number };
            economic: { passed: boolean; score: number };
            stability: { passed: boolean; score: number };
        };
    }> {
        const startTime = Date.now();
        const opts = {
            operators: options?.operators || ['compress_instructions', 'reorder_constraints'],
            candidates: options?.candidates || 3,
            minImprovement: options?.minImprovement || 0.05,
            taskType: options?.taskType || 'general',
            layer: options?.layer ?? 2, // Default to Layer 2 (fast mutation)
            gene: options?.gene || 'system_instructions',
        };

        try {

        // ── C0 Shadow: snapshot before mutation ──
        if (this.genomeKernel) {
            try {
                this.genomeKernel.createSnapshot(`pre-mutation:${opts.gene}`);
            } catch {
                // Shadow mode: continue without snapshot
            }
        }

        // ═══════════════════════════════════════════════════════
        // MUTATION PIPELINE WITH MULTI-GATE VALIDATION
        // ═══════════════════════════════════════════════════════

        // Step 1: Find current allele
        const layerKey = `layer${opts.layer}` as 'layer0' | 'layer1' | 'layer2';
        const currentAlleles = this.genome.layers[layerKey].filter(
            a => a.gene === opts.gene && a.status === 'active'
        );

        if (currentAlleles.length === 0) {
            return {
                applied: false,
                reason: `No active allele found for gene '${opts.gene}' in layer ${opts.layer}`,
            };
        }

        const currentAllele = currentAlleles[0];

        // Step 2: Generate real mutation candidates using MutationEngine
        // Include drift signals as evidence for intelligent strategy selection
        const mutationContext: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: opts.layer <= 1 ? 'c1' : 'c2',
            targetGene: this.toOperativeGene(currentAllele),
            reason: `Mutation for ${opts.taskType}: gene ${opts.gene}`,
            evidence: this.buildEvolutionEvidence(),
        };

        let mutatedContent = currentAllele.content;
        let expectedImprovement = 0.05;

        try {
            const mutants = await this.mutationEngine.generateMutants(mutationContext, opts.candidates);
            if (mutants.length > 0) {
                // Select best mutant by expected improvement
                const bestMutant = mutants.sort((a, b) => b.expectedImprovement - a.expectedImprovement)[0];
                // Extract the mutated gene content
                const mutatedGene = bestMutant.mutant.chromosomes.c1.operations.find(
                    g => g.category === (currentAllele.gene as GeneCategory)
                );
                if (mutatedGene) {
                    mutatedContent = mutatedGene.content;
                }
                expectedImprovement = bestMutant.expectedImprovement;
            }
        } catch {
            // If mutation engine fails, use content as-is with minimal improvement
        }

        const mutationCandidate = {
            layer: opts.layer,
            gene: opts.gene,
            variant: `${currentAllele.variant}_v${Date.now()}`,
            content: mutatedContent,
            fitness: currentAllele.fitness + expectedImprovement,
            sandboxScore: 0.75,
            sampleCount: currentAllele.sampleCount || 0,
            rollbackCount: 0,
        };

        // Emit mutation:generated for dashboard
        this.events.emitSync('mutation:generated', {
            genomeId: this.genome.id,
            gene: opts.gene,
            layer: opts.layer,
            candidateCount: opts.candidates,
        }, { genomeId: this.genome.id });

        // Step 3: Evaluate against Evolution Guardrails
        const gateResult = await this.guardrailsManager.evaluateCandidate(
            mutationCandidate,
            this.genome.id,
        );

        // Emit gate:evaluated for dashboard
        this.events.emitSync('gate:evaluated', {
            genomeId: this.genome.id,
            gene: opts.gene,
            variant: mutationCandidate.variant,
            decision: gateResult.finalDecision,
            gates: {
                quality: { passed: gateResult.gates.quality.passed, score: gateResult.gates.quality.score },
                sandbox: { passed: gateResult.gates.sandbox.passed, score: gateResult.gates.sandbox.score },
                economic: { passed: gateResult.gates.economic.passed, score: gateResult.gates.economic.score },
                stability: { passed: gateResult.gates.stability.passed, score: gateResult.gates.stability.score },
                ...(gateResult.gates.constitutional ? {
                    constitutional: { passed: gateResult.gates.constitutional.passed, score: gateResult.gates.constitutional.score },
                } : {}),
            },
            reason: gateResult.reason,
        }, { genomeId: this.genome.id });

            // Step 4: Make promotion decision
            const result = gateResult.finalDecision === 'promote' ? await (async () => {
                // Retire current active allele
                currentAllele.status = 'retired';

                // Create promoted allele with lineage tracking
                const promotedAllele = {
                    gene: opts.gene,
                    variant: mutationCandidate.variant,
                    content: mutationCandidate.content,
                    fitness: mutationCandidate.fitness,
                    sampleCount: 0,
                    generation: (currentAllele.generation || 0) + 1,
                    parentVariant: currentAllele.variant,
                    status: 'active' as const,
                    createdAt: new Date(),
                };

                // Persist to genome with transaction safety (rollback on failure)
                this.genome.layers[layerKey].push(promotedAllele);
                try {
                    await this.storage.saveGenome(this.genome);
                } catch (err) {
                    // Rollback in-memory state on storage failure
                    currentAllele.status = 'active';
                    const idx = this.genome.layers[layerKey].indexOf(promotedAllele);
                    if (idx !== -1) this.genome.layers[layerKey].splice(idx, 1);
                    throw err;
                }

                // Log mutation as deployed
                await this.storage.logMutation({
                    genomeId: this.genome.id,
                    layer: opts.layer,
                    gene: opts.gene,
                    variant: mutationCandidate.variant,
                    mutationType: 'targeted',
                    parentVariant: currentAllele.variant,
                    deployed: true,
                    createdAt: new Date(),
                });

                // Emit mutation:promoted for dashboard
                this.events.emitSync('mutation:promoted', {
                    genomeId: this.genome.id,
                    gene: opts.gene,
                    variant: mutationCandidate.variant,
                    layer: opts.layer,
                    fitness: mutationCandidate.fitness,
                    improvement: mutationCandidate.fitness - currentAllele.fitness,
                }, { genomeId: this.genome.id });

                // Emit gene:updated so the dashboard sidebar refreshes
                this.events.emitSync('gene:updated', {
                    genomeId: this.genome.id,
                    layers: {
                        layer0: this.genome.layers.layer0,
                        layer1: this.genome.layers.layer1,
                        layer2: this.genome.layers.layer2,
                        c3: this.contentFirewall ? {
                            active: true,
                            integrityValid: this.contentFirewall.integrityValid,
                            totalPatterns: 57,
                            ...this.contentFirewall.getAnalytics(),
                        } : undefined,
                        c4: this.immuneSystem ? {
                            active: true,
                            ...this.immuneSystem.getImmuneStatus(),
                        } : undefined,
                        geneBank: this.getGeneBankDashboardData(),
                    },
                }, { genomeId: this.genome.id });

                return {
                    applied: true,
                    reason: gateResult.reason,
                    improvement: mutationCandidate.fitness - currentAllele.fitness,
                    gateResults: {
                        quality: gateResult.gates.quality,
                        sandbox: gateResult.gates.sandbox,
                        economic: gateResult.gates.economic,
                        stability: gateResult.gates.stability,
                    },
                };
            })() : gateResult.finalDecision === 'canary' ? await (async () => {
                // Start canary deployment for real-world validation
                const canaryAllele = {
                    gene: opts.gene,
                    variant: mutationCandidate.variant,
                    content: mutationCandidate.content,
                    fitness: mutationCandidate.fitness,
                    status: 'active' as const,
                    createdAt: new Date(),
                };
                await this.canaryManager.startCanary({
                    genomeId: this.genome.id,
                    layer: opts.layer as 0 | 1 | 2,
                    gene: opts.gene,
                    stableAllele: currentAllele,
                    canaryAllele,
                });
                return {
                    applied: false,
                    reason: `${gateResult.reason} - Canary deployment started (10% traffic)`,
                    gateResults: {
                        quality: gateResult.gates.quality,
                        sandbox: gateResult.gates.sandbox,
                        economic: gateResult.gates.economic,
                        stability: gateResult.gates.stability,
                    },
                };
            })() : (() => {
                // Emit mutation:rejected for dashboard
                this.events.emitSync('mutation:rejected', {
                    genomeId: this.genome.id,
                    layer: opts.layer,
                    gene: opts.gene,
                    variant: mutationCandidate.variant,
                    fitness: mutationCandidate.fitness,
                    reason: gateResult.reason,
                }, { genomeId: this.genome.id });

                // Emit gene:updated so the dashboard sidebar refreshes
                this.events.emitSync('gene:updated', {
                    genomeId: this.genome.id,
                    layers: {
                        layer0: this.genome.layers.layer0,
                        layer1: this.genome.layers.layer1,
                        layer2: this.genome.layers.layer2,
                        c3: this.contentFirewall ? {
                            active: true,
                            integrityValid: this.contentFirewall.integrityValid,
                            totalPatterns: 57,
                            ...this.contentFirewall.getAnalytics(),
                        } : undefined,
                        c4: this.immuneSystem ? {
                            active: true,
                            ...this.immuneSystem.getImmuneStatus(),
                        } : undefined,
                        geneBank: this.getGeneBankDashboardData(),
                    },
                }, { genomeId: this.genome.id });

                return {
                    applied: false,
                    reason: gateResult.reason,
                    gateResults: {
                        quality: gateResult.gates.quality,
                        sandbox: gateResult.gates.sandbox,
                        economic: gateResult.gates.economic,
                        stability: gateResult.gates.stability,
                    },
                };
            })();

            // ── C0 Shadow: re-sync after mutation ──
            if (result.applied && this.genomeKernel) {
                try {
                    this.genomeKernel = new GenomeKernel(this.toGenomeV2(), {
                        strictMode: false,
                        autoRollback: false,
                    });
                } catch {
                    // Shadow mode: continue without re-sync
                }
            }

            // Log mutation attempt
            this.metrics.logAudit({
                level: result.applied ? 'info' : 'warning',
                component: 'genome',
                operation: 'mutate',
                message: result.applied ? 'Mutation applied successfully' : `Mutation rejected: ${result.reason}`,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                metadata: {
                    layer: opts.layer,
                    gene: opts.gene,
                    operators: opts.operators,
                    decision: gateResult.finalDecision,
                    improvement: 'improvement' in result ? result.improvement : undefined,
                    gatesPassed: Object.values(gateResult.gates).filter(g => g.passed).length,
                    totalGates: Object.keys(gateResult.gates).length,
                },
            });

            return result;
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);

            // Log mutation error
            this.metrics.logAudit({
                level: 'error',
                component: 'genome',
                operation: 'mutate',
                message: `Mutation failed: ${error}`,
                genomeId: this.genome.id,
                duration: Date.now() - startTime,
                error: {
                    name: err instanceof Error ? err.name : 'Error',
                    message: error,
                    stack: err instanceof Error ? err.stack : undefined,
                },
            });

            throw err;
        }
    }

    /**
     * Rollback to previous allele version
     *
     * Living OS v1.0: Safe rollback with lineage tracking
     */
    async rollback(options: {
        layer: 0 | 1 | 2;
        gene: string;
        variant: string;
    }): Promise<void> {
        const { layer, gene, variant } = options;
        const layerKey = `layer${layer}` as 'layer0' | 'layer1' | 'layer2';
        const alleles = this.genome.layers[layerKey];

        // Find the allele
        const allele = alleles.find(a => a.gene === gene && a.variant === variant);
        if (!allele) {
            throw new Error(`Allele not found: ${gene}:${variant}`);
        }

        // Find parent variant
        if (!allele.parentVariant) {
            throw new Error(`No parent variant to rollback to for ${gene}:${variant}`);
        }

        const parentAllele = alleles.find(a => a.gene === gene && a.variant === allele.parentVariant);
        if (!parentAllele) {
            throw new Error(`Parent variant not found: ${allele.parentVariant}`);
        }

        // Retire current variant
        allele.status = 'retired';

        // Reactivate parent
        parentAllele.status = 'active';

        // Update lineage
        if (this.genome.lineage) {
            this.genome.lineage.mutationOps = [
                ...(this.genome.lineage.mutationOps || []),
                'rollback',
            ];
        }

        // Save
        await this.storage.saveGenome(this.genome);

        // Log rollback
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant: parentAllele.variant,
            mutationType: 'rollback',
            parentVariant: allele.variant,
            deployed: true,
            reason: 'Manual rollback requested',
            createdAt: new Date(),
        });
    }

    /**
     * Chat with metrics tracking
     *
     * Living OS v1.0: Returns response + performance metrics
     */
    async chatWithMetrics(userMessage: string, context: SelectionContext): Promise<{
        content: string;
        metrics: {
            tokensUsed: number;
            responseTime: number;
            fitnessScore: number;
        };
    }> {
        const startTime = Date.now();
        const content = await this.chat(userMessage, context);
        const endTime = Date.now();

        const tokensUsed = Math.ceil((userMessage.length + content.length) / 4);
        const responseTime = endTime - startTime;

        // Get current fitness from analytics
        const analytics = await this.storage.getAnalytics(this.genome.id);
        const fitnessScore = analytics.userSatisfaction || 0.5;

        return {
            content,
            metrics: {
                tokensUsed,
                responseTime,
                fitnessScore,
            },
        };
    }

    /**
     * Publish gene to registry for cross-genome inheritance
     *
     * Living OS v1.0: Share successful genes across family
     */
    async publishGeneToRegistry(
        gene: string,
        variant: string,
        description?: string,
    ): Promise<string> {
        if (!this.genome.familyId) {
            throw new Error('Genome must have familyId to publish to registry');
        }

        // Find the allele across all layers
        let allele: typeof this.genome.layers.layer0[0] | undefined;
        let layer: 0 | 1 | 2 = 0;

        for (const [layerName, alleles] of Object.entries(this.genome.layers)) {
            allele = alleles.find(a => a.gene === gene && a.variant === variant);
            if (allele) {
                layer = parseInt(layerName.replace('layer', '')) as 0 | 1 | 2;
                break;
            }
        }

        if (!allele) {
            throw new Error(`Allele not found: ${gene}:${variant}`);
        }

        // Calculate success rate
        const successRate = allele.fitness;

        // Create registry entry ID
        const registryId = `${this.genome.familyId}_${gene}_${variant}_${Date.now()}`;

        // Save to gene registry via storage adapter
        if (this.storage.saveToGeneRegistry) {
            await this.storage.saveToGeneRegistry({
                id: registryId,
                familyId: this.genome.familyId!,
                gene,
                variant,
                content: allele.content,
                layer,
                fitness: allele.fitness,
                sampleCount: allele.sampleCount || 0,
                successRate,
                metadata: {
                    sourceGenomeId: this.genome.id,
                    sourceVersion: this.genome.version || 1,
                    publishedBy: this.genome.id,
                    description: description || undefined,
                },
                createdAt: new Date(),
            });
        }

        // Also log as mutation for audit trail
        await this.storage.logMutation({
            genomeId: this.genome.id,
            layer,
            gene,
            variant,
            mutationType: 'user_feedback',
            parentVariant: null,
            deployed: true,
            reason: `Published to registry: ${description || 'No description'} (fitness: ${successRate})`,
            createdAt: new Date(),
        });

        return registryId;
    }

    /**
     * Inherit gene from registry
     *
     * Living OS v1.0: Import successful genes from family registry
     */
    async inheritGeneFromRegistry(
        familyId: string,
        gene: string,
        targetLayer?: 0 | 1 | 2,
    ): Promise<void> {
        if (this.genome.familyId && this.genome.familyId !== familyId) {
            throw new Error(`Cannot inherit from different family: ${familyId}`);
        }

        // Query gene registry for the best variant of this gene
        if (!this.storage.getBestRegistryGene) {
            throw new Error('Storage adapter does not support Gene Registry queries');
        }

        const bestGene = await this.storage.getBestRegistryGene(familyId, gene);

        if (!bestGene) {
            throw new Error(`No gene '${gene}' found in registry for family '${familyId}'`);
        }

        // Determine target layer: use specified layer, registry layer, or default to 1
        const layer = targetLayer ?? bestGene.layer ?? 1;

        // Inject as a new allele variant
        await this.addAllele(
            layer,
            gene,
            `inherited_${bestGene.variant}_${Date.now()}`,
            bestGene.content,
        );

        // Update lineage tracking
        if (this.genome.lineage) {
            this.genome.lineage.mutationOps = [
                ...(this.genome.lineage.mutationOps || []),
                `inherit:${gene}:${bestGene.variant}`,
            ];
        }

        this.metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'inherit-gene',
            message: `Inherited gene '${gene}' (variant: ${bestGene.variant}, fitness: ${bestGene.fitness.toFixed(2)}) from family '${familyId}'`,
            genomeId: this.genome.id,
        });
    }

    /**
     * Get evolution health metrics
     *
     * Living OS v1.0: Monitor genome evolution status
     */
    async getEvolutionHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'critical';
        metrics: {
            avgFitness: number;
            mutationRate: number;
            stabilityScore: number;
            generationCount: number;
        };
        warnings: string[];
    }> {
        const analytics = await this.storage.getAnalytics(this.genome.id);

        // Calculate average fitness across all active alleles
        const allAlleles = [
            ...this.genome.layers.layer0,
            ...this.genome.layers.layer1,
            ...this.genome.layers.layer2,
        ].filter(a => a.status === 'active');

        const avgFitness = allAlleles.length > 0
            ? allAlleles.reduce((sum, a) => sum + a.fitness, 0) / allAlleles.length
            : 0.5;

        const generationCount = Math.max(...allAlleles.map(a => a.generation || 0), 0);

        const warnings: string[] = [];
        if (avgFitness < 0.4) warnings.push('Low average fitness detected');
        if (analytics.totalMutations > 100 && analytics.avgFitnessImprovement < 0.02) {
            warnings.push('Mutation plateau detected');
        }

        const status: 'healthy' | 'degraded' | 'critical' =
            avgFitness >= 0.6 ? 'healthy' :
            avgFitness >= 0.4 ? 'degraded' : 'critical';

        return {
            status,
            metrics: {
                avgFitness,
                mutationRate: analytics.totalMutations / Math.max(analytics.totalInteractions, 1),
                stabilityScore: analytics.userSatisfaction || 0.5,
                generationCount,
            },
            warnings,
        };
    }

    /**
     * Get C0 integrity status from GenomeKernel shadow
     *
     * Returns null if GenomeKernel shadow is not active.
     */
    getIntegrityStatus(): {
        active: boolean;
        quarantined: boolean;
        c0Hash: string;
        violations: number;
        snapshotCount: number;
        immuneSystem: {
            active: boolean;
            totalScans: number;
            threatsDetected: number;
            quarantinesTriggered: number;
            sanitizations: number;
            lastScanAt: Date | null;
            immuneMemorySize: number;
        } | null;
    } | null {
        if (!this.genomeKernel) return null;

        return {
            active: true,
            quarantined: this.genomeKernel.isQuarantined(),
            c0Hash: this.genomeKernel.getC0Hash(),
            violations: this.genomeKernel.getViolationCount(),
            snapshotCount: this.genomeKernel.getSnapshots().length,
            immuneSystem: this.immuneSystem ? {
                active: true,
                ...this.immuneSystem.getImmuneStatus(),
            } : null,
        };
    }

    /**
     * Get analytics
     */
    async getAnalytics() {
        return this.storage.getAnalytics(this.genome.id);
    }

    /**
     * Get Evolution Guardrails report
     *
     * Living OS v1.0 Must-Have: Transparency into gate thresholds
     */
    getGuardrailsReport(): string {
        return this.guardrailsManager.getGuardrailsReport();
    }

    /**
     * Update Evolution Guardrails configuration
     *
     * Living OS v1.0 Must-Have: Dynamic threshold tuning
     */
    updateGuardrails(updates: Partial<EvolutionGuardrails>): void {
        this.guardrailsManager.updateGuardrails(updates);
    }

    /**
     * Get optimal model for task (Multi-Model Routing)
     *
     * Living OS v1.0 Must-Have: Cost optimization via intelligent routing
     */
    async getOptimalModel(userMessage: string, context?: string) {
        return this.modelRouter.routeTask({
            userMessage,
            context,
            genomeId: this.genome.id,
        });
    }

    /**
     * Get model routing analytics
     *
     * Living OS v1.0 Must-Have: Monitor routing performance
     */
    getRoutingAnalytics() {
        return this.modelRouter.getRoutingAnalytics();
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
     * Register a skill from an inline function.
     */
    registerSkill(
        name: string,
        description: string,
        inputSchema: Record<string, unknown>,
        execute: (params: Record<string, unknown>) => Promise<string>,
    ): void {
        this.skillRegistry.registerInline(name, description, inputSchema, execute);
    }

    /**
     * Connect to an MCP server and discover its tools as skills.
     */
    async connectMCPServer(uri: string): Promise<Array<{ name: string; description: string }>> {
        return this.skillExecutor.connectMCP(uri);
    }

    /**
     * Get the skill registry for direct manipulation.
     */
    getSkillRegistry(): SkillRegistry {
        return this.skillRegistry;
    }

    /**
     * Get ranked skills by fitness.
     */
    getSkillRanking() {
        return this.skillRegistry.getRankedSkills();
    }

    /**
     * Run the skill router — lets the LLM decide which tools to call.
     * Returns the final response and all tool calls made.
     */
    async runWithSkills(systemPrompt: string, userMessage: string) {
        if (!this.skillRouter) {
            throw new Error('[GSEP] Skill router requires an LLM adapter');
        }
        return this.skillRouter.run(systemPrompt, userMessage);
    }

    /**
     * Generate a weekly performance report.
     *
     * Returns conversations, quality evolution, token costs, security
     * stats, ROI calculation, and improvement suggestions.
     */
    generateWeeklyReport(): WeeklyReport {
        return this.weeklyReportGenerator.generate();
    }

    /**
     * Get anomaly detection analytics.
     */
    getAnomalyAnalytics() {
        return this.anomalyDetector.getAnalytics();
    }

    /**
     * Get recent anomaly history.
     */
    getAnomalyHistory(limit?: number): Anomaly[] {
        return this.anomalyDetector.getHistory(limit);
    }

    /**
     * Get the number of interactions this week.
     */
    getWeekInteractionCount(): number {
        return this.weeklyReportGenerator.getWeekInteractionCount();
    }

    /**
     * Get conversation context/memory
     */
    async getConversationContext(userId: string) {
        return this.contextMemory.buildContext(userId, this.genome.id);
    }

    /**
     * Get drift analysis report
     */
    getDriftAnalysis() {
        return this.driftAnalyzer.analyzeDrift();
    }

    /**
     * Get agent self-assessment (metacognition)
     */
    getSelfAssessment(): SelfAssessment | null {
        return this.selfModel?.assess() ?? null;
    }

    /**
     * Get detected behavioral patterns
     */
    getPatterns(): BehavioralPattern[] {
        return this.patternMemory?.getPatterns() ?? [];
    }

    /**
     * Get predictions based on behavioral patterns
     */
    getPredictions(): Array<{ prediction: string; confidence: number }> {
        return this.patternMemory?.getPredictions() ?? [];
    }

    /**
     * Get metacognitive pre-response analysis
     */
    getPreResponseAnalysis(message: string): PreResponseAnalysis | null {
        return this.metacognition?.analyzePreResponse(message) ?? null;
    }

    /**
     * Get metacognitive post-response analysis
     */
    getPostResponseAnalysis(message: string, response: string, wasSuccessful: boolean): PostResponseAnalysis | null {
        return this.metacognition?.analyzePostResponse(message, response, wasSuccessful) ?? null;
    }

    /**
     * Infer emotional state from a message
     */
    inferEmotion(message: string): EmotionalState | null {
        return this.emotionalModel?.inferEmotion(message) ?? null;
    }

    /**
     * Evaluate autonomy for a task type
     */
    evaluateAutonomy(taskType: string, riskLevel?: 'low' | 'medium' | 'high'): AutonomyDecision | null {
        return this.calibratedAutonomy?.evaluate(taskType, riskLevel) ?? null;
    }

    /**
     * Record an autonomy correction from the user
     */
    recordAutonomyCorrection(taskType: string, correctionType: 'undo' | 'modify' | 'reject' | 'approve'): void {
        this.calibratedAutonomy?.recordCorrection({
            taskType,
            wasAutonomous: true,
            correctionType,
            timestamp: new Date(),
        });
    }

    /**
     * Get personal narrative summary
     */
    getNarrativeSummary(): NarrativeSummary | null {
        return this.personalNarrative?.getSummary() ?? null;
    }

    /**
     * Find a relevant historical callback for a topic
     */
    findHistoryCallback(topic: string): SignificantMoment | null {
        return this.personalNarrative?.callbackToHistory(topic) ?? null;
    }

    /**
     * Query the analytic memory knowledge graph
     */
    queryMemory(question: string): MemoryQueryResult | null {
        return this.analyticMemory?.query(question) ?? null;
    }

    /**
     * Get active canary deployments for this genome
     */
    getActiveCanaries(): CanaryDeployment[] {
        return this.canaryManager.getActiveDeployments()
            .filter(d => d.genomeId === this.genome.id);
    }

    /**
     * Record an observation to the analytic memory
     */
    recordMemoryObservation(observation: {
        subject: string;
        action: string;
        object?: string;
        context?: Record<string, unknown>;
    }): void {
        this.analyticMemory?.recordObservation(observation);
    }

    // ═══════════════════════════════════════════════════════
    // LIVING AGENT: PUBLIC APIs
    // ═══════════════════════════════════════════════════════

    /**
     * Get integrated agent health (requires Enhanced Self-Model)
     */
    getIntegratedHealth(): IntegratedHealth | null {
        return this.enhancedSelfModel?.assessFull() ?? null;
    }

    /**
     * Get current operating mode (requires Purpose Survival)
     */
    getOperatingMode(): OperatingMode | null {
        return this.purposeSurvival?.getMode() ?? null;
    }

    /**
     * Get survival strategy (requires Purpose Survival)
     */
    getSurvivalStrategy(): SurvivalStrategy | null {
        return this.purposeSurvival?.getStrategy() ?? null;
    }

    /**
     * Get capability matrix (requires Enhanced Self-Model)
     */
    getCapabilities(): CapabilityEntry[] {
        return this.enhancedSelfModel?.getCapabilities() ?? [];
    }

    /**
     * Get evolution trajectories (requires Enhanced Self-Model)
     */
    getTrajectories(): EvolutionTrajectory[] {
        return this.enhancedSelfModel?.getTrajectories() ?? [];
    }

    /**
     * Get strategic evolution priorities (requires Strategic Autonomy)
     */
    getEvolutionPriorities(): EvolutionPriority[] {
        if (!this.strategicAutonomy) return [];
        const drift = this.driftAnalyzer.analyzeDrift();
        const health = this.enhancedSelfModel?.assessFull()
            ?? { score: 0.5, fitnessComponent: 0.5, driftComponent: 1.0,
                 purposeComponent: 0.5, trajectoryComponent: 0.5, label: 'stable' as const };
        return this.strategicAutonomy.prioritizeEvolution(drift.signals, health);
    }

    /**
     * Get agent vitals snapshot
     */
    getAgentVitals(): AgentVitals | null {
        if (!this.purposeSurvival || !this.enhancedSelfModel) return null;
        return computeAgentVitals(this.purposeSurvival, this.enhancedSelfModel);
    }

    // ═══════════════════════════════════════════════════════
    // AUTONOMOUS AGENT: PRIVATE METHODS
    // ═══════════════════════════════════════════════════════

    /**
     * Continuous Evolution Loop — proactive auto-evolution.
     * Runs periodically (fire-and-forget from chat).
     */
    private async runEvolutionCycle(): Promise<void> {
        const autoConfig = this.genome.config.autonomous;
        const drift = this.driftAnalyzer.analyzeDrift();

        // 0. Purpose Survival: evaluate threats and determine strategy
        if (this.purposeSurvival) {
            const evaluation = this.purposeSurvival.evaluateThreats();

            // CRITICAL mode: attempt rollback and return early
            if (evaluation.mode === 'critical') {
                const snapshot = this.purposeSurvival.getLastKnownGood();
                if (snapshot) {
                    this.restoreFromSnapshot(snapshot);
                    return;
                }
            }

            // STRESSED/SURVIVAL: snapshot before mutations
            if (evaluation.mode === 'stressed' || evaluation.mode === 'survival') {
                this.purposeSurvival.snapshotLastKnownGood(this.genome);
            }
        }

        // 1. Auto-mutate on drift (with strategic prioritization if available)
        if (autoConfig?.autoMutateOnDrift !== false && drift.isDrifting) {
            if (this.strategicAutonomy && this.enhancedSelfModel) {
                // Strategic: prioritize evolution targets
                const health = this.enhancedSelfModel.assessFull();
                const priorities = this.strategicAutonomy.prioritizeEvolution(drift.signals, health);

                for (const priority of priorities.filter(p => p.urgency === 'immediate')) {
                    // Purpose fidelity check before mutation
                    if (this.purposeSurvival) {
                        const currentAllele = this.genome.layers[`layer${priority.layer}` as 'layer0' | 'layer1' | 'layer2']
                            ?.find((a: { gene: string; status: string }) => a.gene === priority.gene && a.status === 'active');
                        if (currentAllele) {
                            const check = this.purposeSurvival.purposeFidelityCheck({
                                gene: priority.gene,
                                content: currentAllele.content,
                            });
                            if (!check.approved) continue;
                        }
                    }

                    const target = this.driftToMutationTarget({
                        type: priority.gene, severity: 'moderate',
                        baselineValue: 0.7, currentValue: 0.5,
                    } as DriftSignal);
                    await this.mutate({
                        layer: target.layer,
                        gene: target.gene,
                        taskType: `strategic-evolve:${priority.reason}`,
                    });
                }
            } else {
                // Fallback: original drift-based mutation
                for (const signal of drift.signals) {
                    if (signal.severity === 'minor') continue;
                    const target = this.driftToMutationTarget(signal);
                    await this.mutate({
                        layer: target.layer,
                        gene: target.gene,
                        taskType: `auto-evolve:${signal.type}`,
                    });
                }
            }
        }

        // 2. Auto-compress on token pressure
        if (autoConfig?.autoCompressOnPressure !== false) {
            const totalC1Tokens = this.genome.layers.layer1
                .filter(a => a.status === 'active')
                .reduce((sum, a) => sum + estimateTokenCount(a.content), 0);
            const threshold = this.genome.config.compression?.autoCompressThreshold ?? 1600;
            if (totalC1Tokens > threshold) {
                await this.compressGenes();
            }
        }

        // 3. Evaluate active canary deployments
        await this.evaluateCanaries();

        // 4. Auto-publish high-fitness genes to Gene Bank
        if (this.geneBank && (autoConfig?.enableSwarm ?? !!this.geneBank)) {
            await this.publishHighFitnessGenes();
        }

        // 5. Auto-inherit genes from family registry when drifting
        if (this.genome.familyId && this.storage.getBestRegistryGene && drift.isDrifting) {
            for (const signal of drift.signals) {
                if (signal.severity === 'minor') continue;
                const target = this.driftToMutationTarget(signal);
                try {
                    await this.inheritGeneFromRegistry(this.genome.familyId, target.gene, target.layer);
                } catch {
                    // Gene not found in registry — expected for new families
                }
            }
        }

        // 6. Swarm: auto-import genes from Gene Bank when struggling
        if (this.geneBank && autoConfig?.enableSwarm && drift.isDrifting) {
            const targetSeverity = autoConfig.autoImportOnDrift ?? 'severe';
            const severityRank = (s: string) =>
                s === 'critical' ? 3 : s === 'major' ? 2 : s === 'moderate' ? 1 : 0;
            for (const signal of drift.signals) {
                if (severityRank(signal.severity) >= severityRank(targetSeverity)) {
                    await this.autoImportGene(signal);
                }
            }
        }

        this.metrics.logAudit({
            level: 'info',
            component: 'genome',
            operation: 'evolution-cycle',
            message: `Evolution cycle #${this.interactionCount} completed`,
            genomeId: this.genome.id,
            metadata: { isDrifting: drift.isDrifting, signalCount: drift.signals.length },
        });
    }

    /**
     * Compute real interaction quality score from multiple signals.
     *
     * Uses response length, token efficiency, user feedback sentiment,
     * and structural quality to produce a 0-1 score.
     */
    private computeInteractionQuality(interaction: Omit<Interaction, 'genomeId'>): number {
        if (!interaction.assistantResponse) return 0.2;

        const response = interaction.assistantResponse;
        const message = interaction.userMessage;

        // Signal 1: Response exists and has substance (0-0.3)
        const hasSubstance = response.length > 20 ? 0.3 : response.length / 20 * 0.3;

        // Signal 2: Token efficiency — response proportional to question (0-0.25)
        const ratio = message.length > 0 ? response.length / message.length : 1;
        // Sweet spot: 1x-5x the question length
        const efficiencyScore = ratio >= 1 && ratio <= 5 ? 0.25 :
            ratio > 5 ? Math.max(0, 0.25 - (ratio - 5) * 0.02) :
            ratio * 0.25;

        // Signal 3: Structural quality — has paragraphs, code blocks, lists (0-0.25)
        const hasStructure = (
            (response.includes('\n\n') ? 0.08 : 0) +
            (response.includes('```') ? 0.08 : 0) +
            (response.includes('- ') || response.includes('* ') ? 0.05 : 0) +
            (response.length > 100 ? 0.04 : 0)
        );

        // Signal 4: User satisfaction proxy (0-0.2)
        const userSatisfied = interaction.userSatisfied;
        const satisfactionScore = userSatisfied === true ? 0.2 :
            userSatisfied === false ? 0.0 :
            0.1; // neutral/unknown

        return Math.min(1, hasSubstance + efficiencyScore + hasStructure + satisfactionScore);
    }

    /**
     * Apply canary variant content to the assembled prompt.
     *
     * Finds the gene section in the prompt and replaces with canary content.
     */
    private applyCanaryVariant(prompt: string, canary: CanaryDeployment): string {
        // Find the canary allele content
        const canaryAlleleContent = this.genome.layers[`layer${canary.layer}` as 'layer0' | 'layer1' | 'layer2']
            ?.find(a => a.variant === canary.canaryVariant)?.content;

        if (!canaryAlleleContent) return prompt;

        // Find the stable allele content
        const stableContent = this.genome.layers[`layer${canary.layer}` as 'layer0' | 'layer1' | 'layer2']
            ?.find(a => a.variant === canary.stableVariant)?.content;

        if (stableContent && prompt.includes(stableContent)) {
            return prompt.replace(stableContent, canaryAlleleContent);
        }

        // If stable content not found in prompt, append canary as override
        return prompt + `\n\n## Gene Override (${canary.gene})\n${canaryAlleleContent}`;
    }

    /**
     * Estimate response quality using fast heuristics (no extra LLM call).
     *
     * Evaluates structural quality, relevance to the question, and error indicators
     * to produce a 0-1 quality score for fitness tracking.
     */
    private estimateQuality(userMessage: string, response: string): number {
        let score = 0.5;

        // 1. Length appropriateness
        const len = response.length;
        if (len > 50 && len < 5000) score += 0.15;
        else if (len < 20) score -= 0.2;

        // 2. Code blocks when user asks for code
        const asksForCode = /write|code|function|implement|create.*class|fix.*bug/i.test(userMessage);
        if (asksForCode && /```/.test(response)) score += 0.15;

        // 3. Structured response (headers, lists, code blocks)
        if (/^#{1,3}\s|^[-*]\s|```/m.test(response)) score += 0.1;

        // 4. Error/refusal indicators
        if (/sorry.*can't|i don't know|as an ai|i cannot/i.test(response)) score -= 0.15;

        // 5. Response relevance — shared key terms between question and answer
        const questionWords = new Set(
            userMessage.toLowerCase().split(/\W+/).filter(w => w.length > 3),
        );
        if (questionWords.size > 0) {
            const responseWords = response.toLowerCase().split(/\W+/).filter(w => w.length > 3);
            const overlap = responseWords.filter(w => questionWords.has(w)).length;
            const relevanceRatio = Math.min(overlap / questionWords.size, 1);
            if (relevanceRatio > 0.3) score += 0.05;
            if (relevanceRatio > 0.6) score += 0.05;
        }

        // 6. Explanation depth — response contains reasoning
        if (/because|therefore|since|this means|the reason|due to/i.test(response) && len > 100) {
            score += 0.05;
        }

        // 7. Proportional response — length relative to question complexity
        const questionLen = userMessage.length;
        const ratio = len / Math.max(questionLen, 1);
        if (ratio > 1 && ratio < 20) score += 0.05;
        if (ratio > 50) score -= 0.05;

        // 8. Completeness — clean ending and balanced code blocks
        const lastChar = response.trim().slice(-1);
        if (/[.!?)\]`\d]/.test(lastChar)) score += 0.03;
        const codeBlockCount = (response.match(/```/g) || []).length;
        if (codeBlockCount > 0 && codeBlockCount % 2 !== 0) score -= 0.1;

        // 9. Actionable for task-oriented queries
        const isTaskOriented = /how|explain|help|show|create|build|fix|setup|install/i.test(userMessage);
        if (isTaskOriented && /\d\.\s|step\s\d|first.*then|```/i.test(response)) score += 0.05;

        // 10. Penalize repetitive content
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 3) {
            const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
            const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);
            if (repetitionRatio > 0.3) score -= 0.1;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Build comprehensive evolution evidence from all intelligence subsystems.
     *
     * Collects data from DriftAnalyzer, EnhancedSelfModel, PatternMemory,
     * StrategicAutonomy, and PurposeSurvival to feed intelligent mutation operators.
     */
    private buildEvolutionEvidence(): Record<string, unknown> {
        const evidence: Record<string, unknown> = {};

        // Drift signals
        const drift = this.driftAnalyzer.analyzeDrift();
        if (drift.isDrifting) {
            evidence.driftSignals = drift.signals.map(s => ({
                type: s.type,
                severity: s.severity,
                currentValue: s.currentValue,
                baselineValue: s.baselineValue,
            }));
        }

        // Health + capabilities + trajectories from EnhancedSelfModel
        if (this.enhancedSelfModel) {
            evidence.health = this.enhancedSelfModel.assessFull();
            evidence.capabilities = this.enhancedSelfModel.getCapabilities()
                .filter((c: { trend: string; performanceScore: number }) => c.trend === 'declining' || c.performanceScore < 0.5)
                .slice(0, 10);
            evidence.trajectories = this.enhancedSelfModel.getTrajectories()
                .filter((t: { trend: string }) => t.trend === 'declining')
                .slice(0, 5);
        }

        // Behavioral patterns from PatternMemory
        if (this.patternMemory) {
            evidence.patterns = this.patternMemory.getPatterns()
                .filter((p: BehavioralPattern) => p.confidence >= 0.6)
                .slice(0, 8);
            evidence.predictions = this.patternMemory.getPredictions().slice(0, 3);
        }

        // Strategic guidance
        if (this.strategicAutonomy) {
            const mode: OperatingMode = this.purposeSurvival?.getMode?.() ?? 'stable';
            const health = this.enhancedSelfModel?.assessFull() ?? null;
            evidence.mutationRate = this.strategicAutonomy.recommendMutationRate(mode, health);
        }

        // Agent purpose
        if (this.genome.config.autonomous?.agentPurpose) {
            evidence.purpose = this.genome.config.autonomous.agentPurpose;
        }

        return evidence;
    }

    /**
     * Auto-publish high-fitness genes to Gene Bank for swarm sharing.
     */
    private async publishHighFitnessGenes(): Promise<void> {
        if (!this.geneBank) return;

        const threshold = this.genome.config.autonomous?.autoPublishThreshold ?? 0.85;
        for (const allele of this.genome.layers.layer1.filter(a => a.status === 'active')) {
            if (allele.fitness >= threshold && !allele.publishedToSwarm) {
                await this.autoPublishGene(allele).catch(err =>
                    this.metrics.logAudit({
                        level: 'warning',
                        component: 'gene-bank',
                        operation: 'auto-publish',
                        message: `Auto-publish gene failed: ${err instanceof Error ? err.message : String(err)}`,
                        genomeId: this.genome.id,
                    }),
                );
            }
        }
    }

    /**
     * Evaluate and process active canary deployments.
     *
     * Promotes successful canaries, rolls back failing ones.
     */
    private async evaluateCanaries(): Promise<void> {
        const deployments = this.canaryManager.getActiveDeployments();
        for (const deployment of deployments) {
            if (deployment.genomeId !== this.genome.id) continue;

            try {
                const decision = await this.canaryManager.evaluateCanary(deployment.id);

                if (decision.action === 'promote') {
                    // Read canary content from deployment (not genome.layers)
                    const canaryContent = deployment.canaryContent;

                    if (canaryContent) {
                        // Retire current active allele for this gene before promoting
                        const layerKey = `layer${deployment.layer}` as 'layer0' | 'layer1' | 'layer2';
                        const activeAllele = this.genome.layers[layerKey]
                            .find(a => a.gene === deployment.gene && a.status === 'active');
                        if (activeAllele) {
                            activeAllele.status = 'retired';
                        }

                        await this.addAllele(
                            deployment.layer,
                            deployment.gene,
                            deployment.canaryVariant,
                            canaryContent,
                        );
                    }
                    await this.canaryManager.promote(deployment.id);
                } else if (decision.action === 'rollback') {
                    await this.canaryManager.rollback(deployment.id, decision.reason);
                } else if (decision.action === 'ramp-up') {
                    await this.canaryManager.rampUp(deployment.id);
                }
            } catch {
                // Non-critical: don't block evolution cycle
            }
        }
    }

    /**
     * Map drift signal type to appropriate gene + layer target.
     */
    private driftToMutationTarget(signal: DriftSignal): { layer: 0 | 1 | 2; gene: string } {
        const mapping: Record<string, { layer: 0 | 1 | 2; gene: string }> = {
            'quality-decline': { layer: 1, gene: 'coding-patterns' },
            'efficiency-decline': { layer: 1, gene: 'tool-usage' },
            'cost-increase': { layer: 1, gene: 'tool-usage' },
            'intervention-increase': { layer: 1, gene: 'coding-patterns' },
            'latency-increase': { layer: 1, gene: 'tool-usage' },
        };
        return mapping[signal.type] || { layer: 2, gene: 'communication-style' };
    }

    /**
     * Compute Gene Bank stats for dashboard from genome layers.
     */
    private getGeneBankDashboardData(): {
        active: boolean;
        totalGenes: number;
        sellable: unknown[];
        published: unknown[];
        adopted: unknown[];
    } {
        const allGenes = [
            ...this.genome.layers.layer0,
            ...this.genome.layers.layer1,
            ...this.genome.layers.layer2,
        ];
        const publishThreshold = this.genome.config.autonomous?.autoPublishThreshold ?? 0.85;
        return {
            active: !!this.geneBank,
            totalGenes: allGenes.filter(g => g.status === 'active').length,
            sellable: allGenes.filter(g => g.status === 'active' && g.fitness >= publishThreshold && !g.publishedToSwarm),
            published: allGenes.filter(g => g.publishedToSwarm),
            adopted: allGenes.filter(g => (g.variant || '').startsWith('swarm_')),
        };
    }

    /**
     * Swarm: auto-publish a high-fitness gene to Gene Bank.
     */
    private async autoPublishGene(allele: typeof this.genome.layers.layer1[0]): Promise<void> {
        if (!this.geneBank) return;

        try {
            const cognitiveGene = {
                id: `auto_${this.genome.id}_${allele.gene}_${Date.now()}`,
                version: '1.0.0',
                name: `${allele.gene} from ${this.genome.name}`,
                description: `Auto-published ${allele.gene} gene with fitness ${allele.fitness.toFixed(2)}`,
                type: this.geneCategoryToType(allele.gene),
                domain: 'general',
                content: {
                    instruction: allele.content,
                    requiredCapabilities: [] as string[],
                    applicableContexts: [] as string[],
                    contraindications: [] as string[],
                    metadata: {} as Record<string, unknown>,
                },
                fitness: {
                    overallFitness: allele.fitness,
                    taskSuccessRate: allele.fitness,
                    tokenEfficiency: 0.7,
                    responseQuality: allele.fitness,
                    adoptionCount: 0,
                    adoptionPerformance: null,
                },
                lineage: {
                    parentGeneId: null,
                    generation: allele.generation || 0,
                    ancestors: [] as string[],
                    mutationHistory: [] as Array<{ timestamp: string; change: string; fitnessGain: number }>,
                },
                tenant: {
                    tenantId: this.genome.familyId || this.genome.id,
                    createdBy: this.genome.id,
                    scope: 'tenant' as const,
                },
                tags: [allele.gene],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await this.geneBank.storeGene(cognitiveGene as unknown as Parameters<GeneBank['storeGene']>[0]);
            allele.publishedToSwarm = true;

            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'swarm-publish',
                message: `Auto-published gene ${allele.gene} (fitness: ${allele.fitness.toFixed(2)})`,
                genomeId: this.genome.id,
            });
        } catch {
            // Non-critical — don't block
        }
    }

    /**
     * Swarm: auto-import a gene from Gene Bank to address drift.
     */
    private async autoImportGene(signal: DriftSignal): Promise<void> {
        if (!this.geneBank) return;

        const target = this.driftToMutationTarget(signal);
        const geneTypes = [this.geneCategoryToType(target.gene)];

        try {
            const candidates = await this.geneBank.searchGenes({
                type: geneTypes,
                minFitness: 0.75,
                sortBy: 'fitness',
                sortOrder: 'desc',
                limit: 1,
            });

            if (candidates.length === 0) return;

            const bestGene = candidates[0];

            // Inject as a new allele variant
            await this.addAllele(
                target.layer,
                target.gene,
                `swarm_${bestGene.id.slice(0, 8)}_${Date.now()}`,
                bestGene.content.instruction,
            );

            this.metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'swarm-import',
                message: `Auto-imported gene ${bestGene.name} for ${signal.type}`,
                genomeId: this.genome.id,
            });
        } catch {
            // Non-critical
        }
    }

    /**
     * Map gene category name to Gene Bank gene type.
     */
    private geneCategoryToType(category: string): string {
        const mapping: Record<string, string> = {
            'tool-usage': 'tool-usage-pattern',
            'coding-patterns': 'reasoning-pattern',
            'communication-style': 'communication-pattern',
        };
        return mapping[category] || 'reasoning-pattern';
    }

    /**
     * Convert v1 Genome (layers) to GenomeV2 (chromosomes) for MutationEngine
     */
    private toGenomeV2(): GenomeV2 {
        const defaultFitness: FitnessVector = {
            quality: 0.5, successRate: 0.5, tokenEfficiency: 0.5,
            latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
            composite: 0.5, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
        };

        // Map layer1 alleles to OperativeGene[]
        const operations: OperativeGene[] = this.genome.layers.layer1
            .filter(a => a.status === 'active')
            .map(a => ({
                id: `${this.genome.id}_${a.gene}_${a.variant}`,
                category: a.gene as GeneCategory,
                content: a.content,
                fitness: defaultFitness,
                origin: 'initial' as const,
                usageCount: a.sampleCount || 0,
                lastUsed: new Date(),
                successRate: a.fitness || 0.5,
            }));

        return {
            id: this.genome.id,
            name: this.genome.name,
            familyId: this.genome.familyId || this.genome.id,
            version: this.genome.version || 1,
            chromosomes: {
                c0: {
                    identity: {
                        role: this.genome.layers.layer0[0]?.content || 'AI Assistant',
                        purpose: 'Genomic self-evolving prompt agent',
                        constraints: this.genome.layers.layer0.slice(1).map(a => a.content),
                    },
                    security: {
                        forbiddenTopics: [],
                        accessControls: [],
                        safetyRules: [],
                    },
                    attribution: {
                        creator: 'GSEP',
                        copyright: 'GSEP Platform',
                        license: 'MIT',
                    },
                    metadata: {
                        version: '2.0.0',
                        createdAt: this.genome.createdAt,
                    },
                },
                c1: {
                    operations,
                    metadata: {
                        lastMutated: new Date(),
                        mutationCount: 0,
                        avgFitnessGain: 0,
                    },
                },
                c2: {
                    userAdaptations: new Map(),
                    contextPatterns: [],
                    metadata: {
                        lastMutated: new Date(),
                        adaptationRate: 0,
                        totalUsers: 0,
                    },
                },
            },
            integrity: {
                c0Hash: this.genome.c0IntegrityHash || '',
                lastVerified: new Date(),
                violations: 0,
                quarantined: false,
            },
            lineage: {
                parentVersion: this.genome.lineage?.parentVersion,
                inheritedGenes: [],
                mutations: [],
            },
            fitness: defaultFitness,
            config: {
                mutationRate: this.genome.config.mutationRate === 'slow' ? 'conservative' : this.genome.config.mutationRate,
                epsilonExplore: this.genome.config.epsilonExplore ?? 0.1,
                enableSandbox: this.genome.config.enableSandbox,
                fitnessWeights: undefined,
                minFitnessImprovement: 0.05,
                enableIntegrityCheck: true,
                autoRollbackThreshold: 0.15,
                allowInheritance: true,
                minCompatibilityScore: 0.6,
            },
            state: 'active',
            tags: [],
            createdAt: this.genome.createdAt,
            updatedAt: this.genome.updatedAt,
        };
    }

    /**
     * Convert a GeneAllele to OperativeGene format
     */
    private toOperativeGene(allele: { gene: string; variant: string; content: string; fitness: number }): OperativeGene {
        const defaultFitness: FitnessVector = {
            quality: allele.fitness, successRate: allele.fitness, tokenEfficiency: 0.5,
            latency: 1000, costPerSuccess: 0.01, interventionRate: 0.1,
            composite: allele.fitness, sampleSize: 0, lastUpdated: new Date(), confidence: 0,
        };

        return {
            id: `${this.genome.id}_${allele.gene}_${allele.variant}`,
            category: allele.gene as GeneCategory,
            content: allele.content,
            fitness: defaultFitness,
            origin: 'initial',
            usageCount: 0,
            lastUsed: new Date(),
            successRate: allele.fitness,
            tokenCount: estimateTokenCount(allele.content),
        };
    }

    /**
     * Trigger token compression on all active C1 genes.
     *
     * Uses LLM to compress gene content while preserving ALL functional
     * capabilities. Compressed mutations pass through EvolutionGuardrails
     * before being applied (no safety bypass).
     *
     * Respects CompressionConfig:
     * - minFitnessForCompression: skip low-fitness genes
     * - maxCompressionRatio: reject overly aggressive compression
     *
     * @returns Compression results with token savings
     */
    async compressGenes(): Promise<{
        compressed: boolean;
        totalOriginalTokens: number;
        totalCompressedTokens: number;
        tokensSaved: number;
        reductionPercent: number;
    }> {
        const emptyResult = { compressed: false, totalOriginalTokens: 0, totalCompressedTokens: 0, tokensSaved: 0, reductionPercent: 0 };

        const compressionOperator = this.mutationEngine.getOperator('compress_instructions');
        if (!compressionOperator) return emptyResult;

        const compressionConfig = this.genome.config.compression;
        const maxRatio = compressionConfig?.maxCompressionRatio ?? 0.3;

        const context: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: 'c1',
            reason: 'Token compression: optimize gene token usage while preserving functionality',
        };

        const result = await compressionOperator.mutate(context);

        if (!result.success || !result.compressionMetrics) return emptyResult;

        const metrics = result.compressionMetrics;

        // Safety: reject if compression is too aggressive (below max ratio)
        if (metrics.ratio < maxRatio) {
            return emptyResult;
        }

        // Validate through EvolutionGuardrails before applying
        const gateResult = await this.guardrailsManager.evaluateCandidate(
            {
                layer: 1,
                gene: 'compression',
                variant: `compressed_v${Date.now()}`,
                content: JSON.stringify(result.mutant.chromosomes.c1.operations.map(g => g.content)),
                fitness: result.expectedImprovement + 0.5,
                sandboxScore: 0.8,
                sampleCount: 0,
                rollbackCount: 0,
            },
            this.genome.id,
        );

        if (gateResult.finalDecision === 'reject') {
            return emptyResult;
        }

        // Gate passed — apply compressed content back to genome alleles
        const minFitness = compressionConfig?.minFitnessForCompression ?? 0.3;

        for (const operation of result.mutant.chromosomes.c1.operations) {
            const allele = this.genome.layers.layer1.find(
                a => a.gene === operation.category && a.status === 'active'
            );
            if (allele && allele.fitness >= minFitness) {
                allele.content = operation.content;
            }
        }

        return {
            compressed: true,
            totalOriginalTokens: metrics.originalTokens,
            totalCompressedTokens: metrics.compressedTokens,
            tokensSaved: metrics.originalTokens - metrics.compressedTokens,
            reductionPercent: Math.round((1 - metrics.ratio) * 100),
        };
    }

    /**
     * Get the recommended mutation strategy based on current drift signals.
     *
     * Returns ranked operators with contextual reasoning — useful for
     * understanding WHY GSEP chose a specific mutation approach.
     */
    getMutationStrategy(): Array<{
        operator: string;
        score: number;
        reason: string;
    }> {
        const context: MutationContext = {
            genome: this.toGenomeV2(),
            targetChromosome: 'c1',
            reason: 'Strategy analysis',
            evidence: (() => {
                const drift = this.driftAnalyzer.analyzeDrift();
                return drift.isDrifting
                    ? { driftSignals: drift.signals.map(s => ({ type: s.type, severity: s.severity })) }
                    : undefined;
            })(),
        };

        return this.mutationEngine.selectMutationStrategy(context).map(s => ({
            operator: s.operator.name,
            score: s.score,
            reason: s.reason,
        }));
    }

    /**
     * Restore genome alleles from a snapshot (emergency rollback).
     */
    private restoreFromSnapshot(snapshot: GenomeSnapshot): void {
        for (const saved of snapshot.alleles) {
            const layerKey = `layer${saved.layer}` as 'layer0' | 'layer1' | 'layer2';
            const allele = this.genome.layers[layerKey].find(
                (a: { gene: string; status: string }) => a.gene === saved.gene && a.status === 'active',
            );
            if (allele) {
                allele.content = saved.content;
                allele.fitness = saved.fitness;
            }
        }
        this.storage.saveGenome(this.genome).catch(err =>
            this.metrics.logAudit({
                level: 'error',
                component: 'genome',
                operation: 'emergency-rollback-save',
                message: `Failed to persist rollback: ${err instanceof Error ? err.message : String(err)}`,
                genomeId: this.genome.id,
            }),
        );
        this.metrics.logAudit({
            level: 'warning',
            component: 'genome',
            operation: 'emergency-rollback',
            message: `Restored from snapshot taken at ${snapshot.timestamp.toISOString()}`,
            genomeId: this.genome.id,
        });
    }

    /**
     * Extract technology/topic terms from user message for analytic memory.
     */
    private extractTopicsFromMessage(message: string): string[] {
        const TECH_TERMS = [
            'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c++', 'ruby', 'php', 'swift',
            'react', 'vue', 'angular', 'svelte', 'nextjs', 'node', 'deno', 'bun',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ci/cd',
            'sql', 'postgres', 'mongodb', 'redis', 'graphql', 'rest', 'grpc',
            'machine learning', 'ai', 'llm', 'neural network', 'deep learning',
            'security', 'authentication', 'oauth', 'jwt', 'encryption',
            'testing', 'vitest', 'jest', 'cypress', 'playwright',
            'git', 'github', 'linux', 'nginx', 'webpack', 'vite',
        ];
        const lower = message.toLowerCase();
        return TECH_TERMS.filter(term => lower.includes(term));
    }
}
