/**
 * EncryptedConfigStore — AES-256-GCM encrypted configuration for Genome Shield.
 *
 * Replaces plaintext .env and auth-profiles.json with encrypted storage.
 * Uses CEK (Credential Encryption Key) from KeyHierarchy.
 * Atomic writes to prevent corruption.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const STORE_DIR = join(homedir(), '.genome');
const STORE_FILE = 'config.enc';

interface StoreData {
    version: 1;
    entries: Record<string, string>;
}

/**
 * Encrypted key-value configuration store.
 *
 * Usage:
 * ```typescript
 * const store = new EncryptedConfigStore(keys.cek);
 * await store.load();
 * await store.set('OPENAI_API_KEY', 'sk-...');
 * const key = await store.get('OPENAI_API_KEY');
 * ```
 */
export class EncryptedConfigStore {
    private key: Buffer;
    private filePath: string;
    private data: StoreData = { version: 1, entries: {} };
    private loaded = false;

    constructor(encryptionKey: Buffer, storePath?: string) {
        if (encryptionKey.length !== 32) {
            throw new Error('[EncryptedConfigStore] Key must be 32 bytes (256 bits).');
        }
        this.key = encryptionKey;
        this.filePath = storePath ?? join(STORE_DIR, STORE_FILE);
    }

    /**
     * Load the encrypted store from disk. Creates empty store if file doesn't exist.
     */
    async load(): Promise<void> {
        try {
            const raw = await readFile(this.filePath);
            this.data = this.decrypt(raw);
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                // File doesn't exist — start with empty store
                this.data = { version: 1, entries: {} };
            } else {
                throw new Error(`[EncryptedConfigStore] Failed to load: ${(err as Error).message}`);
            }
        }
        this.loaded = true;
    }

    /**
     * Get a value by key.
     */
    get(key: string): string | undefined {
        this.ensureLoaded();
        return this.data.entries[key];
    }

    /**
     * Set a value. Saves to disk immediately (atomic write).
     */
    async set(key: string, value: string): Promise<void> {
        this.ensureLoaded();
        this.data.entries[key] = value;
        await this.save();
    }

    /**
     * Delete a key. Saves to disk immediately.
     */
    async delete(key: string): Promise<boolean> {
        this.ensureLoaded();
        if (!(key in this.data.entries)) return false;
        delete this.data.entries[key];
        await this.save();
        return true;
    }

    /**
     * Check if a key exists.
     */
    has(key: string): boolean {
        this.ensureLoaded();
        return key in this.data.entries;
    }

    /**
     * List all keys (values are NOT returned).
     */
    keys(): string[] {
        this.ensureLoaded();
        return Object.keys(this.data.entries).sort();
    }

    /**
     * Get the number of stored entries.
     */
    size(): number {
        this.ensureLoaded();
        return Object.keys(this.data.entries).length;
    }

    /**
     * Import entries from a plain object (bulk set).
     */
    async import(entries: Record<string, string>): Promise<number> {
        this.ensureLoaded();
        let count = 0;
        for (const [key, value] of Object.entries(entries)) {
            if (value !== undefined && value !== '') {
                this.data.entries[key] = value;
                count++;
            }
        }
        await this.save();
        return count;
    }

    /**
     * Export all entries as a plain object. Use with caution.
     */
    exportAll(): Record<string, string> {
        this.ensureLoaded();
        return { ...this.data.entries };
    }

    // ─── Internal ───────────────────────────────────────

    private async save(): Promise<void> {
        const encrypted = this.encrypt(this.data);

        // Atomic write: write temp → rename
        await mkdir(dirname(this.filePath), { recursive: true });
        const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
        await writeFile(tmpPath, encrypted, { mode: 0o600 });
        await rename(tmpPath, this.filePath);
    }

    private encrypt(data: StoreData): Buffer {
        const iv = randomBytes(IV_BYTES);
        const plaintext = Buffer.from(JSON.stringify(data), 'utf-8');

        const cipher = createCipheriv(ALGORITHM, this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Format: [IV (12)] [AuthTag (16)] [Ciphertext (...)]
        return Buffer.concat([iv, authTag, encrypted]);
    }

    private decrypt(raw: Buffer): StoreData {
        if (raw.length < IV_BYTES + AUTH_TAG_BYTES + 1) {
            throw new Error('[EncryptedConfigStore] Corrupted file — too short.');
        }

        const iv = raw.subarray(0, IV_BYTES);
        const authTag = raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
        const ciphertext = raw.subarray(IV_BYTES + AUTH_TAG_BYTES);

        const decipher = createDecipheriv(ALGORITHM, this.key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const parsed = JSON.parse(decrypted.toString('utf-8'));

        if (parsed.version !== 1 || typeof parsed.entries !== 'object') {
            throw new Error('[EncryptedConfigStore] Invalid store format.');
        }

        return parsed as StoreData;
    }

    private ensureLoaded(): void {
        if (!this.loaded) {
            throw new Error('[EncryptedConfigStore] Not loaded. Call load() first.');
        }
    }
}
