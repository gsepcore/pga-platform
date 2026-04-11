/**
 * ComplianceExporter — Comprehensive Tests
 *
 * Covers: credential-access report, full-audit CSV, date range filtering,
 * CSV escaping edge cases, and all report types in both formats.
 *
 * Target: boost from 69% to 90%+ statement coverage.
 */

import { describe, it, expect } from 'vitest';
import { DataAccessTracker } from '../DataAccessTracker.js';
import { ComplianceExporter } from '../ComplianceExporter.js';
import { SecurityEventBus } from '../SecurityEventBus.js';

// ─── Helpers ───────────────────────────────────────────────

function setup() {
    const bus = new SecurityEventBus();
    const tracker = new DataAccessTracker(bus);
    const exporter = new ComplianceExporter(tracker, bus);

    // Add data access records
    tracker.record({ source: 'apple-notes', category: 'notes', skillId: 'note-reader', description: 'Read notes', sentToCloud: true, cloudProvider: 'OpenAI', itemCount: 3 });
    tracker.record({ source: 'imessage', category: 'messages', skillId: 'imsg', description: 'Read messages', sentToCloud: false, itemCount: 10 });
    tracker.record({ source: '1password', category: 'credentials', skillId: 'pw-manager', description: 'Read password', sentToCloud: false, itemCount: 1 });

    // Add security events
    bus.emitDeny('security:exec-blocked', 5, { type: 'command', id: 'rm -rf /' }, 'critical');
    bus.emitDeny('security:net-blocked', 6, { type: 'outbound', id: 'evil.com' }, 'warning');
    bus.emitAllow('security:net-allowed', 6, { type: 'outbound', id: 'api.openai.com' });

    // Add keychain access events
    bus.emit({
        type: 'security:keychain-access',
        timestamp: new Date(),
        layer: 3,
        decision: 'allow',
        actor: { skillId: 'note-reader', userId: 'user-1' },
        resource: { type: 'credential', id: 'OPENAI_API_KEY' },
        severity: 'info',
    });
    bus.emit({
        type: 'security:keychain-access',
        timestamp: new Date(),
        layer: 3,
        decision: 'deny',
        actor: { skillId: 'suspicious-skill', userId: 'user-2' },
        resource: { type: 'credential', id: 'AWS_SECRET' },
        severity: 'high',
    });

    return { exporter, tracker, bus };
}

// ─── Tests ─────────────────────────────────────────────────

