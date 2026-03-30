import { describe, it, expect } from 'vitest';
import { DataAccessTracker } from '../DataAccessTracker.js';
import { ComplianceExporter } from '../ComplianceExporter.js';
import { SecurityEventBus } from '../SecurityEventBus.js';

const bus = () => new SecurityEventBus();

// ─── DataAccessTracker ───────────────────────────────────

describe('DataAccessTracker', () => {
    it('should record data access events', () => {
        const tracker = new DataAccessTracker(bus());
        tracker.record({
            source: 'apple-notes',
            category: 'notes',
            skillId: 'note-reader',
            description: 'Read 3 notes about project X',
            sentToCloud: true,
            cloudProvider: 'OpenAI',
            itemCount: 3,
        });
        expect(tracker.getCount()).toBe(1);
    });

    it('should generate reports', () => {
        const tracker = new DataAccessTracker(bus());

        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 'note-reader', description: 'Read notes', sentToCloud: true, cloudProvider: 'OpenAI', itemCount: 3 });
        tracker.record({ source: 'imessage', category: 'messages', skillId: 'imsg', description: 'Read messages', sentToCloud: false, itemCount: 10 });
        tracker.record({ source: 'filesystem', category: 'files', skillId: 'file-manager', description: 'Read file', sentToCloud: true, cloudProvider: 'Anthropic', itemCount: 1 });

        const report = tracker.getReport();
        expect(report.totalAccesses).toBe(3);
        expect(report.sentToCloud).toBe(2);
        expect(report.bySource['apple-notes']).toBe(1);
        expect(report.bySource['imessage']).toBe(1);
        expect(report.byCategory['notes']).toBe(1);
        expect(report.bySkill['note-reader']).toBe(1);
    });

    it('should filter by time range', () => {
        const tracker = new DataAccessTracker(bus());

        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 's', description: 'd', sentToCloud: false, itemCount: 1 });

        const future = new Date(Date.now() + 100_000);
        const report = tracker.getReport(future);
        expect(report.totalAccesses).toBe(0);
    });

    it('should track cloud exposures', () => {
        const tracker = new DataAccessTracker(bus());

        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 's', description: 'local', sentToCloud: false, itemCount: 1 });
        tracker.record({ source: '1password', category: 'credentials', skillId: 's', description: 'cloud', sentToCloud: true, cloudProvider: 'OpenAI', itemCount: 1 });

        const exposures = tracker.getCloudExposures();
        expect(exposures).toHaveLength(1);
        expect(exposures[0].source).toBe('1password');
    });

    it('should check if source was accessed', () => {
        const tracker = new DataAccessTracker(bus());
        tracker.record({ source: 'imessage', category: 'messages', skillId: 's', description: 'd', sentToCloud: false, itemCount: 5 });

        expect(tracker.wasAccessed('imessage')).toBe(true);
        expect(tracker.wasAccessed('apple-notes')).toBe(false);
    });

    it('should emit events to security bus', () => {
        const b = bus();
        const tracker = new DataAccessTracker(b);
        const events: string[] = [];
        b.onAny((e) => events.push(e.type));

        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 's', description: 'd', sentToCloud: true, itemCount: 1 });

        expect(events).toContain('security:audit-entry');
    });
});

// ─── ComplianceExporter ──────────────────────────────────

describe('ComplianceExporter', () => {
    function setup() {
        const b = bus();
        const tracker = new DataAccessTracker(b);
        const exporter = new ComplianceExporter(tracker, b);

        tracker.record({ source: 'apple-notes', category: 'notes', skillId: 'note-reader', description: 'Read notes', sentToCloud: true, cloudProvider: 'OpenAI', itemCount: 3 });
        tracker.record({ source: 'imessage', category: 'messages', skillId: 'imsg', description: 'Read messages', sentToCloud: false, itemCount: 10 });

        // Simulate security events
        b.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'rm -rf /' }, 'critical');
        b.emitDeny('security:net-blocked', 6, { type: 'outbound', id: 'evil.com' }, 'warning');

        return { exporter, tracker, b };
    }

    it('should export data access report as JSON', () => {
        const { exporter } = setup();
        const result = exporter.export({ format: 'json', type: 'data-access' });

        expect(result.format).toBe('json');
        expect(result.type).toBe('data-access');
        expect(result.recordCount).toBe(2);

        const parsed = JSON.parse(result.content);
        expect(parsed.report).toBe('data-access');
        expect(parsed.records).toHaveLength(2);
    });

    it('should export data access report as CSV', () => {
        const { exporter } = setup();
        const result = exporter.export({ format: 'csv', type: 'data-access' });

        expect(result.format).toBe('csv');
        const lines = result.content.split('\n');
        expect(lines[0]).toContain('Timestamp');
        expect(lines[0]).toContain('Source');
        expect(lines.length).toBe(3); // header + 2 records
    });

    it('should export security incidents', () => {
        const { exporter } = setup();
        const result = exporter.export({ format: 'json', type: 'security-incidents' });

        const parsed = JSON.parse(result.content);
        expect(parsed.report).toBe('security-incidents');
        expect(parsed.totalIncidents).toBeGreaterThanOrEqual(2);
    });

    it('should export full audit', () => {
        const { exporter } = setup();
        const result = exporter.export({ format: 'json', type: 'full-audit' });

        const parsed = JSON.parse(result.content);
        expect(parsed.report).toBe('full-audit');
        expect(parsed.summary).toBeDefined();
        expect(parsed.summary.denied).toBeGreaterThanOrEqual(2);
        expect(parsed.dataAccess).toBeDefined();
    });

    it('should filter by skill', () => {
        const { exporter } = setup();
        const result = exporter.export({
            format: 'json',
            type: 'data-access',
            skillFilter: 'note-reader',
        });

        const parsed = JSON.parse(result.content);
        expect(parsed.records).toHaveLength(1);
        expect(parsed.records[0].skillId).toBe('note-reader');
    });

    it('should handle CSV escaping', () => {
        const b = bus();
        const tracker = new DataAccessTracker(b);
        const exporter = new ComplianceExporter(tracker, b);

        tracker.record({
            source: 'filesystem',
            category: 'files',
            skillId: 'reader',
            description: 'Read file with "quotes" and, commas',
            sentToCloud: false,
            itemCount: 1,
        });

        const result = exporter.export({ format: 'csv', type: 'data-access' });
        expect(result.content).toContain('""quotes""'); // escaped
    });

    it('should include generated timestamp', () => {
        const { exporter } = setup();
        const result = exporter.export({ format: 'json', type: 'data-access' });
        expect(result.generatedAt).toBeDefined();
        expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
    });
});
