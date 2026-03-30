/**
 * SkillManifest — Permission manifest for skills in Genome Shield.
 *
 * Each skill declares what capabilities it needs.
 * The CapabilityBroker enforces these at runtime.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

// ─── Types ──────────────────────────────────────────────

export type CapabilityType =
    | 'fs:read'
    | 'fs:write'
    | 'fs:delete'
    | 'exec:command'
    | 'exec:safe-bin'
    | 'net:outbound'
    | 'net:localhost'
    | 'cred:read'
    | 'data:pii'
    | 'data:financial'
    | 'data:health';

export interface SkillPermissions {
    /** Capabilities the skill requires to function */
    required: CapabilityType[];
    /** Optional capabilities that enhance functionality */
    optional: CapabilityType[];
}

export interface SkillRestrictions {
    /** Max file size the skill can read/write (in bytes) */
    maxFileSize?: number;
    /** Allowed file extensions */
    allowedExtensions?: string[];
    /** Paths the skill is explicitly denied (in addition to global denials) */
    deniedPaths?: string[];
    /** Allowed outbound domains */
    allowedDomains?: string[];
    /** Max execution time for commands (ms) */
    maxExecTimeMs?: number;
}

export interface SkillManifestData {
    /** Skill name */
    name: string;
    /** Skill version */
    version: string;
    /** Skill author */
    author: string;
    /** Permissions */
    permissions: SkillPermissions;
    /** Data classification the skill can access */
    dataAccess: string[];
    /** Restrictions */
    restrictions: SkillRestrictions;
    /** Signature hash (set by SkillSigner) */
    signature?: string;
}

// ─── Default Manifest ───────────────────────────────────

const DEFAULT_MANIFEST: SkillManifestData = {
    name: 'unknown',
    version: '0.0.0',
    author: 'unknown',
    permissions: {
        required: [],
        optional: [],
    },
    dataAccess: ['public'],
    restrictions: {},
};

// ─── Parser ─────────────────────────────────────────────

/**
 * Parse and validate a skill manifest.
 *
 * Usage:
 * ```typescript
 * const manifest = SkillManifest.parse({
 *   name: 'file-manager',
 *   version: '1.0.0',
 *   author: 'genome-team',
 *   permissions: {
 *     required: ['fs:read', 'fs:write'],
 *     optional: ['net:outbound'],
 *   },
 *   dataAccess: ['public', 'internal'],
 *   restrictions: { deniedPaths: ['~/.ssh'] },
 * });
 * ```
 */
export class SkillManifest {
    readonly data: Readonly<SkillManifestData>;

    private constructor(data: SkillManifestData) {
        this.data = Object.freeze(data);
    }

    /**
     * Parse a manifest from raw data. Returns a validated manifest.
     */
    static parse(raw: Partial<SkillManifestData>): SkillManifest {
        const errors = SkillManifest.validate(raw);
        if (errors.length > 0) {
            throw new Error(`[SkillManifest] Invalid manifest: ${errors.join('; ')}`);
        }

        const data: SkillManifestData = {
            name: raw.name ?? DEFAULT_MANIFEST.name,
            version: raw.version ?? DEFAULT_MANIFEST.version,
            author: raw.author ?? DEFAULT_MANIFEST.author,
            permissions: {
                required: raw.permissions?.required ?? [],
                optional: raw.permissions?.optional ?? [],
            },
            dataAccess: raw.dataAccess ?? ['public'],
            restrictions: raw.restrictions ?? {},
            signature: raw.signature,
        };

        return new SkillManifest(data);
    }

    /**
     * Create a default (minimal permissions) manifest for skills without one.
     */
    static default(skillName: string): SkillManifest {
        return new SkillManifest({
            ...DEFAULT_MANIFEST,
            name: skillName,
        });
    }

    /**
     * Validate a raw manifest. Returns array of error strings (empty = valid).
     */
    static validate(raw: Partial<SkillManifestData>): string[] {
        const errors: string[] = [];

        if (raw.permissions?.required) {
            for (const cap of raw.permissions.required) {
                if (!VALID_CAPABILITIES.has(cap)) {
                    errors.push(`Unknown capability: ${cap}`);
                }
            }
        }

        if (raw.permissions?.optional) {
            for (const cap of raw.permissions.optional) {
                if (!VALID_CAPABILITIES.has(cap)) {
                    errors.push(`Unknown optional capability: ${cap}`);
                }
            }
        }

        if (raw.dataAccess) {
            const validClassifications = new Set(['public', 'internal', 'confidential', 'restricted']);
            for (const dc of raw.dataAccess) {
                if (!validClassifications.has(dc)) {
                    errors.push(`Unknown data classification: ${dc}`);
                }
            }
        }

        return errors;
    }

    /**
     * Check if the manifest requires a specific capability.
     */
    requires(capability: CapabilityType): boolean {
        return this.data.permissions.required.includes(capability);
    }

    /**
     * Check if the manifest optionally requests a capability.
     */
    optionallyRequests(capability: CapabilityType): boolean {
        return this.data.permissions.optional.includes(capability);
    }

    /**
     * Check if the skill can access a given data classification.
     */
    canAccessData(classification: string): boolean {
        return this.data.dataAccess.includes(classification);
    }

    /**
     * Get all capabilities (required + optional).
     */
    getAllCapabilities(): CapabilityType[] {
        return [...this.data.permissions.required, ...this.data.permissions.optional];
    }

    /**
     * Serialize to JSON (for signing).
     */
    toJSON(): string {
        return JSON.stringify(this.data);
    }
}

const VALID_CAPABILITIES = new Set<CapabilityType>([
    'fs:read', 'fs:write', 'fs:delete',
    'exec:command', 'exec:safe-bin',
    'net:outbound', 'net:localhost',
    'cred:read',
    'data:pii', 'data:financial', 'data:health',
]);
