/**
 * SecurityPresets — Security profile configurations for Genome Shield.
 *
 * 4 profiles: paranoid, secure (default), standard, developer.
 * Each profile controls all 7 security layers.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

// ─── Types ──────────────────────────────────────────────

export type SecurityPresetName = 'paranoid' | 'secure' | 'standard' | 'developer';

export type FirewallMode = 'full-quarantine' | 'full-sanitize' | 'structural' | 'log-only';
export type ExecPolicy = 'deny-all' | 'allowlist-ask' | 'allowlist' | 'unrestricted';
export type NetworkPolicy = 'localhost-only' | 'allowlist-strict' | 'allowlist-broad' | 'unrestricted';
export type CredentialPolicy = 'keychain-required' | 'keychain-recommended' | 'env-allowed';
export type SkillVerification = 'signed-manifest' | 'manifest-only' | 'none';
export type AuditLevel = 'verbose-signed-encrypted' | 'standard-signed' | 'standard' | 'basic';
export type LLMRouting = 'local-only' | 'local-preferred' | 'cloud-filtered' | 'cloud-direct';

export interface SecurityConfig {
    /** Profile name */
    profile: SecurityPresetName;

    // Layer 1: GSEP Integration
    /** C3 Content Firewall mode */
    firewallMode: FirewallMode;
    /** C4 Behavioral Immune System mode */
    immuneMode: FirewallMode;
    /** Enable Purpose Lock */
    enablePurposeLock: boolean;
    /** Enable Anomaly Detector */
    enableAnomalyDetection: boolean;

    // Layer 2: Data Protection
    /** Enable PII redaction before LLM */
    enablePIIRedaction: boolean;
    /** PII categories to redact (empty = all) */
    piiCategories: string[];
    /** LLM routing preference */
    llmRouting: LLMRouting;
    /** Enable Sensitive Context Vault */
    enableSensitiveVault: boolean;

    // Layer 3: Credential Vault
    /** Credential storage policy */
    credentialPolicy: CredentialPolicy;
    /** Enable encrypted config store */
    enableEncryptedConfig: boolean;
    /** Auto-migrate .env to Keychain on first boot */
    autoMigrateSecrets: boolean;

    // Layer 4: Skill Security
    /** Skill verification level */
    skillVerification: SkillVerification;
    /** Block unsigned skills */
    blockUnsignedSkills: boolean;
    /** Enable capability broker (JIT permissions) */
    enableCapabilityBroker: boolean;

    // Layer 5: Execution Control
    /** Exec policy */
    execPolicy: ExecPolicy;
    /** Enable filesystem boundary */
    enableFSBoundary: boolean;
    /** Allowed filesystem paths (empty = per-profile defaults) */
    allowedPaths: string[];
    /** Denied filesystem paths (always enforced) */
    deniedPaths: string[];
    /** Enable macOS sandbox-exec for subprocesses */
    enableProcessIsolation: boolean;

    // Layer 6: Network Control
    /** Network policy */
    networkPolicy: NetworkPolicy;
    /** Allowed outbound domains (empty = per-profile defaults) */
    allowedDomains: string[];
    /** Block private network access (SSRF prevention) */
    blockPrivateNetworks: boolean;

    // Layer 7: Audit
    /** Audit level */
    auditLevel: AuditLevel;
    /** Audit log retention in days */
    auditRetentionDays: number;
    /** Enable data access tracking */
    enableDataAccessTracking: boolean;
    /** Session timeout in minutes (0 = never) */
    sessionTimeoutMinutes: number;
}

// ─── Default Denied Paths (always enforced, all profiles) ─

const ALWAYS_DENIED_PATHS = [
    '~/.ssh',
    '~/.gnupg',
    '~/Library/Keychains',
    '~/.aws',
    '~/.config/gcloud',
    '~/.azure',
    '~/.kube/config',
    '~/.docker/config.json',
];

// ─── Presets ────────────────────────────────────────────

const PRESET_PARANOID: Readonly<SecurityConfig> = {
    profile: 'paranoid',

    firewallMode: 'full-quarantine',
    immuneMode: 'full-quarantine',
    enablePurposeLock: true,
    enableAnomalyDetection: true,

    enablePIIRedaction: true,
    piiCategories: [], // all categories
    llmRouting: 'local-only',
    enableSensitiveVault: true,

    credentialPolicy: 'keychain-required',
    enableEncryptedConfig: true,
    autoMigrateSecrets: true,

    skillVerification: 'signed-manifest',
    blockUnsignedSkills: true,
    enableCapabilityBroker: true,

    execPolicy: 'deny-all',
    enableFSBoundary: true,
    allowedPaths: ['~/.genome', '/tmp/genome-*'],
    deniedPaths: [...ALWAYS_DENIED_PATHS],
    enableProcessIsolation: true,

    networkPolicy: 'localhost-only',
    allowedDomains: ['localhost', '127.0.0.1'],
    blockPrivateNetworks: true,

    auditLevel: 'verbose-signed-encrypted',
    auditRetentionDays: 365,
    enableDataAccessTracking: true,
    sessionTimeoutMinutes: 60,
};

