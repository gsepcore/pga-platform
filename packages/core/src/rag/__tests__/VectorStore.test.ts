/**
 * InMemoryVectorStore Tests
 *
 * Tests for vector storage, cosine similarity search, metadata filtering,
 * custom embeddings, and statistics.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryVectorStore } from '../VectorStoreAdapter.js';
import type { RAGDocument } from '../RAGEngine.js';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Create a unit vector pointing in a specific direction.
 * Uses a simple approach: sets one dimension to 1.0, rest to 0.
 * Two vectors sharing the same "hot" dimension will have similarity = 1.0.
 */
function unitVector(dimension: number, size: number = 128): number[] {
    const vec = new Array(size).fill(0);
    vec[dimension % size] = 1.0;
    return vec;
}

/**
 * Create an embedding where all values are the same (normalized).
 * Two such vectors with the same length will have cosine similarity = 1.0.
 */
function uniformVector(size: number = 128): number[] {
    const val = 1 / Math.sqrt(size);
    return new Array(size).fill(val);
}

/**
 * Create a document with an explicit embedding.
 */
function makeDoc(
    id: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {},
): RAGDocument {
    return { id, content, embedding, metadata };
}

// ─── Tests ──────────────────────────────────────────────────

describe('InMemoryVectorStore', () => {
    let store: InMemoryVectorStore;

    beforeEach(() => {
        store = new InMemoryVectorStore();
    });

    // ── initialize ──────────────────────────────────────────

    describe('initialize', () => {
        it('should succeed (no-op)', async () => {
            await expect(store.initialize()).resolves.toBeUndefined();
        });
    });

    // ── upsert ──────────────────────────────────────────────

    describe('upsert', () => {
        it('should store documents that can be retrieved via search', async () => {
            const embedding = unitVector(0);
            await store.upsert([makeDoc('doc-1', 'hello world', embedding)]);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(1);
        });

        it('should overwrite an existing document with the same id', async () => {
            const embedding = unitVector(0);
            await store.upsert([makeDoc('doc-1', 'version 1', embedding)]);
            await store.upsert([makeDoc('doc-1', 'version 2', embedding)]);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(1);

            // Search should return the updated content
            const results = await store.search(embedding, { topK: 10 });
            expect(results[0].document.content).toBe('version 2');
        });

        it('should store multiple documents in a single call', async () => {
            await store.upsert([
                makeDoc('a', 'alpha', unitVector(0)),
                makeDoc('b', 'beta', unitVector(1)),
                makeDoc('c', 'gamma', unitVector(2)),
            ]);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(3);
        });
    });

    // ── search ──────────────────────────────────────────────

    describe('search', () => {
        it('should return matching documents sorted by cosine similarity', async () => {
            // Doc A is along dimension 0, Doc B is along dimension 1
            await store.upsert([
                makeDoc('exact-match', 'exact', unitVector(0)),
                makeDoc('no-match', 'different', unitVector(1)),
            ]);

            // Query along dimension 0 => exact-match should score 1.0, no-match should score 0.0
            const results = await store.search(unitVector(0), { topK: 10 });
            expect(results.length).toBe(2);
            expect(results[0].document.id).toBe('exact-match');
            expect(results[0].score).toBeCloseTo(1.0, 5);
            expect(results[1].document.id).toBe('no-match');
            expect(results[1].score).toBeCloseTo(0.0, 5);
        });

        it('should respect the minScore filter', async () => {
            await store.upsert([
                makeDoc('high', 'relevant', unitVector(0)),
                makeDoc('low', 'irrelevant', unitVector(1)),
            ]);

            // Query along dim 0; minScore 0.5 should exclude the orthogonal vector
            const results = await store.search(unitVector(0), { topK: 10, minScore: 0.5 });
            expect(results.length).toBe(1);
            expect(results[0].document.id).toBe('high');
        });

        it('should respect the topK limit', async () => {
            await store.upsert([
                makeDoc('a', 'one', uniformVector()),
                makeDoc('b', 'two', uniformVector()),
                makeDoc('c', 'three', uniformVector()),
            ]);

            const results = await store.search(uniformVector(), { topK: 2 });
            expect(results.length).toBe(2);
        });

        it('should apply metadata filter', async () => {
            await store.upsert([
                makeDoc('py', 'python doc', unitVector(0), { language: 'python' }),
                makeDoc('js', 'javascript doc', unitVector(0), { language: 'javascript' }),
            ]);

            const results = await store.search(unitVector(0), {
                topK: 10,
                filter: { language: 'python' },
            });
            expect(results.length).toBe(1);
            expect(results[0].document.id).toBe('py');
        });

        it('should skip documents without embeddings', async () => {
            const docNoEmbed: RAGDocument = {
                id: 'no-embed',
                content: 'missing embedding',
                metadata: {},
            };
            await store.upsert([
                docNoEmbed,
                makeDoc('has-embed', 'has embedding', unitVector(0)),
            ]);

            const results = await store.search(unitVector(0), { topK: 10 });
            expect(results.length).toBe(1);
            expect(results[0].document.id).toBe('has-embed');
        });

        it('should return empty array when no documents match', async () => {
            const results = await store.search(unitVector(0), { topK: 5 });
            expect(results).toEqual([]);
        });
    });

    // ── delete ──────────────────────────────────────────────

    describe('delete', () => {
        it('should remove documents by their IDs', async () => {
            await store.upsert([
                makeDoc('keep', 'stay', unitVector(0)),
                makeDoc('remove', 'go away', unitVector(1)),
            ]);

            await store.delete(['remove']);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(1);

            const results = await store.search(unitVector(1), { topK: 10 });
            expect(results.every((r) => r.document.id !== 'remove')).toBe(true);
        });

        it('should handle deletion of non-existent IDs without error', async () => {
            await store.upsert([makeDoc('a', 'alpha', unitVector(0))]);
            await expect(store.delete(['non-existent'])).resolves.toBeUndefined();
            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(1);
        });

        it('should handle deletion of multiple IDs', async () => {
            await store.upsert([
                makeDoc('a', 'alpha', unitVector(0)),
                makeDoc('b', 'beta', unitVector(1)),
                makeDoc('c', 'gamma', unitVector(2)),
            ]);

            await store.delete(['a', 'c']);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(1);
        });
    });

    // ── generateEmbedding ───────────────────────────────────

    describe('generateEmbedding', () => {
        it('should return a 128-dimensional vector with fallback embedding', async () => {
            const embedding = await store.generateEmbedding('hello world');
            expect(embedding.length).toBe(128);
            expect(embedding.every((v) => typeof v === 'number')).toBe(true);
        });

        it('should return consistent results for the same input', async () => {
            const a = await store.generateEmbedding('test input');
            const b = await store.generateEmbedding('test input');
            expect(a).toEqual(b);
        });

        it('should return different results for different inputs', async () => {
            const a = await store.generateEmbedding('apples and oranges');
            const b = await store.generateEmbedding('quantum physics equations');
            // Vectors should not be identical
            const allSame = a.every((val, i) => val === b[i]);
            expect(allSame).toBe(false);
        });

        it('should produce a unit vector (normalized)', async () => {
            const embedding = await store.generateEmbedding('some text to embed');
            const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
            expect(norm).toBeCloseTo(1.0, 5);
        });
    });

    // ── getStats ────────────────────────────────────────────

    describe('getStats', () => {
        it('should return correct counts for an empty store', async () => {
            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(0);
            expect(stats.dimensions).toBe(0);
            expect(stats.indexSize).toBe(0);
        });

        it('should return correct counts and dimensions after upserting documents', async () => {
            const dim = 64;
            const embedding = new Array(dim).fill(0.1);

            await store.upsert([
                makeDoc('d1', 'first', embedding),
                makeDoc('d2', 'second', embedding),
            ]);

            const stats = await store.getStats();
            expect(stats.totalDocuments).toBe(2);
            expect(stats.dimensions).toBe(dim);
            // indexSize is an estimate: totalDocuments * dimensions * 4
            expect(stats.indexSize).toBe(2 * dim * 4);
        });
    });

    // ── Custom embedding service ────────────────────────────

    describe('custom embedding service', () => {
        it('should use the provided embedding service instead of fallback', async () => {
            const customEmbedding = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
            const customStore = new InMemoryVectorStore(customEmbedding);

            const result = await customStore.generateEmbedding('test');
            expect(result).toEqual([0.1, 0.2, 0.3]);
            expect(customEmbedding).toHaveBeenCalledWith('test');
            expect(customEmbedding).toHaveBeenCalledTimes(1);
        });

        it('should call the custom service for each generateEmbedding invocation', async () => {
            const customEmbedding = vi.fn().mockResolvedValue(new Array(128).fill(0));
            const customStore = new InMemoryVectorStore(customEmbedding);

            await customStore.generateEmbedding('text A');
            await customStore.generateEmbedding('text B');

            expect(customEmbedding).toHaveBeenCalledTimes(2);
            expect(customEmbedding).toHaveBeenCalledWith('text A');
            expect(customEmbedding).toHaveBeenCalledWith('text B');
        });
    });

    // ── Edge cases ──────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle searching with a zero vector gracefully', async () => {
            await store.upsert([makeDoc('a', 'test', unitVector(0))]);

            const zeroVec = new Array(128).fill(0);
            const results = await store.search(zeroVec, { topK: 5 });
            // cosineSimilarity returns 0 when one vector is zero
            // Depending on minScore, these may or may not be returned
            expect(results).toBeDefined();
            for (const r of results) {
                expect(r.score).toBe(0);
            }
        });

        it('should throw when querying with mismatched vector dimensions', async () => {
            await store.upsert([makeDoc('a', 'test', unitVector(0, 128))]);

            const wrongDim = unitVector(0, 64);
            await expect(store.search(wrongDim, { topK: 5 })).rejects.toThrow(
                'Vectors must have same dimensions',
            );
        });
    });
});
