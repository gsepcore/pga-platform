/**
 * @gsep/core — Genomic Self-Evolving Prompts
 *
 * World's first autonomous prompt evolution system for AI agents
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2025
 * @license MIT
 *
 * @example
 * ```typescript
 * import { GSEP } from '@gsep/core';
 * import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';
 * import { PostgresAdapter } from '@gsep/adapters-storage-postgres';
 *
 * const gsep = new GSEP({
 *   llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_KEY }),
 *   storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL }),
 * });
 *
 * const genome = await gsep.createGenome({ name: 'my-assistant' });
 * const response = await genome.chat('Hello!', { userId: 'user123' });
 * ```
 */

// ─── Main Export — the only thing most developers need ──

export { gsep } from './wrap.js';
export type { WrappedAgent as GSEPAgent, WrapOptions as GSEPWrapOptions, LLMClient } from './wrap.js';

// ─── Advanced Exports ───────────────────────────────────

export { GSEP, GenomeInstance } from './GSEP.js';
export type { GSEPConfig, QuickStartOptions, LLMProvider } from './GSEP.js';

// ─── Runtime Detection ─────────────────────────────────

export { detectRuntime } from './middleware/RuntimeDetector.js';
export type {
    RuntimeLevel,
    GSEPMode,
    RuntimeDetection,
} from './middleware/RuntimeDetector.js';

// ─── Serverless Adapter ────────────────────────────────

export {
    getServerlessGenome,
    serverlessChat,
    serverlessEvolve,
    clearServerlessCache,
} from './middleware/ServerlessAdapter.js';
export type { ServerlessConfig } from './middleware/ServerlessAdapter.js';

// ─── Middleware (Two-Hook Integration) ──────────────────

export { GSEPMiddleware } from './middleware/GSEPMiddleware.js';
export type {
    MiddlewareOptions,
    BeforeContext,
    AfterContext,
    BeforeResult,
} from './middleware/GSEPMiddleware.js';

// ─── Wrap (Universal Middleware) ────────────────────────

export { WrappedAgent } from './wrap/WrappedAgent.js';
export { GenomeBuilder } from './wrap/GenomeBuilder.js';
export { InMemoryStorageAdapter } from './wrap/InMemoryStorageAdapter.js';
export { FunctionLLMAdapter } from './wrap/FunctionLLMAdapter.js';
export type { WrapOptions, FunctionWrapOptions, WrappableFunction } from './wrap/WrapOptions.js';

// ─── Evaluation ─────────────────────────────────────────

export { Evaluator, STANDARD_TASKS } from './evaluation/Evaluator.js';
export type {
    EvaluationTask,
    EvaluationResult,
    BenchmarkResult,
    ComparisonResult,
    EvaluatableGenome,
} from './evaluation/Evaluator.js';

export {
    getBenchmarkSuite,
    getAvailableSuites,
    validateSuiteFrozen,
    CORE_GENERAL_V1,
    CORE_CODING_V1,
    GSEP_SPECIFIC_V1,
    PROOF_OF_VALUE_V1,
} from './evaluation/BenchmarkSuites.js';
export type {
    BenchmarkSuite,
    BenchmarkSuiteMetadata,
    BenchmarkSuiteId,
} from './evaluation/BenchmarkSuites.js';

export { ProofOfValueRunner } from './evaluation/ProofOfValueRunner.js';
export type {
    ProofOfValueConfig,
    ProofOfValueResult,
    CycleResult,
    FitnessCurvePoint,
} from './evaluation/ProofOfValueRunner.js';

export {
    getSandboxSuite,
    getSandboxPromotionThreshold,
    GLOBAL_SANDBOX_CASES,
    COMPRESS_INSTRUCTIONS_CASES,
    REORDER_CONSTRAINTS_CASES,
    SAFETY_REINFORCEMENT_CASES,
    TOOL_SELECTION_BIAS_CASES,
    CODING_TASK_CASES,
    GENERAL_TASK_CASES,
} from './evaluation/SandboxSuites.js';
export type {
    SandboxCaseDefinition,
} from './evaluation/SandboxSuites.js';

export { SemanticJudge } from './evaluation/SemanticJudge.js';
export type {
    SemanticJudgment,
} from './evaluation/SemanticJudge.js';

export { CalibrationManager } from './evaluation/CalibrationManager.js';
export type {
    CalibrationPoint,
    CalibrationHistory,
} from './evaluation/CalibrationManager.js';

