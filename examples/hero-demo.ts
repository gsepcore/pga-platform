/**
 * GSEP Hero Demo — See Genomic Evolution in Action
 *
 * This demo shows how GSEP measures and drives prompt evolution:
 *
 *   --dry-run mode: Demonstrates the measurement framework with a mock LLM.
 *     The mock produces CONSISTENT responses (no artificial improvement).
 *     You'll see the evaluation pipeline in action.
 *
 *   Real LLM mode: Uses a REAL GSEP genome with continuous evolution enabled.
 *     Evolution triggers every 5 interactions, mutating and selecting prompts.
 *     Quality changes reflect actual prompt evolution.
 *
 * Usage:
 *   npx tsx examples/hero-demo.ts --dry-run           # Free, mock LLM
 *   ANTHROPIC_API_KEY=sk-... npx tsx examples/hero-demo.ts anthropic
 *   OPENAI_API_KEY=sk-...    npx tsx examples/hero-demo.ts openai
 *
 * Options:
 *   --dry-run       Run with mock LLM (zero cost, shows measurement pipeline)
 *   --save-report   Write markdown report to disk
 *   anthropic       Use Claude Haiku (~$0.08)
 *   openai          Use GPT-4o-mini (~$0.05)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-06
 */

import { ProofOfValueRunner } from '../packages/core/src/evaluation/ProofOfValueRunner.js';
import { PROOF_OF_VALUE_V1 } from '../packages/core/src/evaluation/BenchmarkSuites.js';
import { GSEP, InMemoryStorageAdapter } from '../packages/core/src/index.js';
import type { LLMAdapter, Message, ChatResponse } from '../packages/core/src/interfaces/LLMAdapter.js';
import { writeFileSync } from 'fs';

// ─── Constants ───────────────────────────────────────────

const CYCLES = 3;
const INTERACTIONS_PER_CYCLE = 5;
const TASKS_COUNT = 5;
const EVOLVE_EVERY_N = 5;

// ─── Banner ──────────────────────────────────────────────

function printBanner(mode: string, model: string) {
    const W = 64;
    console.log('\n' + '='.repeat(W));
    console.log('  GSEP HERO DEMO — Genomic Self-Evolving Prompts');
    console.log('='.repeat(W));
    console.log('');
    console.log('  What you will see:');
    console.log('  1. Baseline evaluation (how the LLM performs today)');
    console.log(`  2. ${CYCLES} evolution cycles with ${INTERACTIONS_PER_CYCLE} interactions each`);
    console.log('  3. Quality & fitness measured after every cycle');
    console.log('  4. Side-by-side comparison: before vs after');
    console.log('');
    console.log(`  Mode:   ${mode}`);
    console.log(`  Model:  ${model}`);
    console.log(`  Tasks:  ${TASKS_COUNT} evaluation tasks`);
    console.log(`  Cycles: ${CYCLES}`);

    if (mode === 'dry-run') {
        console.log('\n  Cost: $0.00 (mock LLM — shows measurement pipeline)');
        console.log('  Note: Mock produces consistent responses. Use a real LLM');
        console.log('        to see actual prompt evolution in action.');
    } else if (mode === 'anthropic') {
        console.log('\n  Estimated cost: ~$0.08 (Claude Haiku)');
        console.log(`  Evolution enabled: mutations every ${EVOLVE_EVERY_N} interactions`);
    } else if (mode === 'openai') {
        console.log('\n  Estimated cost: ~$0.05 (GPT-4o-mini)');
        console.log(`  Evolution enabled: mutations every ${EVOLVE_EVERY_N} interactions`);
    }
    console.log('\n' + '-'.repeat(W));
}

// ─── Mock LLM for --dry-run ──────────────────────────────

class MockLLMAdapter implements LLMAdapter {
    readonly name = 'mock';
    readonly model = 'mock-consistent';

    async chat(messages: Message[]): Promise<ChatResponse> {
        const userMsg = messages.find(m => m.role === 'user')?.content ?? '';
        const response = this.generateResponse(userMsg);

        return {
            content: response,
            usage: {
                inputTokens: Math.round(userMsg.length / 4),
                outputTokens: Math.round(response.length / 4),
            },
        };
    }

    private generateResponse(prompt: string): string {
        // Consistent quality — no artificial improvement based on call count
        const keywords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const topic = keywords[0] ?? 'the topic';

        return [
            `Here is a clear explanation of ${topic}.`,
            `The key concept involves understanding the fundamentals and applying them correctly.`,
            `First, consider the core requirements and constraints of the problem.`,
            `A good approach follows established best practices for maintainability.`,
            `Error handling should be included for robustness in production.`,
        ].join(' ');
    }
}

// ─── Real Adapter Factory ────────────────────────────────

async function createAdapter(provider: string): Promise<LLMAdapter> {
    if (provider === 'anthropic') {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error('ANTHROPIC_API_KEY not set. Use --dry-run for zero-cost demo.');

        const { ClaudeAdapter } = await import('../packages/adapters-llm/anthropic/src/index.js');
        return new ClaudeAdapter({
            apiKey: key,
            model: 'claude-haiku-4-5-20251001',
        });
    }

    if (provider === 'openai') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) throw new Error('OPENAI_API_KEY not set. Use --dry-run for zero-cost demo.');

        const { OpenAIAdapter } = await import('../packages/adapters-llm/openai/src/index.js');
        return new OpenAIAdapter({
            apiKey: key,
            model: 'gpt-4o-mini',
        });
    }

    throw new Error(`Unknown provider: ${provider}. Use 'anthropic', 'openai', or --dry-run`);
}

// ─── Create a real GSEP genome (evolution-enabled) ───────