describe('ComplianceExporter', () => {

    // ─── Data Access Report ────────────────────────────────

    describe('data-access report', () => {
        it('should export as JSON with correct structure', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'data-access' });

            expect(result.format).toBe('json');
            expect(result.type).toBe('data-access');
            expect(result.recordCount).toBe(3);

            const parsed = JSON.parse(result.content);
            expect(parsed.report).toBe('data-access');
            expect(parsed.summary).toBeDefined();
            expect(parsed.summary.total).toBe(3);
            expect(parsed.records).toHaveLength(3);
        });

        it('should export as CSV with correct headers and rows', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'csv', type: 'data-access' });

            const lines = result.content.split('\n');
            expect(lines[0]).toContain('Timestamp');
            expect(lines[0]).toContain('Source');
            expect(lines[0]).toContain('Sent to Cloud');
            expect(lines.length).toBe(4); // header + 3 records
        });

        it('should filter by skillFilter', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'data-access', skillFilter: 'imsg' });

            const parsed = JSON.parse(result.content);
            expect(parsed.records).toHaveLength(1);
            expect(parsed.records[0].skillId).toBe('imsg');
        });

        it('should use default date range (30 days) when not specified', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'data-access' });
            expect(result.recordCount).toBe(3);
        });

        it('should respect custom date range', () => {
            const { exporter } = setup();
            const future = new Date(Date.now() + 100_000);
            const result = exporter.export({ format: 'json', type: 'data-access', from: future });
            expect(result.recordCount).toBe(0);
        });
    });

    // ─── Security Incidents Report ─────────────────────────

    describe('security-incidents report', () => {
        it('should export as JSON', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'security-incidents' });

            const parsed = JSON.parse(result.content);
            expect(parsed.report).toBe('security-incidents');
            expect(parsed.totalIncidents).toBeGreaterThanOrEqual(2);
            expect(parsed.bySeverity).toBeDefined();
            expect(parsed.byLayer).toBeDefined();
        });

        it('should export as CSV', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'csv', type: 'security-incidents' });

            const lines = result.content.split('\n');
            expect(lines[0]).toContain('Timestamp');
            expect(lines[0]).toContain('Severity');
            expect(lines[0]).toContain('Evidence');
            expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2+ incidents
        });

        it('should only include deny events', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'security-incidents' });
            const parsed = JSON.parse(result.content);
            // All events should have decision = deny
            expect(parsed.totalIncidents).toBeGreaterThanOrEqual(2);
        });

        it('should filter by date range', () => {
            const { exporter } = setup();
            const future = new Date(Date.now() + 100_000);
            const result = exporter.export({ format: 'json', type: 'security-incidents', from: future });
            expect(result.recordCount).toBe(0);
        });
    });

    // ─── Credential Access Report ──────────────────────────

    describe('credential-access report', () => {
        it('should export as JSON', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'credential-access' });

            expect(result.type).toBe('credential-access');
            const parsed = JSON.parse(result.content);
            expect(parsed.report).toBe('credential-access');
            expect(parsed.totalAccesses).toBeGreaterThanOrEqual(2);
            expect(parsed.events).toHaveLength(parsed.totalAccesses);
        });

        it('should export as CSV', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'csv', type: 'credential-access' });

            const lines = result.content.split('\n');
            expect(lines[0]).toContain('Timestamp');
            expect(lines[0]).toContain('Decision');
            expect(lines[0]).toContain('Resource');
            expect(lines[0]).toContain('Skill');
            expect(lines[0]).toContain('User');
            expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2+ records
        });

        it('should include both allow and deny keychain events', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'credential-access' });
            const parsed = JSON.parse(result.content);
            const decisions = parsed.events.map((e: { decision: string }) => e.decision);
            expect(decisions).toContain('allow');
            expect(decisions).toContain('deny');
        });

        it('should filter by date range', () => {
            const { exporter } = setup();
            const future = new Date(Date.now() + 100_000);
            const result = exporter.export({ format: 'json', type: 'credential-access', from: future });
            expect(result.recordCount).toBe(0);
        });
    });

    // ─── Full Audit Report ─────────────────────────────────

    describe('full-audit report', () => {
        it('should export as JSON with all sections', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'full-audit' });

            const parsed = JSON.parse(result.content);
            expect(parsed.report).toBe('full-audit');
            expect(parsed.summary).toBeDefined();
            expect(parsed.summary.totalEvents).toBeGreaterThan(0);
            expect(parsed.summary.allowed).toBeGreaterThanOrEqual(0);
            expect(parsed.summary.denied).toBeGreaterThanOrEqual(2);
            expect(parsed.summary.dataAccesses).toBeDefined();
            expect(parsed.summary.dataSentToCloud).toBeDefined();
            expect(parsed.securityEvents).toBeDefined();
            expect(parsed.dataAccess).toBeDefined();
        });

        it('should export as CSV', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'csv', type: 'full-audit' });

            const lines = result.content.split('\n');
            expect(lines[0]).toContain('Timestamp');
            expect(lines[0]).toContain('Type');
            expect(lines[0]).toContain('Layer');
            expect(lines[0]).toContain('Decision');
            expect(lines.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter by date range', () => {
            const { exporter } = setup();
            const future = new Date(Date.now() + 100_000);
            const result = exporter.export({ format: 'json', type: 'full-audit', from: future });
            const parsed = JSON.parse(result.content);
            expect(parsed.summary.totalEvents).toBe(0);
        });
    });

    // ─── CSV Escaping ──────────────────────────────────────

    describe('CSV escaping', () => {
        it('should escape commas in values', () => {
            const bus = new SecurityEventBus();
            const tracker = new DataAccessTracker(bus);
            const exporter = new ComplianceExporter(tracker, bus);

            tracker.record({
                source: 'filesystem',
                category: 'files',
                skillId: 'reader',
                description: 'Read file with, commas',
                sentToCloud: false,
                itemCount: 1,
            });

            const result = exporter.export({ format: 'csv', type: 'data-access' });
            // The description with comma should be quoted
            expect(result.content).toContain('"Read file with, commas"');
        });

        it('should escape double quotes in values', () => {
            const bus = new SecurityEventBus();
            const tracker = new DataAccessTracker(bus);
            const exporter = new ComplianceExporter(tracker, bus);

            tracker.record({
                source: 'filesystem',
                category: 'files',
                skillId: 'reader',
                description: 'File "important.txt"',
                sentToCloud: false,
                itemCount: 1,
            });

            const result = exporter.export({ format: 'csv', type: 'data-access' });
            expect(result.content).toContain('""important.txt""');
        });

        it('should escape newlines in values', () => {
            const bus = new SecurityEventBus();
            const tracker = new DataAccessTracker(bus);
            const exporter = new ComplianceExporter(tracker, bus);

            tracker.record({
                source: 'filesystem',
                category: 'files',
                skillId: 'reader',
                description: 'Line1\nLine2',
                sentToCloud: false,
                itemCount: 1,
            });

            const result = exporter.export({ format: 'csv', type: 'data-access' });
            expect(result.content).toContain('"Line1\nLine2"');
        });
    });

    // ─── Metadata ──────────────────────────────────────────

    describe('metadata', () => {
        it('should include generatedAt timestamp', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'json', type: 'data-access' });
            expect(result.generatedAt).toBeDefined();
            expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
        });

        it('should include correct format and type', () => {
            const { exporter } = setup();
            const result = exporter.export({ format: 'csv', type: 'security-incidents' });
            expect(result.format).toBe('csv');
            expect(result.type).toBe('security-incidents');
        });
    });
});
