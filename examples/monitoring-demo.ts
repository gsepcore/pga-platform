/**
 * PGA Monitoring & Observability Demo
 *
 * Demonstrates the enterprise-grade monitoring capabilities of PGA.
 *
 * @author Luis Alfredo Velasquez Duran (Germany, 2025)
 */

import { MetricsCollector } from '@pga/core';

// ─── Example 1: Basic Metrics Collection ───────────────────────

console.log('='.repeat(60));
console.log('PGA MONITORING & OBSERVABILITY DEMO');
console.log('='.repeat(60));
console.log();

// Create metrics collector with custom configuration
const metrics = new MetricsCollector({
    enabled: true,
    retentionDays: 7,
    enableCostTracking: true,
    enableAuditLogs: true,
    alertThresholds: {
        maxCostPerHour: 50, // Alert if cost exceeds $50/hour
        maxErrorRate: 0.05, // Alert if error rate exceeds 5%
        maxP95Latency: 3000, // Alert if P95 latency exceeds 3s
        maxMemoryUsageMB: 500, // Alert if memory exceeds 500MB
    },
});

console.log('✅ Metrics Collector initialized\n');

// ─── Example 2: Simulating Requests ────────────────────────────

console.log('📊 Simulating API requests...\n');

// Simulate successful requests
for (let i = 0; i < 50; i++) {
    metrics.recordRequest({
        requestId: `req_${i}`,
        duration: Math.random() * 2000 + 500, // 500-2500ms
        success: true,
        model: 'claude-sonnet-4.5',
        inputTokens: Math.floor(Math.random() * 1000) + 100,
        outputTokens: Math.floor(Math.random() * 2000) + 200,
    });
}

// Simulate some OpenAI requests
for (let i = 0; i < 20; i++) {
    metrics.recordRequest({
        requestId: `req_openai_${i}`,
        duration: Math.random() * 1500 + 300,
        success: true,
        model: 'gpt-4-turbo-preview',
        inputTokens: Math.floor(Math.random() * 800) + 100,
        outputTokens: Math.floor(Math.random() * 1500) + 150,
    });
}

// Simulate some failures
for (let i = 0; i < 3; i++) {
    metrics.recordRequest({
        requestId: `req_fail_${i}`,
        duration: Math.random() * 500,
        success: false,
        model: 'claude-sonnet-4.5',
        inputTokens: 100,
        outputTokens: 0,
        error: 'Rate limit exceeded',
    });
}

console.log('✅ Recorded 73 requests (70 successful, 3 failed)\n');

// ─── Example 3: Performance Metrics ─────────────────────────────

console.log('📈 PERFORMANCE METRICS');
console.log('-'.repeat(60));

const perfMetrics = metrics.getPerformanceMetrics();

console.log(`Total Requests:       ${perfMetrics.totalRequests}`);
console.log(`Successful:           ${perfMetrics.successfulRequests}`);
console.log(`Failed:               ${perfMetrics.failedRequests}`);
console.log(`Success Rate:         ${(perfMetrics.successRate * 100).toFixed(2)}%`);
console.log(`Avg Response Time:    ${perfMetrics.avgResponseTime.toFixed(0)}ms`);
console.log(`P95 Response Time:    ${perfMetrics.p95ResponseTime.toFixed(0)}ms`);
console.log(`P99 Response Time:    ${perfMetrics.p99ResponseTime.toFixed(0)}ms`);
console.log(`Total Tokens:         ${perfMetrics.totalTokens.toLocaleString()}`);
console.log(
    `Avg Tokens/Request:   ${perfMetrics.avgTokensPerRequest.toFixed(0)}`
);
console.log();

// ─── Example 4: Cost Tracking ───────────────────────────────────

console.log('💰 COST METRICS');
console.log('-'.repeat(60));

const costMetrics = metrics.getCostMetrics();

