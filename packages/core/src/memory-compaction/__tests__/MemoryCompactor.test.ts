/**
 * MemoryCompactor Tests
 *
 * Tests for conversation memory compaction, prioritization, and configuration.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCompactor } from '../MemoryCompactor.js';
import type { Conversation, MemoryItem, Message } from '../types.js';

// ─── Helpers ────────────────────────────────────────────────

function makeMessage(
    role: Message['role'],
    content: string,
    tokens?: number,
    timestamp?: Date,
): Message {
    return {
        role,
        content,
        timestamp: timestamp ?? new Date(),
        tokens,
    };
}

function makeConversation(
    messageCount: number,
    tokensPerMessage: number,
    idPrefix = 'conv',
): Conversation {
    const messages: Message[] = [];
    for (let i = 0; i < messageCount; i++) {
        const role: Message['role'] = i % 2 === 0 ? 'user' : 'assistant';
        messages.push(
            makeMessage(role, `Message ${i} `.repeat(10), tokensPerMessage, new Date(Date.now() - (messageCount - i) * 60000)),
        );
    }
    return {
        id: `${idPrefix}-${Date.now()}`,
        messages,
        totalTokens: messageCount * tokensPerMessage,
    };
}

function makeMemoryItem(overrides: Partial<MemoryItem> = {}): MemoryItem {
    return {
        id: overrides.id ?? `mem-${Math.random().toString(36).slice(2, 8)}`,
        content: overrides.content ?? 'some content',
        importance: overrides.importance ?? 0.5,
        timestamp: overrides.timestamp ?? new Date(),
        tokens: overrides.tokens ?? 20,
        type: overrides.type ?? 'fact',
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────

describe('MemoryCompactor', () => {
    let compactor: MemoryCompactor;

    beforeEach(() => {
        compactor = new MemoryCompactor();
    });

    // ── Constructor & defaults ──────────────────────────────

    describe('constructor defaults', () => {
        it('should use sensible defaults when no config is provided', () => {
            const config = compactor.getConfig();
            expect(config.maxTokens).toBe(100000);
            expect(config.compactionThreshold).toBe(0.8);
            expect(config.targetCompressionRatio).toBe(0.3);
            expect(config.strategy).toBe('sliding-window');
            expect(config.minImportance).toBe(0.3);
            expect(config.preserveRecent).toBe(true);
            expect(config.recentMessagesCount).toBe(10);
        });

        it('should merge partial config with defaults', () => {
            const custom = new MemoryCompactor({ maxTokens: 50000, strategy: 'importance-based' });
            const config = custom.getConfig();
            expect(config.maxTokens).toBe(50000);
            expect(config.strategy).toBe('importance-based');
            // Remaining fields are defaults
            expect(config.compactionThreshold).toBe(0.8);
            expect(config.recentMessagesCount).toBe(10);
        });
    });

    // ── shouldCompact ───────────────────────────────────────

    describe('shouldCompact', () => {
        it('should return false when totalTokens is below threshold', () => {
            // Default threshold = 100000 * 0.8 = 80000
            // Each message has 100 tokens, 10 messages = 1000 tokens
            const conversation = makeConversation(10, 100);
            expect(compactor.shouldCompact(conversation)).toBe(false);
        });

        it('should return true when totalTokens is at the threshold', () => {
            // Need totalTokens >= 80000 with estimateTokens based on content.length/4
            // Each message "Message N " repeated 10x is about 100 chars -> ~25 estimated tokens
            // But with explicit token count it uses that. Let's use explicit tokens.
            const messages: Message[] = [];
            for (let i = 0; i < 80; i++) {
                messages.push(makeMessage('user', 'x', 1000));
            }
            const conversation: Conversation = {
                id: 'test-at-threshold',
                messages,
                totalTokens: 80000, // This field is informational; shouldCompact uses calculateTotalTokens
            };
            expect(compactor.shouldCompact(conversation)).toBe(true);
        });

        it('should return true when totalTokens exceeds the threshold', () => {
            const messages: Message[] = [];
            for (let i = 0; i < 100; i++) {
                messages.push(makeMessage('user', 'x', 1000));
            }
            const conversation: Conversation = {
                id: 'test-over-threshold',
                messages,
                totalTokens: 100000,
            };
            expect(compactor.shouldCompact(conversation)).toBe(true);
        });

        it('should respect custom maxTokens and threshold', () => {
            const custom = new MemoryCompactor({ maxTokens: 1000, compactionThreshold: 0.5 });
            // Threshold = 1000 * 0.5 = 500. 10 messages * 60 tokens = 600 -> true
            const messages: Message[] = [];
            for (let i = 0; i < 10; i++) {
                messages.push(makeMessage('user', 'x', 60));
            }
            const conversation: Conversation = {
                id: 'custom-threshold',
                messages,
                totalTokens: 600,
            };
            expect(custom.shouldCompact(conversation)).toBe(true);
        });
    });

    // ── compactConversation ─────────────────────────────────

    describe('compactConversation', () => {
        it('should compact with sliding-window strategy and return a success result', async () => {
            // Need > recentMessagesCount (10) messages
            const conversation = makeConversation(20, 500);

            const result = await compactor.compactConversation(conversation);
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('sliding-window');
            expect(result.tokensSaved).toBeGreaterThan(0);
            expect(result.compressionRatio).toBeGreaterThan(0);
            expect(result.compressionRatio).toBeLessThan(1);
            expect(result.originalMessages.length).toBe(10); // 20 - 10 kept
        });

        it('should return unsuccessful result when not enough messages for sliding-window', async () => {
            // Only 5 messages, recentMessagesCount = 10 -> nothing to compact
            const conversation = makeConversation(5, 500);
            const result = await compactor.compactConversation(conversation);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should compact with importance-based strategy when configured', async () => {
            // Use high minImportance so more messages are classified as "unimportant"
            const importanceCompactor = new MemoryCompactor({
                strategy: 'importance-based',
                minImportance: 0.9,
            });
            // Create many short, low-importance messages
            const conversation: Conversation = {
                id: 'importance-test',
                messages: Array.from({ length: 20 }, (_, i) =>
                    makeMessage(
                        i % 2 === 0 ? 'user' : 'assistant',
                        `msg ${i}`,
                        10,
                        new Date(Date.now() - (20 - i) * 60000),
                    ),
                ),
                totalTokens: 200,
            };

            const result = await importanceCompactor.compactConversation(conversation);
            expect(result.strategy).toBe('importance-based');
            expect(result.success).toBe(true);
        });

        it('should throw an error for an unknown strategy', async () => {
            const badCompactor = new MemoryCompactor();
            badCompactor.updateConfig({ strategy: 'non-existent' as any });
            const conversation = makeConversation(20, 500);

            await expect(badCompactor.compactConversation(conversation)).rejects.toThrow(
                "Strategy 'non-existent' not found",
            );
        });
    });

    // ── applyCompaction ─────────────────────────────────────

    describe('applyCompaction', () => {
        it('should filter out compacted messages and prepend the summary message', async () => {
            const conversation = makeConversation(20, 500);
            const result = await compactor.compactConversation(conversation);

            expect(result.success).toBe(true);

            const compacted = compactor.applyCompaction(conversation, result);
            // Should have compactedMessage + recentMessagesCount messages
            // The compacted message is placed at the beginning
            expect(compacted.messages[0].role).toBe('system');
            // Original conversation had 20 messages, 10 were compacted, 10 remain + 1 summary = 11
            expect(compacted.messages.length).toBe(11);
        });

        it('should return the original conversation when result.success is false', () => {
            const conversation = makeConversation(5, 100);
            const failedResult = {
                success: false,
                originalMessages: [],
                compactedMessage: {
                    role: 'system' as const,
                    content: '',
                    originalMessages: 0,
                    compressionRatio: 1,
                    timestamp: new Date(),
                },
                tokensSaved: 0,
                compressionRatio: 1,
                strategy: 'sliding-window',
                error: 'Not enough messages',
            };

            const result = compactor.applyCompaction(conversation, failedResult);
            expect(result).toBe(conversation); // Same reference
        });

        it('should include metadata about the compaction', async () => {
            const conversation = makeConversation(20, 500);
            const result = await compactor.compactConversation(conversation);
            const compacted = compactor.applyCompaction(conversation, result);

            expect(compacted.metadata).toBeDefined();
            expect(compacted.metadata!.lastCompaction).toBeDefined();
            expect(compacted.metadata!.tokensSaved).toBe(result.tokensSaved);
            expect(compacted.metadata!.compressionRatio).toBe(result.compressionRatio);
        });
    });

    // ── extractEssentials ───────────────────────────────────

    describe('extractEssentials', () => {
        it('should extract topics from messages containing known topic keywords', () => {
            const conversation: Conversation = {
                id: 'extract-test',
                messages: [
                    makeMessage('user', 'I have a bug in the database code', undefined, new Date('2026-01-01')),
                    makeMessage('assistant', 'Let me help with the error in your function', undefined, new Date('2026-01-02')),
                    makeMessage('user', 'The api performance is terrible', undefined, new Date('2026-01-03')),
                ],
                totalTokens: 300,
            };

            const summary = compactor.extractEssentials(conversation);
            expect(summary.mainTopics).toContain('bug');
            expect(summary.mainTopics).toContain('database');
            expect(summary.mainTopics).toContain('error');
            expect(summary.mainTopics).toContain('function');
            // 'api' is topic #6, but mainTopics is limited to 5 via .slice(0, 5)
            expect(summary.mainTopics.length).toBeLessThanOrEqual(5);
        });

        it('should extract decisions from messages containing decision keywords', () => {
            const conversation: Conversation = {
                id: 'decisions-test',
                messages: [
                    makeMessage('user', 'We decided to use TypeScript for the project'),
                    makeMessage('assistant', 'We will use Vitest for testing'),
                ],
                totalTokens: 200,
            };

            const summary = compactor.extractEssentials(conversation);
            expect(summary.importantDecisions.length).toBeGreaterThanOrEqual(2);
            expect(summary.importantDecisions[0]).toContain('decided');
        });

        it('should extract key facts from messages with importance markers', () => {
            const conversation: Conversation = {
                id: 'facts-test',
                messages: [
                    makeMessage('user', 'Note that the server requires TLS 1.3'),
                    makeMessage('assistant', 'Remember to update the certificates monthly'),
                    makeMessage('user', 'This is important: the key is rotated daily'),
                ],
                totalTokens: 200,
            };

            const summary = compactor.extractEssentials(conversation);
            expect(summary.keyFacts.length).toBe(3);
        });

        it('should set coverageRange from first to last message timestamps', () => {
            const from = new Date('2026-01-01');
            const to = new Date('2026-03-01');
            const conversation: Conversation = {
                id: 'range-test',
                messages: [
                    makeMessage('user', 'first', undefined, from),
                    makeMessage('assistant', 'last', undefined, to),
                ],
                totalTokens: 50,
            };

            const summary = compactor.extractEssentials(conversation);
            expect(summary.coverageRange.from).toEqual(from);
            expect(summary.coverageRange.to).toEqual(to);
            expect(summary.coverageRange.messagesCount).toBe(2);
        });
    });

    // ── prioritizeMemory ────────────────────────────────────

    describe('prioritizeMemory', () => {
        it('should sort items by composite score (importance + recency)', () => {
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 3600_000);
            const dayAgo = new Date(now.getTime() - 86400_000);

            const items: MemoryItem[] = [
                makeMemoryItem({ id: 'old-low', importance: 0.2, timestamp: dayAgo }),
                makeMemoryItem({ id: 'recent-high', importance: 0.9, timestamp: now }),
                makeMemoryItem({ id: 'old-high', importance: 0.9, timestamp: dayAgo }),
                makeMemoryItem({ id: 'recent-low', importance: 0.2, timestamp: now }),
            ];

            const sorted = compactor.prioritizeMemory(items);
            // recent-high should be first (highest importance + highest recency)
            expect(sorted[0].id).toBe('recent-high');
            // old-low should be last (lowest importance + lowest recency)
            expect(sorted[sorted.length - 1].id).toBe('old-low');
        });

        it('should respect custom prioritization weights', () => {
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 86400_000);

            const items: MemoryItem[] = [
                makeMemoryItem({ id: 'old-important', importance: 1.0, timestamp: dayAgo }),
                makeMemoryItem({ id: 'recent-trivial', importance: 0.1, timestamp: now }),
            ];

            // With extreme importance weight, old-important should beat recent-trivial
            const importanceFocused = compactor.prioritizeMemory(items, {
                importanceWeight: 0.95,
                recencyWeight: 0.05,
                frequencyWeight: 0.0,
            });
            expect(importanceFocused[0].id).toBe('old-important');

            // With extreme recency weight, recent-trivial should beat old-important
            const recencyFocused = compactor.prioritizeMemory(items, {
                importanceWeight: 0.05,
                recencyWeight: 0.95,
                frequencyWeight: 0.0,
            });
            expect(recencyFocused[0].id).toBe('recent-trivial');
        });

        it('should handle a single item', () => {
            const item = makeMemoryItem({ id: 'only' });
            const result = compactor.prioritizeMemory([item]);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('only');
        });
    });

    // ── getAvailableStrategies ──────────────────────────────

    describe('getAvailableStrategies', () => {
        it('should return both sliding-window and importance-based strategies', () => {
            const strategies = compactor.getAvailableStrategies();
            expect(strategies).toContain('sliding-window');
            expect(strategies).toContain('importance-based');
            expect(strategies).toHaveLength(2);
        });
    });

    // ── updateConfig ────────────────────────────────────────

    describe('updateConfig', () => {
        it('should update configuration and change behaviour', () => {
            compactor.updateConfig({ maxTokens: 5000, compactionThreshold: 0.5 });
            const config = compactor.getConfig();
            expect(config.maxTokens).toBe(5000);
            expect(config.compactionThreshold).toBe(0.5);
            // Unchanged fields remain
            expect(config.strategy).toBe('sliding-window');
        });

        it('should affect shouldCompact after update', () => {
            // Default: threshold = 80000. A 1000-token conversation => false
            const conversation = makeConversation(10, 100);
            expect(compactor.shouldCompact(conversation)).toBe(false);

            // Now lower the threshold dramatically
            compactor.updateConfig({ maxTokens: 500, compactionThreshold: 0.5 });
            // Threshold is now 250 tokens. calculateTotalTokens uses msg.tokens (100 each) -> 1000 >= 250
            expect(compactor.shouldCompact(conversation)).toBe(true);
        });
    });

    // ── Empty conversation ──────────────────────────────────

    describe('empty conversation handling', () => {
        it('shouldCompact returns false for empty conversation', () => {
            const conversation: Conversation = {
                id: 'empty',
                messages: [],
                totalTokens: 0,
            };
            expect(compactor.shouldCompact(conversation)).toBe(false);
        });

        it('extractEssentials handles empty conversation gracefully', () => {
            const conversation: Conversation = {
                id: 'empty',
                messages: [],
                totalTokens: 0,
            };
            const summary = compactor.extractEssentials(conversation);
            expect(summary.keyFacts).toEqual([]);
            expect(summary.mainTopics).toEqual([]);
            expect(summary.importantDecisions).toEqual([]);
            expect(summary.activeContext).toBe('');
            expect(summary.coverageRange.messagesCount).toBe(0);
        });

        it('prioritizeMemory handles empty array', () => {
            const result = compactor.prioritizeMemory([]);
            expect(result).toEqual([]);
        });
    });
});