async function createGSEPGenome(llm: LLMAdapter) {
    const gsep = new GSEP({
        llm,
        storage: new InMemoryStorageAdapter(),
    });
    await gsep.initialize();

    const genome = await gsep.createGenome({
        name: 'hero-demo-genome',
        config: {
            autonomous: {
                continuousEvolution: true,
                evolveEveryN: EVOLVE_EVERY_N,
                autoMutateOnDrift: true,
            },
        },
    });

    // Layer 0 — Immutable identity (never mutates)
    await genome.addAllele(
        0, 'identity', 'default',
        'You are a knowledgeable technical assistant. Provide accurate, well-structured answers.',
    );

    // Layer 1 — Operative behavior (evolves through mutation + selection)
    await genome.addAllele(
        1, 'approach', 'default',
        'When answering: 1) Address the core question directly. 2) Provide examples when helpful. 3) Keep responses focused and concise.',
    );

    // Layer 2 — Style (adapts per user)
    await genome.addAllele(
        2, 'style', 'default',
        'Use clear language. Format with markdown when appropriate.',
    );

    return genome;
}

// ─── Simple wrapper for dry-run mode ─────────────────────

function createMockGenome(llm: LLMAdapter) {
    return {
        async chat(userMessage: string): Promise<string> {
            const messages: Message[] = [{ role: 'user', content: userMessage }];
            const response = await llm.chat(messages, { maxTokens: 500, temperature: 0.7 });
            return response.content;
        },
    };
}

// ─── What just happened? ─────────────────────────────────

function printExplainer(isDryRun: boolean, verdict: string, qualityDelta: number, baseline: number) {
    const W = 64;
    console.log('\n' + '='.repeat(W));
    console.log('  WHAT JUST HAPPENED?');
    console.log('='.repeat(W));

    const pctChange = baseline > 0 ? ((qualityDelta / baseline) * 100).toFixed(1) : '0.0';

    if (isDryRun) {
        console.log(`
  You ran the MEASUREMENT PIPELINE with a mock LLM.

  The mock produces consistent responses (no fake improvement).
  What you saw is how GSEP evaluates quality across cycles.

  To see REAL evolution with prompt mutation and selection:
    ANTHROPIC_API_KEY=sk-... npx tsx examples/hero-demo.ts anthropic

  In production, GSEP does this continuously:
  - Every ${EVOLVE_EVERY_N} interactions triggers an evolution cycle
  - Best mutations are promoted through safety gates
  - Immutable DNA (Layer 0) is NEVER modified
  - All changes are reversible with automatic rollback
`);
    } else {
        console.log(`
  GSEP ran ${CYCLES} evolution cycles on your AI agent:

  1. BASELINE  — Measured raw quality (before evolution)
  2. INTERACT  — Drove ${CYCLES * INTERACTIONS_PER_CYCLE} chat interactions to build fitness data
  3. EVOLVE    — Mutated and selected best-performing prompt variants
  4. MEASURE   — Re-evaluated quality after each cycle

  Result: ${verdict === 'IMPROVEMENT_PROVEN'
            ? `Quality improved by ${pctChange}%`
            : verdict === 'NO_SIGNIFICANT_CHANGE'
                ? 'Quality remained stable (small dataset — production uses 50-100 cycles)'
                : `Quality changed by ${pctChange}%`}

  Note: ${CYCLES} cycles is a minimal demo. Production deployments
  use 50-100 cycles for convergence. The evolution is working:
  measuring, mutating, selecting — just needs more cycles to converge.
`);
    }
    console.log('='.repeat(W));
}

// ─── Main ────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const saveReport = args.includes('--save-report');
    const provider = isDryRun ? 'dry-run' : (args.find(a => !a.startsWith('--')) || 'anthropic');

    // Create adapter
    const llm = isDryRun ? new MockLLMAdapter() : await createAdapter(provider);
    const modelName = llm.model;

    // Print banner
    printBanner(isDryRun ? 'dry-run' : provider, modelName);

    // Select tasks
    const tasks = PROOF_OF_VALUE_V1.tasks.slice(0, TASKS_COUNT);

    // Create genome — real GSEP genome for LLM mode, simple wrapper for dry-run
    const genome = isDryRun
        ? createMockGenome(llm)
        : await createGSEPGenome(llm);

    // Run experiment
    console.log('\n  Running experiment...\n');

    const runner = new ProofOfValueRunner();
    const result = await runner.run(
        genome,
        {
            name: `GSEP Hero Demo (${isDryRun ? 'dry-run / measurement pipeline' : provider + ' / real evolution'})`,
            cycles: CYCLES,
            interactionsPerCycle: INTERACTIONS_PER_CYCLE,
            dataset: tasks,
            userId: 'hero-demo-user',
        },
        (cycle, cycleResult) => {
            const q = cycleResult.benchmark.avgQualityScore.toFixed(3);
            const s = cycleResult.benchmark.successRate.toFixed(1);
            console.log(`  Cycle ${cycle} complete: quality=${q}, success=${s}%`);
        },
    );

    // Print formatted report
    console.log(runner.formatConsoleReport(result));

    // Print explainer
    printExplainer(
        isDryRun,
        result.verdict,
        result.finalComparison.qualityDelta,
        result.baseline.avgQualityScore,
    );

    // Save report to disk (only if --save-report)
    if (saveReport) {
        const reportPath = `hero-demo-report-${isDryRun ? 'dry-run' : provider}.md`;
        writeFileSync(reportPath, runner.formatMarkdownReport(result));
        console.log(`\n  Markdown report saved to: ${reportPath}`);
    }
}

main().catch(err => {
    console.error(`\n  ERROR: ${err.message}`);
    console.error('  Tip: Use --dry-run for a zero-cost demo without API keys.\n');
    process.exit(1);
});
