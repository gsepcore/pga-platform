/**
 * SecurityEventBus — Centralized event bus for all Genome Shield security events.
 *
 * Every security decision (allow/deny) across all 7 layers emits an event here.
 * The audit log and dashboard subscribe to this bus.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

export type SecurityEventType =
    // Layer 1: GSEP Integration
    | 'security:inbound-scanned'
    | 'security:inbound-blocked'
    | 'security:outbound-scanned'
    | 'security:outbound-quarantined'
    | 'security:purpose-rejected'
    | 'security:anomaly-detected'
    // Layer 2: Data Protection
    | 'security:pii-redacted'
    | 'security:data-classified'
    | 'security:llm-request-filtered'
    | 'security:local-model-routed'
    // Layer 3: Credential Vault
    | 'security:keychain-access'
    | 'security:secret-migrated'
    | 'security:config-encrypted'
    // Layer 4: Skill Security
    | 'security:skill-verified'
    | 'security:skill-blocked'
    | 'security:capability-granted'
    | 'security:capability-denied'
    // Layer 5: Execution Control
    | 'security:exec-allowed'
    | 'security:exec-blocked'
    | 'security:fs-allowed'
    | 'security:fs-blocked'
    | 'security:process-sandboxed'
    // Layer 6: Network Control
    | 'security:net-allowed'
    | 'security:net-blocked'
    // Layer 7: Audit
    | 'security:audit-entry'
    | 'security:audit-tamper-detected'
    | 'security:profile-changed';

export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: Date;
    layer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    decision: 'allow' | 'deny' | 'info';
    actor: {
        userId?: string;
        skillId?: string;
        channel?: string;
    };
    resource: {
        type: string;
        id: string;
        detail?: string;
    };
    evidence?: string;
    severity: 'info' | 'warning' | 'high' | 'critical';
}

type SecurityEventHandler = (event: SecurityEvent) => void | Promise<void>;

interface Subscription {
    id: number;
    type: SecurityEventType | '*';
    handler: SecurityEventHandler;
}

/**
 * Centralized event bus for all security events across Genome Shield layers.
 *
 * Usage:
 * ```typescript
 * const bus = new SecurityEventBus();
 *
 * // Subscribe to all events (audit log)
 * bus.onAny((event) => auditLog.append(event));
 *
 * // Subscribe to specific events (dashboard)
 * bus.on('security:exec-blocked', (event) => dashboard.alert(event));
 *
 * // Emit from any layer
 * bus.emit({
 *   type: 'security:exec-blocked',
 *   layer: 5,
 *   decision: 'deny',
 *   ...
 * });
 * ```
 */
export class SecurityEventBus {
    private subscriptions: Map<SecurityEventType | '*', Subscription[]> = new Map();
    private nextId = 1;
    private history: SecurityEvent[] = [];
    private maxHistory = 500;

    /**
     * Subscribe to a specific event type.
     */
    on(type: SecurityEventType, handler: SecurityEventHandler): number {
        const sub: Subscription = { id: this.nextId++, type, handler };
        const existing = this.subscriptions.get(type) || [];
        existing.push(sub);
        this.subscriptions.set(type, existing);
        return sub.id;
    }

    /**
     * Subscribe to ALL security events (for audit log, dashboard).
     */
    onAny(handler: SecurityEventHandler): number {
        const sub: Subscription = { id: this.nextId++, type: '*', handler };
        const existing = this.subscriptions.get('*') || [];
        existing.push(sub);
        this.subscriptions.set('*', existing);
        return sub.id;
    }

    /**
     * Unsubscribe by subscription ID.
     */
    off(subscriptionId: number): boolean {
        for (const [type, subs] of this.subscriptions) {
            const idx = subs.findIndex(s => s.id === subscriptionId);
            if (idx !== -1) {
                subs.splice(idx, 1);
                if (subs.length === 0) this.subscriptions.delete(type);
                return true;
            }
        }
        return false;
    }

    /**
     * Emit a security event. Fire-and-forget — handlers run async.
     */
    emit(event: SecurityEvent): void {
        // Add to history
        this.history.push(event);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }

        // Notify type-specific subscribers
        const typeSubs = this.subscriptions.get(event.type) || [];
        for (const sub of typeSubs) {
            try { sub.handler(event); } catch { /* fire-and-forget */ }
        }

        // Notify wildcard subscribers
        const wildcardSubs = this.subscriptions.get('*') || [];
        for (const sub of wildcardSubs) {
            try { sub.handler(event); } catch { /* fire-and-forget */ }
        }
    }

    /**
     * Convenience: emit a deny event with minimal boilerplate.
     */
    emitDeny(
        type: SecurityEventType,
        layer: SecurityEvent['layer'],
        resource: SecurityEvent['resource'],
        severity: SecurityEvent['severity'] = 'warning',
        actor?: SecurityEvent['actor'],
        evidence?: string,
    ): void {
        this.emit({
            type,
            timestamp: new Date(),
            layer,
            decision: 'deny',
            actor: actor || {},
            resource,
            severity,
            evidence,
        });
    }

    /**
     * Convenience: emit an allow event.
     */
    emitAllow(
        type: SecurityEventType,
        layer: SecurityEvent['layer'],
        resource: SecurityEvent['resource'],
        actor?: SecurityEvent['actor'],
    ): void {
        this.emit({
            type,
            timestamp: new Date(),
            layer,
            decision: 'allow',
            actor: actor || {},
            resource,
            severity: 'info',
        });
    }

    /**
     * Get recent events, optionally filtered.
     */
    getHistory(filter?: {
        type?: SecurityEventType;
        layer?: SecurityEvent['layer'];
        decision?: SecurityEvent['decision'];
        since?: Date;
        limit?: number;
    }): SecurityEvent[] {
        let events = this.history;

        if (filter?.type) events = events.filter(e => e.type === filter.type);
        if (filter?.layer) events = events.filter(e => e.layer === filter.layer);
        if (filter?.decision) events = events.filter(e => e.decision === filter.decision);
        if (filter?.since) events = events.filter(e => e.timestamp >= filter.since!);
        if (filter?.limit) events = events.slice(-filter.limit);

        return events;
    }

    /**
     * Get summary counts by decision type.
     */
    getSummary(): { total: number; allowed: number; denied: number; byLayer: Record<number, number> } {
        const summary = { total: this.history.length, allowed: 0, denied: 0, byLayer: {} as Record<number, number> };
        for (const event of this.history) {
            if (event.decision === 'allow') summary.allowed++;
            if (event.decision === 'deny') summary.denied++;
            summary.byLayer[event.layer] = (summary.byLayer[event.layer] || 0) + 1;
        }
        return summary;
    }

    /**
     * Clear all subscriptions and history.
     */
    reset(): void {
        this.subscriptions.clear();
        this.history = [];
    }
}
