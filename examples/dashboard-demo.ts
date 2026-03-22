/**
 * GSEP Real-Time Dashboard Demo
 *
 * Shows how to enable per-user live dashboards for your GSEP-powered agent.
 * Each user gets their own dashboard URL that streams evolution data in real-time.
 *
 * Usage:
 *   npx tsx examples/dashboard-demo.ts
 *
 * Then open the printed URL in your browser.
 */

import { PGA, DashboardServer, DashboardTokenHelper, InMemoryStorageAdapter } from '@pga-ai/core';

// ─── Mock LLM (replace with your real adapter) ──────────
const mockLLM = {
    model: 'mock-model',
    chat: async () => ({
        content: 'Hello! I am your GSEP-powered agent.',
        usage: { inputTokens: 100, outputTokens: 50 },
    }),
};

async function main() {
    const storage = new InMemoryStorageAdapter();

    // 1. Create GSEP instance and genome
    const gsep = new PGA({ llm: mockLLM as never, storage });
    const genome = await gsep.createGenome({ name: 'dashboard-demo-agent' });

    // 2. Start dashboard server (binds to port 4200)
    const dashboard = new DashboardServer({
        secret: 'my-dashboard-secret-change-in-production',
        events: genome.getEventEmitter(),
        port: 4200,
    });

    await dashboard.start();
    console.log('🧬 GSEP Dashboard Server running on port 4200\n');

    // 3. Generate a per-user token (your app does this for each user)
    const token = DashboardTokenHelper.create(
        'my-dashboard-secret-change-in-production',
        {
            userId: 'demo-user-1',
            genomeId: genome.id,
            expiresIn: '24h',
        },
    );

    console.log('📊 Open this URL in your browser:\n');
    console.log(`   http://localhost:4200/gsep/dashboard?token=${token}\n`);
    console.log('─────────────────────────────────────────────────');
    console.log('Simulating chat interactions... Watch the dashboard update!\n');

    // 4. Simulate some chat interactions
    for (let i = 1; i <= 10; i++) {
        console.log(`  💬 Chat #${i}...`);
        try {
            await genome.chat(`Tell me about topic ${i}`, {
                userId: 'demo-user-1',
                taskType: 'general',
            });
        } catch {
            // Mock LLM may throw — that's OK for demo
        }
        await sleep(1500);
    }

    console.log('\n✅ Demo complete. Dashboard server still running.');
    console.log('   Press Ctrl+C to stop.\n');
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
