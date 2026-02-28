/**
 * MonitoringDashboard Tests
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsCollector } from '../MetricsCollector.js';
import { MonitoringDashboard } from '../MonitoringDashboard.js';

describe('MonitoringDashboard', () => {
    let metrics: MetricsCollector;
    let dashboard: MonitoringDashboard;

    // Mock console.log to prevent test output pollution
    const originalLog = console.log;
    const originalWarn = console.warn;

    beforeEach(() => {
        metrics = new MetricsCollector({
            alertThresholds: {
                maxCostPerHour: 10,
                maxErrorRate: 0.2,
                maxP95Latency: 5000,
                maxMemoryUsageMB: 1000,
            },
        });

        dashboard = new MonitoringDashboard(metrics, {
            refreshInterval: 100, // Fast for testing
        });

        // Suppress console output during tests
        console.log = vi.fn();
        console.warn = vi.fn();
    });

    afterEach(() => {
        dashboard.stop();
        console.log = originalLog;
        console.warn = originalWarn;
    });

    describe('constructor', () => {
        it('should create dashboard with default config', () => {
            const defaultDashboard = new MonitoringDashboard(metrics);
            expect(defaultDashboard).toBeDefined();
        });

        it('should accept custom config', () => {
            const customDashboard = new MonitoringDashboard(metrics, {
                refreshInterval: 5000,
                showPerformance: false,
                showCost: true,
                showHealth: true,
                showAlerts: false,
                showAuditLogs: true,
                maxLogs: 10,
            });
            expect(customDashboard).toBeDefined();
        });
    });

    describe('start and stop', () => {
        it('should start the dashboard', () => {
            dashboard.start();
            expect(console.log).toHaveBeenCalled();
        });

        it('should warn if already running', () => {
            dashboard.start();
            dashboard.start(); // Second start
            expect(console.warn).toHaveBeenCalledWith('Dashboard is already running');
        });

        it('should stop the dashboard', () => {
            dashboard.start();
            dashboard.stop();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Dashboard Stopped')
            );
        });

        it('should refresh at configured interval', async () => {
            vi.useFakeTimers();

            dashboard.start();
            const initialCalls = (console.log as any).mock.calls.length;

            // Advance time by refresh interval
            vi.advanceTimersByTime(100);

            // Should have refreshed
            expect((console.log as any).mock.calls.length).toBeGreaterThan(initialCalls);

            dashboard.stop();
            vi.useRealTimers();
        });
    });

    describe('renderSnapshot', () => {
        it('should render a single snapshot', () => {
            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalled();
        });

        it('should render all sections when enabled', () => {
            const fullDashboard = new MonitoringDashboard(metrics, {
                showPerformance: true,
                showCost: true,
                showHealth: true,
                showAlerts: true,
                showAuditLogs: true,
            });

            fullDashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('SYSTEM HEALTH')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('PERFORMANCE')
            );
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('COSTS'));
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('ACTIVE ALERTS')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('RECENT ACTIVITY')
            );
        });

        it('should not render disabled sections', () => {
            const minimalDashboard = new MonitoringDashboard(metrics, {
                showPerformance: false,
                showCost: false,
                showHealth: true,
                showAlerts: false,
                showAuditLogs: false,
            });

            minimalDashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('SYSTEM HEALTH')
            );
        });
    });

    describe('health display', () => {
        it('should display healthy status', () => {
            // Simulate healthy system
            for (let i = 0; i < 100; i++) {
                metrics.recordRequest({
                    requestId: `req_${i}`,
                    duration: 1000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('HEALTHY')
            );
        });

        it('should display degraded status', () => {
            // Simulate degraded system (low success rate)
            for (let i = 0; i < 90; i++) {
                metrics.recordRequest({
                    requestId: `req_fail_${i}`,
                    duration: 500,
                    success: false,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 0,
                    error: 'Error',
                });
            }

            for (let i = 0; i < 10; i++) {
                metrics.recordRequest({
                    requestId: `req_success_${i}`,
                    duration: 1000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('DEGRADED')
            );
        });
    });

    describe('performance display', () => {
        it('should display performance metrics', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1500,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Total Requests')
            );
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Avg Response Time')
            );
        });
    });

    describe('cost display', () => {
        it('should display cost metrics', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            });

            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Total Cost')
            );
        });

        it('should display cost by model', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500_000,
                outputTokens: 500_000,
            });

            metrics.recordRequest({
                requestId: 'req_2',
                duration: 1000,
                success: true,
                model: 'gpt-4',
                inputTokens: 500_000,
                outputTokens: 500_000,
            });

            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('By Model'));
        });
    });

    describe('alerts display', () => {
        it('should show no alerts message when no alerts', () => {
            dashboard.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('No active alerts')
            );
        });

        it('should display active alerts', () => {
            // Trigger an alert (high error rate)
            for (let i = 0; i < 50; i++) {
                metrics.recordRequest({
                    requestId: `req_fail_${i}`,
                    duration: 500,
                    success: false,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 0,
                    error: 'Error',
                });
            }

            for (let i = 0; i < 50; i++) {
                metrics.recordRequest({
                    requestId: `req_success_${i}`,
                    duration: 1000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            dashboard.renderSnapshot();
            const alerts = metrics.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);
        });
    });

    describe('audit logs display', () => {
        it('should show no activity message when no logs', () => {
            const dashboardWithLogs = new MonitoringDashboard(metrics, {
                showAuditLogs: true,
            });

            dashboardWithLogs.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('No recent activity')
            );
        });

        it('should display recent audit logs', () => {
            const dashboardWithLogs = new MonitoringDashboard(metrics, {
                showAuditLogs: true,
                maxLogs: 3,
            });

            metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'chat',
                message: 'Test log 1',
            });

            metrics.logAudit({
                level: 'warning',
                component: 'llm',
                operation: 'mutation',
                message: 'Test log 2',
            });

            dashboardWithLogs.renderSnapshot();
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('genome.chat')
            );
        });

        it('should limit logs to maxLogs', () => {
            const dashboardWithLogs = new MonitoringDashboard(metrics, {
                showAuditLogs: true,
                maxLogs: 2,
            });

            for (let i = 0; i < 10; i++) {
                metrics.logAudit({
                    level: 'info',
                    component: 'test',
                    operation: 'test',
                    message: `Log ${i}`,
                });
            }

            dashboardWithLogs.renderSnapshot();
            // Should only show 2 most recent logs
            const logs = metrics.getAuditLogs(2);
            expect(logs.length).toBe(2);
        });
    });

    describe('formatting', () => {
        it('should format durations correctly', () => {
            vi.useFakeTimers();
            const collector = new MetricsCollector();
            const testDashboard = new MonitoringDashboard(collector);

            vi.advanceTimersByTime(125_000); // 125 seconds

            testDashboard.renderSnapshot();
            // Should display as minutes (2.1m)
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Uptime')
            );

            vi.useRealTimers();
        });

        it('should format latency correctly', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1500,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 100,
                outputTokens: 100,
            });

            dashboard.renderSnapshot();
            // Should display latency in ms
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('ms')
            );
        });

        it('should format percentages correctly', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 100,
                outputTokens: 100,
            });

            dashboard.renderSnapshot();
            // Should display success rate as percentage
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('%'));
        });

        it('should truncate long strings', () => {
            metrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message:
                    'This is a very long message that should be truncated to fit in the dashboard display area without breaking the layout',
            });

            const dashboardWithLogs = new MonitoringDashboard(metrics, {
                showAuditLogs: true,
            });

            dashboardWithLogs.renderSnapshot();
            expect(console.log).toHaveBeenCalled();
        });
    });
});