export { EvolutionGuardrailsManager } from './evaluation/EvolutionGuardrails.js';
export type {
    MutationCandidate,
} from './evaluation/EvolutionGuardrails.js';

export { ConstitutionalGate } from './evaluation/ConstitutionalGate.js';

// ─── Monitoring ─────────────────────────────────────────

export { MetricsCollector } from './monitoring/MetricsCollector.js';
export type {
    PerformanceMetrics,
    CostMetrics,
    HealthStatus,
    ComponentHealth,
    AuditLog,
    Alert,
    MetricsCollectorConfig,
} from './monitoring/MetricsCollector.js';

export { WeeklyReportGenerator } from './monitoring/WeeklyReportGenerator.js';
export type { WeeklyReport, ReportConfig } from './monitoring/WeeklyReportGenerator.js';

export { MonitoringDashboard } from './monitoring/MonitoringDashboard.js';
export type {
    DashboardConfig,
} from './monitoring/MonitoringDashboard.js';

export { AlertWebhooks } from './monitoring/AlertWebhooks.js';
export type {
    WebhookConfig,
    SlackPayload,
    DiscordPayload,
} from './monitoring/AlertWebhooks.js';

// ─── Memory (v0.3.0) ────────────────────────────────────

export { LayeredMemory } from './memory/LayeredMemory.js';
export type {
    LayeredMemoryConfig,
    LayeredMemorySnapshot,
    ShortTermMemory,
    MediumTermMemory,
    LongTermMemory,
    UserProfile,
    SemanticFact,
} from './memory/LayeredMemory.js';

// ─── RAG (v0.3.0) ───────────────────────────────────────

export { RAGEngine } from './rag/RAGEngine.js';
export type {
    RAGConfig,
    RAGDocument,
    RAGSearchResult,
    RAGContext,
} from './rag/RAGEngine.js';

export { InMemoryVectorStore } from './rag/VectorStoreAdapter.js';
export type {
    VectorStoreAdapter,
} from './rag/VectorStoreAdapter.js';

// ─── Reasoning (v0.3.0) ─────────────────────────────────

export { ReasoningEngine } from './reasoning/ReasoningEngine.js';
export type {
    ReasoningConfig,
    ReasoningStrategy,
    ReasoningResult,
} from './reasoning/ReasoningEngine.js';

// ─── Gene Bank (v0.4.0) ─────────────────────────────────

export {
    // Core types
    CognitiveGeneSchema,
    GeneTypeSchema,
    GeneContentSchema,
    FitnessMetricsSchema,
    LineageSchema,
    TenantInfoSchema,
    SharingScopeSchema,
    GeneExtractionResultSchema,
    GeneAdoptionResultSchema,
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,

    // Components
    GeneBank,
    GeneBankConfigSchema,
    GeneExtractor,
    GeneExtractionConfigSchema,
    GeneMatcher,
    GeneMatchConfigSchema,
    SandboxTester,
    SandboxConfigSchema,
    GeneAdopter,
    GeneAdoptionConfigSchema,
    MarketplaceClient,

    // Marketplace Mappers
    mapListingToCognitiveGene,
    mapCognitiveGeneToPublishBody,
    mapFiltersToApiParams,
} from './gene-bank/index.js';

// Storage Adapters (included)
export { InMemoryGeneStorage } from './gene-bank/adapters/InMemoryGeneStorage.js';

export type {
    // Core types
    CognitiveGene,
    GeneType,
    GeneContent,
    FitnessMetrics as GeneFitnessMetrics,
    Lineage,
    TenantInfo,
    SharingScope,
    GeneExtractionResult,
    GeneAdoptionResult,

    // Gene Bank
    GeneBankConfig,
    GeneBankStats,
    GeneStorageAdapter,
    GeneSearchFilters,

    // Gene Extractor
    GeneExtractionConfig,
    MutationContext as GeneMutationContext,

    // Gene Matcher
    GeneMatchConfig,
    MatchContext,
    GeneMatchResult,

    // Sandbox Tester
    SandboxConfig,
    SandboxTestCase,
    TestCaseResult,
    SandboxTestResult,
    BaselinePerformance,

    // Gene Adopter
    GeneAdoptionConfig,
    AdoptionRequest,
    AdoptedGeneStatus,

    // Marketplace Client
    MarketplaceClientOptions,

    // Marketplace Types (API response shapes)
    MarketplaceGeneListing,
    MarketplaceSearchResponse,
    MarketplaceSearchFilters,
    MarketplaceHealthResponse,
    MarketplacePublishResponse,
    CreatePurchaseResponse,
    MarketplacePurchase,
    RefundResponse,
    SellerOnboardResponse,
    SellerStatus,
    SellerEarnings,
    MarketplaceAdoptionResponse,
    DiscoverOptions,
} from './gene-bank/index.js';

