/**
 * Production Monitoring Dashboard Demo
 *
 * Demonstrates how to monitor Evolution Guardrails and economic metrics
 * in a production GSEP deployment.
 *
 * Living OS v1.0 Must-Have: Real-time production monitoring
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-27
 */

import { GSEP, type EvolutionGuardrails } from '../packages/core/src/index.js';
import { ClaudeAdapter } from '../packages/adapters-llm/anthropic/src/index.js';
import { PostgresAdapter } from '../packages/adapters-storage/postgres/src/index.js';

async function productionMonitoringDemo() {
    // ═══════════════════════════════════════════════════════
    // SETUP: Initialize GSEP with production configuration
    // ═══════════════════════════════════════════════════════

    const gsep = new GSEP({
        llm: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY || 'demo-key',
        }),
        storage: new PostgresAdapter({
            connectionString: process.env.DATABASE_URL || 'postgres://localhost/gsep',
        }),
        config: {
            enableSandbox: true,
            mutationRate: 'balanced',
        },
    });

    await gsep.initialize();

    // ═══════════════════════════════════════════════════════
    // CREATE GENOME: With custom Evolution Guardrails
    // ═══════════════════════════════════════════════════════

    const customGuardrails: EvolutionGuardrails = {
        minQualityScore: 0.70,
        minSandboxScore: 0.80,
        minCompressionScore: 0.70,
        maxCostPerTask: 0.05,
        minStabilityWindow: 20,
        maxRollbackRate: 0.15,
        gateMode: 'AND',
    };

    const genome = await gsep.createGenome({
        name: 'production-agent',
        config: {
            evolutionGuardrails: customGuardrails,
            mutationRate: 'slow',
        },
    });

    console.log('🧬 Production Genome Created:', genome.id);
    console.log('\n📊 Evolution Guardrails Report:');
    console.log(genome.getGuardrailsReport());

    // Test mutation with gate validation
    const result = await genome.mutate({
        operators: ['compress_instructions'],
        layer: 2,
    });

    console.log('\n🛡️ Mutation Result:', result);
}

export { productionMonitoringDemo };
