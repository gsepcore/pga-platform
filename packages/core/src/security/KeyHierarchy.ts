/**
 * KeyHierarchy — Cryptographic key derivation for Genome Shield.
 *
 * Master Key (MK) stored in macOS Keychain.
 * Derived keys via HKDF-SHA256:
 *   - DEK (Data Encryption Key) — for SensitiveContextVault
 *   - CEK (Credential Encryption Key) — for EncryptedConfigStore
 *   - ALK (Audit Log Key) — for TamperProofAuditLog signing
 *
 * Zero npm dependencies — uses Node.js node:crypto only.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { randomBytes, hkdf } from 'node:crypto';
import { promisify } from 'node:util';
import { KeychainAdapter } from './KeychainAdapter.js';

const hkdfAsync = promisify(hkdf);

const MASTER_KEY_NAME = 'master-key';
const MASTER_KEY_BYTES = 32; // 256 bits
const DERIVED_KEY_BYTES = 32; // 256 bits

// HKDF context labels — unique per derived key purpose
const KEY_LABELS = {
    dek: 'genome-shield-dek-v1',   // Data Encryption Key
    cek: 'genome-shield-cek-v1',   // Credential Encryption Key
    alk: 'genome-shield-alk-v1',   // Audit Log Key
} as const;

export interface DerivedKeys {
    /** Data Encryption Key — for SensitiveContextVault */
    dek: Buffer;
    /** Credential Encryption Key — for EncryptedConfigStore */
    cek: Buffer;
    /** Audit Log Key — for TamperProofAuditLog HMAC signing */
    alk: Buffer;
}

/**
 * Manages cryptographic key hierarchy for Genome Shield.
 *
 * Usage:
 * ```typescript
 * const hierarchy = new KeyHierarchy(new KeychainAdapter());
 * await hierarchy.initialize(); // Generates or loads master key
 * const keys = hierarchy.getDerivedKeys();
 * // Use keys.cek for config encryption, keys.dek for data, keys.alk for audit
 * ```
 */
export class KeyHierarchy {
    private keychain: KeychainAdapter;
    private masterKey: Buffer | null = null;
    private derivedKeys: DerivedKeys | null = null;
    private initialized = false;

    constructor(keychain: KeychainAdapter) {
        this.keychain = keychain;
    }

    /**
     * Initialize the key hierarchy.
     * Loads the master key from Keychain, or generates one on first run.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Try to load existing master key
        this.masterKey = await this.keychain.getBuffer(MASTER_KEY_NAME);

        if (!this.masterKey) {
            // First run — generate and store master key
            this.masterKey = randomBytes(MASTER_KEY_BYTES);
            await this.keychain.setBuffer(MASTER_KEY_NAME, this.masterKey);
        }

        // Derive all keys from master
        this.derivedKeys = {
            dek: await this.deriveKey(KEY_LABELS.dek),
            cek: await this.deriveKey(KEY_LABELS.cek),
            alk: await this.deriveKey(KEY_LABELS.alk),
        };

        this.initialized = true;
    }

    /**
     * Get derived keys. Must call initialize() first.
     */
    getDerivedKeys(): DerivedKeys {
        if (!this.derivedKeys) {
            throw new Error('[KeyHierarchy] Not initialized. Call initialize() first.');
        }
        return this.derivedKeys;
    }

    /**
     * Check if the master key exists in Keychain.
     */
    async hasMasterKey(): Promise<boolean> {
        return this.keychain.has(MASTER_KEY_NAME);
    }

    /**
     * Rotate the master key. Generates a new one and re-derives all keys.
     * WARNING: This invalidates all encrypted data. Caller must re-encrypt.
     * Returns the old master key for re-encryption purposes.
     */
    async rotateMasterKey(): Promise<{ oldMasterKey: Buffer; newKeys: DerivedKeys }> {
        if (!this.masterKey) {
            throw new Error('[KeyHierarchy] Cannot rotate — not initialized.');
        }

        const oldMasterKey = Buffer.from(this.masterKey);

        // Generate new master key
        this.masterKey = randomBytes(MASTER_KEY_BYTES);
        await this.keychain.setBuffer(MASTER_KEY_NAME, this.masterKey);

        // Re-derive all keys
        this.derivedKeys = {
            dek: await this.deriveKey(KEY_LABELS.dek),
            cek: await this.deriveKey(KEY_LABELS.cek),
            alk: await this.deriveKey(KEY_LABELS.alk),
        };

        return { oldMasterKey, newKeys: this.derivedKeys };
    }

    /**
     * Wipe all keys from memory. Call on shutdown.
     */
    destroy(): void {
        if (this.masterKey) {
            this.masterKey.fill(0);
            this.masterKey = null;
        }
        if (this.derivedKeys) {
            this.derivedKeys.dek.fill(0);
            this.derivedKeys.cek.fill(0);
            this.derivedKeys.alk.fill(0);
            this.derivedKeys = null;
        }
        this.initialized = false;
    }

    // ─── Internal ───────────────────────────────────────

    private async deriveKey(label: string): Promise<Buffer> {
        if (!this.masterKey) throw new Error('[KeyHierarchy] No master key.');

        const derived = await hkdfAsync(
            'sha256',
            this.masterKey,
            Buffer.alloc(0), // no salt — master key is already random
            label,
            DERIVED_KEY_BYTES,
        );

        return Buffer.from(derived);
    }
}
