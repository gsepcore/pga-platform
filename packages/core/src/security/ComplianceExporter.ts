/**
 * ComplianceExporter — Export audit data for enterprise compliance.
 *
 * Pre-built report templates for data access, security incidents,
 * and credential access. JSON and CSV formats.
 * GDPR Art. 15 compatible (right of access).
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import type { DataAccessTracker } from './DataAccessTracker.js';
import type { SecurityEventBus } from './SecurityEventBus.js';

// ─── Types ──────────────────────────────────────────────

export type ReportFormat = 'json' | 'csv';

export type ReportType =
    | 'data-access'
    | 'security-incidents'
    | 'credential-access'
    | 'full-audit';

export interface ExportOptions {
    format: ReportFormat;
    type: ReportType;
    from?: Date;
    to?: Date;
    skillFilter?: string;
    userFilter?: string;
}

export interface ExportResult {
    content: string;
    format: ReportFormat;
    type: ReportType;
    generatedAt: string;
    recordCount: number;
}

// ─── Exporter ───────────────────────────────────────────

/**
 * Exports audit and compliance data.
 *
 * Usage:
 * ```typescript
 * const exporter = new ComplianceExporter(dataTracker, eventBus);
 *
 * const report = exporter.export({
 *   format: 'csv',
 *   type: 'data-access',
 *   from: lastMonth,
 * });
 *
 * fs.writeFileSync('audit-report.csv', report.content);
 * ```
 */
export class ComplianceExporter {
    private dataTracker: DataAccessTracker;
    private eventBus: SecurityEventBus;

    constructor(dataTracker: DataAccessTracker, eventBus: SecurityEventBus) {
        this.dataTracker = dataTracker;
        this.eventBus = eventBus;
    }

    /**
     * Export a compliance report.
     */
    export(options: ExportOptions): ExportResult {
        const from = options.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = options.to ?? new Date();

        switch (options.type) {
            case 'data-access':
                return this.exportDataAccess(options.format, from, to, options.skillFilter);
            case 'security-incidents':
                return this.exportSecurityIncidents(options.format, from, to);
            case 'credential-access':
                return this.exportCredentialAccess(options.format, from, to);
            case 'full-audit':
                return this.exportFullAudit(options.format, from, to);
            default:
                throw new Error(`Unknown report type: ${options.type}`);
        }
    }

    // ─── Data Access Report ─────────────────────────────

    private exportDataAccess(
        format: ReportFormat,
        from: Date,
        to: Date,
        skillFilter?: string,
    ): ExportResult {
        const report = this.dataTracker.getReport(from, to);
        let records = report.records;

        if (skillFilter) {
            records = records.filter(r => r.skillId === skillFilter);
        }

        const content = format === 'csv'
            ? this.toCSV(
                ['Timestamp', 'Source', 'Category', 'Skill', 'Description', 'Sent to Cloud', 'Cloud Provider', 'Item Count'],
                records.map(r => [
                    r.timestamp.toISOString(),
                    r.source,
                    r.category,
                    r.skillId,
                    r.description,
                    String(r.sentToCloud),
                    r.cloudProvider ?? '',
                    String(r.itemCount),
                ]),
            )
            : JSON.stringify({ report: 'data-access', period: { from, to }, summary: { total: records.length, sentToCloud: report.sentToCloud, bySource: report.bySource, byCategory: report.byCategory }, records }, null, 2);

        return { content, format, type: 'data-access', generatedAt: new Date().toISOString(), recordCount: records.length };
    }

    // ─── Security Incidents Report ──────────────────────

    private exportSecurityIncidents(format: ReportFormat, from: Date, to: Date): ExportResult {
        const events = this.eventBus.getHistory({
            decision: 'deny',
            since: from,
        }).filter(e => e.timestamp <= to);

        const content = format === 'csv'
            ? this.toCSV(
                ['Timestamp', 'Type', 'Layer', 'Severity', 'Resource Type', 'Resource ID', 'Detail', 'Evidence'],
                events.map(e => [
                    e.timestamp.toISOString(),
                    e.type,
                    String(e.layer),
                    e.severity,
                    e.resource.type,
                    e.resource.id,
                    e.resource.detail ?? '',
                    e.evidence ?? '',
                ]),
            )
            : JSON.stringify({ report: 'security-incidents', period: { from, to }, totalIncidents: events.length, bySeverity: this.countBy(events, e => e.severity), byLayer: this.countBy(events, e => String(e.layer)), events }, null, 2);

        return { content, format, type: 'security-incidents', generatedAt: new Date().toISOString(), recordCount: events.length };
    }

    // ─── Credential Access Report ───────────────────────

    private exportCredentialAccess(format: ReportFormat, from: Date, to: Date): ExportResult {
        const events = this.eventBus.getHistory({
            type: 'security:keychain-access',
            since: from,
        }).filter(e => e.timestamp <= to);

        const content = format === 'csv'
            ? this.toCSV(
                ['Timestamp', 'Decision', 'Resource', 'Skill', 'User'],
                events.map(e => [
                    e.timestamp.toISOString(),
                    e.decision,
                    e.resource.id,
                    e.actor.skillId ?? '',
                    e.actor.userId ?? '',
                ]),
            )
            : JSON.stringify({ report: 'credential-access', period: { from, to }, totalAccesses: events.length, events }, null, 2);

        return { content, format, type: 'credential-access', generatedAt: new Date().toISOString(), recordCount: events.length };
    }

    // ─── Full Audit Report ──────────────────────────────

    private exportFullAudit(format: ReportFormat, from: Date, to: Date): ExportResult {
        const allEvents = this.eventBus.getHistory({ since: from }).filter(e => e.timestamp <= to);
        const dataReport = this.dataTracker.getReport(from, to);

        const content = format === 'csv'
            ? this.toCSV(
                ['Timestamp', 'Type', 'Layer', 'Decision', 'Severity', 'Resource', 'Detail'],
                allEvents.map(e => [
                    e.timestamp.toISOString(),
                    e.type,
                    String(e.layer),
                    e.decision,
                    e.severity,
                    `${e.resource.type}:${e.resource.id}`,
                    e.resource.detail ?? '',
                ]),
            )
            : JSON.stringify({
                report: 'full-audit',
                period: { from, to },
                summary: {
                    totalEvents: allEvents.length,
                    allowed: allEvents.filter(e => e.decision === 'allow').length,
                    denied: allEvents.filter(e => e.decision === 'deny').length,
                    dataAccesses: dataReport.totalAccesses,
                    dataSentToCloud: dataReport.sentToCloud,
                },
                securityEvents: allEvents,
                dataAccess: dataReport,
            }, null, 2);

        return { content, format, type: 'full-audit', generatedAt: new Date().toISOString(), recordCount: allEvents.length };
    }

    // ─── Helpers ────────────────────────────────────────

    private toCSV(headers: string[], rows: string[][]): string {
        const escape = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };

        const lines = [headers.map(escape).join(',')];
        for (const row of rows) {
            lines.push(row.map(escape).join(','));
        }
        return lines.join('\n');
    }

    private countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const item of items) {
            const k = key(item);
            counts[k] = (counts[k] || 0) + 1;
        }
        return counts;
    }
}
