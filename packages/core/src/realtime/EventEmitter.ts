/**
 * Event Emitter for GSEP Real-Time Features
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Type-safe event system for genome changes, mutations, and system events.
 */

export type PGAEventType =
    | 'genome:created'
    | 'genome:updated'
    | 'genome:deleted'
    | 'genome:evolved'
    | 'mutation:proposed'
    | 'mutation:applied'
    | 'mutation:rejected'
    | 'mutation:generated'
    | 'mutation:promoted'
    | 'chat:started'
    | 'chat:message'
    | 'chat:completed'
    | 'metrics:updated'
    | 'alert:triggered'
    | 'health:changed'
    | 'user:created'
    | 'user:updated'
    | 'fitness:computed'
    | 'drift:detected'
    | 'gate:evaluated'
    | 'firewall:threat'
    | 'immune:threat'
    | 'gene:updated';

export interface PGAEvent<T = unknown> {
    type: PGAEventType;
    timestamp: Date;
    data: T;
    metadata?: {
        userId?: string;
        genomeId?: string;
        tenantId?: string;
        correlationId?: string;
        [key: string]: unknown;
    };
}

export interface GenomeCreatedEvent {
    genomeId: string;
    name: string;
    userId?: string;
}

export interface GenomeEvolvedEvent {
    genomeId: string;
    layer: number;
    gene: string;
    oldFitness: number;
    newFitness: number;
    improvement: number;
}

export interface MutationAppliedEvent {
    genomeId: string;
    layer: number;
    gene: string;
    variant: string;
    fitness: number;
    reason: string;
}

export interface ChatMessageEvent {
    genomeId: string;
    userId: string;
    message: string;
    response?: string;
    duration?: number;
}

export interface MetricsUpdatedEvent {
    type: 'performance' | 'cost' | 'health';
    data: unknown;
}

export interface AlertTriggeredEvent {
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    title: string;
    description: string;
}

export interface ChatStartedEvent {
    genomeId: string;
    userId: string;
    message: string;
}

export interface ChatCompletedEvent {
    genomeId: string;
    userId: string;
    duration: number;
    quality: number;
    tokens: number;
}

export interface FitnessComputedEvent {
    genomeId: string;
    composite: number;
    vector: {
        taskSuccess: number;
        efficiency: number;
        adaptability: number;
        consistency: number;
        userSatisfaction: number;
        safety: number;
    };
}

export interface DriftDetectedEvent {
    genomeId: string;
    signals: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        metric: string;
        value: number;
    }>;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface GateEvaluatedEvent {
    genomeId: string;
    gene: string;
    variant: string;
    decision: 'promote' | 'reject' | 'canary';
    gates: {
        quality: { passed: boolean; score: number };
        sandbox: { passed: boolean; score: number };
        economic: { passed: boolean; score: number };
        stability: { passed: boolean; score: number };
        constitutional?: { passed: boolean; score: number };
    };
    reason: string;
}

export interface FirewallThreatEvent {
    genomeId: string;
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    allowed: boolean;
    input: string;
}

export interface ImmuneThreatEvent {
    genomeId: string;
    threats: Array<{
        type: string;
        severity: string;
        description: string;
    }>;
    action: 'quarantine' | 'heal' | 'pass';
}

export interface MutationGeneratedEvent {
    genomeId: string;
    gene: string;
    layer: number;
    candidateCount: number;
}

export interface MutationPromotedEvent {
    genomeId: string;
    gene: string;
    variant: string;
    layer: number;
    fitness: number;
    improvement: number;
}

export type EventHandler<T = unknown> = (event: PGAEvent<T>) => void | Promise<void>;

interface EventSubscription {
    id: string;
    type: PGAEventType;
    handler: EventHandler;
    once: boolean;
}

/**
 * GSEP Event Emitter
 *
 * Type-safe event system for real-time updates and notifications.
 */
export class PGAEventEmitter {
    private subscriptions: Map<PGAEventType, EventSubscription[]> = new Map();
    private wildcardSubscriptions: EventSubscription[] = [];
    private eventHistory: PGAEvent[] = [];
    private maxHistorySize = 1000;
    private nextSubscriptionId = 1;

    /**
     * Subscribe to an event
     */
    on<T = unknown>(type: PGAEventType, handler: EventHandler<T>): string {
        return this.subscribe(type, handler, false);
    }

    /**
     * Subscribe to an event (once)
     */
    once<T = unknown>(type: PGAEventType, handler: EventHandler<T>): string {
        return this.subscribe(type, handler, true);
    }

    /**
     * Subscribe to all events (wildcard)
     */
    onAny(handler: EventHandler): string {
        const subscription: EventSubscription = {
            id: `wildcard_${this.nextSubscriptionId++}`,
            type: '*' as PGAEventType,
            handler,
            once: false,
        };

        this.wildcardSubscriptions.push(subscription);

        return subscription.id;
    }

    /**
     * Internal subscribe method
     */
    private subscribe<T = unknown>(
        type: PGAEventType,
        handler: EventHandler<T>,
        once: boolean
    ): string {
        const subscription: EventSubscription = {
            id: `${type}_${this.nextSubscriptionId++}`,
            type,
            handler: handler as EventHandler,
            once,
        };

        const existing = this.subscriptions.get(type) || [];
        existing.push(subscription);
        this.subscriptions.set(type, existing);

        return subscription.id;
    }

