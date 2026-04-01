/**
 * Gene Bank Module
 *
 * Horizontal Knowledge Transfer (THK) system for GSEP agents.
 *
 * Inspired by bacterial plasmid transfer, this module enables agents to:
 * - Extract successful behavioral patterns as "Cognitive Genes"
 * - Store genes in a local Gene Bank
 * - Share genes within tenant (THK protocol)
 * - Test genes in sandbox before adoption
 * - Adopt proven genes to improve performance
 *
 * @module gene-bank
 * @version 0.4.0
 */

// Core types and schemas
export {
    // Types
    CognitiveGene,
    GeneType,
    GeneContent,
    FitnessMetrics,
    Lineage,
    TenantInfo,
    SharingScope,
    GeneExtractionResult,
    GeneAdoptionResult,

    // Schemas
    CognitiveGeneSchema,
    GeneTypeSchema,
    GeneContentSchema,
    FitnessMetricsSchema,
    LineageSchema,
    TenantInfoSchema,
    SharingScopeSchema,
    GeneExtractionResultSchema,
    GeneAdoptionResultSchema,

    // Helper functions
    createGeneId,
    meetsMinimumFitness,
    calculateFitnessDelta,
    isMarketplaceReady,
} from './CognitiveGene.js';

// Gene Bank (storage and management)
export {
    GeneBank,
    GeneBankConfig,
    GeneBankConfigSchema,
    GeneBankStats,
    GeneStorageAdapter,
    GeneSearchFilters,
    GeneSearchFiltersSchema,
} from './GeneBank.js';

// Gene Extractor (extract from mutations)
export {
    GeneExtractor,
    GeneExtractionConfig,
    GeneExtractionConfigSchema,
    MutationContext,
} from './GeneExtractor.js';

// Gene Matcher (find and rank genes)
export {
    GeneMatcher,
    GeneMatchConfig,
    GeneMatchConfigSchema,
    MatchContext,
    GeneMatchResult,
} from './GeneMatcher.js';

// Sandbox Tester (test genes safely)
export {
    SandboxTester,
    SandboxConfig,
    SandboxConfigSchema,
    SandboxTestCase,
    TestCaseResult,
    SandboxTestResult,
    BaselinePerformance,
} from './SandboxTester.js';

// Gene Adopter (orchestrate adoption)
export {
    GeneAdopter,
    GeneAdoptionConfig,
    GeneAdoptionConfigSchema,
    AdoptionRequest,
    AdoptedGeneStatus,
} from './GeneAdopter.js';
// Marketplace Client (global sharing)
export { MarketplaceClient } from './MarketplaceClient.js';
export type { MarketplaceClientOptions } from './MarketplaceClient.js';

// Marketplace Types (API response shapes)
export type {
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
} from './MarketplaceTypes.js';

// Marketplace Mappers (public utilities)
export {
    mapListingToCognitiveGene,
    mapCognitiveGeneToPublishBody,
    mapFiltersToApiParams,
} from './MarketplaceMapper.js';
