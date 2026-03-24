/**
 * GSEP Real-Time Dashboard Demo
 *
 * See your agent evolving in real-time. One line.
 *
 * Usage:
 *   GSEP_MARKETPLACE_API_KEY=gsep_mk_xxx npx tsx examples/dashboard-demo.ts
 */

import { GSEP, InMemoryStorageAdapter, GeneBank, InMemoryGeneStorage } from '../packages/core/src/index.js';

const mockLLM = {
    model: 'mock-model',
    chat: async () => ({
        content: 'Hello! I am evolving with GSEP.',
        usage: { inputTokens: 100, outputTokens: 50 },
    }),
};

async function main() {
    const geneBank = new GeneBank(
        new InMemoryGeneStorage(),
        { tenantId: 'gsep-core', agentId: 'dashboard-demo' },
    );

    const gsep = new GSEP({
        llm: mockLLM as never,
        storage: new InMemoryStorageAdapter(),
        geneBank,
        marketplace: {
            apiKey: process.env.GSEP_MARKETPLACE_API_KEY,
            url: 'https://market.gsepcore.com/v1',
        },
    });
    const genome = await gsep.createGenome({ name: 'my-agent' });

    // One line — dashboard is live
    await genome.startDashboard();

    // Simulate conversations — watch the dashboard update
    for (let i = 1; i <= 20; i++) {
        console.log(`  💬 Chat #${i}...`);
        try {
            await genome.chat(`Question ${i}`, { userId: 'me', taskType: 'general' });
        } catch { /* mock LLM */ }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n✅ Done. Dashboard still running. Ctrl+C to stop.');
}

main().catch(console.error);
