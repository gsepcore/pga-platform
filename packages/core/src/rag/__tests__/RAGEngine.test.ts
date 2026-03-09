/**
 * RAGEngine Unit Tests
 *
 * Tests the Retrieval-Augmented Generation pipeline including
 * vector search, context augmentation, and LLM generation.
 *
 * @version 0.4.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGEngine, RAGConfig, RAGDocument, RAGSearchResult } from '../RAGEngine.js';

// ============================================================================
// MOCKS
// ============================================================================

function createMockVectorStore() {
    return {
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([
            {
                document: {
                    id: 'doc1',
                    content: 'Relevant content about testing',
                    metadata: { source: 'unit-tests' },
                },
                score: 0.85,
                relevance: 0.85,
            },
        ] as RAGSearchResult[]),
        upsert: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        generateEmbedding: vi.fn().mockResolvedValue(new Array(128).fill(0.1)),
        getStats: vi.fn().mockResolvedValue({
            totalDocuments: 1,
            dimensions: 128,
            indexSize: 1024,
        }),
    };
}

function createMockLLM() {
    return {
        name: 'mock',
        model: 'mock-model',
        chat: vi.fn().mockResolvedValue({
            content: 'Generated response based on context',
            usage: { inputTokens: 100, outputTokens: 50 },
        }),
    };
}

function createDefaultRAGConfig(
    vectorStore: ReturnType<typeof createMockVectorStore>,
    overrides?: Partial<RAGConfig>
): RAGConfig {
    return {
        enabled: true,
        vectorStore: vectorStore as any,
        embeddings: {
            model: 'text-embedding-3-small',
            dimensions: 128,
        },
        search: {
            topK: 5,
            minScore: 0.7,
            hybridSearch: false,
        },
        context: {
            maxTokens: 2000,
            includeMetadata: false,
        },
        ...overrides,
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('RAGEngine', () => {
    let mockVectorStore: ReturnType<typeof createMockVectorStore>;
    let mockLLM: ReturnType<typeof createMockLLM>;
    let config: RAGConfig;
    let engine: RAGEngine;

    beforeEach(() => {
        mockVectorStore = createMockVectorStore();
        mockLLM = createMockLLM();
        config = createDefaultRAGConfig(mockVectorStore);
        engine = new RAGEngine(mockLLM as any, config);
    });

    // ========================================================================
    // RETRIEVE
    // ========================================================================

    describe('retrieve', () => {
        it('should return search results for a query', async () => {
            const results = await engine.retrieve('How do I write tests?');

            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('doc1');
            expect(results[0].document.content).toBe('Relevant content about testing');
            expect(results[0].score).toBe(0.85);

            // Should generate embedding for query
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith(
                'How do I write tests?'
            );

            // Should search the vector store with correct options
            expect(mockVectorStore.search).toHaveBeenCalledWith(
                expect.any(Array),
                { topK: 5, minScore: 0.7 }
            );
        });

        it('should return empty array when no results match', async () => {
            mockVectorStore.search.mockResolvedValue([]);

            const results = await engine.retrieve('completely unrelated query');

            expect(results).toHaveLength(0);
        });

        it('should filter results below minScore', async () => {
            mockVectorStore.search.mockResolvedValue([
                {
                    document: { id: 'doc-high', content: 'High relevance', metadata: {} },
                    score: 0.9,
                    relevance: 0.9,
                },
                {
                    document: { id: 'doc-low', content: 'Low relevance', metadata: {} },
                    score: 0.5, // Below the 0.7 minScore
                    relevance: 0.5,
                },
            ] as RAGSearchResult[]);

            const results = await engine.retrieve('test query');

            // Only the high-score result should pass the filter
            expect(results).toHaveLength(1);
            expect(results[0].document.id).toBe('doc-high');
        });

        it('should respect custom minScore from config', async () => {
            const strictConfig = createDefaultRAGConfig(mockVectorStore, {
                search: { topK: 5, minScore: 0.95, hybridSearch: false },
            });
            const strictEngine = new RAGEngine(mockLLM as any, strictConfig);

            mockVectorStore.search.mockResolvedValue([
                {
                    document: { id: 'doc1', content: 'Good result', metadata: {} },
                    score: 0.9,
                    relevance: 0.9,
                },
            ] as RAGSearchResult[]);

            const results = await strictEngine.retrieve('test query');

            // 0.9 < 0.95 minScore, so filtered out
            expect(results).toHaveLength(0);
        });

        it('should propagate errors from vector store', async () => {
            mockVectorStore.generateEmbedding.mockRejectedValue(
                new Error('Embedding service down')
            );

            await expect(engine.retrieve('test query')).rejects.toThrow(
                'Embedding service down'
            );
        });
    });

    // ========================================================================
    // AUGMENT
    // ========================================================================

    describe('augment', () => {
        it('should include retrieved context in augmented prompt', async () => {
            const ragContext = await engine.augment(
                'How do I test?',
                'You are a helpful assistant.'
            );

            expect(ragContext.query).toBe('How do I test?');
            expect(ragContext.results).toHaveLength(1);
            expect(ragContext.augmentedPrompt).toContain('You are a helpful assistant.');
            expect(ragContext.augmentedPrompt).toContain('Retrieved Knowledge Context');
            expect(ragContext.augmentedPrompt).toContain('Relevant content about testing');
            expect(ragContext.totalTokens).toBeGreaterThan(0);
        });

        it('should return base prompt unchanged when no results found', async () => {
            mockVectorStore.search.mockResolvedValue([]);

            const ragContext = await engine.augment(
                'unrelated query',
                'You are a helpful assistant.'
            );

            expect(ragContext.augmentedPrompt).toBe('You are a helpful assistant.');
            expect(ragContext.results).toHaveLength(0);
        });

        it('should include metadata in augmented prompt when config enables it', async () => {
            const metadataConfig = createDefaultRAGConfig(mockVectorStore, {
                context: { maxTokens: 2000, includeMetadata: true },
            });
            const metadataEngine = new RAGEngine(mockLLM as any, metadataConfig);

            const ragContext = await metadataEngine.augment(
                'How do I test?',
                'Base prompt.'
            );

            expect(ragContext.augmentedPrompt).toContain('Metadata');
            expect(ragContext.augmentedPrompt).toContain('unit-tests');
        });

        it('should include multiple documents when available', async () => {
            mockVectorStore.search.mockResolvedValue([
                {
                    document: { id: 'doc1', content: 'First document about testing', metadata: {} },
                    score: 0.95,
                    relevance: 0.95,
                },
                {
                    document: { id: 'doc2', content: 'Second document about deployment', metadata: {} },
                    score: 0.85,
                    relevance: 0.85,
                },
            ] as RAGSearchResult[]);

            const ragContext = await engine.augment('testing and deployment', 'Base prompt.');

            expect(ragContext.results).toHaveLength(2);
            expect(ragContext.augmentedPrompt).toContain('First document about testing');
            expect(ragContext.augmentedPrompt).toContain('Second document about deployment');
            expect(ragContext.augmentedPrompt).toContain('Document 1');
            expect(ragContext.augmentedPrompt).toContain('Document 2');
        });
    });

    // ========================================================================
    // GENERATE
    // ========================================================================

    describe('generate', () => {
        it('should call LLM with augmented prompt and return generated text', async () => {
            const response = await engine.generate(
                'How do I write unit tests?',
                'You are a testing expert.'
            );

            expect(response).toBe('Generated response based on context');

            // LLM should receive the augmented system prompt + user query
            expect(mockLLM.chat).toHaveBeenCalledTimes(1);

            const [messages] = mockLLM.chat.mock.calls[0];
            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toContain('You are a testing expert.');
            expect(messages[0].content).toContain('Retrieved Knowledge Context');
            expect(messages[1].role).toBe('user');
            expect(messages[1].content).toBe('How do I write unit tests?');
        });

        it('should propagate LLM errors', async () => {
            mockLLM.chat.mockRejectedValue(new Error('LLM rate limited'));

            await expect(
                engine.generate('test query', 'base prompt')
            ).rejects.toThrow('LLM rate limited');
        });
    });

    // ========================================================================
    // INDEX DOCUMENT
    // ========================================================================

    describe('indexDocument', () => {
        it('should generate embedding and upsert document to vector store', async () => {
            const document: RAGDocument = {
                id: 'new-doc-1',
                content: 'New document about gene extraction',
                metadata: { category: 'genetics' },
            };

            await engine.indexDocument(document);

            // Should generate embedding
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith(
                'New document about gene extraction'
            );

            // Should upsert with generated embedding
            expect(mockVectorStore.upsert).toHaveBeenCalledTimes(1);
            const upsertedDocs = mockVectorStore.upsert.mock.calls[0][0];
            expect(upsertedDocs).toHaveLength(1);
            expect(upsertedDocs[0].id).toBe('new-doc-1');
            expect(upsertedDocs[0].embedding).toEqual(new Array(128).fill(0.1));
        });

        it('should skip embedding generation when document already has an embedding', async () => {
            const precomputedEmbedding = new Array(128).fill(0.5);
            const document: RAGDocument = {
                id: 'pre-embedded-doc',
                content: 'Already has embedding',
                metadata: {},
                embedding: precomputedEmbedding,
            };

            await engine.indexDocument(document);

            // Should NOT generate a new embedding
            expect(mockVectorStore.generateEmbedding).not.toHaveBeenCalled();

            // Should upsert with original embedding
            expect(mockVectorStore.upsert).toHaveBeenCalledTimes(1);
            const upsertedDocs = mockVectorStore.upsert.mock.calls[0][0];
            expect(upsertedDocs[0].embedding).toBe(precomputedEmbedding);
        });
    });

    // ========================================================================
    // INDEX DOCUMENTS (BATCH)
    // ========================================================================

    describe('indexDocuments', () => {
        it('should generate embeddings and upsert all documents in batch', async () => {
            const documents: RAGDocument[] = [
                { id: 'batch-1', content: 'First batch document', metadata: {} },
                { id: 'batch-2', content: 'Second batch document', metadata: {} },
                { id: 'batch-3', content: 'Third batch document', metadata: {} },
            ];

            await engine.indexDocuments(documents);

            // Should generate embedding for each document
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledTimes(3);
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('First batch document');
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('Second batch document');
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('Third batch document');

            // Should upsert all documents in a single call
            expect(mockVectorStore.upsert).toHaveBeenCalledTimes(1);
            const upsertedDocs = mockVectorStore.upsert.mock.calls[0][0];
            expect(upsertedDocs).toHaveLength(3);
        });

        it('should skip embedding generation for documents that already have embeddings', async () => {
            const documents: RAGDocument[] = [
                { id: 'batch-1', content: 'Needs embedding', metadata: {} },
                {
                    id: 'batch-2',
                    content: 'Has embedding',
                    metadata: {},
                    embedding: new Array(128).fill(0.7),
                },
            ];

            await engine.indexDocuments(documents);

            // Only one embedding generation needed
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledTimes(1);
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('Needs embedding');
        });

        it('should propagate errors during batch indexing', async () => {
            mockVectorStore.upsert.mockRejectedValue(new Error('Storage full'));

            const documents: RAGDocument[] = [
                { id: 'doc-fail', content: 'Will fail', metadata: {} },
            ];

            await expect(engine.indexDocuments(documents)).rejects.toThrow('Storage full');
        });
    });

    // ========================================================================
    // DELETE DOCUMENT
    // ========================================================================

    describe('deleteDocument', () => {
        it('should call vector store delete with the document ID', async () => {
            await engine.deleteDocument('doc-to-delete');

            expect(mockVectorStore.delete).toHaveBeenCalledTimes(1);
            expect(mockVectorStore.delete).toHaveBeenCalledWith(['doc-to-delete']);
        });

        it('should propagate delete errors', async () => {
            mockVectorStore.delete.mockRejectedValue(new Error('Document not found'));

            await expect(engine.deleteDocument('nonexistent')).rejects.toThrow(
                'Document not found'
            );
        });
    });

    // ========================================================================
    // METRICS COLLECTOR INTEGRATION
    // ========================================================================

    describe('metrics collector integration', () => {
        it('should log audit on successful retrieve', async () => {
            const mockMetrics = { logAudit: vi.fn() };
            const engineWithMetrics = new RAGEngine(
                mockLLM as any,
                config,
                mockMetrics as any
            );

            await engineWithMetrics.retrieve('test query');

            expect(mockMetrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    component: 'RAGEngine',
                    operation: 'retrieve',
                })
            );
        });

        it('should log audit on retrieve error', async () => {
            const mockMetrics = { logAudit: vi.fn() };
            const engineWithMetrics = new RAGEngine(
                mockLLM as any,
                config,
                mockMetrics as any
            );

            mockVectorStore.generateEmbedding.mockRejectedValue(new Error('Network error'));

            await expect(engineWithMetrics.retrieve('test')).rejects.toThrow('Network error');

            expect(mockMetrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    component: 'RAGEngine',
                    operation: 'retrieve',
                })
            );
        });

        it('should log audit on successful batch indexing', async () => {
            const mockMetrics = { logAudit: vi.fn() };
            const engineWithMetrics = new RAGEngine(
                mockLLM as any,
                config,
                mockMetrics as any
            );

            await engineWithMetrics.indexDocuments([
                { id: 'doc1', content: 'test', metadata: {} },
            ]);

            expect(mockMetrics.logAudit).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    component: 'RAGEngine',
                    operation: 'index_documents',
                })
            );
        });
    });

    // ========================================================================
    // END-TO-END PIPELINE
    // ========================================================================

    describe('full pipeline', () => {
        it('should chain retrieve -> augment -> generate correctly', async () => {
            mockVectorStore.search.mockResolvedValue([
                {
                    document: {
                        id: 'knowledge-1',
                        content: 'PGA uses genomic evolution for prompt optimization.',
                        metadata: { source: 'docs' },
                    },
                    score: 0.92,
                    relevance: 0.92,
                },
            ] as RAGSearchResult[]);

            mockLLM.chat.mockResolvedValue({
                content: 'PGA Platform uses biological evolution principles to improve prompts automatically.',
                usage: { inputTokens: 200, outputTokens: 80 },
            });

            const response = await engine.generate(
                'What is PGA?',
                'You are a documentation assistant.'
            );

            // Embedding was generated
            expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith('What is PGA?');

            // Vector store was searched
            expect(mockVectorStore.search).toHaveBeenCalled();

            // LLM was called with augmented context
            const [messages] = mockLLM.chat.mock.calls[0];
            expect(messages[0].content).toContain('genomic evolution');
            expect(messages[0].content).toContain('You are a documentation assistant.');

            // Final response returned
            expect(response).toContain('biological evolution');
        });
    });
});