    /**
     * Unsubscribe from an event
     */
    off(subscriptionId: string): boolean {
        // Check wildcard subscriptions
        const wildcardIndex = this.wildcardSubscriptions.findIndex(
            (s) => s.id === subscriptionId
        );

        if (wildcardIndex !== -1) {
            this.wildcardSubscriptions.splice(wildcardIndex, 1);
            return true;
        }

        // Check type-specific subscriptions
        for (const [type, subs] of this.subscriptions.entries()) {
            const index = subs.findIndex((s) => s.id === subscriptionId);

            if (index !== -1) {
                subs.splice(index, 1);

                if (subs.length === 0) {
                    this.subscriptions.delete(type);
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Remove all listeners for a type
     */
    removeAllListeners(type?: PGAEventType): void {
        if (type) {
            this.subscriptions.delete(type);
        } else {
            this.subscriptions.clear();
            this.wildcardSubscriptions = [];
        }
    }

    /**
     * Emit an event
     */
    async emit<T = unknown>(
        type: PGAEventType,
        data: T,
        metadata?: PGAEvent<T>['metadata']
    ): Promise<void> {
        const event: PGAEvent<T> = {
            type,
            timestamp: new Date(),
            data,
            metadata,
        };

        // Add to history
        this.eventHistory.push(event);

        // Trim history if needed
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }

        // Get subscribers
        const typeSubscriptions = this.subscriptions.get(type) || [];
        const allSubscriptions = [...typeSubscriptions, ...this.wildcardSubscriptions];

        // Execute handlers
        const promises: Promise<void>[] = [];

        for (const subscription of allSubscriptions) {
            try {
                const result = subscription.handler(event);

                if (result instanceof Promise) {
                    promises.push(result);
                }

                // Remove if once
                if (subscription.once) {
                    this.off(subscription.id);
                }
            } catch {
                // Silently catch handler errors to prevent event propagation failures
            }
        }

        // Wait for all async handlers
        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    /**
     * Emit synchronously (fire and forget)
     */
    emitSync<T = unknown>(
        type: PGAEventType,
        data: T,
        metadata?: PGAEvent<T>['metadata']
    ): void {
        this.emit(type, data, metadata).catch(() => {
            // Fire-and-forget: silently ignore async emission errors
        });
    }

    /**
     * Get event history
     */
    getHistory(
        filter?: {
            type?: PGAEventType;
            since?: Date;
            limit?: number;
        }
    ): PGAEvent[] {
        let events = this.eventHistory;

        if (filter?.type) {
            events = events.filter((e) => e.type === filter.type);
        }

        if (filter?.since) {
            events = events.filter((e) => e.timestamp >= filter.since!);
        }

        if (filter?.limit) {
            events = events.slice(-filter.limit);
        }

        return events;
    }

    /**
     * Wait for specific event
     */
    async waitFor<T = unknown>(
        type: PGAEventType,
        timeout?: number,
        predicate?: (event: PGAEvent<T>) => boolean
    ): Promise<PGAEvent<T>> {
        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | undefined;

            const handler = (event: PGAEvent<T>) => {
                if (predicate && !predicate(event)) {
                    return; // Keep waiting
                }

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                this.off(subscriptionId);
                resolve(event);
            };

            const subscriptionId = this.once(type, handler);

            if (timeout) {
                timeoutId = setTimeout(() => {
                    this.off(subscriptionId);
                    reject(new Error(`Timeout waiting for event: ${type}`));
                }, timeout);
            }
        });
    }

    /**
     * Get subscriber count
     */
    listenerCount(type?: PGAEventType): number {
        if (type) {
            const subs = this.subscriptions.get(type) || [];
            return subs.length + this.wildcardSubscriptions.length;
        }

        let total = this.wildcardSubscriptions.length;

        for (const subs of this.subscriptions.values()) {
            total += subs.length;
        }

        return total;
    }

    /**
     * Get all event types with subscribers
     */
    eventNames(): PGAEventType[] {
        return Array.from(this.subscriptions.keys());
    }

    /**
     * Clear event history
     */
    clearHistory(): void {
        this.eventHistory = [];
    }

    /**
     * Set max history size
     */
    setMaxHistorySize(size: number): void {
        this.maxHistorySize = size;

        // Trim if needed
        if (this.eventHistory.length > size) {
            this.eventHistory = this.eventHistory.slice(-size);
        }
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalSubscriptions: number;
        subscriptionsByType: Record<string, number>;
        wildcardSubscriptions: number;
        historySize: number;
        eventTypes: PGAEventType[];
    } {
        const subscriptionsByType: Record<string, number> = {};

        for (const [type, subs] of this.subscriptions.entries()) {
            subscriptionsByType[type] = subs.length;
        }

        return {
            totalSubscriptions: this.listenerCount(),
            subscriptionsByType,
            wildcardSubscriptions: this.wildcardSubscriptions.length,
            historySize: this.eventHistory.length,
            eventTypes: this.eventNames(),
        };
    }
}

/**
 * Global event emitter instance
 */
export const globalEvents = new PGAEventEmitter();
