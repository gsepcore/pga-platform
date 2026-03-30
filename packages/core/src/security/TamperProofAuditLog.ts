/**
 * TamperProofAuditLog — Hash-chain append-only audit log for Genome Shield.
 *
 * Each entry SHA-256 hashes the previous entry (blockchain-like chain).
 * Root hash stored in Keychain. Encrypted entries with ALK.
 * Tampering of any entry breaks the chain and is detectable.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { appendFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { KeychainAdapter } from './KeychainAdapter.js';
import type { SecurityEvent } from './SecurityEventBus.js';

const AUDIT_DIR = join(homedir(), '.genome', 'audit');
const ROOT_HASH_KEY = 'audit-root-hash';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

// ─── Types ──────────────────────────────────────────────

export type AuditEventType =
    | SecurityEvent['type']
    | 'audit:initialized'
    | 'audit:verified'
    | 'audit:rotated';

export interface AuditEntry {
    id: string;
    timestamp: string;
    type: AuditEventType;
    severity: 'info' | 'warning' | 'high' | 'critical';
    layer: number;
    decision: 'allow' | 'deny' | 'info';
    actor: {
        userId?: string;
        skillId?: string;
        channel?: string;
    };
    resource: {
        type: string;
        id: string;
        detail?: string;
    };
    evidence?: string;
    previousHash: string;
    hash: string;
}

export interface VerificationResult {
    valid: boolean;
    totalEntries: number;
    brokenAt?: number;
    brokenEntry?: AuditEntry;
    rootHashMatch: boolean;
}

/**
 * Tamper-proof append-only audit log with hash chain.
 *
 * Usage:
 * ```typescript
 * const log = new TamperProofAuditLog(auditLogKey, keychain);
 * await log.initialize();
 *
 * // Append from SecurityEventBus
 * bus.onAny((event) => log.appendFromEvent(event));
 *
 * // Verify integrity
 * const result = await log.verify();
 * if (!result.valid) console.error('AUDIT LOG TAMPERED!');
 * ```
 */
export class TamperProofAuditLog {
    private alk: Buffer;
    private keychain: KeychainAdapter;
    private currentHash: string = '';
    private auditDir: string;
    private entryCount = 0;
    private initialized = false;

    constructor(auditLogKey: Buffer, keychain: KeychainAdapter, auditDir?: string) {
        if (auditLogKey.length !== 32) {
            throw new Error('[TamperProofAuditLog] ALK must be 32 bytes.');
        }
        this.alk = auditLogKey;
        this.keychain = keychain;
        this.auditDir = auditDir ?? AUDIT_DIR;
    }

    /**
     * Initialize the audit log. Loads or creates root hash.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await mkdir(this.auditDir, { recursive: true });

        // Load root hash from Keychain
        const rootHash = await this.keychain.get(ROOT_HASH_KEY);
        this.currentHash = rootHash ?? this.computeHMAC('genesis');

        if (!rootHash) {
            // First run — store genesis hash
            await this.keychain.set(ROOT_HASH_KEY, this.currentHash);
        }

        // Count existing entries
        this.entryCount = await this.countEntries();

        this.initialized = true;

        // Log initialization
        await this.append({
            type: 'audit:initialized',
            severity: 'info',
            layer: 7,
            decision: 'info',
            actor: {},
            resource: { type: 'audit-log', id: 'system' },
        });
    }

    /**
     * Append a security event to the audit log.
     */
    async appendFromEvent(event: SecurityEvent): Promise<void> {
        await this.append({
            type: event.type,
            severity: event.severity,
            layer: event.layer,
            decision: event.decision,
            actor: event.actor,
            resource: event.resource,
            evidence: event.evidence,
        });
    }

    /**
     * Append a raw entry to the audit log.
     */
    async append(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'previousHash' | 'hash'>): Promise<AuditEntry> {
        this.ensureInitialized();

        const fullEntry: AuditEntry = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            ...entry,
            previousHash: this.currentHash,
            hash: '', // computed below
        };

        // Compute HMAC of the entry (excluding hash field itself)
        fullEntry.hash = this.computeEntryHash(fullEntry);

        // Update chain head
        this.currentHash = fullEntry.hash;

        // Encrypt and append to today's log file
        const encrypted = this.encryptEntry(fullEntry);
        const filePath = this.todayFilePath();
        await appendFile(filePath, encrypted.toString('base64') + '\n', { mode: 0o600 });

        // Update root hash in Keychain periodically (every 50 entries)
        this.entryCount++;
        if (this.entryCount % 50 === 0) {
            await this.keychain.set(ROOT_HASH_KEY, this.currentHash);
        }

