/**
 * GSEP Quickstart — Your first self-evolving agent in 5 lines.
 *
 * Without API key (free demo):
 *   npx tsx examples/quickstart-demo.ts
 *
 * With a real LLM:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/quickstart-demo.ts
 *   OPENAI_API_KEY=sk-...       npx tsx examples/quickstart-demo.ts
 */

// In your project: import { GSEP } from '@gsep/core';
import { GSEP } from '../packages/core/src/index.js';

async function main() {
    const agent = await GSEP.quickStart({
        name: 'my-first-agent',
        dashboardPort: 0, // disable dashboard for this demo
    });

    const ctx = { userId: 'demo-user', taskType: 'general' };

    console.log('\n--- Chat 1 ---');
    const reply1 = await agent.chat('What can you do?', ctx);
    console.log(reply1);

    console.log('\n--- Chat 2 ---');
    const reply2 = await agent.chat('Write a haiku about programming', ctx);
    console.log(reply2);

    console.log('\n--- Chat 3 ---');
    const reply3 = await agent.chat('Explain recursion in one sentence', ctx);
    console.log(reply3);

    // Show what GSEP tracked
    const exported = await agent.export();
    console.log(`\n--- GSEP Status ---`);
    console.log(`Agent: ${exported.name}`);
    console.log(`Interactions: ${exported.interactions ?? 0}`);
    console.log(`Active genes: ${exported.layers?.layer1?.filter((g: { status: string }) => g.status === 'active').length ?? 0}`);
    console.log(`\nGSEP ran its full 32-step pipeline on every call above.`);
    console.log(`Add an API key to see real AI responses + prompt evolution.\n`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
