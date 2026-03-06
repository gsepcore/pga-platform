/**
 * ProofOfValueRunner — Demonstrate measurable PGA improvement
 *
 * Orchestrates multiple evolution cycles on a QA dataset and
 * measures the fitness curve to prove PGA delivers real value.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import type { EvaluatableGenome, EvaluationTask, BenchmarkResult } from './Evaluator.js';
import { Evaluator } from './Evaluator.js';

// ─── Configuration ──────────────────────────────────────────

export interface ProofOfValueConfig {
    /** Experiment name */
    name: string;
    /** Number of evolution cycles to run (default: 5) */
    cycles: number;
    /** Number of chat interactions per cycle to drive evolution (default: 10) */
    interactionsPerCycle: number;
    /** Evaluation tasks to benchmark each cycle */
    dataset: EvaluationTask[];
    /** Simulated user ID (default: 'pov-user') */
    userId: string;
}

// ─── Result Types ───────────────────────────────────────────

export interface CycleResult {
    cycle: number;
    benchmark: BenchmarkResult;
    timestamp: Date;
}

export interface FitnessCurvePoint {
    cycle: number;
    quality: number;
    successRate: number;
    avgTokens: number;
}

export interface ProofOfValueResult {
    config: ProofOfValueConfig;
    baseline: BenchmarkResult;
    cycles: CycleResult[];
    fitnessCurve: FitnessCurvePoint[];
    finalComparison: {
        qualityDelta: number;
        successRateDelta: number;
        tokenDelta: number;
    };
    totalDuration: number;
    verdict: 'IMPROVEMENT_PROVEN' | 'NO_SIGNIFICANT_CHANGE' | 'REGRESSION';
}

// ─── Runner ─────────────────────────────────────────────────

export class ProofOfValueRunner {
    private evaluator: Evaluator;

    constructor(evaluator?: Evaluator) {
        this.evaluator = evaluator ?? new Evaluator();
    }

    /**
     * Run the proof-of-value experiment.
     *
     * 1. Evaluate baseline (cycle 0)
     * 2. For each cycle: drive interactions → evolve → evaluate
     * 3. Compare final vs baseline → verdict
     */
    async run(
        genome: EvaluatableGenome,
        config: ProofOfValueConfig,
        onCycleComplete?: (cycle: number, result: CycleResult) => void,
    ): Promise<ProofOfValueResult> {
        const startTime = Date.now();
        const userId = config.userId || 'pov-user';

        // ── Baseline evaluation (cycle 0) ──
        console.log(`\n  Evaluating baseline (cycle 0)...`);
        const baseline = await this.evaluator.evaluate(genome, config.dataset, userId);

        const fitnessCurve: FitnessCurvePoint[] = [{
            cycle: 0,
            quality: baseline.avgQualityScore,
            successRate: baseline.successRate,
            avgTokens: baseline.avgTokensPerTask,
        }];

        const cycles: CycleResult[] = [];

        // ── Evolution cycles ──
        for (let c = 1; c <= config.cycles; c++) {
            console.log(`  Cycle ${c}/${config.cycles}: driving ${config.interactionsPerCycle} interactions...`);

            // Drive interactions to trigger evolution
            for (let i = 0; i < config.interactionsPerCycle; i++) {
                const task = config.dataset[i % config.dataset.length];
                try {
                    await genome.chat(task.userMessage, { userId });
                } catch {
                    // Continue even if individual interactions fail
                }
            }

            // Evaluate after evolution
            console.log(`  Cycle ${c}/${config.cycles}: evaluating...`);
            const benchmark = await this.evaluator.evaluate(genome, config.dataset, userId);

            const cycleResult: CycleResult = {
                cycle: c,
                benchmark,
                timestamp: new Date(),
            };
            cycles.push(cycleResult);

            fitnessCurve.push({
                cycle: c,
                quality: benchmark.avgQualityScore,
                successRate: benchmark.successRate,
                avgTokens: benchmark.avgTokensPerTask,
            });

            onCycleComplete?.(c, cycleResult);
        }

        // ── Final comparison ──
        const lastBenchmark = cycles.length > 0 ? cycles[cycles.length - 1].benchmark : baseline;

        const qualityDelta = lastBenchmark.avgQualityScore - baseline.avgQualityScore;
        const successRateDelta = lastBenchmark.successRate - baseline.successRate;
        const tokenDelta = baseline.avgTokensPerTask - lastBenchmark.avgTokensPerTask;

        // Determine verdict
        const qualityPctChange = baseline.avgQualityScore > 0
            ? (qualityDelta / baseline.avgQualityScore) * 100
            : 0;

        let verdict: ProofOfValueResult['verdict'];
        if (qualityPctChange > 10 || successRateDelta > 10) {
            verdict = 'IMPROVEMENT_PROVEN';
        } else if (qualityPctChange < -5 || successRateDelta < -5) {
            verdict = 'REGRESSION';
        } else {
            verdict = 'NO_SIGNIFICANT_CHANGE';
        }

        return {
            config,
            baseline,
            cycles,
            fitnessCurve,
            finalComparison: {
                qualityDelta: Math.round(qualityDelta * 1000) / 1000,
                successRateDelta: Math.round(successRateDelta * 100) / 100,
                tokenDelta: Math.round(tokenDelta),
            },
            totalDuration: Date.now() - startTime,
            verdict,
        };
    }