// ─── Memory Compaction (v0.4.0) ─────────────────────────

export { MemoryCompactor } from './memory-compaction/MemoryCompactor.js';
export {
    SlidingWindowStrategy,
    ImportanceBasedStrategy,
    BaseCompactionStrategy,
} from './memory-compaction/index.js';

export type {
    Message as MemoryMessage,
    CompactedMessage,
    Conversation,
    CompactionResult,
    MemoryItem,
    CompactionConfig,
    CompactionStrategy,
    ICompactionStrategy,
    PrioritizationOptions,
    ConversationSummary,
} from './memory-compaction/index.js';

// ─── Enterprise ─────────────────────────────────────────

export { RateLimiter } from './enterprise/RateLimiter.js';
export type {
    RateLimitConfig,
    RateLimitContext,
    RateLimitResult,
} from './enterprise/RateLimiter.js';

export { AuthManager } from './enterprise/AuthManager.js';
export type {
    User,
    Role,
    Permission,
    AuthContext,
    AuthPolicy,
    AuthConfig,
} from './enterprise/AuthManager.js';

// ─── Real-Time ──────────────────────────────────────────

export { GSEPEventEmitter, globalEvents } from './realtime/EventEmitter.js';
export type {
    GSEPEventType,
    GSEPEvent,
    GenomeCreatedEvent,
    GenomeEvolvedEvent,
    MutationAppliedEvent,
    ChatMessageEvent,
    MetricsUpdatedEvent,
    AlertTriggeredEvent,
    ChatStartedEvent,
    ChatCompletedEvent,
    FitnessComputedEvent,
    DriftDetectedEvent,
    GateEvaluatedEvent,
    FirewallThreatEvent,
    ImmuneThreatEvent,
    MutationGeneratedEvent,
    MutationPromotedEvent,
    EventHandler,
} from './realtime/EventEmitter.js';

export { StreamingManager, globalStreaming } from './realtime/StreamingManager.js';
export type {
    StreamChunk,
    StreamOptions,
} from './realtime/StreamingManager.js';

// ─── Dashboard ──────────────────────────────────────────

export { DashboardServer, DashboardTokenHelper } from './dashboard/index.js';
export type {
    DashboardServerConfig,
    DashboardTokenPayload,
} from './dashboard/index.js';

// ─── Plugins ────────────────────────────────────────────

export { PluginManager } from './plugins/PluginManager.js';
export type {
    Plugin,
    PluginMetadata,
    PluginHooks,
    PluginConfig,
} from './plugins/PluginManager.js';

// ─── Advanced AI ────────────────────────────────────────

export { ThinkingEngine } from './advanced-ai/ThinkingEngine.js';
export type {
    ThinkingStep,
    ThinkingResult,
    SelfReflection,
    MetaLearning,
} from './advanced-ai/ThinkingEngine.js';

export { ModelRouter } from './advanced-ai/ModelRouter.js';
export type {
    ModelSpec,
    TaskClassification,
    RoutingDecision,
    ModelRouterConfig,
} from './advanced-ai/ModelRouter.js';

// ─── Resilience ─────────────────────────────────────────

export { CircuitBreaker } from './resilience/CircuitBreaker.js';
export type {
    CircuitState,
    CircuitBreakerConfig,
    CircuitBreakerStats,
} from './resilience/CircuitBreaker.js';

export { RetryManager } from './resilience/RetryManager.js';
export type {
    RetryConfig,
} from './resilience/RetryManager.js';

// ─── Evolution (Living OS) ──────────────────────────────

export { GenomeKernel, IntegrityViolationError, QuarantinedGenomeError } from './core/GenomeKernel.js';
export type { GenomeKernelOptions } from './core/GenomeKernel.js';

export { CoherenceValidator } from './core/CoherenceValidator.js';
export type { CoherenceViolation, CoherenceResult } from './core/CoherenceValidator.js';

export { DriftAnalyzer } from './evolution/DriftAnalyzer.js';
export type {
    DriftAnalyzerConfig,
    DriftSignal,
    DriftType,
    DriftSeverity,
    DriftAnalysis,
} from './evolution/DriftAnalyzer.js';

