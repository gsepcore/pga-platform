/**
 * AlertWebhooks Tests
 *
 * Tests for webhook alert delivery, payload formatting, deduplication, and retry.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertWebhooks } from '../AlertWebhooks.js';
import type { WebhookConfig } from '../AlertWebhooks.js';
import type { Alert } from '../MetricsCollector.js';

// ─── Helpers ────────────────────────────────────────────────

function makeAlert(overrides: Partial<Alert> = {}): Alert {
    return {
        id: overrides.id ?? `alert-${Math.random().toString(36).slice(2, 8)}`,
        title: overrides.title ?? 'Test Alert',
        description: overrides.description ?? 'Something happened',
        severity: overrides.severity ?? 'high',
        type: overrides.type ?? 'error',
        timestamp: overrides.timestamp ?? new Date('2026-03-09T12:00:00Z'),
        resolved: overrides.resolved ?? false,
        metrics: overrides.metrics,
    };
}

function makeWebhookConfig(overrides: Partial<WebhookConfig> = {}): WebhookConfig {
    return {
        url: overrides.url ?? 'https://hooks.example.com/webhook',
        type: overrides.type ?? 'generic',
        minSeverity: overrides.minSeverity,
        headers: overrides.headers,
        retry: overrides.retry,
        ...overrides,
    };
}

function mockFetchOk(): ReturnType<typeof vi.fn> {
    const fn = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
    });
    vi.stubGlobal('fetch', fn);
    return fn;
}

function mockFetchFailure(times: number): ReturnType<typeof vi.fn> {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= times) {
            return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK' });
    });
    vi.stubGlobal('fetch', fn);
    return fn;
}

// ─── Tests ──────────────────────────────────────────────────

describe('AlertWebhooks', () => {
    let webhooks: AlertWebhooks;

    beforeEach(() => {
        webhooks = new AlertWebhooks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    // ── addWebhook / clearWebhooks ──────────────────────────

    describe('addWebhook and clearWebhooks', () => {
        it('should add webhooks and clear them all', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ url: 'https://a.test/hook' }));
            webhooks.addWebhook(makeWebhookConfig({ url: 'https://b.test/hook' }));

            const alert = makeAlert();
            await webhooks.sendAlert(alert);
            expect(fetchMock).toHaveBeenCalledTimes(2);

            // Clear and verify no more calls
            webhooks.clearWebhooks();
            fetchMock.mockClear();
            const alert2 = makeAlert({ id: 'different-alert' });
            await webhooks.sendAlert(alert2);
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    // ── sendAlert — severity filtering ──────────────────────

    describe('sendAlert severity filtering', () => {
        it('should call fetch for webhooks matching the alert severity', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ minSeverity: 'high' }));
            const alert = makeAlert({ severity: 'critical' });
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should skip webhooks whose minSeverity is above the alert severity', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ minSeverity: 'critical' }));
            const alert = makeAlert({ severity: 'low' });
            await webhooks.sendAlert(alert);

            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('should send to webhook with no minSeverity for any alert severity', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ minSeverity: undefined }));
            const alert = makeAlert({ severity: 'low' });
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should filter correctly across the full severity spectrum', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ url: 'https://low.test', minSeverity: 'low' }));
            webhooks.addWebhook(makeWebhookConfig({ url: 'https://high.test', minSeverity: 'high' }));

            const alert = makeAlert({ severity: 'medium' });
            await webhooks.sendAlert(alert);

            // 'low' webhook accepts medium (medium >= low), 'high' webhook rejects (medium < high)
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('https://low.test');
        });
    });

    // ── Deduplication ───────────────────────────────────────

    describe('deduplication', () => {
        it('should not send the same alert ID twice', async () => {
            const fetchMock = mockFetchOk();
            webhooks.addWebhook(makeWebhookConfig());

            const alert = makeAlert({ id: 'dup-1' });
            await webhooks.sendAlert(alert);
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should send alerts with different IDs independently', async () => {
            const fetchMock = mockFetchOk();
            webhooks.addWebhook(makeWebhookConfig());

            await webhooks.sendAlert(makeAlert({ id: 'unique-1' }));
            await webhooks.sendAlert(makeAlert({ id: 'unique-2' }));

            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    // ── Slack payload format ────────────────────────────────

    describe('Slack payload format', () => {
        it('should send a Slack-formatted payload with blocks', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ type: 'slack' }));
            const alert = makeAlert({ title: 'High Latency', severity: 'high' });
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [, options] = fetchMock.mock.calls[0];
            const body = JSON.parse(options.body);

            expect(body.blocks).toBeDefined();
            expect(Array.isArray(body.blocks)).toBe(true);
            expect(body.blocks.length).toBeGreaterThanOrEqual(2);

            // Header block
            const headerBlock = body.blocks.find((b: any) => b.type === 'header');
            expect(headerBlock).toBeDefined();
            expect(headerBlock.text.text).toContain('High Latency');

            // Section block with fields
            const sectionWithFields = body.blocks.find(
                (b: any) => b.type === 'section' && b.fields,
            );
            expect(sectionWithFields).toBeDefined();

            // Content-type header
            expect(options.headers['Content-Type']).toBe('application/json');
        });
    });

    // ── Discord payload format ──────────────────────────────

    describe('Discord payload format', () => {
        it('should send a Discord-formatted payload with embeds', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ type: 'discord' }));
            const alert = makeAlert({
                title: 'Cost Spike',
                severity: 'critical',
                description: 'Costs exceeded threshold',
            });
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [, options] = fetchMock.mock.calls[0];
            const body = JSON.parse(options.body);

            expect(body.embeds).toBeDefined();
            expect(Array.isArray(body.embeds)).toBe(true);
            expect(body.embeds.length).toBe(1);

            const embed = body.embeds[0];
            expect(embed.title).toContain('Cost Spike');
            expect(embed.description).toBe('Costs exceeded threshold');
            expect(typeof embed.color).toBe('number');
            expect(embed.color).toBe(0xff0000); // critical = red
            expect(embed.fields).toBeDefined();
            expect(embed.timestamp).toBeDefined();
        });
    });

    // ── Generic payload format ──────────────────────────────

    describe('Generic payload format', () => {
        it('should send a generic payload with the full alert structure', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(makeWebhookConfig({ type: 'generic' }));
            const alert = makeAlert({
                id: 'gen-1',
                title: 'Generic Alert',
                severity: 'medium',
                type: 'performance',
                metrics: { latency: 5000 },
            });
            await webhooks.sendAlert(alert);

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [, options] = fetchMock.mock.calls[0];
            const body = JSON.parse(options.body);

            expect(body.alert).toBeDefined();
            expect(body.alert.id).toBe('gen-1');
            expect(body.alert.title).toBe('Generic Alert');
            expect(body.alert.severity).toBe('medium');
            expect(body.alert.type).toBe('performance');
            expect(body.alert.resolved).toBe(false);
            expect(body.alert.metrics).toEqual({ latency: 5000 });
            expect(body.alert.timestamp).toBeDefined();
        });
    });

    // ── Retry on failure ────────────────────────────────────

    describe('retry on fetch failure', () => {
        it('should retry up to maxRetries times with exponential backoff on failure', async () => {
            // Fail twice, succeed on third attempt
            const fetchMock = mockFetchFailure(2);

            webhooks.addWebhook(
                makeWebhookConfig({
                    retry: { maxRetries: 3, delayMs: 100 },
                }),
            );

            const alertPromise = webhooks.sendAlert(makeAlert());

            // Advance past first backoff: 100 * 2^0 = 100ms
            await vi.advanceTimersByTimeAsync(100);
            // Advance past second backoff: 100 * 2^1 = 200ms
            await vi.advanceTimersByTimeAsync(200);

            await alertPromise;

            // 2 failures + 1 success = 3 calls
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it('should throw after exhausting all retries', async () => {
            // Fail on all attempts (default maxRetries=3 + initial = 4 attempts)
            const fetchMock = vi.fn().mockRejectedValue(new Error('Permanent failure'));
            vi.stubGlobal('fetch', fetchMock);

            webhooks.addWebhook(
                makeWebhookConfig({
                    retry: { maxRetries: 2, delayMs: 50 },
                }),
            );

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const alertPromise = webhooks.sendAlert(makeAlert());

            // Advance timers for all retry delays
            // Attempt 0 fails -> wait 50ms
            await vi.advanceTimersByTimeAsync(50);
            // Attempt 1 fails -> wait 100ms
            await vi.advanceTimersByTimeAsync(100);
            // Attempt 2 fails -> no more retries, throws

            // Promise.allSettled means the outer promise resolves even when inner throws
            await alertPromise;

            // 3 total attempts: initial + 2 retries
            expect(fetchMock).toHaveBeenCalledTimes(3);

            consoleSpy.mockRestore();
        });
    });

    // ── Custom headers ──────────────────────────────────────

    describe('custom headers', () => {
        it('should include custom headers in the fetch request', async () => {
            const fetchMock = mockFetchOk();

            webhooks.addWebhook(
                makeWebhookConfig({
                    headers: { Authorization: 'Bearer secret-token' },
                }),
            );

            await webhooks.sendAlert(makeAlert());

            const [, options] = fetchMock.mock.calls[0];
            expect(options.headers['Authorization']).toBe('Bearer secret-token');
            expect(options.headers['Content-Type']).toBe('application/json');
        });
    });
});
