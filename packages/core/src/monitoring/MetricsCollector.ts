/**
 * Metrics Collector for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Collects and aggregates performance metrics, costs, and health data.
 */

export interface PerformanceMetrics {
    /**
     * Average response time in milliseconds
     */
    avgResponseTime: number;

    /**
     * 95th percentile response time
     */
    p95ResponseTime: number;

    /**
     * 99th percentile response time
     */
    p99ResponseTime: number;

    /**
     * Total number of requests
     */
    totalRequests: number;

    /**
     * Number of successful requests
     */
    successfulRequests: number;

    /**
     * Number of failed requests
     */
    failedRequests: number;

    /**
     * Success rate (0-1)
     */
    successRate: number;

    /**
     * Average tokens per request
     */
    avgTokensPerRequest: number;

    /**
     * Total tokens used
     */
    totalTokens: number;

    /**
     * Timestamp of metrics collection
     */
    timestamp: Date;
}

export interface CostMetrics {
    /**
     * Total cost in USD
     */
    totalCost: number;

    /**
     * Input tokens cost
     */
    inputTokensCost: number;

    /**
     * Output tokens cost
     */
    outputTokensCost: number;

    /**
     * Average cost per request
     */
    avgCostPerRequest: number;

    /**
     * Total input tokens
     */
    totalInputTokens: number;

    /**
     * Total output tokens
     */
    totalOutputTokens: number;

    /**
     * Cost by model
     */
    costByModel: Record<string, number>;

    /**
     * Timestamp
     */
    timestamp: Date;
}

export interface HealthStatus {
    /**
     * Overall health status
     */
    status: 'healthy' | 'degraded' | 'unhealthy';

    /**
     * Component health checks
     */
    components: {
        llm: ComponentHealth;
        storage: ComponentHealth;
        genome: ComponentHealth;
    };

    /**
     * Uptime in seconds
     */
    uptime: number;

    /**
     * Memory usage in MB
     */
    memoryUsage: number;

    /**
     * Timestamp
     */
    timestamp: Date;
}

export interface ComponentHealth {
    status: 'up' | 'down' | 'degraded';
    latency?: number;
    errorRate?: number;
    lastCheck: Date;
    message?: string;
}

export interface AuditLog {
    /**
     * Unique log ID
     */
    id: string;

    /**
     * Timestamp
     */
    timestamp: Date;

    /**
     * Log level
     */
    level: 'info' | 'warning' | 'error' | 'critical';

    /**
     * Component that generated the log
     */
    component: string;

    /**
     * Operation type
     */
    operation: string;

    /**
     * User ID (if applicable)
     */
    userId?: string;

    /**
     * Genome ID (if applicable)
     */
    genomeId?: string;

    /**
     * Log message
     */
    message: string;

    /**
     * Additional metadata
     */
    metadata?: Record<string, unknown>;

    /**
     * Duration in milliseconds (if applicable)
     */
    duration?: number;

    /**
     * Error details (if applicable)
     */
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

export interface Alert {
    /**
     * Alert ID
     */
    id: string;

    /**
     * Alert severity
     */
    severity: 'low' | 'medium' | 'high' | 'critical';

    /**
     * Alert type
     */
    type: 'performance' | 'cost' | 'error' | 'health';

    /**
     * Alert title
     */
    title: string;

    /**
     * Alert description
     */
    description: string;

    /**
     * Timestamp
     */
    timestamp: Date;

    /**
     * Resolved flag
     */
    resolved: boolean;

    /**
     * Related metrics
     */
    metrics?: Record<string, number>;
}

/**
 * Metrics Collector Configuration
 */
export interface MetricsCollectorConfig {
    /**
     * Enable metrics collection
     * @default true
     */
    enabled?: boolean;

    /**
     * Metrics retention period in days
     * @default 30
     */
    retentionDays?: number;

    /**
     * Enable cost tracking
     * @default true
     */
    enableCostTracking?: boolean;

    /**
     * Enable audit logging
     * @default true
     */
    enableAuditLogs?: boolean;

    /**
     * Cost per 1M input tokens by model (USD)
     */
    costPerMillionInputTokens?: Record<string, number>;