const PRESET_SECURE: Readonly<SecurityConfig> = {
    profile: 'secure',

    firewallMode: 'full-sanitize',
    immuneMode: 'full-sanitize',
    enablePurposeLock: true,
    enableAnomalyDetection: true,

    enablePIIRedaction: true,
    piiCategories: [], // all categories
    llmRouting: 'local-preferred',
    enableSensitiveVault: true,

    credentialPolicy: 'keychain-required',
    enableEncryptedConfig: true,
    autoMigrateSecrets: true,

    skillVerification: 'signed-manifest',
    blockUnsignedSkills: true,
    enableCapabilityBroker: true,

    execPolicy: 'allowlist-ask',
    enableFSBoundary: true,
    allowedPaths: ['~/Documents/Genome', '~/.genome', '/tmp/genome-*'],
    deniedPaths: [...ALWAYS_DENIED_PATHS],
    enableProcessIsolation: true,

    networkPolicy: 'allowlist-strict',
    allowedDomains: [
        '*.openai.com', '*.anthropic.com', 'generativelanguage.googleapis.com',
        'api.telegram.org', 'discord.com', 'gateway.discord.gg',
        'slack.com', '*.slack.com',
    ],
    blockPrivateNetworks: true,

    auditLevel: 'standard-signed',
    auditRetentionDays: 90,
    enableDataAccessTracking: true,
    sessionTimeoutMinutes: 480,
};

const PRESET_STANDARD: Readonly<SecurityConfig> = {
    profile: 'standard',

    firewallMode: 'structural',
    immuneMode: 'structural',
    enablePurposeLock: false,
    enableAnomalyDetection: true,

    enablePIIRedaction: true,
    piiCategories: ['credit-card', 'ssn', 'api-key', 'iban'],
    llmRouting: 'cloud-filtered',
    enableSensitiveVault: false,

    credentialPolicy: 'keychain-recommended',
    enableEncryptedConfig: true,
    autoMigrateSecrets: false,

    skillVerification: 'manifest-only',
    blockUnsignedSkills: false,
    enableCapabilityBroker: true,

    execPolicy: 'allowlist',
    enableFSBoundary: true,
    allowedPaths: ['~'],
    deniedPaths: [...ALWAYS_DENIED_PATHS],
    enableProcessIsolation: false,

    networkPolicy: 'allowlist-broad',
    allowedDomains: [],  // broad = allow most, block suspicious
    blockPrivateNetworks: true,

    auditLevel: 'standard',
    auditRetentionDays: 30,
    enableDataAccessTracking: false,
    sessionTimeoutMinutes: 1440,
};

const PRESET_DEVELOPER: Readonly<SecurityConfig> = {
    profile: 'developer',

    firewallMode: 'log-only',
    immuneMode: 'log-only',
    enablePurposeLock: false,
    enableAnomalyDetection: false,

    enablePIIRedaction: false,
    piiCategories: [],
    llmRouting: 'cloud-direct',
    enableSensitiveVault: false,

    credentialPolicy: 'env-allowed',
    enableEncryptedConfig: false,
    autoMigrateSecrets: false,

    skillVerification: 'none',
    blockUnsignedSkills: false,
    enableCapabilityBroker: false,

    execPolicy: 'unrestricted',
    enableFSBoundary: false,
    allowedPaths: [],
    deniedPaths: [],
    enableProcessIsolation: false,

    networkPolicy: 'unrestricted',
    allowedDomains: [],
    blockPrivateNetworks: false,

    auditLevel: 'basic',
    auditRetentionDays: 7,
    enableDataAccessTracking: false,
    sessionTimeoutMinutes: 0,
};

// ─── Preset Map ─────────────────────────────────────────

const SECURITY_PRESETS: Record<SecurityPresetName, Readonly<SecurityConfig>> = {
    paranoid: PRESET_PARANOID,
    secure: PRESET_SECURE,
    standard: PRESET_STANDARD,
    developer: PRESET_DEVELOPER,
};

// ─── Public API ─────────────────────────────────────────

/**
 * Get a security preset by name.
 */
export function getSecurityPreset(name: SecurityPresetName): SecurityConfig {
    return { ...SECURITY_PRESETS[name] };
}

/**
 * Get a security preset with custom overrides.
 */
export function withSecurityPreset(
    name: SecurityPresetName,
    overrides: Partial<SecurityConfig>,
): SecurityConfig {
    return { ...SECURITY_PRESETS[name], ...overrides };
}

/**
 * List available security preset names.
 */
export function getAvailableSecurityPresets(): SecurityPresetName[] {
    return Object.keys(SECURITY_PRESETS) as SecurityPresetName[];
}

/**
 * Validate a security config (ensure no conflicting settings).
 */
export function validateSecurityConfig(config: SecurityConfig): string[] {
    const errors: string[] = [];

    if (config.credentialPolicy === 'keychain-required' && !config.enableEncryptedConfig) {
        errors.push('Keychain-required credential policy needs enableEncryptedConfig=true');
    }

    if (config.execPolicy === 'deny-all' && !config.enableFSBoundary) {
        errors.push('deny-all exec policy should have FS boundary enabled');
    }

    if (config.llmRouting === 'local-only' && config.networkPolicy === 'unrestricted') {
        errors.push('local-only LLM routing with unrestricted network is contradictory');
    }

    if (config.blockUnsignedSkills && config.skillVerification === 'none') {
        errors.push('Cannot block unsigned skills with verification=none');
    }

    return errors;
}
