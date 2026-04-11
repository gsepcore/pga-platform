import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseCache } from '../ResponseCache.js';

describe('ResponseCache', () => {
    let cache: ResponseCache;

    beforeEach(() => {
        cache = new ResponseCache({ maxSize: 5, ttlMs: 1000 });
    });

    it('should return null for cache miss', () => {
        const result = cache.get('system', 'hello', 'gpt-4');
        expect(result).toBeNull();
    });

    it('should store and retrieve a cached response', () => {
        cache.set('system', 'hello', 'gpt-4', 'Hi there!', { inputTokens: 10, outputTokens: 5 });
        const result = cache.get('system', 'hello', 'gpt-4');
        expect(result).not.toBeNull();
        expect(result!.response).toBe('Hi there!');
        expect(result!.usage?.inputTokens).toBe(10);
        expect(result!.usage?.outputTokens).toBe(5);
    });

    it('should differentiate by model', () => {
        cache.set('system', 'hello', 'gpt-4', 'Response A');
        cache.set('system', 'hello', 'claude-haiku', 'Response B');
        expect(cache.get('system', 'hello', 'gpt-4')!.response).toBe('Response A');
        expect(cache.get('system', 'hello', 'claude-haiku')!.response).toBe('Response B');
    });

    it('should differentiate by system prompt', () => {
        cache.set('You are a teacher', 'hello', 'gpt-4', 'Teacher response');
        cache.set('You are a chef', 'hello', 'gpt-4', 'Chef response');
        expect(cache.get('You are a teacher', 'hello', 'gpt-4')!.response).toBe('Teacher response');
        expect(cache.get('You are a chef', 'hello', 'gpt-4')!.response).toBe('Chef response');
    });

    it('should expire entries after TTL', async () => {
        cache = new ResponseCache({ maxSize: 5, ttlMs: 50 });
        cache.set('sys', 'hello', 'gpt-4', 'cached');
        expect(cache.get('sys', 'hello', 'gpt-4')).not.toBeNull();
        await new Promise(r => setTimeout(r, 60));
        expect(cache.get('sys', 'hello', 'gpt-4')).toBeNull();
    });

    it('should evict oldest entry when at capacity', () => {
        for (let i = 0; i < 5; i++) {
            cache.set('sys', `msg-${i}`, 'gpt-4', `response-${i}`);
        }
        expect(cache.getStats().size).toBe(5);

        // Add one more — should evict msg-0
        cache.set('sys', 'msg-5', 'gpt-4', 'response-5');
        expect(cache.getStats().size).toBe(5);
        expect(cache.get('sys', 'msg-0', 'gpt-4')).toBeNull();
        expect(cache.get('sys', 'msg-5', 'gpt-4')!.response).toBe('response-5');
    });

    it('should track hit/miss statistics', () => {
        cache.set('sys', 'hello', 'gpt-4', 'cached', { inputTokens: 100, outputTokens: 50 });

        cache.get('sys', 'hello', 'gpt-4'); // hit
        cache.get('sys', 'hello', 'gpt-4'); // hit
        cache.get('sys', 'miss', 'gpt-4'); // miss

        const stats = cache.getStats();
        expect(stats.totalHits).toBe(2);
        expect(stats.totalMisses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(0.667, 2);
        expect(stats.tokensSaved).toBe(300); // 150 * 2
    });

    it('should increment hit counter on cache entry', () => {
        cache.set('sys', 'hello', 'gpt-4', 'cached');
        cache.get('sys', 'hello', 'gpt-4'); // hit 1
        cache.get('sys', 'hello', 'gpt-4'); // hit 2
        const entry = cache.get('sys', 'hello', 'gpt-4'); // hit 3
        expect(entry!.hits).toBe(3);
    });

    it('should disable caching when setEnabled(false)', () => {
        cache.set('sys', 'hello', 'gpt-4', 'cached');
        cache.setEnabled(false);
        expect(cache.get('sys', 'hello', 'gpt-4')).toBeNull();
        cache.set('sys', 'new', 'gpt-4', 'new response');
        expect(cache.get('sys', 'new', 'gpt-4')).toBeNull();
        expect(cache.getStats().enabled).toBe(false);
    });

    it('should clear all entries', () => {
        cache.set('sys', 'a', 'gpt-4', 'response-a');
        cache.set('sys', 'b', 'gpt-4', 'response-b');
        expect(cache.getStats().size).toBe(2);
        cache.clear();
        expect(cache.getStats().size).toBe(0);
    });

    it('should update existing key instead of adding duplicate', () => {
        cache.set('sys', 'hello', 'gpt-4', 'first');
        cache.set('sys', 'hello', 'gpt-4', 'second');
        expect(cache.getStats().size).toBe(1);
        expect(cache.get('sys', 'hello', 'gpt-4')!.response).toBe('second');
    });

    it('should default to enabled with 500 max size', () => {
        const defaultCache = new ResponseCache();
        const stats = defaultCache.getStats();
        expect(stats.enabled).toBe(true);
        expect(stats.maxSize).toBe(500);
    });
});
