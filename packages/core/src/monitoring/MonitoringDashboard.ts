/**
 * Real-Time Monitoring Dashboard
 *
 * Interactive dashboard for monitoring PGA performance, costs, and health in real-time.
 * Displays metrics, alerts, and trends in the terminal.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import type { MetricsCollector, Alert } from './MetricsCollector.js';

export interface DashboardConfig {
    /**
     * Refresh interval in milliseconds
     * @default 2000
     */
    refreshInterval?: number;

    /**
     * Show performance metrics
     * @default true
     */
    showPerformance?: boolean;

    /**
     * Show cost metrics
     * @default true
     */
    showCost?: boolean;

    /**
     * Show health status
     * @default true
     */
    showHealth?: boolean;

    /**
     * Show alerts
     * @default true
     */
    showAlerts?: boolean;

    /**
     * Show audit logs
     * @default false
     */
    showAuditLogs?: boolean;

    /**
     * Number of recent logs to show
     * @default 5
     */
    maxLogs?: number;
}

/**
 * Monitoring Dashboard
 *
 * Real-time terminal dashboard for PGA metrics and health.
 */
export class MonitoringDashboard {
    private config: Required<DashboardConfig>;
    private metricsCollector: MetricsCollector;
    private intervalId?: NodeJS.Timeout;
    private isRunning = false;

    constructor(metricsCollector: MetricsCollector, config: DashboardConfig = {}) {
        this.metricsCollector = metricsCollector;
        this.config = {
            refreshInterval: config.refreshInterval ?? 2000,
            showPerformance: config.showPerformance ?? true,
            showCost: config.showCost ?? true,
            showHealth: config.showHealth ?? true,
            showAlerts: config.showAlerts ?? true,
            showAuditLogs: config.showAuditLogs ?? false,
            maxLogs: config.maxLogs ?? 5,
        };
    }

    /**
     * Start the dashboard
     */
    start(): void {
        if (this.isRunning) {
            console.warn('Dashboard is already running');
            return;
        }

        this.isRunning = true;
        this.render();

        this.intervalId = setInterval(() => {
            this.render();
        }, this.config.refreshInterval);

        console.log('\n📊 Monitoring Dashboard Started');
        console.log(`Refreshing every ${this.config.refreshInterval}ms`);
        console.log('Press Ctrl+C to stop\n');
    }

    /**
     * Stop the dashboard
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        this.isRunning = false;
        console.log('\n📊 Monitoring Dashboard Stopped\n');
    }

    /**
     * Render a single snapshot
     */
    renderSnapshot(): void {
        this.render();
    }

    /**
     * Render the dashboard
     */
    private render(): void {
        // Clear console (cross-platform)
        if (process.stdout.isTTY) {
            process.stdout.write('\x1Bc');
        }

        const timestamp = new Date().toISOString();

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║       PGA MONITORING DASHBOARD — Real-Time Metrics            ║');
        console.log('╠════════════════════════════════════════════════════════════════╣');
        console.log(`║ Updated: ${timestamp}                       ║`);
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        if (this.config.showHealth) {
            this.renderHealth();
        }

        if (this.config.showPerformance) {
            this.renderPerformance();
        }

        if (this.config.showCost) {
            this.renderCost();
        }

        if (this.config.showAlerts) {
            this.renderAlerts();
        }

        if (this.config.showAuditLogs) {
            this.renderAuditLogs();
        }
    }