console.log(`Total Cost:           $${costMetrics.totalCost.toFixed(4)}`);
console.log(
    `Input Tokens Cost:    $${costMetrics.inputTokensCost.toFixed(4)}`
);
console.log(
    `Output Tokens Cost:   $${costMetrics.outputTokensCost.toFixed(4)}`
);
console.log(
    `Avg Cost/Request:     $${costMetrics.avgCostPerRequest.toFixed(4)}`
);
console.log(
    `Total Input Tokens:   ${costMetrics.totalInputTokens.toLocaleString()}`
);
console.log(
    `Total Output Tokens:  ${costMetrics.totalOutputTokens.toLocaleString()}`
);
console.log();
console.log('Cost by Model:');
for (const [model, cost] of Object.entries(costMetrics.costByModel)) {
    console.log(`  ${model.padEnd(25)} $${cost.toFixed(4)}`);
}
console.log();

// ─── Example 5: Health Monitoring ───────────────────────────────

console.log('🏥 HEALTH STATUS');
console.log('-'.repeat(60));

const health = metrics.getHealthStatus();

const statusEmoji = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌',
};

console.log(`Overall Status:       ${statusEmoji[health.status]} ${health.status.toUpperCase()}`);
console.log(`Uptime:               ${Math.floor(health.uptime)}s`);
console.log(`Memory Usage:         ${health.memoryUsage.toFixed(2)} MB`);
console.log();
console.log('Components:');
console.log(
    `  LLM:                ${health.components.llm.status === 'up' ? '✅' : '❌'} ${health.components.llm.status.toUpperCase()}`
);
console.log(
    `    Latency:          ${health.components.llm.latency?.toFixed(0)}ms`
);
console.log(
    `    Error Rate:       ${((health.components.llm.errorRate || 0) * 100).toFixed(2)}%`
);
console.log(
    `  Storage:            ${health.components.storage.status === 'up' ? '✅' : '❌'} ${health.components.storage.status.toUpperCase()}`
);
console.log(
    `  Genome:             ${health.components.genome.status === 'up' ? '✅' : '❌'} ${health.components.genome.status.toUpperCase()}`
);
console.log();

// ─── Example 6: Audit Logging ───────────────────────────────────

console.log('📝 AUDIT LOGS');
console.log('-'.repeat(60));

// Log some audit events
metrics.logAudit({
    level: 'info',
    component: 'genome',
    operation: 'create',
    userId: 'user-123',
    genomeId: 'genome-abc',
    message: 'Created new genome',
    duration: 125,
});

metrics.logAudit({
    level: 'info',
    component: 'mutation',
    operation: 'evolve',
    userId: 'user-123',
    genomeId: 'genome-abc',
    message: 'Evolved Layer 2 gene: response_style',
    duration: 342,
    metadata: {
        layer: 2,
        gene: 'response_style',
        fitnessDelta: 0.15,
    },
});

metrics.logAudit({
    level: 'warning',
    component: 'llm',
    operation: 'chat',
    userId: 'user-456',
    message: 'High latency detected',
    duration: 4523,
    metadata: {
        model: 'claude-sonnet-4.5',
        threshold: 3000,
    },
});

metrics.logAudit({
    level: 'error',
    component: 'llm',
    operation: 'chat',
    userId: 'user-789',
    message: 'Request failed',
    error: {
        name: 'RateLimitError',
        message: 'Rate limit exceeded',
    },
});

const logs = metrics.getAuditLogs(10);
console.log(`Recent logs (${logs.length}):\n`);

for (const log of logs) {
    const levelEmoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🔥',
    };

    console.log(`${levelEmoji[log.level]} [${log.level.toUpperCase()}] ${log.component}:${log.operation}`);
    console.log(`   ${log.message}`);
    if (log.duration) {
        console.log(`   Duration: ${log.duration}ms`);
    }
    if (log.error) {
        console.log(`   Error: ${log.error.name} - ${log.error.message}`);
    }
    console.log();
}

// ─── Example 7: Alerts ──────────────────────────────────────────

console.log('🚨 ACTIVE ALERTS');
console.log('-'.repeat(60));

const alerts = metrics.getAlerts();

if (alerts.length === 0) {
    console.log('✅ No active alerts\n');
} else {
    for (const alert of alerts) {
        const severityEmoji = {
            low: 'ℹ️',
            medium: '⚠️',
            high: '🔴',
            critical: '🔥',
        };

        console.log(
            `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}`
        );
        console.log(`   ${alert.description}`);
        console.log(`   Type: ${alert.type}`);
        console.log(
            `   Time: ${alert.timestamp.toLocaleTimeString()}`
        );
        if (alert.metrics) {
            console.log(`   Metrics: ${JSON.stringify(alert.metrics)}`);
        }
        console.log();
    }
}