export {
    MutationEngine,
    CompressInstructionsOperator,
    ReorderConstraintsOperator,
    SafetyReinforcementOperator,
    ToolSelectionBiasOperator,
    TokenCompressionOperator,
} from './evolution/MutationOperator.js';
export type {
    IMutationOperator,
    MutationContext,
    MutationResult,
} from './evolution/MutationOperator.js';

export { FitnessCalculator } from './evolution/FitnessCalculator.js';
export type {
    InteractionData,
    FitnessCalculatorConfig,
} from './evolution/FitnessCalculator.js';

export { CanaryDeploymentManager } from './evolution/CanaryDeployment.js';
export type {
    CanaryConfig,
    CanaryDeployment,
    DeploymentMetrics,
    CanaryDecision,
} from './evolution/CanaryDeployment.js';

// ─── Evolution Boost 2.0 (100x Power!) ─────────────────

export { EvolutionBoostEngine } from './evolution/boost/EvolutionBoostEngine.js';
export type {
    EvolutionMode,
    EvolutionBoostConfig,
    EvolutionResult,
} from './evolution/boost/EvolutionBoostEngine.js';

export { ParallelEvolutionEngine } from './evolution/boost/ParallelEvolutionEngine.js';
export type {
    ParallelEvolutionConfig,
    MutationBranch,
} from './evolution/boost/ParallelEvolutionEngine.js';

export { MetaEvolutionEngine } from './evolution/boost/MetaEvolutionEngine.js';
export type {
    OperatorPerformance,
    ContextualPerformance,
    MetaEvolutionConfig,
    StrategyRecommendation,
    LearningVelocity,
} from './evolution/boost/MetaEvolutionEngine.js';

export { ParetoOptimizer } from './evolution/boost/ParetoOptimizer.js';
export type {
    ParetoSolution,
    OptimizationObjectives,
} from './evolution/boost/ParetoOptimizer.js';

export { GeneticRecombinator } from './evolution/boost/GeneticRecombinator.js';
export type {
    RecombinationParent,
    RecombinationResult,
} from './evolution/boost/GeneticRecombinator.js';

// Boost Operators (40-80% improvement!)
export { SemanticRestructuringOperator } from './evolution/boost/operators/SemanticRestructuringOperator.js';
export { PatternExtractionOperator } from './evolution/boost/operators/PatternExtractionOperator.js';
export { CrossoverMutationOperator } from './evolution/boost/operators/CrossoverMutationOperator.js';
export { BreakthroughOperator } from './evolution/boost/operators/BreakthroughOperator.js';

// ─── Interfaces ─────────────────────────────────────────

export type { LLMAdapter, Message, ChatOptions, ChatResponse, ChatChunk } from './interfaces/LLMAdapter.js';
export type { StorageAdapter } from './interfaces/StorageAdapter.js';

// ─── Types ──────────────────────────────────────────────

export type {
    Genome,
    GenomeConfig,
    GeneAllele,
    UserDNA,
    UserTraits,
    MutationLog,
    MutationProposal,
    Interaction,
    ToolCall,
    FitnessMetrics,
    SelectionContext,
    Layer,
    MutationRate,
    Sentiment,
    GeneRegistryEntry,
    EvolutionGuardrails,
    EconomicMetrics,
    PromotionGateResult,
    ConstitutionalGateResult,
    CompressionConfig,
    AutonomousConfig,
    // Gene Registry Extended Types (v0.9.0)
    GeneFamily,
    ValidatedGene,
    GeneInheritance,
    GeneRating,
    GenomeRegistryRecord,
    InheritancePolicy,
    GeneUsageAnalytics,
} from './types/index.js';

// ─── Types v2 (Living OS) ───────────────────────────────

export type {
    GenomeV2,
    Chromosome0,
    Chromosome1,
    Chromosome2,
    Chromosome3,
    GenomeValues,
    AgentPersonality,
    OperativeGene,
    GeneCategory,
    GeneOrigin,
    UserEpigenome,
    UserPreferences,
    LearnedPatterns,
    ContextGene,
    IntegrityMetadata,
    LineageMetadata,
    InheritedGene,
    MutationRecord,
    MutationTrigger,
    MutationType,
    FitnessVector,
    FitnessWeights,
    GenomeState,
    ValidationResults,
    EvaluationResult as EvaluationResultV2,
    TaskResult,
    GenomeSnapshot,
    GenomeDiff,
    GenomeChange,
    GenomeFamily,
    // C3 Content Firewall types
    FirewallPattern,
    ThreatCategory,
    TrustLevel,
    TrustPolicy,
    ContentSource,
    SanitizationRule,
    ContentTaggingConfig,
    FirewallResult,
    FirewallDetection,
    FirewallAnalytics,
} from './types/GenomeV2.js';