    /**
     * Format results as ASCII console report
     */
    formatConsoleReport(result: ProofOfValueResult): string {
        const lines: string[] = [];
        const w = 62;

        // Header
        lines.push('');
        lines.push(`${'='.repeat(w)}`);
        lines.push(`  PGA PROOF OF VALUE -- RESULTS`);
        lines.push(`  Experiment: ${result.config.name}`);
        lines.push(`${'='.repeat(w)}`);
        lines.push('');

        // Verdict
        const verdictIcon = result.verdict === 'IMPROVEMENT_PROVEN' ? '[OK]'
            : result.verdict === 'REGRESSION' ? '[FAIL]' : '[--]';
        const qualityPct = result.baseline.avgQualityScore > 0
            ? ((result.finalComparison.qualityDelta / result.baseline.avgQualityScore) * 100).toFixed(1)
            : '0.0';
        lines.push(`  VERDICT: ${verdictIcon} ${result.verdict.replace(/_/g, ' ')} (${Number(qualityPct) >= 0 ? '+' : ''}${qualityPct}% quality)`);
        lines.push('');

        // Table
        const col = (s: string, len: number) => s.padEnd(len);
        lines.push(`  ${col('Cycle', 10)} ${col('Quality', 10)} ${col('Success', 10)} ${col('Tokens', 10)}`);
        lines.push(`  ${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(10)}`);

        for (const point of result.fitnessCurve) {
            const label = point.cycle === 0 ? 'Base' : `Cycle ${point.cycle}`;
            lines.push(`  ${col(label, 10)} ${col(point.quality.toFixed(2), 10)} ${col(point.successRate.toFixed(1) + '%', 10)} ${col(String(Math.round(point.avgTokens)), 10)}`);
        }
        lines.push('');

        // ASCII fitness curve (auto-scaled to data range with padding)
        lines.push(`  FITNESS CURVE (quality):`);
        const points = result.fitnessCurve.map(p => p.quality);
        const dataMax = Math.max(...points);
        const dataMin = Math.min(...points);
        const padding = Math.max((dataMax - dataMin) * 0.2, 0.05);
        const maxQ = Math.min(1, dataMax + padding);
        const minQ = Math.max(0, dataMin - padding);
        const rows = 6;
        for (let r = rows; r >= 0; r--) {
            const threshold = minQ + ((maxQ - minQ) * r) / rows;
            const label = threshold.toFixed(2);
            let row = `  ${label} |`;
            for (const q of points) {
                row += q >= threshold ? ' * ' : '   ';
            }
            lines.push(row);
        }
        const axisLine = `  ${' '.repeat(5)}+${points.map(() => '---').join('')}`;
        lines.push(axisLine);
        let labels = `  ${' '.repeat(6)}`;
        for (let i = 0; i < points.length; i++) {
            labels += i === 0 ? 'B  ' : `${i}  `;
        }
        lines.push(labels);
        lines.push('');

        // Duration
        const secs = (result.totalDuration / 1000).toFixed(1);
        lines.push(`  TOTAL DURATION: ${secs}s`);
        lines.push(`${'='.repeat(w)}`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Format results as markdown report
     */
    formatMarkdownReport(result: ProofOfValueResult): string {
        const lines: string[] = [];

        lines.push(`# PGA Proof of Value Report`);
        lines.push('');
        lines.push(`**Experiment**: ${result.config.name}`);
        lines.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
        lines.push(`**Cycles**: ${result.config.cycles}`);
        lines.push(`**Tasks per evaluation**: ${result.config.dataset.length}`);
        lines.push(`**Duration**: ${(result.totalDuration / 1000).toFixed(1)}s`);
        lines.push('');

        // Verdict
        lines.push('## Verdict');
        lines.push('');
        const qualityPct = result.baseline.avgQualityScore > 0
            ? ((result.finalComparison.qualityDelta / result.baseline.avgQualityScore) * 100).toFixed(1)
            : '0.0';
        lines.push(`**${result.verdict.replace(/_/g, ' ')}** (${Number(qualityPct) >= 0 ? '+' : ''}${qualityPct}% quality improvement)`);
        lines.push('');

        // Results table
        lines.push('## Evolution Curve');
        lines.push('');
        lines.push('| Cycle | Quality | Success Rate | Avg Tokens |');
        lines.push('|-------|---------|--------------|------------|');
        for (const point of result.fitnessCurve) {
            const label = point.cycle === 0 ? 'Baseline' : `Cycle ${point.cycle}`;
            lines.push(`| ${label} | ${point.quality.toFixed(3)} | ${point.successRate.toFixed(1)}% | ${Math.round(point.avgTokens)} |`);
        }
        lines.push('');

        // Final comparison
        lines.push('## Final Comparison (Last Cycle vs Baseline)');
        lines.push('');
        lines.push(`- **Quality Delta**: ${result.finalComparison.qualityDelta >= 0 ? '+' : ''}${result.finalComparison.qualityDelta.toFixed(3)}`);
        lines.push(`- **Success Rate Delta**: ${result.finalComparison.successRateDelta >= 0 ? '+' : ''}${result.finalComparison.successRateDelta.toFixed(1)} pp`);
        lines.push(`- **Token Savings**: ${result.finalComparison.tokenDelta >= 0 ? '+' : ''}${result.finalComparison.tokenDelta} tokens/task`);
        lines.push('');

        // Methodology
        lines.push('## Methodology');
        lines.push('');
        lines.push('1. Baseline evaluation (Cycle 0): Run all tasks against the genome before any evolution');
        lines.push(`2. For each of ${result.config.cycles} cycles:`);
        lines.push(`   - Drive ${result.config.interactionsPerCycle} chat interactions to build fitness data`);
        lines.push('   - Trigger evolution cycle (mutation + selection based on fitness)');
        lines.push('   - Re-evaluate all tasks against the evolved genome');
        lines.push('3. Compare final cycle quality vs baseline to determine verdict');
        lines.push('');
        lines.push('---');
        lines.push('*Generated by PGA ProofOfValueRunner*');

        return lines.join('\n');
    }
}
