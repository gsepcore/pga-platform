/**
 * GSEP with Integrated Monitoring — Production Example
 *
 * Demonstrates how to use GSEP with built-in monitoring and dashboard
 * in a production environment.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-28
 */

import { GSEP } from '../packages/core/src/GSEP.js';

// Mock adapters for demonstration
class MockLLMAdapter {
    async chat(messages: Array<{ role: string; content: string }>) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            content: `Response to: ${messages[messages.length - 1].content}`,
            usage: { inputTokens: 100, outputTokens: 200 },
        };
    }
}

class MockStorageAdapter {
    private data: Map<string, any> = new Map();

    async initialize() {
        console.log('📦 Storage initialized');
    }

    async saveGenome(genome: any) {
        this.data.set(genome.id, genome);
    }

    async loadGenome(id: string) {
        return this.data.get(id) || null;
    }

    async listGenomes() {
        return Array.from(this.data.values());
    }

    async deleteGenome(id: string) {
        this.data.delete(id);
    }

    async recordInteraction(interaction: any) {
        // Store interaction
    }

    async recordFeedback(feedback: any) {
        // Store feedback
    }

    async logMutation(log: any) {
        // Store mutation log
    }

    async getAnalytics(genomeId: string) {
        return {
            totalInteractions: 100,
            totalMutations: 5,
            avgFitnessImprovement: 0.05,
            userSatisfaction: 0.75,
        };
    }
}

/**
 * Production setup with full monitoring
 */
async function productionExample() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  GSEP WITH INTEGRATED MONITORING — Production Setup          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════════════════
    // STEP 1: Initialize GSEP with Monitoring Configuration
    // ═══════════════════════════════════════════════════════

    console.log('🚀 Initializing GSEP with monitoring...\n');

    const gsep = new GSEP({
        llm: new MockLLMAdapter() as any,
        storage: new MockStorageAdapter() as any,

        // Monitoring configuration
        monitoring: {
            enabled: true,
            enableCostTracking: true,
            enableAuditLogs: true,
            retentionDays: 30,
            alertThresholds: {
                maxCostPerHour: 100, // Alert if hourly cost > $100
                maxErrorRate: 0.05, // Alert if error rate > 5%
                maxP95Latency: 3000, // Alert if P95 latency > 3s
                maxMemoryUsageMB: 512, // Alert if memory > 512MB
            },
        },

        // Dashboard configuration
        dashboard: {
            enabled: true, // Enable real-time dashboard
            refreshInterval: 2000, // Refresh every 2 seconds
            showPerformance: true,
            showCost: true,
            showHealth: true,
            showAlerts: true,
            showAuditLogs: true,
            maxLogs: 5,
        },
    });

    // Initialize GSEP (also starts dashboard if enabled)
    await gsep.initialize();

    console.log('✓ GSEP initialized with monitoring enabled');
    console.log('✓ Dashboard started (refreshing every 2s)\n');

    // ═══════════════════════════════════════════════════════
    // STEP 2: Create Genome with Monitoring
    // ═══════════════════════════════════════════════════════

    console.log('🧬 Creating genome...\n');

    const genome = await gsep.createGenome({
        name: 'production-agent',
        config: {
            mutationRate: 'balanced',
            enableSandbox: true,
        },
    });

    console.log(`✓ Genome created: ${genome.id}\n`);

    // ═══════════════════════════════════════════════════════
    // STEP 3: Simulate Production Traffic
    // ═══════════════════════════════════════════════════════

    console.log('📊 Simulating production traffic...\n');

    // Simulate 20 requests
    for (let i = 1; i <= 20; i++) {
        try {
            const response = await genome.chat(
                `Request ${i}: What is the capital of France?`,
                { userId: `user_${i % 5}`, taskType: 'general' }
            );

            console.log(`   [${i}/20] Request completed successfully`);

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`   [${i}/20] Request failed:`, error);
        }
    }

    console.log('\n✓ Traffic simulation complete\n');

    // ═══════════════════════════════════════════════════════
    // STEP 4: Check Real-Time Metrics
    // ═══════════════════════════════════════════════════════

    console.log('📈 Current metrics:\n');

    const metrics = gsep.getMetrics();
    const performance = metrics.getPerformanceMetrics();
    const cost = metrics.getCostMetrics();
    const health = metrics.getHealthStatus();
    const alerts = metrics.getAlerts();

    console.log('Performance:');
    console.log(`  • Total Requests: ${performance.totalRequests}`);
    console.log(`  • Success Rate: ${(performance.successRate * 100).toFixed(1)}%`);
    console.log(`  • Avg Latency: ${performance.avgResponseTime.toFixed(0)}ms`);
    console.log(`  • P95 Latency: ${performance.p95ResponseTime.toFixed(0)}ms`);

    console.log('\nCost:');
    console.log(`  • Total Cost: $${cost.totalCost.toFixed(4)}`);
    console.log(`  • Avg/Request: $${cost.avgCostPerRequest.toFixed(6)}`);

    console.log('\nHealth:');
    console.log(`  • Status: ${health.status.toUpperCase()}`);
    console.log(`  • Uptime: ${health.uptime.toFixed(0)}s`);
    console.log(`  • Memory: ${health.memoryUsage.toFixed(1)}MB`);

    console.log('\nAlerts:');
    if (alerts.length === 0) {
        console.log('  ✓ No active alerts');
    } else {
        alerts.forEach(alert => {
            console.log(`  ⚠ [${alert.severity.toUpperCase()}] ${alert.title}`);
        });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5: Export Metrics for External Monitoring
    // ═══════════════════════════════════════════════════════

    console.log('\n📤 Exporting metrics for external systems...\n');

    const exportedMetrics = gsep.exportMetrics();

    console.log('Exported metrics structure:');
    console.log(`  • Performance: ${Object.keys(exportedMetrics.performance).length} fields`);
    console.log(`  • Cost: ${Object.keys(exportedMetrics.cost).length} fields`);
    console.log(`  • Health: ${Object.keys(exportedMetrics.health).length} fields`);
    console.log(`  • Alerts: ${exportedMetrics.alerts.length} active`);
    console.log(`  • Audit Logs: ${exportedMetrics.auditLogs.length} entries`);

    // Example: Send to external monitoring service
    // await sendToGrafana(exportedMetrics);
    // await sendToDatadog(exportedMetrics);

    // ═══════════════════════════════════════════════════════
    // STEP 6: Graceful Shutdown
    // ═══════════════════════════════════════════════════════

    console.log('\n🛑 Shutting down gracefully...\n');

    // Stop dashboard and log shutdown
    gsep.shutdown();

    console.log('✓ GSEP shutdown complete\n');

    // ═══════════════════════════════════════════════════════
    // PRODUCTION BEST PRACTICES
    // ═══════════════════════════════════════════════════════

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PRODUCTION BEST PRACTICES                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('1. Alert Configuration:');
    console.log('   • Set thresholds based on your SLA');
    console.log('   • Monitor cost limits to prevent runaway expenses');
    console.log('   • Track error rates for immediate incident response\n');

    console.log('2. Dashboard Usage:');
    console.log('   • Enable in development for debugging');
    console.log('   • Disable in production (use metrics export instead)');
    console.log('   • Access via separate admin endpoint if needed\n');

    console.log('3. Metrics Export:');
    console.log('   • Export to Grafana/Datadog for long-term storage');
    console.log('   • Set up periodic exports (every 1-5 minutes)');
    console.log('   • Correlate with application metrics\n');

    console.log('4. Audit Logs:');
    console.log('   • Use for debugging and compliance');
    console.log('   • Export to centralized logging (Elasticsearch, CloudWatch)');
    console.log('   • Set appropriate retention based on requirements\n');

    console.log('5. Performance Monitoring:');
    console.log('   • Track P95/P99 latency for SLA compliance');
    console.log('   • Monitor success rate for reliability');
    console.log('   • Alert on degradation trends\n');
}

