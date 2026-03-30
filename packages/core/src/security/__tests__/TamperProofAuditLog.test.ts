import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TamperProofAuditLog } from '../TamperProofAuditLog.js';
import { KeychainAdapter } from '../KeychainAdapter.js';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock KeychainAdapter to avoid actual Keychain access in tests
class MockKeychainAdapter {
    private store = new Map<string, string>();

    async get(key: string): Promise<string | null> {
        return this.store.get(key) ?? null;
    }
    async set(key: string, value: string): Promise<void> {
        this.store.set(key, value);
    }
    async delete(key: string): Promise<boolean> {
        return this.store.delete(key);
    }
    async has(key: string): Promise<boolean> {
        return this.store.has(key);
    }
    async getBuffer(key: string): Promise<Buffer | null> {
        const v = this.store.get(key);
        return v ? Buffer.from(v, 'base64') : null;
    }
    async setBuffer(key: string, value: Buffer): Promise<void> {
        this.store.set(key, value.toString('base64'));
    }
}

describe('TamperProofAuditLog', () => {
    let tmpDir: string;
    let alk: Buffer;
    let keychain: MockKeychainAdapter;

    beforeEach(async () => {
        tmpDir = await mkdtemp(join(tmpdir(), 'gsep-audit-'));
        alk = randomBytes(32);
        keychain = new MockKeychainAdapter();
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    function createLog(): TamperProofAuditLog {
        return new TamperProofAuditLog(alk, keychain as unknown as KeychainAdapter, tmpDir);
    }

    it('should initialize and create genesis entry', async () => {
        const log = createLog();
        await log.initialize();
        expect(log.getEntryCount()).toBeGreaterThanOrEqual(1);
    });

    it('should append entries', async () => {
        const log = createLog();
        await log.initialize();

        const entry = await log.append({
            type: 'security:exec-blocked',
            severity: 'critical',
            layer: 5,
            decision: 'deny',
            actor: { userId: 'user-1' },
            resource: { type: 'command', id: 'rm -rf /' },
        });

        expect(entry.id).toBeDefined();
        expect(entry.hash).toBeDefined();
        expect(entry.previousHash).toBeDefined();
        expect(entry.type).toBe('security:exec-blocked');
    });

    it('should chain hashes correctly', async () => {
        const log = createLog();
        await log.initialize();

        const entry1 = await log.append({
            type: 'security:exec-allowed',
            severity: 'info',
            layer: 5,
            decision: 'allow',
            actor: {},
            resource: { type: 'command', id: 'ls' },
        });

        const entry2 = await log.append({
            type: 'security:fs-blocked',
            severity: 'warning',
            layer: 5,
            decision: 'deny',
            actor: {},
            resource: { type: 'file', id: '~/.ssh/id_rsa' },
        });

        expect(entry2.previousHash).toBe(entry1.hash);
    });

    it('should verify a valid chain', async () => {
        const log = createLog();
        await log.initialize();

        await log.append({
            type: 'security:exec-allowed',
            severity: 'info',
            layer: 5,
            decision: 'allow',
            actor: {},
            resource: { type: 'command', id: 'ls' },
        });

        await log.append({
            type: 'security:net-blocked',
            severity: 'warning',
            layer: 6,
            decision: 'deny',
            actor: {},
            resource: { type: 'domain', id: 'evil.com' },
        });

        await log.flush();

        const result = await log.verify();
        expect(result.valid).toBe(true);
        expect(result.totalEntries).toBeGreaterThanOrEqual(3); // genesis + 2
    });

    it('should read entries from today', async () => {
        const log = createLog();
        await log.initialize();

        await log.append({
            type: 'security:pii-redacted',
            severity: 'info',
            layer: 2,
            decision: 'info',
            actor: { userId: 'user-1' },
            resource: { type: 'pii', id: 'credit-card' },
        });

        const entries = await log.readEntries();
        expect(entries.length).toBeGreaterThanOrEqual(2);
        const piiEntry = entries.find(e => e.type === 'security:pii-redacted');
        expect(piiEntry).toBeDefined();
        expect(piiEntry!.resource.id).toBe('credit-card');
    });

    it('should reject invalid ALK length', () => {
        expect(() => new TamperProofAuditLog(
            Buffer.alloc(16),
            keychain as unknown as KeychainAdapter,
            tmpDir,
        )).toThrow('32 bytes');
    });

    it('should throw if not initialized', async () => {
        const log = createLog();
        await expect(log.append({
            type: 'security:exec-blocked',
            severity: 'info',
            layer: 5,
            decision: 'deny',
            actor: {},
            resource: { type: 'test', id: 'test' },
        })).rejects.toThrow('Not initialized');
    });

    it('should persist root hash to keychain on flush', async () => {
        const log = createLog();
        await log.initialize();

        await log.append({
            type: 'security:exec-allowed',
            severity: 'info',
            layer: 5,
            decision: 'allow',
            actor: {},
            resource: { type: 'command', id: 'echo hello' },
        });

        await log.flush();

        const rootHash = await keychain.get('audit-root-hash');
        expect(rootHash).toBeDefined();
        expect(rootHash!.length).toBe(64); // SHA-256 hex
    });

    it('should handle appendFromEvent', async () => {
        const log = createLog();
        await log.initialize();

        await log.appendFromEvent({
            type: 'security:skill-blocked',
            timestamp: new Date(),
            layer: 4,
            decision: 'deny',
            actor: { skillId: 'malicious-skill' },
            resource: { type: 'skill', id: 'malicious-skill' },
            severity: 'high',
            evidence: 'unsigned skill in secure profile',
        });

        const entries = await log.readEntries();
        const skillEntry = entries.find(e => e.type === 'security:skill-blocked');
        expect(skillEntry).toBeDefined();
        expect(skillEntry!.evidence).toBe('unsigned skill in secure profile');
    });
});
