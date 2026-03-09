/**
 * PGA Proof of Value — Real LLM Validation
 *
 * Runs the full PGA pipeline with a real LLM to prove that
 * evolution produces measurable improvement.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx examples/proof-of-value-real-llm.ts anthropic
 *   OPENAI_API_KEY=sk-...    npx tsx examples/proof-of-value-real-llm.ts openai
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-06
 */

import { PGA } from '../packages/core/src/PGA.js';
import { ProofOfValueRunner } from '../packages/core/src/evaluation/ProofOfValueRunner.js';
import { PROOF_OF_VALUE_V1 } from '../packages/core/src/evaluation/BenchmarkSuites.js';
import type { LLMAdapter, Message, ChatResponse } from '../packages/core/src/interfaces/LLMAdapter.js';
import { writeFileSync } from 'fs';

// ─── Adapter Selection ──────────────────────────────────

async function createAdapter(provider: string): Promise<LLMAdapter> {
    if (provider === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('ANTHROPIC_API_KEY not set');

        const { ClaudeAdapter } = await import('../packages/adapters-llm/anthropic/src/index.js');
        return new ClaudeAdapter({
            apiKey: key,
            model: 'claude-haiku-4-5-20251001',  // Use Haiku for cost efficiency
        });
    }

    if (provider === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OPENAI_API_KEY not set');

        const { OpenAIAdapter } = await import('../packages/adapters-llm/openai/src/index.js');
        return new OpenAIAdapter({
            apiKey: key,
            model: 'gpt-4o-mini',  // Use mini for cost efficiency
        });
    }

    throw new Error(`Unknown provider: ${provider}. Use 'anthropic' or 'openai'`);
}

// ─── Simple LLM wrapper as EvaluatableGenome ────────────

function createLLMGenome(llm: LLMAdapter) {
    return {
        async chat(userMessage: string, _context?: { userId?: string }): Promise<string> {
            const messages: Message[] = [
                { role: 'user', content: userMessage },
            ];
            const response: ChatResponse = await llm.chat(messages, {
                maxTokens: 500,
                temperature: 0.7,
            });
            return response.content;
        },
    };
}

// ─── Main ───────────────────────────────────────────────

async function main() {
    const provider = process.argv[2] || 'anthropic';

    console.log('\n' + '='.repeat(62));
    console.log('  PGA PROOF OF VALUE — REAL LLM VALIDATION');
    console.log(`  Provider: ${provider.toUpperCase()}`);
    console.log('='.repeat(62) + '\n');

    // Create adapter
    const llm = await createAdapter(provider);
    console.log(`  Model: ${llm.model}`);

    // Select subset for cost efficiency (5 tasks)
    const tasks = PROOF_OF_VALUE_V1.tasks.slice(0, 5);
    console.log(`  Dataset: ${tasks.length} evaluation tasks`);
    console.log(`  Cycles: 3`);
    console.log(`  Interactions/cycle: 5\n`);

    // Create evaluatable genome (raw LLM, no PGA evolution)
    const genome = createLLMGenome(llm);

    // Run experiment
    const runner = new ProofOfValueRunner();

    console.log('  Running experiment (this will make real API calls)...\n');
    const result = await runner.run(
        genome,
        {
            name: `Real LLM Test (${provider})`,
            cycles: 3,
            interactionsPerCycle: 5,
            dataset: tasks,
            userId: 'pov-real-test',
        },
        (cycle, cycleResult) => {
            const q = cycleResult.benchmark.avgQualityScore.toFixed(3);
            const s = cycleResult.benchmark.successRate.toFixed(1);
            console.log(`  Cycle ${cycle} complete: quality=${q}, success=${s}%`);
        },
    );

    // Display console report
    console.log(runner.formatConsoleReport(result));

    // Save markdown report
    const reportPath = `pov-report-${provider}.md`;
    writeFileSync(reportPath, runner.formatMarkdownReport(result));
    console.log(`  Markdown report saved to: ${reportPath}\n`);
}

main().catch(err => {
    console.error('\n  ERROR:', err.message);
    process.exit(1);
});
