import { describe, it, expect, vi } from 'vitest';
import { SecurityEventBus, type SecurityEvent } from '../SecurityEventBus.js';

function makeEvent(overrides?: Partial<SecurityEvent>): SecurityEvent {
    return {
        type: 'security:exec-blocked',
        timestamp: new Date(),
        layer: 5,
        decision: 'deny',
        actor: { userId: 'user-1' },
        resource: { type: 'command', id: 'rm -rf /' },
        severity: 'critical',
        ...overrides,
    };
}

describe('SecurityEventBus', () => {
    it('should emit events to type-specific subscribers', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        bus.on('security:exec-blocked', handler);

        bus.emit(makeEvent());

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].type).toBe('security:exec-blocked');
    });

    it('should emit events to wildcard subscribers', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        bus.onAny(handler);

        bus.emit(makeEvent({ type: 'security:fs-blocked' }));
        bus.emit(makeEvent({ type: 'security:net-blocked' }));

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should not call unrelated type subscribers', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        bus.on('security:net-blocked', handler);

        bus.emit(makeEvent({ type: 'security:exec-blocked' }));

        expect(handler).not.toHaveBeenCalled();
    });

    it('should unsubscribe by ID', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        const id = bus.on('security:exec-blocked', handler);

        bus.off(id);
        bus.emit(makeEvent());

        expect(handler).not.toHaveBeenCalled();
    });

    it('should maintain event history', () => {
        const bus = new SecurityEventBus();

        bus.emit(makeEvent({ type: 'security:exec-blocked' }));
        bus.emit(makeEvent({ type: 'security:fs-blocked' }));
        bus.emit(makeEvent({ type: 'security:net-allowed', decision: 'allow' }));

        const history = bus.getHistory();
        expect(history).toHaveLength(3);
    });

    it('should filter history by type', () => {
        const bus = new SecurityEventBus();

        bus.emit(makeEvent({ type: 'security:exec-blocked' }));
        bus.emit(makeEvent({ type: 'security:fs-blocked' }));

        const filtered = bus.getHistory({ type: 'security:exec-blocked' });
        expect(filtered).toHaveLength(1);
    });

    it('should filter history by decision', () => {
        const bus = new SecurityEventBus();

        bus.emit(makeEvent({ decision: 'allow' }));
        bus.emit(makeEvent({ decision: 'deny' }));
        bus.emit(makeEvent({ decision: 'deny' }));

        const denied = bus.getHistory({ decision: 'deny' });
        expect(denied).toHaveLength(2);
    });

    it('should provide summary counts', () => {
        const bus = new SecurityEventBus();

        bus.emit(makeEvent({ decision: 'allow', layer: 5 }));
        bus.emit(makeEvent({ decision: 'deny', layer: 5 }));
        bus.emit(makeEvent({ decision: 'deny', layer: 6 }));

        const summary = bus.getSummary();
        expect(summary.total).toBe(3);
        expect(summary.allowed).toBe(1);
        expect(summary.denied).toBe(2);
        expect(summary.byLayer[5]).toBe(2);
        expect(summary.byLayer[6]).toBe(1);
    });

    it('should emit convenience deny events', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        bus.onAny(handler);

        bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'sudo rm' });

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0];
        expect(event.decision).toBe('deny');
        expect(event.layer).toBe(5);
    });

    it('should reset subscriptions and history', () => {
        const bus = new SecurityEventBus();
        const handler = vi.fn();
        bus.onAny(handler);
        bus.emit(makeEvent());

        bus.reset();
        bus.emit(makeEvent());

        expect(handler).toHaveBeenCalledTimes(1); // only the first (subscriber removed by reset)
        expect(bus.getHistory()).toHaveLength(1); // second emit still records to fresh history
    });
});