// ─── Autonomous Agent (v0.5.0) ─────────────────────────

export { GenesisBootstrap } from './core/GenesisBootstrap.js';
export type { BootstrapResult } from './core/GenesisBootstrap.js';

export { SelfModel } from './advanced-ai/SelfModel.js';
export type { SelfAssessment } from './advanced-ai/SelfModel.js';

export { PatternMemory } from './memory/PatternMemory.js';
export type { BehavioralPattern } from './memory/PatternMemory.js';

// ─── Living Agent v0.6.0 ────────────────────────────────

export { Metacognition } from './reasoning/Metacognition.js';
export type {
    ConfidenceAssessment,
    PreResponseAnalysis,
    PostResponseInsight,
    PostResponseAnalysis,
} from './reasoning/Metacognition.js';

export { EmotionalModel } from './advanced-ai/EmotionalModel.js';
export type {
    Emotion,
    EmotionalState,
    EngagementLevel,
    ToneGuidance,
} from './advanced-ai/EmotionalModel.js';

export { CalibratedAutonomy } from './advanced-ai/CalibratedAutonomy.js';
export type {
    ValidationLevel,
    AutonomyThreshold,
    AutonomyDecision,
} from './advanced-ai/CalibratedAutonomy.js';

export { PersonalNarrative } from './memory/PersonalNarrative.js';
export type {
    RelationshipStage,
    SignificantMoment,
    SharedAchievement,
    NarrativeSummary,
} from './memory/PersonalNarrative.js';

export { AnalyticMemoryEngine } from './memory/AnalyticMemoryEngine.js';
export type {
    Entity,
    Relation,
    RelationType,
    Inference,
    MemoryQueryResult,
    TemporalPattern,
    KnowledgeSummary,
} from './memory/AnalyticMemoryEngine.js';

// ─── Living Agent v0.7.0 ────────────────────────────────

export { EnhancedSelfModel } from './advanced-ai/EnhancedSelfModel.js';
export type {
    PurposeAlignment,
    CapabilityEntry,
    HardLimit,
    EvolutionTrajectory,
    IntegratedHealth,
} from './advanced-ai/EnhancedSelfModel.js';

export { PurposeSurvival } from './evolution/PurposeSurvival.js';
export type {
    OperatingMode,
    ThreatClassification,
    GenomeSnapshot as SurvivalSnapshot,
    SurvivalStrategy,
    ModeTransition,
} from './evolution/PurposeSurvival.js';

export { StrategicAutonomy } from './advanced-ai/StrategicAutonomy.js';
export type {
    StrategicDecision,
    EvolutionPriority,
    RefusalRecord,
} from './advanced-ai/StrategicAutonomy.js';

export { computeAgentVitals } from './advanced-ai/AgentVitals.js';
export type { AgentVitals } from './advanced-ai/AgentVitals.js';

// ─── Consciousness & Autonomy (v0.8.0) ─────────────────

export { AgentStateVector } from './advanced-ai/AgentStateVector.js';
export type {
    StateVector,
    EmotionalFacet,
    CognitiveFacet,
    MemoryFacet,
    HealthFacet,
    EvolutionFacet,
    AutonomyFacet,
} from './advanced-ai/AgentStateVector.js';

export { AutonomousLoop } from './advanced-ai/AutonomousLoop.js';
export type {
    Observation,
    ThinkingResult as LoopThinkingResult,
    Plan,
    LearningOutcome,
    CycleReport,
} from './advanced-ai/AutonomousLoop.js';

export { GrowthJournal } from './memory/GrowthJournal.js';
export type {
    JournalEntry,
    GrowthMilestone,
    GrowthSnapshot,
} from './memory/GrowthJournal.js';

export { CuriosityEngine } from './memory/CuriosityEngine.js';
export type {
    KnowledgeGap,
    CuriositySignal,
    ExplorationRecord,
} from './memory/CuriosityEngine.js';

// ─── C3 Content Firewall (v0.8.0) ──────────────────────

export { ContentFirewall } from './firewall/ContentFirewall.js';
export {
    CORE_PATTERNS,
    ALL_DEFAULT_PATTERNS,
    DEFAULT_TRUST_POLICIES,
    DEFAULT_SANITIZATION_RULES,
    DEFAULT_CONTENT_TAGGING,
    CONTENT_TRUST_PREAMBLE,
} from './firewall/DefaultPatterns.js';