    /**
     * Cost per 1M output tokens by model (USD)
     */
    costPerMillionOutputTokens?: Record<string, number>;

    /**
     * Alert thresholds
     */
    alertThresholds?: {
        maxCostPerHour?: number;
        maxErrorRate?: number;
        maxP95Latency?: number;
        maxMemoryUsageMB?: number;
    };
}

/**
 * Request Metrics (tracked per request)
 */
interface RequestMetrics {
    requestId: string;
    timestamp: Date;
    duration: number;
    success: boolean;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    error?: string;
}

/**
 * Metrics Collector
 *
 * Collects and aggregates metrics from PGA operations.
 */
export class MetricsCollector {
    private config: Required<MetricsCollectorConfig>;
    private requestMetrics: RequestMetrics[] = [];
    private auditLogs: AuditLog[] = [];
    private alerts: Alert[] = [];
    private startTime: Date;

    // Default pricing (Claude Sonnet 3.5)
    private static readonly DEFAULT_COSTS = {
        inputTokens: {
            'claude-sonnet-4.5': 3.0,
            'claude-opus-4': 15.0,
            'claude-haiku-3': 0.25,
            'gpt-4-turbo-preview': 10.0,
            'gpt-4': 30.0,
            'gpt-3.5-turbo': 0.5,
        },
        outputTokens: {
            'claude-sonnet-4.5': 15.0,
            'claude-opus-4': 75.0,
            'claude-haiku-3': 1.25,
            'gpt-4-turbo-preview': 30.0,
            'gpt-4': 60.0,
            'gpt-3.5-turbo': 1.5,
        },
    };

    constructor(config: MetricsCollectorConfig = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            retentionDays: config.retentionDays ?? 30,
            enableCostTracking: config.enableCostTracking ?? true,
            enableAuditLogs: config.enableAuditLogs ?? true,
            costPerMillionInputTokens:
                config.costPerMillionInputTokens ||
                MetricsCollector.DEFAULT_COSTS.inputTokens,
            costPerMillionOutputTokens:
                config.costPerMillionOutputTokens ||
                MetricsCollector.DEFAULT_COSTS.outputTokens,
            alertThresholds: {
                maxCostPerHour: config.alertThresholds?.maxCostPerHour ?? 100,
                maxErrorRate: config.alertThresholds?.maxErrorRate ?? 0.1,
                maxP95Latency: config.alertThresholds?.maxP95Latency ?? 5000,
                maxMemoryUsageMB: config.alertThresholds?.maxMemoryUsageMB ?? 1000,
            },
        };

        this.startTime = new Date();
    }

    /**
     * Record a request
     */
    recordRequest(data: {
        requestId: string;
        duration: number;
        success: boolean;
        model: string;
        inputTokens: number;
        outputTokens: number;
        error?: string;
    }): void {
        if (!this.config.enabled) return;

        const cost = this.calculateCost(data.model, data.inputTokens, data.outputTokens);

        const metrics: RequestMetrics = {
            requestId: data.requestId,
            timestamp: new Date(),
            duration: data.duration,
            success: data.success,
            model: data.model,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            cost,
            error: data.error,
        };

        this.requestMetrics.push(metrics);

        // Cleanup old metrics
        this.cleanupOldMetrics();

        // Check alerts
        this.checkAlerts();
    }

    /**
     * Calculate cost for tokens
     */
    private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
        if (!this.config.enableCostTracking) return 0;

        const inputCostPerMillion = this.config.costPerMillionInputTokens[model] || 3.0;
        const outputCostPerMillion = this.config.costPerMillionOutputTokens[model] || 15.0;

        const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
        const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;

        return inputCost + outputCost;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        const durations = this.requestMetrics.map(m => m.duration).sort((a, b) => a - b);

        const avgResponseTime =
            durations.length > 0
                ? durations.reduce((sum, d) => sum + d, 0) / durations.length
                : 0;

        const p95Index = Math.floor(durations.length * 0.95);
        const p99Index = Math.floor(durations.length * 0.99);