        return fullEntry;
    }

    /**
     * Verify the integrity of the entire audit log chain.
     */
    async verify(): Promise<VerificationResult> {
        this.ensureInitialized();

        const entries = await this.readAllEntries();
        const storedRootHash = await this.keychain.get(ROOT_HASH_KEY);

        if (entries.length === 0) {
            return { valid: true, totalEntries: 0, rootHashMatch: true };
        }

        let previousHash = this.computeHMAC('genesis');

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            // Verify chain link
            if (entry.previousHash !== previousHash) {
                return {
                    valid: false,
                    totalEntries: entries.length,
                    brokenAt: i,
                    brokenEntry: entry,
                    rootHashMatch: false,
                };
            }

            // Verify entry hash
            const expectedHash = this.computeEntryHash(entry);
            if (entry.hash !== expectedHash) {
                return {
                    valid: false,
                    totalEntries: entries.length,
                    brokenAt: i,
                    brokenEntry: entry,
                    rootHashMatch: false,
                };
            }

            previousHash = entry.hash;
        }

        // Verify root hash matches last entry
        const lastHash = entries[entries.length - 1].hash;
        const rootHashMatch = storedRootHash === lastHash || storedRootHash === this.currentHash;

        return {
            valid: true,
            totalEntries: entries.length,
            rootHashMatch,
        };
    }

    /**
     * Read all entries from a specific date.
     */
    async readEntries(date?: Date): Promise<AuditEntry[]> {
        const filePath = date ? this.filePathForDate(date) : this.todayFilePath();
        return this.readEntriesFromFile(filePath);
    }

    /**
     * Get entry count.
     */
    getEntryCount(): number {
        return this.entryCount;
    }

    /**
     * Flush root hash to Keychain (call on shutdown).
     */
    async flush(): Promise<void> {
        if (this.currentHash) {
            await this.keychain.set(ROOT_HASH_KEY, this.currentHash);
        }
    }

    // ─── Internal ───────────────────────────────────────

    private computeHMAC(data: string): string {
        return createHmac('sha256', this.alk).update(data).digest('hex');
    }

    private computeEntryHash(entry: AuditEntry): string {
        const payload = JSON.stringify({
            id: entry.id,
            timestamp: entry.timestamp,
            type: entry.type,
            severity: entry.severity,
            layer: entry.layer,
            decision: entry.decision,
            actor: entry.actor,
            resource: entry.resource,
            evidence: entry.evidence,
            previousHash: entry.previousHash,
        });
        return this.computeHMAC(payload);
    }

    private encryptEntry(entry: AuditEntry): Buffer {
        const iv = randomBytes(IV_BYTES);
        const plaintext = Buffer.from(JSON.stringify(entry), 'utf-8');
        const cipher = createCipheriv(ALGORITHM, this.alk, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
    }

    private decryptEntry(raw: Buffer): AuditEntry {
        const iv = raw.subarray(0, IV_BYTES);
        const authTag = raw.subarray(IV_BYTES, IV_BYTES + 16);
        const ciphertext = raw.subarray(IV_BYTES + 16);
        const decipher = createDecipheriv(ALGORITHM, this.alk, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(decrypted.toString('utf-8'));
    }

    private todayFilePath(): string {
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        return join(this.auditDir, `${date}.jsonl.enc`);
    }

    private filePathForDate(date: Date): string {
        const dateStr = date.toISOString().slice(0, 10);
        return join(this.auditDir, `${dateStr}.jsonl.enc`);
    }

    private async readEntriesFromFile(filePath: string): Promise<AuditEntry[]> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            return lines.map(line => this.decryptEntry(Buffer.from(line, 'base64')));
        } catch {
            return [];
        }
    }

    private async readAllEntries(): Promise<AuditEntry[]> {
        try {
            const files = await readdir(this.auditDir);
            const logFiles = files.filter(f => f.endsWith('.jsonl.enc')).sort();
            const allEntries: AuditEntry[] = [];
            for (const file of logFiles) {
                const entries = await this.readEntriesFromFile(join(this.auditDir, file));
                allEntries.push(...entries);
            }
            return allEntries;
        } catch {
            return [];
        }
    }

    private async countEntries(): Promise<number> {
        try {
            const files = await readdir(this.auditDir);
            let count = 0;
            for (const file of files.filter(f => f.endsWith('.jsonl.enc'))) {
                const content = await readFile(join(this.auditDir, file), 'utf-8');
                count += content.split('\n').filter(l => l.trim()).length;
            }
            return count;
        } catch {
            return 0;
        }
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('[TamperProofAuditLog] Not initialized. Call initialize() first.');
        }
    }
}