    /**
     * Render health status
     */
    private renderHealth(): void {
        const health = this.metricsCollector.getHealthStatus();

        console.log('┌─ SYSTEM HEALTH ─────────────────────────────────────────────┐');

        // Overall status
        const statusIcon = this.getStatusIcon(health.status);
        const statusColor = this.getStatusColor(health.status);
        console.log(`│ Status: ${statusColor}${statusIcon} ${health.status.toUpperCase()}${this.colors.reset}`);

        // Components
        console.log('│');
        console.log('│ Components:');
        console.log(`│   LLM:     ${this.getComponentStatus(health.components.llm)}`);
        console.log(`│   Storage: ${this.getComponentStatus(health.components.storage)}`);
        console.log(`│   Genome:  ${this.getComponentStatus(health.components.genome)}`);

        // System info
        console.log('│');
        console.log(`│ Uptime:       ${this.formatDuration(health.uptime)}`);
        console.log(`│ Memory:       ${health.memoryUsage.toFixed(1)} MB`);

        console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    /**
     * Render performance metrics
     */
    private renderPerformance(): void {
        const perf = this.metricsCollector.getPerformanceMetrics();

        console.log('┌─ PERFORMANCE ───────────────────────────────────────────────┐');

        // Requests
        console.log(`│ Total Requests:    ${perf.totalRequests.toLocaleString()}`);
        console.log(`│ Successful:        ${perf.successfulRequests.toLocaleString()} (${this.formatPercentage(perf.successRate)})`);
        console.log(`│ Failed:            ${perf.failedRequests.toLocaleString()}`);

        // Latency
        console.log('│');
        console.log(`│ Avg Response Time: ${this.formatLatency(perf.avgResponseTime)}`);
        console.log(`│ P95:               ${this.formatLatency(perf.p95ResponseTime)}`);
        console.log(`│ P99:               ${this.formatLatency(perf.p99ResponseTime)}`);

        // Tokens
        console.log('│');
        console.log(`│ Total Tokens:      ${perf.totalTokens.toLocaleString()}`);
        console.log(`│ Avg/Request:       ${perf.avgTokensPerRequest.toFixed(0)}`);

        console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    /**
     * Render cost metrics
     */
    private renderCost(): void {
        const cost = this.metricsCollector.getCostMetrics();

        console.log('┌─ COSTS ─────────────────────────────────────────────────────┐');

        console.log(`│ Total Cost:        $${cost.totalCost.toFixed(4)}`);
        console.log(`│ Avg/Request:       $${cost.avgCostPerRequest.toFixed(6)}`);

        console.log('│');
        console.log(`│ Input Tokens:      ${cost.totalInputTokens.toLocaleString()} ($${cost.inputTokensCost.toFixed(4)})`);
        console.log(`│ Output Tokens:     ${cost.totalOutputTokens.toLocaleString()} ($${cost.outputTokensCost.toFixed(4)})`);

        // Cost by model
        if (Object.keys(cost.costByModel).length > 0) {
            console.log('│');
            console.log('│ By Model:');
            for (const [model, modelCost] of Object.entries(cost.costByModel)) {
                const modelName = this.truncate(model, 20);
                console.log(`│   ${modelName.padEnd(20)} $${modelCost.toFixed(6)}`);
            }
        }

        console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    /**
     * Render active alerts
     */
    private renderAlerts(): void {
        const alerts = this.metricsCollector.getAlerts();

        console.log('┌─ ACTIVE ALERTS ─────────────────────────────────────────────┐');

        if (alerts.length === 0) {
            console.log(`│ ${this.colors.green}✓ No active alerts${this.colors.reset}`);
        } else {
            for (const alert of alerts.slice(0, 5)) {
                const severityIcon = this.getSeverityIcon(alert.severity);
                const severityColor = this.getSeverityColor(alert.severity);
                console.log(`│ ${severityColor}${severityIcon} [${alert.severity.toUpperCase()}] ${alert.title}${this.colors.reset}`);
                console.log(`│   ${this.truncate(alert.description, 58)}`);
                console.log('│');
            }

            if (alerts.length > 5) {
                console.log(`│ ... and ${alerts.length - 5} more alerts`);
            }
        }

        console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    /**
     * Render recent audit logs
     */
    private renderAuditLogs(): void {
        const logs = this.metricsCollector.getAuditLogs(this.config.maxLogs);

        console.log('┌─ RECENT ACTIVITY ───────────────────────────────────────────┐');

        if (logs.length === 0) {
            console.log('│ No recent activity');
        } else {
            for (const log of logs.reverse()) {
                const levelIcon = this.getLogLevelIcon(log.level);
                const time = log.timestamp.toLocaleTimeString();
                console.log(`│ ${levelIcon} [${time}] ${log.component}.${log.operation}`);
                console.log(`│   ${this.truncate(log.message, 58)}`);
                console.log('│');
            }
        }

        console.log('└─────────────────────────────────────────────────────────────┘\n');
    }

    /**
     * Get status icon
     */
    private getStatusIcon(status: string): string {
        switch (status) {
            case 'healthy':
                return '✓';
            case 'degraded':
                return '⚠';
            case 'unhealthy':
                return '✗';
            default:
                return '?';
        }
    }

    /**
     * Get status color
     */
    private getStatusColor(status: string): string {
        switch (status) {
            case 'healthy':
                return this.colors.green;
            case 'degraded':
                return this.colors.yellow;
            case 'unhealthy':
                return this.colors.red;
            default:
                return this.colors.reset;
        }
    }

    /**
     * Get component status string
     */
    private getComponentStatus(component: { status: string; latency?: number }): string {
        const icon = component.status === 'up' ? '●' : component.status === 'degraded' ? '◐' : '○';
        const color =
            component.status === 'up'
                ? this.colors.green
                : component.status === 'degraded'
                  ? this.colors.yellow
                  : this.colors.red;

        let statusStr = `${color}${icon} ${component.status}${this.colors.reset}`;

        if (component.latency) {
            statusStr += ` (${component.latency.toFixed(0)}ms)`;
        }

        return statusStr;
    }

    /**
     * Get severity icon
     */
    private getSeverityIcon(severity: Alert['severity']): string {
        switch (severity) {
            case 'low':
                return 'ℹ';
            case 'medium':
                return '⚠';
            case 'high':
                return '⚠';
            case 'critical':
                return '🚨';
            default:
                return '?';
        }
    }

    /**
     * Get severity color
     */
    private getSeverityColor(severity: Alert['severity']): string {
        switch (severity) {
            case 'low':
                return this.colors.blue;
            case 'medium':
                return this.colors.yellow;
            case 'high':
                return this.colors.orange;
            case 'critical':
                return this.colors.red;
            default:
                return this.colors.reset;
        }
    }

    /**
     * Get log level icon
     */
    private getLogLevelIcon(level: string): string {
        switch (level) {
            case 'info':
                return 'ℹ';
            case 'warning':
                return '⚠';
            case 'error':
                return '✗';
            case 'critical':
                return '🚨';
            default:
                return '·';
        }
    }

    /**
     * Format duration
     */
    private formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds.toFixed(0)}s`;
        } else if (seconds < 3600) {
            return `${(seconds / 60).toFixed(1)}m`;
        } else {
            return `${(seconds / 3600).toFixed(1)}h`;
        }
    }

    /**
     * Format latency
     */
    private formatLatency(ms: number): string {
        if (ms < 1000) {
            return `${ms.toFixed(0)}ms`;
        } else {
            return `${(ms / 1000).toFixed(2)}s`;
        }
    }

    /**
     * Format percentage
     */
    private formatPercentage(value: number): string {
        return `${(value * 100).toFixed(1)}%`;
    }

    /**
     * Truncate string
     */
    private truncate(str: string, maxLength: number): string {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength - 3) + '...';
    }

    /**
     * Terminal colors
     */
    private colors = {
        reset: '\x1b[0m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        red: '\x1b[31m',
        blue: '\x1b[34m',
        orange: '\x1b[38;5;208m',
    };
}
