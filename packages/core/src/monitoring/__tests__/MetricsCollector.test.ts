/**
 * MetricsCollector Tests
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector } from '../MetricsCollector.js';

describe('MetricsCollector', () => {
    let metrics: MetricsCollector;

    beforeEach(() => {
        metrics = new MetricsCollector({
            alertThresholds: {
                maxCostPerHour: 10,
                maxErrorRate: 0.2,
                maxP95Latency: 5000,
                maxMemoryUsageMB: 1000,
            },
        });
    });

    describe('recordRequest', () => {
        it('should record a successful request', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            const perf = metrics.getPerformanceMetrics();
            expect(perf.totalRequests).toBe(1);
            expect(perf.successfulRequests).toBe(1);
            expect(perf.failedRequests).toBe(0);
            expect(perf.successRate).toBe(1);
        });

        it('should record a failed request', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 500,
                success: false,
                model: 'claude-sonnet-4.5',
                inputTokens: 100,
                outputTokens: 0,
                error: 'API error',
            });

            const perf = metrics.getPerformanceMetrics();
            expect(perf.totalRequests).toBe(1);
            expect(perf.successfulRequests).toBe(0);
            expect(perf.failedRequests).toBe(1);
            expect(perf.successRate).toBe(0);
        });

        it('should calculate cost correctly', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 1_000_000, // 1M tokens
                outputTokens: 1_000_000, // 1M tokens
            });

            const cost = metrics.getCostMetrics();
            // $3 input + $15 output = $18
            expect(cost.totalCost).toBeCloseTo(18, 2);
        });
    });

    describe('getPerformanceMetrics', () => {
        it('should calculate average response time', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 500,
            });

            metrics.recordRequest({
                requestId: 'req_2',
                duration: 2000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 500,
            });

            const perf = metrics.getPerformanceMetrics();
            expect(perf.avgResponseTime).toBe(1500);
        });

        it('should calculate p95 and p99 percentiles', () => {
            // Record 100 requests with increasing latency
            for (let i = 0; i < 100; i++) {
                metrics.recordRequest({
                    requestId: `req_${i}`,
                    duration: (i + 1) * 10, // 10ms, 20ms, 30ms, ..., 1000ms
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            const perf = metrics.getPerformanceMetrics();
            expect(perf.p95ResponseTime).toBe(960); // 96th request (index 95)
            expect(perf.p99ResponseTime).toBe(1000); // 100th request (index 99)
        });

        it('should calculate success rate', () => {
            // 7 successful, 3 failed = 70% success rate
            for (let i = 0; i < 7; i++) {
                metrics.recordRequest({
                    requestId: `req_success_${i}`,
                    duration: 1000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            for (let i = 0; i < 3; i++) {
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

            const perf = metrics.getPerformanceMetrics();
            expect(perf.successRate).toBe(0.7);
        });

        it('should calculate total tokens', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            const perf = metrics.getPerformanceMetrics();
            expect(perf.totalTokens).toBe(1500);
            expect(perf.avgTokensPerRequest).toBe(1500);
        });
    });

    describe('getCostMetrics', () => {
        it('should track costs by model', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            });

            metrics.recordRequest({
                requestId: 'req_2',
                duration: 1000,
                success: true,
                model: 'gpt-4',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            });

            const cost = metrics.getCostMetrics();
            expect(cost.costByModel['claude-sonnet-4.5']).toBeCloseTo(18, 2);
            expect(cost.costByModel['gpt-4']).toBeCloseTo(90, 2);
        });

        it('should calculate average cost per request', () => {
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
                model: 'claude-sonnet-4.5',
                inputTokens: 500_000,
                outputTokens: 500_000,
            });

            const cost = metrics.getCostMetrics();
            // Each request: ($1.5 input + $7.5 output) = $9
            expect(cost.avgCostPerRequest).toBeCloseTo(9.0, 2);
        });

        it('should use default pricing for unknown models', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'unknown-model',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            });

            const cost = metrics.getCostMetrics();
            // Default: $3 input + $15 output = $18
            expect(cost.totalCost).toBeCloseTo(18, 2);
        });
    });

    describe('getHealthStatus', () => {
        it('should return healthy status with high success rate', () => {
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

            const health = metrics.getHealthStatus();
            expect(health.status).toBe('healthy');
            expect(health.components.llm.status).toBe('up');
        });

        it('should return degraded status with low success rate', () => {
            // 90% failure rate
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

            const health = metrics.getHealthStatus();
            expect(health.status).toBe('degraded');
            expect(health.components.llm.status).toBe('degraded');
        });

        it('should track uptime', () => {
            vi.useFakeTimers();
            const collector = new MetricsCollector();

            vi.advanceTimersByTime(5000); // 5 seconds

            const health = collector.getHealthStatus();
            expect(health.uptime).toBe(5);

            vi.useRealTimers();
        });
    });

    describe('logAudit', () => {
        it('should create audit logs', () => {
            metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'chat',
                message: 'Chat completed',
            });

            const logs = metrics.getAuditLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('info');
            expect(logs[0].component).toBe('genome');
            expect(logs[0].operation).toBe('chat');
        });

        it('should assign unique IDs to logs', () => {
            metrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message: 'Test 1',
            });

            metrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message: 'Test 2',
            });

            const logs = metrics.getAuditLogs();
            expect(logs[0].id).not.toBe(logs[1].id);
        });

        it('should include metadata in logs', () => {
            metrics.logAudit({
                level: 'info',
                component: 'genome',
                operation: 'mutate',
                message: 'Mutation applied',
                metadata: {
                    genomeId: 'gen_123',
                    operator: 'compress',
                },
            });

            const logs = metrics.getAuditLogs();
            expect(logs[0].metadata).toEqual({
                genomeId: 'gen_123',
                operator: 'compress',
            });
        });
    });

    describe('alerts', () => {
        it('should create alert for high error rate', () => {
            // Create 50% error rate (exceeds 20% threshold)
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

            const alerts = metrics.getAlerts();
            expect(alerts.some(a => a.type === 'error')).toBe(true);
        });

        it('should create alert for high latency', () => {
            // Create requests with 6000ms latency (exceeds 5000ms threshold)
            for (let i = 0; i < 100; i++) {
                metrics.recordRequest({
                    requestId: `req_${i}`,
                    duration: 6000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            const alerts = metrics.getAlerts();
            expect(alerts.some(a => a.type === 'performance')).toBe(true);
        });

        it('should create alert for high cost', () => {
            // Create expensive requests that exceed $10/hour
            metrics.recordRequest({
                requestId: 'req_expensive',
                duration: 1000,
                success: true,
                model: 'claude-opus-4',
                inputTokens: 1_000_000, // $15
                outputTokens: 1_000_000, // $75
                // Total: $90 > $10 threshold
            });

            const alerts = metrics.getAlerts();
            expect(alerts.some(a => a.type === 'cost')).toBe(true);
        });

        it('should resolve alerts', () => {
            // Trigger an alert
            for (let i = 0; i < 100; i++) {
                metrics.recordRequest({
                    requestId: `req_${i}`,
                    duration: 6000,
                    success: true,
                    model: 'claude-sonnet-4.5',
                    inputTokens: 100,
                    outputTokens: 100,
                });
            }

            const alerts = metrics.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);

            const alertId = alerts[0].id;
            metrics.resolveAlert(alertId);

            const unresolvedAlerts = metrics.getAlerts();
            expect(unresolvedAlerts.some(a => a.id === alertId)).toBe(false);
        });

        it('should not create duplicate alerts', () => {
            // Trigger same alert condition multiple times
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 100; j++) {
                    metrics.recordRequest({
                        requestId: `req_${i}_${j}`,
                        duration: 6000,
                        success: true,
                        model: 'claude-sonnet-4.5',
                        inputTokens: 100,
                        outputTokens: 100,
                    });
                }
            }

            const alerts = metrics.getAlerts();
            const performanceAlerts = alerts.filter(a => a.type === 'performance');
            // Should only have one unresolved performance alert
            expect(performanceAlerts.length).toBe(1);
        });
    });

    describe('reset', () => {
        it('should reset all metrics', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            metrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message: 'Test',
            });

            metrics.reset();

            const perf = metrics.getPerformanceMetrics();
            const cost = metrics.getCostMetrics();
            const logs = metrics.getAuditLogs();
            const alerts = metrics.getAlerts();

            expect(perf.totalRequests).toBe(0);
            expect(cost.totalCost).toBe(0);
            expect(logs).toHaveLength(0);
            expect(alerts).toHaveLength(0);
        });
    });

    describe('exportMetrics', () => {
        it('should export all metrics', () => {
            metrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            metrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message: 'Test',
            });

            const exported = metrics.exportMetrics();

            expect(exported.performance).toBeDefined();
            expect(exported.cost).toBeDefined();
            expect(exported.health).toBeDefined();
            expect(exported.alerts).toBeDefined();
            expect(exported.auditLogs).toBeDefined();
        });
    });

    describe('configuration', () => {
        it('should respect enabled flag', () => {
            const disabledMetrics = new MetricsCollector({ enabled: false });

            disabledMetrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'claude-sonnet-4.5',
                inputTokens: 500,
                outputTokens: 1000,
            });

            const perf = disabledMetrics.getPerformanceMetrics();
            expect(perf.totalRequests).toBe(0);
        });

        it('should respect audit logs flag', () => {
            const noAuditMetrics = new MetricsCollector({ enableAuditLogs: false });

            noAuditMetrics.logAudit({
                level: 'info',
                component: 'test',
                operation: 'test',
                message: 'Test',
            });

            const logs = noAuditMetrics.getAuditLogs();
            expect(logs).toHaveLength(0);
        });

        it('should use custom pricing', () => {
            const customMetrics = new MetricsCollector({
                costPerMillionInputTokens: {
                    'custom-model': 100.0,
                },
                costPerMillionOutputTokens: {
                    'custom-model': 200.0,
                },
            });

            customMetrics.recordRequest({
                requestId: 'req_1',
                duration: 1000,
                success: true,
                model: 'custom-model',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            });

            const cost = customMetrics.getCostMetrics();
            expect(cost.totalCost).toBeCloseTo(300, 2);
        });
    });
});