// ─── Skills (MCP + Inline) ───────────────────────────────

export {
    SkillRegistry,
    SkillExecutor,
    SkillRouter,
    ProactiveEngine,
} from './skills/index.js';
export type {
    SkillDefinition,
    SkillMetrics,
    SkillCallResult,
    SkillExecutorConfig,
    ToolCall as SkillToolCall,
    ToolCallResult as SkillToolCallResult,
    SkillRouterConfig,
    ProactiveTask,
    ProactiveResult,
    ProactiveEngineConfig,
    NotificationHandler,
} from './skills/index.js';

// ─── Anomaly Detection (v0.9.0) ──────────────────────────

export { AnomalyDetector } from './firewall/AnomalyDetector.js';
export type {
    Anomaly,
    AnomalyType,
    AnomalySeverity,
    AnomalyDetectorConfig,
    AnomalyAnalytics,
} from './firewall/AnomalyDetector.js';

// ─── Purpose Lock (v0.9.0) ───────────────────────────────

export { PurposeLock } from './firewall/PurposeLock.js';
export type {
    PurposeLockConfig,
    PurposeClassification,
    PurposeVerdict,
    PurposeLockAnalytics,
} from './firewall/PurposeLock.js';

// ─── C4 Behavioral Immune System (v0.9.0) ───────────────
export { BehavioralImmuneSystem } from './immune/BehavioralImmuneSystem.js';
export type {
    ImmuneVerdict,
    OutputThreat,
    OutputThreatType,
    ImmuneStatus,
    ImmuneMemoryEntry,
    BISConfig,
} from './immune/BehavioralImmuneSystem.js';

// ─── GSEP Visibility (v0.8.0) ──────────────────────────

export { GSEPIdentitySection } from './core/GSEPIdentitySection.js';
export type { GSEPIdentityContext } from './core/GSEPIdentitySection.js';
export { GSEPActivityFooter } from './core/GSEPActivityFooter.js';
export type { GSEPActivity } from './core/GSEPActivityFooter.js';
export type { GSEPVisibility, GSEPStatus, GSEPChatResult } from './types/index.js';

// ─── Configuration Presets ──────────────────────────────

export {
    PRESET_MINIMAL,
    PRESET_STANDARD,
    PRESET_CONSCIOUS,
    PRESET_FULL,
    getPreset,
    withPreset,
    getAvailablePresets,
    countEnabledFlags,
} from './presets/ConfigPresets.js';
export type { PresetName } from './presets/ConfigPresets.js';

// ─── Token Utilities ────────────────────────────────────

export { estimateTokenCount, tokenEfficiency, compressionRatio } from './utils/tokens.js';

// ─── Genome Shield (Security) ────────────────────────────

export {
    // Layer 1: GSEP Integration
    SecurityEventBus,
    GenomeSecurityBridge,
    getSecurityPreset,
    // Layer 2: Data Protection
    PIIRedactionEngine,
    DataClassifier,
    LLMProxyLayer,
    // Layer 3: Credential Vault
    KeychainAdapter,
    KeyHierarchy,
    EncryptedConfigStore,
    SecretsMigrator,
    // Layer 4: Skill Security
    SkillManifest,
    SkillSigner,
    CapabilityBroker,
    // Layer 5: Execution Control
    CommandExecutionGuard,
    FileSystemBoundary,
    // Layer 6: Network Control
    OutboundAllowlist,
    NetworkAuditLogger,
    // Layer 7: Audit & Compliance
    TamperProofAuditLog,
    DataAccessTracker,
    ComplianceExporter,
} from './security/index.js';

export type {
    SecurityEvent,
    SecurityEventType,
    SecurityConfig,
    SecurityPresetName,
    InboundResult,
    OutboundResult,
    ChannelTrustLevel,
    PIICategory,
    RedactionResult,
    DataClassification,
    SkillManifestData,
    CapabilityType,
    SkillSignature,
    ExecRequest,
    ExecResult,
    FSAccess,
    OutboundCheckResult,
    AuditEntry,
    DataAccessRecord,
    DataAccessReport,
    ExportResult,
    ReportFormat,
    ReportType,
} from './security/index.js';

// ─── Version ────────────────────────────────────────────

export const VERSION = '0.8.0';
export const AUTHOR = 'Luis Alfredo Velasquez Duran';
export const YEAR = 2025;
