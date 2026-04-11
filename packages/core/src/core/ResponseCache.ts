/**
 * Response Cache — LRU cache with TTL for LLM responses.
 *
 * Caches responses by content hash to avoid redundant LLM calls.
 * Supports TTL-based expiration and LRU eviction.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-04-10
 */

import { createHash } from 'node:crypto';

export interface CacheEntry {
    response: string;
    usage?: { inputTokens: number; outputTokens: number };
    createdAt: number;
    hits: number;
}

export interface ResponseCacheConfig {
    /** Maximum number of cached entries (default: 500) */
    maxSize?: number;
    /** Time-to-live in milliseconds (default: 30 minutes) */
    ttlMs?: number;
    /** Whether caching is enabled (default: true) */
    enabled?: boolean;
}

export class ResponseCache {
    private cache = new Map<string, CacheEntry>();
    private readonly maxSize: number;
    private readonly ttlMs: number;
    private enabled: boolean;

    // Stats
    private totalHits = 0;
    private totalMisses = 0;
    private totalSaved = 0; // estimated tokens saved

    constructor(config: ResponseCacheConfig = {}) {
        this.maxSize = config.maxSize ?? 500;
        this.ttlMs = config.ttlMs ?? 30 * 60 * 1000; // 30 min
        this.enabled = config.enabled ?? true;
    }

    /**
     * Generate a cache key from system prompt + user message + model
     */
    private makeKey(systemPrompt: string, userMessage: string, model: string): string {
        const content = `${model}::${systemPrompt}::${userMessage}`;
        return createHash('sha256').update(content).digest('hex').slice(0, 32);
    }

    /**
     * Look up a cached response
     */
    get(systemPrompt: string, userMessage: string, model: string): CacheEntry | null {
        if (!this.enabled) return null;

        const key = this.makeKey(systemPrompt, userMessage, model);
        const entry = this.cache.get(key);

        if (!entry) {
            this.totalMisses++;
            return null;
        }

        // Check TTL
        if (Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(key);
            this.totalMisses++;
            return null;
        }

        // LRU: move to end (most recently used)
        this.cache.delete(key);
        entry.hits++;
        this.cache.set(key, entry);

        this.totalHits++;
        if (entry.usage) {
            this.totalSaved += entry.usage.inputTokens + entry.usage.outputTokens;
        }

        return entry;
    }

    /**
     * Store a response in cache
     */
    set(
        systemPrompt: string,
        userMessage: string,
        model: string,
        response: string,
        usage?: { inputTokens: number; outputTokens: number },
    ): void {
        if (!this.enabled) return;

        const key = this.makeKey(systemPrompt, userMessage, model);

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            response,
            usage,
            createdAt: Date.now(),
            hits: 0,
        });
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        totalHits: number;
        totalMisses: number;
        tokensSaved: number;
        enabled: boolean;
    } {
        const total = this.totalHits + this.totalMisses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: total > 0 ? this.totalHits / total : 0,
            totalHits: this.totalHits,
            totalMisses: this.totalMisses,
            tokensSaved: this.totalSaved,
            enabled: this.enabled,
        };
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Enable or disable caching
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) this.cache.clear();
    }
}
