import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptedConfigStore } from '../EncryptedConfigStore.js';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('EncryptedConfigStore', () => {
    let tmpDir: string;
    let key: Buffer;

    beforeEach(async () => {
        tmpDir = await mkdtemp(join(tmpdir(), 'gsep-test-'));
        key = randomBytes(32);
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    function createStore(): EncryptedConfigStore {
        return new EncryptedConfigStore(key, join(tmpDir, 'config.enc'));
    }

    it('should create empty store on first load', async () => {
        const store = createStore();
        await store.load();
        expect(store.size()).toBe(0);
        expect(store.keys()).toEqual([]);
    });

    it('should set and get values', async () => {
        const store = createStore();
        await store.load();
        await store.set('API_KEY', 'sk-test-123');
        expect(store.get('API_KEY')).toBe('sk-test-123');
    });

    it('should persist across instances', async () => {
        const store1 = createStore();
        await store1.load();
        await store1.set('API_KEY', 'sk-test-123');
        await store1.set('SECRET', 'my-secret');

        const store2 = createStore();
        await store2.load();
        expect(store2.get('API_KEY')).toBe('sk-test-123');
        expect(store2.get('SECRET')).toBe('my-secret');
    });

    it('should delete values', async () => {
        const store = createStore();
        await store.load();
        await store.set('KEY', 'value');
        expect(store.has('KEY')).toBe(true);

        const deleted = await store.delete('KEY');
        expect(deleted).toBe(true);
        expect(store.has('KEY')).toBe(false);
    });

    it('should return false when deleting non-existent key', async () => {
        const store = createStore();
        await store.load();
        const deleted = await store.delete('NONEXISTENT');
        expect(deleted).toBe(false);
    });

    it('should list keys sorted', async () => {
        const store = createStore();
        await store.load();
        await store.set('ZEBRA', 'z');
        await store.set('ALPHA', 'a');
        await store.set('MIDDLE', 'm');

        expect(store.keys()).toEqual(['ALPHA', 'MIDDLE', 'ZEBRA']);
    });

    it('should import bulk entries', async () => {
        const store = createStore();
        await store.load();

        const count = await store.import({
            KEY1: 'val1',
            KEY2: 'val2',
            KEY3: '',  // empty, should be skipped
        });

        expect(count).toBe(2);
        expect(store.size()).toBe(2);
    });

    it('should export all entries', async () => {
        const store = createStore();
        await store.load();
        await store.set('A', '1');
        await store.set('B', '2');

        const exported = store.exportAll();
        expect(exported).toEqual({ A: '1', B: '2' });
    });

    it('should fail with wrong key', async () => {
        const store1 = new EncryptedConfigStore(key, join(tmpDir, 'config.enc'));
        await store1.load();
        await store1.set('SECRET', 'value');

        const wrongKey = randomBytes(32);
        const store2 = new EncryptedConfigStore(wrongKey, join(tmpDir, 'config.enc'));
        await expect(store2.load()).rejects.toThrow();
    });

    it('should reject invalid key length', () => {
        expect(() => new EncryptedConfigStore(Buffer.alloc(16))).toThrow('32 bytes');
    });

    it('should throw if not loaded', () => {
        const store = createStore();
        expect(() => store.get('KEY')).toThrow('Not loaded');
    });

    it('should handle unicode values', async () => {
        const store = createStore();
        await store.load();
        await store.set('NAME', 'Luis Velásquez Durán 🧬');

        const store2 = createStore();
        await store2.load();
        expect(store2.get('NAME')).toBe('Luis Velásquez Durán 🧬');
    });

    it('should handle large values', async () => {
        const store = createStore();
        await store.load();
        const largeValue = 'x'.repeat(100_000);
        await store.set('BIG', largeValue);

        const store2 = createStore();
        await store2.load();
        expect(store2.get('BIG')).toBe(largeValue);
    });
});
