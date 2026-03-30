/**
 * DataAccessTracker — Personal data access tracking for Genome Shield.
 *
 * Tracks what personal data was accessed, when, by which skill,
 * and whether it was sent to a cloud LLM.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export type DataSource =
    | 'apple-notes'
    | 'imessage'
    | 'obsidian'
    | 'bear-notes'
    | '1password'
    | 'browser'
    | 'filesystem'
    | 'terminal'
    | 'clipboard'
    | 'calendar'
    | 'contacts'
    | 'email'
    | 'other';

export type DataCategory =
    | 'messages'
    | 'notes'
    | 'contacts'
    | 'financial'
    | 'credentials'
    | 'health'
    | 'files'
    | 'browsing-history'
    | 'location'
    | 'media'
    | 'other';

export interface DataAccessRecord {
    timestamp: Date;
    source: DataSource;
    category: DataCategory;
    skillId: string;
    description: string;
    sentToCloud: boolean;
    cloudProvider?: string;
    itemCount: number;
}

export interface DataAccessReport {
    period: { from: Date; to: Date };
    totalAccesses: number;
    sentToCloud: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    bySkill: Record<string, number>;
    records: DataAccessRecord[];
}

// ─── Tracker ────────────────────────────────────────────

/**
 * Tracks personal data access for audit and compliance.
 *
 * Usage:
 * ```typescript
 * const tracker = new DataAccessTracker(eventBus);
 *
 * tracker.record({
 *   source: 'apple-notes',
 *   category: 'notes',
 *   skillId: 'note-reader',
 *   description: 'Read 3 notes matching "project X"',
 *   sentToCloud: true,
 *   cloudProvider: 'OpenAI',
 *   itemCount: 3,
 * });
 *
 * const report = tracker.getReport(lastWeek, now);
 * ```
 */
export class DataAccessTracker {
    private eventBus: SecurityEventBus;
    private records: DataAccessRecord[] = [];
    private maxRecords = 10_000;

    constructor(eventBus: SecurityEventBus) {
        this.eventBus = eventBus;
    }

    /**
     * Record a data access event.
     */
    record(access: Omit<DataAccessRecord, 'timestamp'>): void {
        const record: DataAccessRecord = {
            ...access,
            timestamp: new Date(),
        };

        this.records.push(record);

        if (this.records.length > this.maxRecords) {
            this.records = this.records.slice(-this.maxRecords);
        }

        this.eventBus.emit({
            type: 'security:audit-entry',
            timestamp: record.timestamp,
            layer: 7,
            decision: 'info',
            actor: { skillId: access.skillId },
            resource: {
                type: `data:${access.source}`,
                id: access.category,
                detail: `${access.itemCount} items${access.sentToCloud ? ` → ${access.cloudProvider ?? 'cloud'}` : ' (local only)'}`,
            },
            severity: access.sentToCloud ? 'warning' : 'info',
        });
    }

    /**
     * Get a report for a time range.
     */
    getReport(from?: Date, to?: Date): DataAccessReport {
        const start = from ?? new Date(0);
        const end = to ?? new Date();

        const filtered = this.records.filter(
            r => r.timestamp >= start && r.timestamp <= end,
        );

        const bySource: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const bySkill: Record<string, number> = {};
        let sentToCloud = 0;

        for (const r of filtered) {
            bySource[r.source] = (bySource[r.source] || 0) + 1;
            byCategory[r.category] = (byCategory[r.category] || 0) + 1;
            bySkill[r.skillId] = (bySkill[r.skillId] || 0) + 1;
            if (r.sentToCloud) sentToCloud++;
        }

        return {
            period: { from: start, to: end },
            totalAccesses: filtered.length,
            sentToCloud,
            bySource,
            byCategory,
            bySkill,
            records: filtered,
        };
    }

    /**
     * Get recent access records.
     */
    getRecent(limit = 50): DataAccessRecord[] {
        return this.records.slice(-limit);
    }

    /**
     * Get total record count.
     */
    getCount(): number {
        return this.records.length;
    }

    /**
     * Check if a specific data source has been accessed.
     */
    wasAccessed(source: DataSource, since?: Date): boolean {
        const start = since ?? new Date(0);
        return this.records.some(r => r.source === source && r.timestamp >= start);
    }

    /**
     * Get all accesses that were sent to cloud.
     */
    getCloudExposures(since?: Date): DataAccessRecord[] {
        const start = since ?? new Date(0);
        return this.records.filter(r => r.sentToCloud && r.timestamp >= start);
    }
}
