/**
 * GSEP + Vercel AI SDK — Demo
 *
 * Shows GSEP's full pipeline running on a Vercel AI SDK model.
 * Run: OPENAI_API_KEY=sk-... npx tsx examples/vercel-ai-demo.ts
 */

import { generateText, wrapLanguageModel } from 'ai';
import { openai } from '@ai-sdk/openai';
// In your project: import { gsepMiddleware } from '@gsep/core/vercel-ai';
import { gsepMiddleware } from '../packages/core/src/adapters/vercel-ai.js';

async function main() {
    console.log('🧬 GSEP + Vercel AI SDK Demo\n');

    // 1. Create GSEP middleware
    console.log('Initializing GSEP...');
    const gsep = await gsepMiddleware({
        name: 'vercel-demo',
        dashboardPort: 4201, // Different port to avoid conflict with Genome
    });
    console.log('✅ GSEP initialized\n');

    // 2. Wrap any model with GSEP
    const model = wrapLanguageModel({
        model: openai('gpt-4o-mini'),
        middleware: gsep.middleware,
    });

    // 3. Send messages — GSEP pipeline runs automatically
    const questions = [
        'What is the capital of France?',
        'Write a function to check if a number is prime in TypeScript',
        'Explain quantum computing in simple terms',
    ];

    for (const question of questions) {
        console.log(`\n📤 User: ${question}`);
        const result = await generateText({
            model,
            prompt: question,
        });
        console.log(`📥 Agent: ${result.text.slice(0, 200)}...`);
        console.log(`   Tokens: ${result.usage?.totalTokens ?? '?'}`);
    }

    // 4. Check genome state
    const exported = await gsep.genome.export();
    console.log('\n📊 Genome State:');
    console.log(`   Name: ${exported.name}`);
    console.log(`   C1 Genes: ${exported.layers?.layer1?.length ?? 0}`);
    console.log(`   Active genes: ${exported.layers?.layer1?.filter((a: { status: string }) => a.status === 'active').length ?? 0}`);

    console.log('\n✅ Demo complete — check dashboard at http://localhost:4201');
    console.log('Press Ctrl+C to exit\n');
}

main().catch(console.error);