/**
 * Example: Periodic Metrics Export (Production Pattern)
 */
async function periodicMetricsExport(gsepInstance: GSEP) {
    // Export metrics every 60 seconds
    setInterval(() => {
        const metrics = gsep.exportMetrics();

        // Send to your monitoring service
        console.log('📤 Exporting metrics:', {
            timestamp: new Date().toISOString(),
            totalRequests: metrics.performance.totalRequests,
            successRate: metrics.performance.successRate,
            totalCost: metrics.cost.totalCost,
            healthStatus: metrics.health.status,
            activeAlerts: metrics.alerts.length,
        });

        // Example integrations:
        // await sendToGrafana(metrics);
        // await sendToDatadog(metrics);
        // await sendToCloudWatch(metrics);
    }, 60000);
}

/**
 * Example: Alert Handler (Production Pattern)
 */
async function alertHandler(gsepInstance: GSEP) {
    // Check alerts every 30 seconds
    setInterval(() => {
        const alerts = gsep.getAlerts();

        for (const alert of alerts) {
            // Send notifications
            if (alert.severity === 'critical') {
                // sendToSlack(alert);
                // sendToEmail(alert);
                // sendToPagerDuty(alert);
            } else if (alert.severity === 'high') {
                // sendToSlack(alert);
            }

            console.log(`⚠️ Alert: [${alert.severity}] ${alert.title}`);
        }
    }, 30000);
}

// ─── Run Example ────────────────────────────────────────

productionExample().catch(console.error);
