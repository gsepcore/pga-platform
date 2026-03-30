/**
 * NetworkAuditLogger — Outbound traffic logging for Genome Shield.
 *
 * Logs every HTTP/WS connection: destination, size, status.
 * Does NOT log request/response bodies (privacy).
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export interface NetworkLogEntry {
    timestamp: Date;
    method: string;
    hostname: string;
    port: number;
    path: string;
    requestSize: number;
    responseStatus?: number;
    responseSize?: number;
    durationMs?: number;
    skillId?: string;
    blocked: boolean;
}

export interface TrafficSummary {
    totalRequests: number;
    blockedRequests: number;
    byHostname: Record<string, number>;
    byMethod: Record<string, number>;
    avgDurationMs: number;
    totalBytesOut: number;
    totalBytesIn: number;
}

// ─── Logger ─────────────────────────────────────────────

/**
 * Network traffic audit logger.
 *
 * Usage:
 * ```typescript
 * const logger = new NetworkAuditLogger(eventBus);
 *
 * // Log an outbound request
 * logger.logRequest({
 *   method: 'POST',
 *   hostname: 'api.openai.com',
 *   port: 443,
 *   path: '/v1/chat/completions',
 *   requestSize: 2048,
 *   responseStatus: 200,
 *   responseSize: 512,
 *   durationMs: 1200,
 * });
 *
 * const summary = logger.getSummary();
 * ```
 */
export class NetworkAuditLogger {
    private entries: NetworkLogEntry[] = [];
    private maxEntries = 5000;

    constructor(eventBus: SecurityEventBus) {

        // Auto-subscribe to network events from OutboundAllowlist
        eventBus.on('security:net-blocked', (event) => {
            this.entries.push({
                timestamp: event.timestamp,
                method: 'BLOCKED',
                hostname: event.resource.id,
                port: 0,
                path: '',
                requestSize: 0,
                blocked: true,
                skillId: event.actor.skillId,
            });
            this.trimEntries();
        });

        eventBus.on('security:net-allowed', (event) => {
            this.entries.push({
                timestamp: event.timestamp,
                method: 'ALLOWED',
                hostname: event.resource.id,
                port: 0,
                path: '',
                requestSize: 0,
                blocked: false,
                skillId: event.actor.skillId,
            });
            this.trimEntries();
        });
    }

    /**
     * Log an outbound HTTP request with details.
     */
    logRequest(entry: Omit<NetworkLogEntry, 'timestamp' | 'blocked'>): void {
        const full: NetworkLogEntry = {
            ...entry,
            timestamp: new Date(),
            blocked: false,
        };

        this.entries.push(full);
        this.trimEntries();
    }

    /**
     * Get traffic summary for a time range.
     */
    getSummary(since?: Date): TrafficSummary {
        let entries = this.entries;
        if (since) {
            entries = entries.filter(e => e.timestamp >= since);
        }

        const summary: TrafficSummary = {
            totalRequests: entries.length,
            blockedRequests: entries.filter(e => e.blocked).length,
            byHostname: {},
            byMethod: {},
            avgDurationMs: 0,
            totalBytesOut: 0,
            totalBytesIn: 0,
        };

        let totalDuration = 0;
        let durationCount = 0;

        for (const entry of entries) {
            summary.byHostname[entry.hostname] = (summary.byHostname[entry.hostname] || 0) + 1;
            summary.byMethod[entry.method] = (summary.byMethod[entry.method] || 0) + 1;
            summary.totalBytesOut += entry.requestSize;
            summary.totalBytesIn += entry.responseSize ?? 0;
            if (entry.durationMs) {
                totalDuration += entry.durationMs;
                durationCount++;
            }
        }

        summary.avgDurationMs = durationCount > 0 ? totalDuration / durationCount : 0;

        return summary;
    }

    /**
     * Get recent entries.
     */
    getRecent(limit = 50): NetworkLogEntry[] {
        return this.entries.slice(-limit);
    }

    /**
     * Detect anomalies: sudden spike in requests to a new domain.
     */
    detectAnomalies(windowMs = 300_000): string[] {
        const anomalies: string[] = [];
        const now = Date.now();
        const recent = this.entries.filter(e => now - e.timestamp.getTime() < windowMs);

        // Check for new domains with high volume
        const hostCounts: Record<string, number> = {};
        for (const entry of recent) {
            hostCounts[entry.hostname] = (hostCounts[entry.hostname] || 0) + 1;
        }

        // Older entries (before window)
        const older = this.entries.filter(e => now - e.timestamp.getTime() >= windowMs);
        const oldHosts = new Set(older.map(e => e.hostname));

        for (const [host, count] of Object.entries(hostCounts)) {
            if (!oldHosts.has(host) && count > 5) {
                anomalies.push(`New domain "${host}" with ${count} requests in last ${windowMs / 60000}m`);
            }
        }

        return anomalies;
    }

    /**
     * Get entry count.
     */
    getEntryCount(): number {
        return this.entries.length;
    }

    // ─── Internal ───────────────────────────────────────

    private trimEntries(): void {
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(-this.maxEntries);
        }
    }
}