// ─── Example 8: Full Export ─────────────────────────────────────

console.log('📦 FULL METRICS EXPORT');
console.log('-'.repeat(60));

const exportData = metrics.exportMetrics();

console.log('Exported data includes:');
console.log(`  ✅ Performance metrics (${exportData.performance.totalRequests} requests)`);
console.log(`  ✅ Cost metrics ($${exportData.cost.totalCost.toFixed(4)} total)`);
console.log(`  ✅ Health status (${exportData.health.status})`);
console.log(`  ✅ Alerts (${exportData.alerts.length} active)`);
console.log(`  ✅ Audit logs (${exportData.auditLogs.length} entries)`);
console.log();

console.log('Example: Save to file or send to monitoring service');
console.log('```typescript');
console.log("import fs from 'fs';");
console.log('const data = metrics.exportMetrics();');
console.log("fs.writeFileSync('metrics.json', JSON.stringify(data, null, 2));");
console.log('```');
console.log();

// ─── Example 9: Integration with PGA ────────────────────────────

console.log('🔄 INTEGRATION WITH PGA');
console.log('-'.repeat(60));

console.log(`
Example: Integrate metrics into your PGA instance

\`\`\`typescript
import { PGA, MetricsCollector } from '@pga/core';
import { ClaudeAdapter } from '@pga/adapters-llm-anthropic';

const metrics = new MetricsCollector({
  alertThresholds: {
    maxCostPerHour: 100,
    maxErrorRate: 0.05,
  },
});

const pga = new PGA({
  llmAdapter: new ClaudeAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),
});

// Wrap chat calls with metrics
const genome = await pga.createGenome({ name: 'monitored-agent' });

const startTime = Date.now();
try {
  const response = await genome.chat('Hello!', { userId: 'user-123' });

  metrics.recordRequest({
    requestId: crypto.randomUUID(),
    duration: Date.now() - startTime,
    success: true,
    model: 'claude-sonnet-4.5',
    inputTokens: response.usage?.inputTokens || 0,
    outputTokens: response.usage?.outputTokens || 0,
  });

  metrics.logAudit({
    level: 'info',
    component: 'genome',
    operation: 'chat',
    userId: 'user-123',
    genomeId: genome.id,
    message: 'Chat completed successfully',
    duration: Date.now() - startTime,
  });
} catch (error) {
  metrics.recordRequest({
    requestId: crypto.randomUUID(),
    duration: Date.now() - startTime,
    success: false,
    model: 'claude-sonnet-4.5',
    inputTokens: 0,
    outputTokens: 0,
    error: error.message,
  });

  metrics.logAudit({
    level: 'error',
    component: 'genome',
    operation: 'chat',
    userId: 'user-123',
    message: 'Chat failed',
    error: {
      name: error.name,
      message: error.message,
    },
  });
}

// Check metrics periodically
setInterval(() => {
  const health = metrics.getHealthStatus();
  if (health.status !== 'healthy') {
    console.error('Health degraded:', health);
  }

  const alerts = metrics.getAlerts();
  if (alerts.length > 0) {
    console.warn('Active alerts:', alerts);
  }
}, 60000); // Check every minute
\`\`\`
`);

console.log('='.repeat(60));
console.log('✅ Demo completed!');
console.log('='.repeat(60));
console.log();

console.log('Key Features:');
console.log('  ✅ Real-time performance tracking');
console.log('  ✅ Automatic cost calculation by model');
console.log('  ✅ Health monitoring with component status');
console.log('  ✅ Comprehensive audit logging');
console.log('  ✅ Configurable alerting system');
console.log('  ✅ Multi-model cost tracking (Claude + OpenAI)');
console.log('  ✅ P95/P99 latency metrics');
console.log('  ✅ Memory usage monitoring');
console.log('  ✅ Export to JSON for external monitoring');
console.log();

console.log('Next Steps:');
console.log('  • Integrate MetricsCollector into your PGA application');
console.log('  • Export metrics to your monitoring dashboard (Grafana, Datadog, etc.)');
console.log('  • Set up alert notifications (Slack, email, PagerDuty)');
console.log('  • Create custom dashboards for your specific use case');
console.log();
