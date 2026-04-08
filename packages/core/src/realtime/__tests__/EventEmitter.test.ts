import { describe, it, expect, vi } from 'vitest';
import { GSEPEventEmitter } from '../EventEmitter.js';

describe('GSEPEventEmitter', () => {
    // ─── Basic pub/sub ──────────────────────────────────

    it('should emit and receive events', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        emitter.on('genome:created', handler);
        await emitter.emit('genome:created', { genomeId: 'g1', name: 'test' });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].data).toEqual({ genomeId: 'g1', name: 'test' });
    });

    it('should pass metadata to handlers', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        emitter.on('chat:message', handler);
        await emitter.emit('chat:message', { text: 'hi' }, { userId: 'u1', genomeId: 'g1' });

        expect(handler.mock.calls[0][0].metadata).toEqual({ userId: 'u1', genomeId: 'g1' });
    });

    it('should support multiple handlers for same event', async () => {
        const emitter = new GSEPEventEmitter();
        const h1 = vi.fn();
        const h2 = vi.fn();

        emitter.on('mutation:applied', h1);
        emitter.on('mutation:applied', h2);
        await emitter.emit('mutation:applied', { gene: 'test' });

        expect(h1).toHaveBeenCalledTimes(1);
        expect(h2).toHaveBeenCalledTimes(1);
    });

    // ─── once ───────────────────────────────────────────

    it('should fire once handler only one time', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        emitter.once('genome:evolved', handler);
        await emitter.emit('genome:evolved', { first: true });
        await emitter.emit('genome:evolved', { second: true });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].data).toEqual({ first: true });
    });

    // ─── Wildcard ───────────────────────────────────────

    it('should receive all events via onAny', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        emitter.onAny(handler);
        await emitter.emit('genome:created', { id: 1 });
        await emitter.emit('chat:message', { id: 2 });
        await emitter.emit('drift:detected', { id: 3 });

        expect(handler).toHaveBeenCalledTimes(3);
    });

    // ─── Unsubscribe ────────────────────────────────────

    it('should unsubscribe by ID and return true', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        const id = emitter.on('alert:triggered', handler);
        const removed = emitter.off(id);

        expect(removed).toBe(true);

        await emitter.emit('alert:triggered', {});
        expect(handler).not.toHaveBeenCalled();
    });

    it('should return false for unknown subscription ID', () => {
        const emitter = new GSEPEventEmitter();
        expect(emitter.off('nonexistent')).toBe(false);
    });

    it('should unsubscribe wildcard handler', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        const id = emitter.onAny(handler);
        emitter.off(id);

        await emitter.emit('genome:created', {});
        expect(handler).not.toHaveBeenCalled();
    });

    // ─── removeAllListeners ─────────────────────────────

    it('should remove all listeners for a specific type', async () => {
        const emitter = new GSEPEventEmitter();
        const h1 = vi.fn();
        const h2 = vi.fn();

        emitter.on('chat:message', h1);
        emitter.on('chat:completed', h2);
        emitter.removeAllListeners('chat:message');

        await emitter.emit('chat:message', {});
        await emitter.emit('chat:completed', {});

        expect(h1).not.toHaveBeenCalled();
        expect(h2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners when no type specified', () => {
        const emitter = new GSEPEventEmitter();
        emitter.on('genome:created', vi.fn());
        emitter.onAny(vi.fn());

        emitter.removeAllListeners();
        expect(emitter.listenerCount()).toBe(0);
    });

    // ─── History ────────────────────────────────────────

    it('should store events in history', async () => {
        const emitter = new GSEPEventEmitter();

        await emitter.emit('genome:created', { id: 1 });
        await emitter.emit('chat:message', { id: 2 });

        const history = emitter.getHistory();
        expect(history).toHaveLength(2);
    });

    it('should filter history by type', async () => {
        const emitter = new GSEPEventEmitter();

        await emitter.emit('genome:created', {});
        await emitter.emit('chat:message', {});
        await emitter.emit('genome:created', {});

        const filtered = emitter.getHistory({ type: 'genome:created' });
        expect(filtered).toHaveLength(2);
    });

    it('should filter history by since date', async () => {
        const emitter = new GSEPEventEmitter();
        const before = new Date();

        await emitter.emit('genome:created', {});
        const after = new Date(Date.now() + 1);
        await emitter.emit('chat:message', {});

        const filtered = emitter.getHistory({ since: after });
        expect(filtered.length).toBeLessThanOrEqual(1);
    });

    it('should limit history results', async () => {
        const emitter = new GSEPEventEmitter();

        for (let i = 0; i < 5; i++) {
            await emitter.emit('genome:created', { i });
        }

        const limited = emitter.getHistory({ limit: 2 });
        expect(limited).toHaveLength(2);
    });

    it('should clear history', async () => {
        const emitter = new GSEPEventEmitter();

        await emitter.emit('genome:created', {});
        emitter.clearHistory();

        expect(emitter.getHistory()).toHaveLength(0);
    });

    it('should trim history when exceeding max size', async () => {
        const emitter = new GSEPEventEmitter();
        emitter.setMaxHistorySize(3);

        for (let i = 0; i < 5; i++) {
            await emitter.emit('genome:created', { i });
        }

        expect(emitter.getHistory()).toHaveLength(3);
    });

    it('setMaxHistorySize should trim existing history', async () => {
        const emitter = new GSEPEventEmitter();

        for (let i = 0; i < 10; i++) {
            await emitter.emit('genome:created', { i });
        }

        emitter.setMaxHistorySize(3);
        expect(emitter.getHistory()).toHaveLength(3);
    });

    // ─── emitSync ───────────────────────────────────────

    it('should not throw on emitSync', () => {
        const emitter = new GSEPEventEmitter();
        emitter.on('genome:created', async () => { throw new Error('boom'); });

        // emitSync should not throw
        expect(() => emitter.emitSync('genome:created', {})).not.toThrow();
    });

    // ─── Async handler errors ───────────────────────────

    it('should not propagate handler errors to other handlers', async () => {
        const emitter = new GSEPEventEmitter();
        const good = vi.fn();

        emitter.on('genome:created', () => { throw new Error('bad handler'); });
        emitter.on('genome:created', good);

        await emitter.emit('genome:created', {});
        expect(good).toHaveBeenCalledTimes(1);
    });

    // ─── waitFor ────────────────────────────────────────

    it('should resolve when matching event fires', async () => {
        const emitter = new GSEPEventEmitter();

        const promise = emitter.waitFor('genome:evolved');
        setTimeout(() => emitter.emit('genome:evolved', { fitness: 0.9 }), 10);

        const event = await promise;
        expect(event.data).toEqual({ fitness: 0.9 });
    });

    it('should reject on timeout', async () => {
        const emitter = new GSEPEventEmitter();

        await expect(emitter.waitFor('genome:evolved', 50)).rejects.toThrow('Timeout');
    });

    it('should filter with predicate on matching event', async () => {
        const emitter = new GSEPEventEmitter();

        const promise = emitter.waitFor('fitness:computed', undefined, (e) => {
            return (e.data as { score: number }).score > 0.8;
        });

        // Fire matching event directly
        setTimeout(() => emitter.emit('fitness:computed', { score: 0.9 }), 10);

        const event = await promise;
        expect((event.data as { score: number }).score).toBe(0.9);
    });

    // ─── Listener count & event names ───────────────────

    it('should count listeners correctly', () => {
        const emitter = new GSEPEventEmitter();

        emitter.on('genome:created', vi.fn());
        emitter.on('genome:created', vi.fn());
        emitter.on('chat:message', vi.fn());
        emitter.onAny(vi.fn());

        expect(emitter.listenerCount('genome:created')).toBe(3); // 2 + 1 wildcard
        expect(emitter.listenerCount('chat:message')).toBe(2); // 1 + 1 wildcard
        expect(emitter.listenerCount()).toBe(4); // 3 type + 1 wildcard
    });

    it('should list event names with subscribers', () => {
        const emitter = new GSEPEventEmitter();

        emitter.on('genome:created', vi.fn());
        emitter.on('chat:message', vi.fn());

        const names = emitter.eventNames();
        expect(names).toContain('genome:created');
        expect(names).toContain('chat:message');
    });

    // ─── Stats ──────────────────────────────────────────

    it('should return accurate stats', async () => {
        const emitter = new GSEPEventEmitter();

        emitter.on('genome:created', vi.fn());
        emitter.on('chat:message', vi.fn());
        emitter.onAny(vi.fn());

        await emitter.emit('genome:created', {});

        const stats = emitter.getStats();
        expect(stats.totalSubscriptions).toBe(3);
        expect(stats.wildcardSubscriptions).toBe(1);
        expect(stats.historySize).toBe(1);
        expect(stats.subscriptionsByType['genome:created']).toBe(1);
    });

    // ─── Timestamp ──────────────────────────────────────

    it('should include timestamp in emitted events', async () => {
        const emitter = new GSEPEventEmitter();
        const handler = vi.fn();

        emitter.on('genome:created', handler);
        await emitter.emit('genome:created', {});

        expect(handler.mock.calls[0][0].timestamp).toBeInstanceOf(Date);
    });
});
