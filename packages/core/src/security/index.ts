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

// Layer 3: Credential Vault
export { KeychainAdapter } from './KeychainAdapter.js';
export { KeyHierarchy, type DerivedKeys } from './KeyHierarchy.js';
export { EncryptedConfigStore } from './EncryptedConfigStore.js';
export { SecretsMigrator } from './SecretsMigrator.js';

// Layer 7: Audit
export { TamperProofAuditLog, type AuditEntry, type AuditEventType } from './TamperProofAuditLog.js';
