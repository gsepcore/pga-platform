/**
 * KeyHierarchy Tests — Cryptographic key derivation for Genome Shield
 *
 * Tests: initialization, key derivation, rotation, destruction, hasMasterKey
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyHierarchy } from '../KeyHierarchy.js';

// ─── Mock KeychainAdapter ──────────────────────────────

function createMockKeychain() {
    const store = new Map<string, Buffer>();

    return {
        get: vi.fn(async (key: string) => {
            const buf = store.get(key);
            return buf ? buf.toString('hex') : null;
        }),
        getBuffer: vi.fn(async (key: string) => {
            return store.get(key) || null;
        }),
        set: vi.fn(async (key: string, value: string) => {
            store.set(key, Buffer.from(value, 'hex'));
        }),
        setBuffer: vi.fn(async (key: string, value: Buffer) => {
            store.set(key, Buffer.from(value));
        }),
        has: vi.fn(async (key: string) => {
            return store.has(key);
        }),
        delete: vi.fn(async (key: string) => {
            return store.delete(key);
        }),
        _store: store,
    };
}

// ─── Tests ────────────────────────────────────────────

describe('KeyHierarchy', () => {
    let keychain: ReturnType<typeof createMockKeychain>;
    let hierarchy: KeyHierarchy;

    beforeEach(() => {
        keychain = createMockKeychain();
        hierarchy = new KeyHierarchy(keychain as never);
    });

    describe('initialize', () => {
        it('should generate a master key on first initialization', async () => {
            await hierarchy.initialize();

            expect(keychain.getBuffer).toHaveBeenCalledWith('master-key');
            expect(keychain.setBuffer).toHaveBeenCalledWith('master-key', expect.any(Buffer));
        });

        it('should load existing master key if already in keychain', async () => {
            // Pre-store a master key
            const existingKey = Buffer.alloc(32, 0xAB);
            keychain._store.set('master-key', existingKey);

            await hierarchy.initialize();

            // Should not store a new key since one already exists
            expect(keychain.setBuffer).not.toHaveBeenCalled();
        });

        it('should be idempotent — second call is no-op', async () => {
            await hierarchy.initialize();
            const firstCallCount = keychain.getBuffer.mock.calls.length;

            await hierarchy.initialize();
            // No additional calls on second init
            expect(keychain.getBuffer.mock.calls.length).toBe(firstCallCount);
        });

        it('should derive DEK, CEK, and ALK keys', async () => {
            await hierarchy.initialize();

            const keys = hierarchy.getDerivedKeys();
            expect(keys.dek).toBeInstanceOf(Buffer);
            expect(keys.cek).toBeInstanceOf(Buffer);
            expect(keys.alk).toBeInstanceOf(Buffer);
            expect(keys.dek.length).toBe(32);
            expect(keys.cek.length).toBe(32);
            expect(keys.alk.length).toBe(32);
        });

        it('should derive different keys for each purpose', async () => {
            await hierarchy.initialize();

            const keys = hierarchy.getDerivedKeys();
            expect(keys.dek.equals(keys.cek)).toBe(false);
            expect(keys.dek.equals(keys.alk)).toBe(false);
            expect(keys.cek.equals(keys.alk)).toBe(false);
        });
    });

    describe('getDerivedKeys', () => {
        it('should throw if not initialized', () => {
            expect(() => hierarchy.getDerivedKeys()).toThrow('Not initialized');
        });

        it('should return keys after initialization', async () => {
            await hierarchy.initialize();
            const keys = hierarchy.getDerivedKeys();
            expect(keys).toBeDefined();
            expect(keys.dek).toBeDefined();
        });
    });

    describe('hasMasterKey', () => {
        it('should return false when no master key exists', async () => {
            const result = await hierarchy.hasMasterKey();
            expect(result).toBe(false);
        });

        it('should return true after initialization', async () => {
            await hierarchy.initialize();
            const result = await hierarchy.hasMasterKey();
            expect(result).toBe(true);
        });
    });

    describe('rotateMasterKey', () => {
        it('should throw if not initialized', async () => {
            await expect(hierarchy.rotateMasterKey()).rejects.toThrow('not initialized');
        });

        it('should generate new master key and return old one', async () => {
            await hierarchy.initialize();

            const oldKeys = hierarchy.getDerivedKeys();
            const oldDek = Buffer.from(oldKeys.dek);

            const result = await hierarchy.rotateMasterKey();

            expect(result.oldMasterKey).toBeInstanceOf(Buffer);
            expect(result.oldMasterKey.length).toBe(32);
            expect(result.newKeys.dek).toBeInstanceOf(Buffer);
            expect(result.newKeys.cek).toBeInstanceOf(Buffer);
            expect(result.newKeys.alk).toBeInstanceOf(Buffer);
        });

        it('should produce different derived keys after rotation', async () => {
            await hierarchy.initialize();
            const beforeDek = Buffer.from(hierarchy.getDerivedKeys().dek);

            await hierarchy.rotateMasterKey();
            const afterDek = hierarchy.getDerivedKeys().dek;

            expect(beforeDek.equals(afterDek)).toBe(false);
        });

        it('should store new master key in keychain', async () => {
            await hierarchy.initialize();
            const storeCountBefore = keychain.setBuffer.mock.calls.length;

            await hierarchy.rotateMasterKey();

            expect(keychain.setBuffer.mock.calls.length).toBeGreaterThan(storeCountBefore);
        });
    });

    describe('destroy', () => {
        it('should wipe master key from memory', async () => {
            await hierarchy.initialize();
            hierarchy.destroy();

            expect(() => hierarchy.getDerivedKeys()).toThrow('Not initialized');
        });

        it('should zero-fill all key buffers', async () => {
            await hierarchy.initialize();
            const keys = hierarchy.getDerivedKeys();
            const dekRef = keys.dek;
            const cekRef = keys.cek;
            const alkRef = keys.alk;

            hierarchy.destroy();

            // Buffers should be filled with zeros
            expect(dekRef.every(b => b === 0)).toBe(true);
            expect(cekRef.every(b => b === 0)).toBe(true);
            expect(alkRef.every(b => b === 0)).toBe(true);
        });

        it('should be safe to call destroy multiple times', async () => {
            await hierarchy.initialize();
            hierarchy.destroy();
            hierarchy.destroy(); // Should not throw
        });

        it('should be safe to call destroy without initialization', () => {
            hierarchy.destroy(); // Should not throw
        });

        it('should allow re-initialization after destroy', async () => {
            await hierarchy.initialize();
            hierarchy.destroy();

            await hierarchy.initialize();
            const keys = hierarchy.getDerivedKeys();
            expect(keys.dek.length).toBe(32);
        });
    });
});
