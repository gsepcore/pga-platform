/**
 * GSEP Basic Usage — Complete walkthrough
 *
 * Demonstrates:
 * 1. Initialize with GSEP.quickStart() (auto-detects provider)
 * 2. Chat through the evolving genome
 * 3. See learning announcements and fitness tracking
 * 4. Export genome status
 *
 * Without API key (free mock mode):
 *   npx tsx examples/basic-usage.ts
 *
 * With a real LLM:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/basic-usage.ts
 *   OPENAI_API_KEY=sk-...       npx tsx examples/basic-usage.ts
 */

// In your project: import { GSEP } from '@gsep/core';
import { GSEP } from '../packages/core/src/index.js';

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  GSEP Basic Usage — Self-Evolving Agent');
    console.log('═══════════════════════════════════════════\n');

    // ── Step 1: Initialize ──────────────────────────────
    // quickStart() auto-detects your LLM provider from env vars.
    // No API key? It runs with a mock LLM so you can see the pipeline.

    const agent = await GSEP.quickStart({
        name: 'basic-demo',
        dashboardPort: 0,
    });

    console.log('\n── Step 2: Chat through the genome ──\n');

    const ctx = { userId: 'user-123', taskType: 'support' };

    // First interaction
    console.log('📩 User: My app keeps crashing when I click submit');
    const reply1 = await agent.chat('My app keeps crashing when I click the submit button', ctx);
    console.log('🤖 Agent:', reply1, '\n');

    // Second interaction — GSEP adapts to the user
    console.log('📩 User: I already tried clearing the cache');
    const reply2 = await agent.chat('I already tried clearing the cache, that did not work', ctx);
    console.log('🤖 Agent:', reply2, '\n');

    // Third interaction
    console.log('📩 User: It works now, thanks!');
    const reply3 = await agent.chat('It works now, thanks for the help!', ctx);
    console.log('🤖 Agent:', reply3, '\n');

    // ── Step 3: See what GSEP learned ───────────────────

    console.log('── Step 3: Genome status ──\n');

    const exported = await agent.export();
    const activeGenes = exported.layers?.layer1?.filter(
        (g: { status: string }) => g.status === 'active',
    ) ?? [];

    console.log(`Agent: ${exported.name}`);
    console.log(`Genome: ${exported.id?.slice(0, 20)}...`);
    console.log(`C0 (immutable): ${exported.layers?.layer0?.length ?? 0} genes`);
    console.log(`C1 (operative): ${activeGenes.length} active genes`);
    console.log(`C2 (epigenomes): ${exported.layers?.layer2?.length ?? 0} genes`);

    if (activeGenes.length > 0) {
        console.log('\nActive C1 genes:');
        for (const gene of activeGenes) {
            const g = gene as { gene: string; fitness: number };
            console.log(`  • ${g.gene}: fitness ${g.fitness.toFixed(2)}`);
        }
    }

    // ── Step 4: Weekly report ───────────────────────────

    console.log('\n── Step 4: Weekly report ──\n');

    const report = agent.generateWeeklyReport();
    console.log(`Quality: ${(report.quality.endScore * 100).toFixed(0)}%`);
    console.log(`Trend: ${report.quality.trend}`);
    console.log(`Suggestions: ${report.suggestions.length > 0 ? report.suggestions[0] : 'None yet'}`);

    console.log('\n═══════════════════════════════════════════');
    console.log('  GSEP ran 32 steps per call: security,');
    console.log('  gene injection, PII scan, fitness,');
    console.log('  drift detection, and evolution check.');
    console.log('═══════════════════════════════════════════\n');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