        const successfulRequests = this.requestMetrics.filter(m => m.success).length;
        const failedRequests = this.requestMetrics.length - successfulRequests;

        const totalTokens = this.requestMetrics.reduce(
            (sum, m) => sum + m.inputTokens + m.outputTokens,
            0
        );

        return {
            avgResponseTime,
            p95ResponseTime: durations[p95Index] || 0,
            p99ResponseTime: durations[p99Index] || 0,
            totalRequests: this.requestMetrics.length,
            successfulRequests,
            failedRequests,
            successRate:
                this.requestMetrics.length > 0
                    ? successfulRequests / this.requestMetrics.length
                    : 1,
            avgTokensPerRequest:
                this.requestMetrics.length > 0
                    ? totalTokens / this.requestMetrics.length
                    : 0,
            totalTokens,
            timestamp: new Date(),
        };
    }

    /**
     * Get cost metrics
     */
    getCostMetrics(): CostMetrics {
        const totalInputTokens = this.requestMetrics.reduce(
            (sum, m) => sum + m.inputTokens,
            0
        );
        const totalOutputTokens = this.requestMetrics.reduce(
            (sum, m) => sum + m.outputTokens,
            0
        );
        const totalCost = this.requestMetrics.reduce((sum, m) => sum + m.cost, 0);

        const costByModel: Record<string, number> = {};
        for (const metric of this.requestMetrics) {
            costByModel[metric.model] = (costByModel[metric.model] || 0) + metric.cost;
        }

        return {
            totalCost,
            inputTokensCost: this.requestMetrics.reduce((sum, m) => {
                const costPerMillion =
                    this.config.costPerMillionInputTokens[m.model] || 3.0;
                return sum + (m.inputTokens / 1_000_000) * costPerMillion;
            }, 0),
            outputTokensCost: this.requestMetrics.reduce((sum, m) => {
                const costPerMillion =
                    this.config.costPerMillionOutputTokens[m.model] || 15.0;
                return sum + (m.outputTokens / 1_000_000) * costPerMillion;
            }, 0),
            avgCostPerRequest:
                this.requestMetrics.length > 0
                    ? totalCost / this.requestMetrics.length
                    : 0,
            totalInputTokens,
            totalOutputTokens,
            costByModel,
            timestamp: new Date(),
        };
    }

    /**
     * Get health status
     */
    getHealthStatus(): HealthStatus {
        const perfMetrics = this.getPerformanceMetrics();
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        // Determine component health
        const llmHealth: ComponentHealth = {
            status: perfMetrics.successRate >= 0.95 ? 'up' : 'degraded',
            latency: perfMetrics.avgResponseTime,
            errorRate: 1 - perfMetrics.successRate,
            lastCheck: new Date(),
        };

        const storageHealth: ComponentHealth = {
            status: 'up',
            lastCheck: new Date(),
        };

        const genomeHealth: ComponentHealth = {
            status: 'up',
            lastCheck: new Date(),
        };

        // Determine overall status
        if (
            llmHealth.status === 'degraded' ||
            storageHealth.status === 'degraded' ||
            genomeHealth.status === 'degraded'
        ) {
            overallStatus = 'degraded';
        }

        if (
            llmHealth.status === 'down' ||
            storageHealth.status === 'down' ||
            genomeHealth.status === 'down'
        ) {
            overallStatus = 'unhealthy';
        }

        return {
            status: overallStatus,
            components: {
                llm: llmHealth,
                storage: storageHealth,
                genome: genomeHealth,
            },
            uptime: (Date.now() - this.startTime.getTime()) / 1000,
            memoryUsage,
            timestamp: new Date(),
        };
    }

    /**
     * Log an audit event
     */
    logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
        if (!this.config.enableAuditLogs) return;

        const auditLog: AuditLog = {
            ...log,
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
        };

        this.auditLogs.push(auditLog);

        // Cleanup old logs
        this.cleanupOldLogs();
    }

    /**
     * Get recent audit logs
     */
    getAuditLogs(limit: number = 100): AuditLog[] {
        return this.auditLogs.slice(-limit);
    }

    /**
     * Get active alerts
     */
    getAlerts(): Alert[] {
        return this.alerts.filter(a => !a.resolved);
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
        }
    }

    /**
     * Check for alert conditions
     */
    private checkAlerts(): void {
        const perfMetrics = this.getPerformanceMetrics();
        const healthStatus = this.getHealthStatus();
        const thresholds = this.config.alertThresholds;

        // Check error rate
        const maxErrorRate = thresholds.maxErrorRate ?? 0.1;
        if (perfMetrics.successRate < 1 - maxErrorRate) {
            this.createAlert({
                severity: 'high',
                type: 'error',
                title: 'High Error Rate',
                description: `Error rate is ${((1 - perfMetrics.successRate) * 100).toFixed(1)}%, exceeding threshold of ${(maxErrorRate * 100).toFixed(1)}%`,
                metrics: { errorRate: 1 - perfMetrics.successRate },
            });
        }

        // Check latency
        const maxP95Latency = thresholds.maxP95Latency ?? 5000;
        if (perfMetrics.p95ResponseTime > maxP95Latency) {
            this.createAlert({
                severity: 'medium',
                type: 'performance',
                title: 'High Latency',
                description: `P95 latency is ${perfMetrics.p95ResponseTime.toFixed(0)}ms, exceeding threshold of ${maxP95Latency}ms`,
                metrics: { p95Latency: perfMetrics.p95ResponseTime },
            });
        }

        // Check memory usage
        const maxMemoryUsageMB = thresholds.maxMemoryUsageMB ?? 1000;
        if (healthStatus.memoryUsage > maxMemoryUsageMB) {
            this.createAlert({
                severity: 'high',
                type: 'health',
                title: 'High Memory Usage',
                description: `Memory usage is ${healthStatus.memoryUsage.toFixed(0)}MB, exceeding threshold of ${maxMemoryUsageMB}MB`,
                metrics: { memoryUsage: healthStatus.memoryUsage },
            });
        }

        // Check hourly cost
        const hourlyMetrics = this.requestMetrics.filter(
            m => Date.now() - m.timestamp.getTime() < 3600000
        );
        const hourlyCost = hourlyMetrics.reduce((sum, m) => sum + m.cost, 0);
        const maxCostPerHour = thresholds.maxCostPerHour ?? 100;

        if (hourlyCost > maxCostPerHour) {
            this.createAlert({
                severity: 'critical',
                type: 'cost',
                title: 'High Cost Rate',
                description: `Hourly cost is $${hourlyCost.toFixed(2)}, exceeding threshold of $${maxCostPerHour.toFixed(2)}`,
                metrics: { hourlyCost },
            });
        }
    }

    /**
     * Create a new alert
     */
    private createAlert(
        data: Omit<Alert, 'id' | 'timestamp' | 'resolved'>
    ): void {
        // Check if similar alert already exists and is unresolved
        const existingAlert = this.alerts.find(
            a => !a.resolved && a.type === data.type && a.title === data.title
        );

        if (existingAlert) return;

        const alert: Alert = {
            ...data,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            resolved: false,
        };

        this.alerts.push(alert);
    }

    /**
     * Cleanup old metrics
     */
    private cleanupOldMetrics(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

        this.requestMetrics = this.requestMetrics.filter(
            m => m.timestamp > cutoffDate
        );
    }

    /**
     * Cleanup old logs
     */
    private cleanupOldLogs(): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

        this.auditLogs = this.auditLogs.filter(l => l.timestamp > cutoffDate);
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.requestMetrics = [];
        this.auditLogs = [];
        this.alerts = [];
        this.startTime = new Date();
    }

    /**
     * Export metrics to JSON
     */
    exportMetrics(): {
        performance: PerformanceMetrics;
        cost: CostMetrics;
        health: HealthStatus;
        alerts: Alert[];
        auditLogs: AuditLog[];
    } {
        return {
            performance: this.getPerformanceMetrics(),
            cost: this.getCostMetrics(),
            health: this.getHealthStatus(),
            alerts: this.getAlerts(),
            auditLogs: this.getAuditLogs(),
        };
    }
}
