/**
 * Genome Shield — Security Module
 *
 * 7-layer security architecture for Genome agent.
 * Zero new dependencies — uses node:crypto + macOS Keychain.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

// Layer 1: GSEP Integration
export { SecurityEventBus, type SecurityEvent, type SecurityEventType } from './SecurityEventBus.js';
export { type SecurityPresetName, type SecurityConfig, getSecurityPreset } from './SecurityPresets.js';

// Layer 1: Bridge
export { GenomeSecurityBridge, type InboundResult, type OutboundResult, type ChannelTrustLevel } from './GenomeSecurityBridge.js';

// Layer 2: Data Protection
export { PIIRedactionEngine, type PIICategory, type PIIMatch, type RedactionResult } from './PIIRedactionEngine.js';
export { DataClassifier, type DataClassification, type ClassificationResult } from './DataClassifier.js';
export { LLMProxyLayer, type LLMAdapterLike, type ProxyStats } from './LLMProxyLayer.js';

// Layer 3: Credential Vault
export { KeychainAdapter } from './KeychainAdapter.js';
export { KeyHierarchy, type DerivedKeys } from './KeyHierarchy.js';
export { EncryptedConfigStore } from './EncryptedConfigStore.js';
export { SecretsMigrator } from './SecretsMigrator.js';

// Layer 4: Skill Security
export { SkillManifest, type SkillManifestData, type CapabilityType, type SkillPermissions } from './SkillManifest.js';
export { SkillSigner, type SkillSignature, type KeyPair } from './SkillSigner.js';
export { CapabilityBroker, type CapabilityGrant, type CapabilityCheckResult } from './CapabilityBroker.js';

// Layer 5: Execution Control
export { CommandExecutionGuard, type ExecRequest, type ExecResult, type ExecDecision } from './CommandExecutionGuard.js';
export { FileSystemBoundary, type FSAccess, type FSCheckResult } from './FileSystemBoundary.js';

// Layer 6: Network Control
export { OutboundAllowlist, type OutboundCheckResult } from './OutboundAllowlist.js';
export { NetworkAuditLogger, type NetworkLogEntry, type TrafficSummary } from './NetworkAuditLogger.js';

// Layer 7: Audit & Compliance
export { TamperProofAuditLog, type AuditEntry, type AuditEventType } from './TamperProofAuditLog.js';
export { DataAccessTracker, type DataSource, type DataCategory, type DataAccessRecord, type DataAccessReport } from './DataAccessTracker.js';
export { ComplianceExporter, type ReportFormat, type ReportType, type ExportResult } from './ComplianceExporter.js';
