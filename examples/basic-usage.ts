/**
 * GSEP Basic Usage Example
 *
 * This example demonstrates how to:
 * 1. Initialize GSEP with an LLM adapter
 * 2. Create a genome (your agent's evolving brain)
 * 3. Chat through the genome (drop-in LLM replacement)
 * 4. Record feedback for evolution
 *
 * Requirements:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/basic-usage.ts
 *
 * Or without an API key (dry run — shows initialization only):
 *   npx tsx examples/basic-usage.ts
 */

import { PGA, InMemoryStorageAdapter } from '../packages/core/src/index.js';

// ═══════════════════════════════════════════════════════════
// Storage Options:
//
// Option A: InMemory (default — for demos and development)
//   import { InMemoryStorageAdapter } from '@gsep/core';
//   const storage = new InMemoryStorageAdapter();
//
// Option B: PostgreSQL (production — data persists across restarts)
//   import { PostgresAdapter } from '@gsep/adapters-storage-postgres';
//   const storage = new PostgresAdapter({
//       connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/gsep',
//   });
//   await storage.initialize(); // Auto-creates 9 tables on first run
// ═══════════════════════════════════════════════════════════

async function main() {
    // ═══════════════════════════════════════════════════════
    // Step 1: Initialize GSEP
    // ═══════════════════════════════════════════════════════

    const gsep = new PGA({
        storage: new InMemoryStorageAdapter(),
    });

    await gsep.initialize();
    console.log('✓ GSEP initialized');

    // ═══════════════════════════════════════════════════════
    // Step 2: Create a genome for your agent
    // ═══════════════════════════════════════════════════════

    const genome = await gsep.createGenome({
        name: 'customer-support-agent',
        config: {
            autonomous: {
                continuousEvolution: true,
                evolveEveryN: 10,
                autoMutateOnDrift: true,
            },
        },
    });

    console.log(`✓ Genome created: ${genome.id}`);
    console.log(`  Name: ${genome.name}`);

    // ═══════════════════════════════════════════════════════
    // Step 3: Add prompts to chromosome layers
    // ═══════════════════════════════════════════════════════

    // Layer 0 — Immutable DNA (core identity, never mutates)
    await genome.addAllele(
        0,
        'core-identity',
        'default',
        `You are a helpful customer support agent.
Your goal is to resolve customer issues quickly and professionally.
Always be polite, empathetic, and solution-oriented.`,
    );
    console.log('✓ Layer 0 (Immutable DNA) initialized');

    // Layer 1 — Operative Genes (slow mutation, sandbox-tested)
    await genome.addAllele(
        1,
        'troubleshooting-approach',
        'default',
        `When troubleshooting:
1. Ask clarifying questions
2. Reproduce the issue
3. Identify root cause
4. Provide clear solution steps`,
    );
    console.log('✓ Layer 1 (Operative Genes) initialized');

    // Layer 2 — Epigenomes (fast mutation, per-user adaptation)
    await genome.addAllele(
        2,
        'communication-style',
        'default',
        'Use a friendly, professional tone with balanced detail.',
    );
    console.log('✓ Layer 2 (Epigenomes) initialized');

    // ═══════════════════════════════════════════════════════
    // Step 4: Chat through the genome
    // ═══════════════════════════════════════════════════════

    // Check if we have an LLM configured
    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('\n⚠ No ANTHROPIC_API_KEY set — skipping chat demo.');
        console.log('  To run the full demo:');
        console.log('  ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/basic-usage.ts');
        console.log('\n✅ Initialization completed successfully!');
        return;
    }

    // Dynamic import to avoid requiring the adapter when no key is set
    const { ClaudeAdapter } = await import('../packages/adapters-llm/anthropic/src/index.js');

    const gsepWithLLM = new PGA({
        llm: new ClaudeAdapter({
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: 'claude-sonnet-4-5-20250929',
        }),
        storage: new InMemoryStorageAdapter(),
    });

    await gsepWithLLM.initialize();

    const liveGenome = await gsepWithLLM.createGenome({
        name: 'support-agent-live',
        config: {
            autonomous: {
                continuousEvolution: true,
                evolveEveryN: 10,
            },
        },
    });

    // Add the same prompts
    await liveGenome.addAllele(0, 'core-identity', 'default',
        'You are a helpful customer support agent. Be polite, empathetic, and solution-oriented.');
    await liveGenome.addAllele(1, 'troubleshooting', 'default',
        'When troubleshooting: ask clarifying questions, then provide step-by-step solutions.');

    const userId = 'user-123';
    const userMessage = 'My app keeps crashing when I click the submit button';

    console.log('\n📩 User:', userMessage);

    const response = await liveGenome.chat(userMessage, {
        userId,
        taskType: 'support',
    });

    console.log('🤖 Assistant:', response);

    // ═══════════════════════════════════════════════════════
    // Step 5: Record feedback (drives evolution)
    // ═══════════════════════════════════════════════════════

    await liveGenome.recordFeedback(userId, 'troubleshooting', 'positive');
    console.log('✓ Positive feedback recorded');

    // ═══════════════════════════════════════════════════════
    // Step 6: View analytics
    // ═══════════════════════════════════════════════════════

    const analytics = await liveGenome.getAnalytics();
    console.log('\n📊 Genome Analytics:', analytics);

    // ═══════════════════════════════════════════════════════
    // Step 7: Get user DNA profile
    // ═══════════════════════════════════════════════════════

    const userDNA = await liveGenome.getDNA(userId);
    console.log('\n🧬 User DNA Profile:', userDNA);

    // ═══════════════════════════════════════════════════════
    // Step 8: Reload genome (persistence demo)
    // ═══════════════════════════════════════════════════════

    const reloadedGenome = await gsepWithLLM.loadGenome(liveGenome.id);

    if (reloadedGenome) {
        console.log(`\n✓ Genome reloaded: ${reloadedGenome.name}`);
    }

    console.log('\n✅ Example completed successfully!');
}

// Run the example
main().catch(console.error);
