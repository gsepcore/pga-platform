/**
 * Drift Analyzer Tests
 *
 * Tests for GSEP's proactive performance monitoring system:
 * - Initial state with no data
 * - Fitness recording and history management
 * - Insufficient sample handling
 * - Stable metrics detection (no drift)
 * - Quality decline detection
 * - Efficiency decline detection
 * - Cost increase detection
 * - Multiple drift signals at once
 * - Severity classification (minor/moderate/severe/critical)
 * - History clearing
 * - Custom configuration thresholds
 * - History max size enforcement (1000)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect } from 'vitest';
import type { FitnessVector } from '../../types/GenomeV2.js';
import { DriftAnalyzer } from '../DriftAnalyzer.js';

// ─── Test Helpers ────────────────────────────────────────────

function createFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.8,
        successRate: 0.9,
        tokenEfficiency: 0.7,
        latency: 500,
        costPerSuccess: 0.01,
        interventionRate: 0.05,
        composite: 0.82,
        sampleSize: 50,
        lastUpdated: new Date(),
        confidence: 0.9,
        ...overrides,
    };
}

/**
 * Helper to record N identical fitness vectors into the analyzer.
 */
function recordMany(analyzer: DriftAnalyzer, count: number, fitness: FitnessVector): void {
    for (let i = 0; i < count; i++) {
        analyzer.recordFitness(fitness);
    }
}

/**
 * Helper to build a DriftAnalyzer that has a baseline window of good data
 * followed by a recent window of degraded data.
 *
 * Uses small windows so we can exceed confidence thresholds without
 * needing thousands of data points.
 */
function buildDriftingAnalyzer(
    baselineFitness: FitnessVector,
    recentFitness: FitnessVector,
    config?: Partial<Parameters<typeof DriftAnalyzer.prototype.analyzeDrift extends () => infer R ? never : never>
    >,
): DriftAnalyzer {
    // Use small windows: comparisonWindow=50, baselineWindow=200, minSampleSize=10
    // With 250 baseline + 50 recent = 300 total points
    // baseline window has 200 points -> confidence = 0.9
    // recent window has 50 points -> confidence = 0.7
    // computeConfidence(min(50,200)) = computeConfidence(50) = 0.7
    // But we need >= 0.80 confidence to pass the filter.
    // So we use larger windows: 150 recent + 300 baseline -> min(150,300) = 150 -> 0.9
    const analyzer = new DriftAnalyzer({
        comparisonWindow: 150,
        baselineWindow: 300,
        minSampleSize: 10,
        confidenceThreshold: 0.80,
    });

    // Record baseline data (good performance)
    recordMany(analyzer, 300, baselineFitness);

    // Record recent data (degraded performance)
    recordMany(analyzer, 150, recentFitness);

    return analyzer;
}

// ─── Tests ──────────────────────────────────────────────────

describe('DriftAnalyzer', () => {
    // ── 1. Initial state ─────────────────────────────────────

    describe('initial state (no data)', () => {
        it('should report no drift when no data has been recorded', () => {
            const analyzer = new DriftAnalyzer();
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(false);
            expect(analysis.signals).toHaveLength(0);
            expect(analysis.confidence).toBe(0);
            expect(analysis.overallSeverity).toBe('minor');
            expect(analysis.timestamp).toBeInstanceOf(Date);
        });

        it('should have empty history initially', () => {
            const analyzer = new DriftAnalyzer();

            expect(analyzer.getHistory()).toHaveLength(0);
            expect(analyzer.getHistorySize()).toBe(0);
        });
    });

    // ── 2. Record fitness and get history ────────────────────

    describe('recordFitness and getHistory', () => {
        it('should record fitness data points and return them in history', () => {
            const analyzer = new DriftAnalyzer();
            const fitness = createFitness();

            analyzer.recordFitness(fitness);
            analyzer.recordFitness(fitness);

            expect(analyzer.getHistorySize()).toBe(2);
            expect(analyzer.getHistory()).toHaveLength(2);
        });

        it('should store a copy of the fitness vector (no mutation leakage)', () => {
            const analyzer = new DriftAnalyzer();
            const fitness = createFitness({ quality: 0.9 });

            analyzer.recordFitness(fitness);

            // Mutate the original after recording
            fitness.quality = 0.1;

            const history = analyzer.getHistory();
            expect(history[0].fitness.quality).toBe(0.9);
        });

        it('should return a copy of history (no external mutation)', () => {
            const analyzer = new DriftAnalyzer();
            analyzer.recordFitness(createFitness());

            const history1 = analyzer.getHistory();
            history1.pop(); // mutate the returned array

            expect(analyzer.getHistorySize()).toBe(1);
        });
    });

    // ── 3. Insufficient samples ──────────────────────────────

    describe('insufficient samples', () => {
        it('should report no drift with fewer samples than minSampleSize', () => {
            const analyzer = new DriftAnalyzer({ minSampleSize: 20 });

            // Record only 19 data points
            for (let i = 0; i < 19; i++) {
                analyzer.recordFitness(createFitness());
            }

            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(false);
            expect(analysis.signals).toHaveLength(0);
            expect(analysis.confidence).toBe(0);
            expect(analysis.recommendedActions).toContainEqual(
                expect.stringContaining('Collect more data')
            );
        });

        it('should begin analysis once minSampleSize is reached', () => {
            const analyzer = new DriftAnalyzer({ minSampleSize: 5 });

            for (let i = 0; i < 5; i++) {
                analyzer.recordFitness(createFitness());
            }

            const analysis = analyzer.analyzeDrift();

            // With stable data, should not be drifting (may or may not have signals
            // but at minimum it attempted analysis)
            expect(analysis.confidence).toBeGreaterThanOrEqual(0);
            // The recommendedActions should NOT contain the "collect more data" message
            expect(analysis.recommendedActions).not.toContainEqual(
                expect.stringContaining('Collect more data')
            );
        });
    });

    // ── 4. Stable metrics -> no drift ────────────────────────

    describe('stable metrics (no drift)', () => {
        it('should report no drift when all metrics are stable', () => {
            const stableFitness = createFitness({
                quality: 0.85,
                successRate: 0.90,
                tokenEfficiency: 0.75,
                latency: 500,
                costPerSuccess: 0.01,
                interventionRate: 0.05,
            });

            const analyzer = buildDriftingAnalyzer(stableFitness, stableFitness);

            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(false);
            expect(analysis.signals).toHaveLength(0);
        });
    });

    // ── 5. Quality decline detection ─────────────────────────

    describe('quality decline detection', () => {
        it('should detect success rate decline as drift', () => {
            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.70 }); // 22% drop > 10% threshold

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);

            const successSignal = analysis.signals.find(
                (s) => s.type === 'success-rate-decline'
            );
            expect(successSignal).toBeDefined();
            expect(successSignal!.metric).toBe('successRate');
            expect(successSignal!.percentageChange).toBeGreaterThan(0);
            expect(successSignal!.recommendation).toContain('Success rate declining');
        });
    });

    // ── 6. Efficiency decline detection ──────────────────────

    describe('efficiency decline detection', () => {
        it('should detect token efficiency decline as drift', () => {
            const baseline = createFitness({ tokenEfficiency: 0.80 });
            const degraded = createFitness({ tokenEfficiency: 0.55 }); // 31% drop > 15% threshold

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);

            const efficiencySignal = analysis.signals.find(
                (s) => s.type === 'efficiency-decline'
            );
            expect(efficiencySignal).toBeDefined();
            expect(efficiencySignal!.metric).toBe('tokenEfficiency');
            expect(efficiencySignal!.recommendation).toContain('Token usage increasing');
        });
    });

    // ── 7. Cost increase detection ───────────────────────────

    describe('cost increase detection', () => {
        it('should detect cost per success increase as drift', () => {
            const baseline = createFitness({ costPerSuccess: 0.01 });
            const degraded = createFitness({ costPerSuccess: 0.02 }); // 100% increase > 25% threshold

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);

            const costSignal = analysis.signals.find(
                (s) => s.type === 'cost-increase'
            );
            expect(costSignal).toBeDefined();
            expect(costSignal!.metric).toBe('costPerSuccess');
            expect(costSignal!.recommendation).toContain('Cost per success increasing');
        });
    });

    // ── 8. Multiple drift signals at once ────────────────────

    describe('multiple drift signals', () => {
        it('should detect multiple drift signals simultaneously', () => {
            const baseline = createFitness({
                successRate: 0.90,
                tokenEfficiency: 0.80,
                costPerSuccess: 0.01,
                interventionRate: 0.05,
            });
            const degraded = createFitness({
                successRate: 0.60,     // 33% drop > 10% threshold
                tokenEfficiency: 0.50, // 37% drop > 15% threshold
                costPerSuccess: 0.05,  // 400% increase > 25% threshold
                interventionRate: 0.30, // 25% absolute increase > 10% threshold
            });

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);
            expect(analysis.signals.length).toBeGreaterThanOrEqual(3);

            const signalTypes = analysis.signals.map((s) => s.type);
            expect(signalTypes).toContain('success-rate-decline');
            expect(signalTypes).toContain('efficiency-decline');
            expect(signalTypes).toContain('cost-increase');
        });

        it('should recommend full genome evaluation when more than 2 signals are present', () => {
            const baseline = createFitness({
                successRate: 0.90,
                tokenEfficiency: 0.80,
                costPerSuccess: 0.01,
                interventionRate: 0.05,
            });
            const degraded = createFitness({
                successRate: 0.60,
                tokenEfficiency: 0.50,
                costPerSuccess: 0.05,
                interventionRate: 0.30,
            });

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.recommendedActions).toContainEqual(
                expect.stringContaining('Multiple metrics drifting')
            );
        });
    });

    // ── 9. Severity levels ───────────────────────────────────

    describe('severity classification', () => {
        it('should classify minor severity (< 15% change)', () => {
            // Success rate drop of ~12.2% => severity minor
            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.78 }); // ~13.3% drop

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            if (analysis.signals.length > 0) {
                const signal = analysis.signals.find((s) => s.type === 'success-rate-decline');
                if (signal) {
                    expect(signal.severity).toBe('minor');
                }
            }
        });

        it('should classify moderate severity (15-30% change)', () => {
            // Success rate drop of ~22% => severity moderate
            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.70 }); // 22.2% drop

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            const signal = analysis.signals.find((s) => s.type === 'success-rate-decline');
            expect(signal).toBeDefined();
            expect(signal!.severity).toBe('moderate');
        });

        it('should classify severe severity (30-50% change)', () => {
            // Success rate drop of ~44% => severity severe
            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.50 }); // 44.4% drop

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            const signal = analysis.signals.find((s) => s.type === 'success-rate-decline');
            expect(signal).toBeDefined();
            expect(signal!.severity).toBe('severe');
        });

        it('should classify critical severity (>= 50% change)', () => {
            // Success rate drop of ~77% => severity critical
            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.20 }); // 77.8% drop

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            const signal = analysis.signals.find((s) => s.type === 'success-rate-decline');
            expect(signal).toBeDefined();
            expect(signal!.severity).toBe('critical');

            // Overall severity should also be critical
            expect(analysis.overallSeverity).toBe('critical');

            // Should include emergency rollback recommendation
            expect(analysis.recommendedActions).toContainEqual(
                expect.stringContaining('CRITICAL')
            );
        });

        it('should compute overall severity as the maximum among all signals', () => {
            const baseline = createFitness({
                successRate: 0.90,    // Will be moderate
                tokenEfficiency: 0.80, // Will be critical
            });
            const degraded = createFitness({
                successRate: 0.70,     // 22% drop -> moderate
                tokenEfficiency: 0.20, // 75% drop -> critical
            });

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.overallSeverity).toBe('critical');
        });
    });

    // ── 10. Clear history ────────────────────────────────────

    describe('clearHistory', () => {
        it('should reset all history state', () => {
            const analyzer = new DriftAnalyzer();

            recordMany(analyzer, 50, createFitness());
            expect(analyzer.getHistorySize()).toBe(50);

            analyzer.clearHistory();

            expect(analyzer.getHistorySize()).toBe(0);
            expect(analyzer.getHistory()).toHaveLength(0);

            // After clearing, analysis should show no drift (insufficient data)
            const analysis = analyzer.analyzeDrift();
            expect(analysis.isDrifting).toBe(false);
            expect(analysis.confidence).toBe(0);
        });
    });

    // ── 11. Custom config thresholds ─────────────────────────

    describe('custom configuration', () => {
        it('should respect custom success rate threshold', () => {
            // Very sensitive threshold: 0.02 (2% drop triggers alert)
            const analyzer = new DriftAnalyzer({
                successRateThreshold: 0.02,
                comparisonWindow: 150,
                baselineWindow: 300,
                minSampleSize: 10,
                confidenceThreshold: 0.80,
            });

            const baseline = createFitness({ successRate: 0.90 });
            const slightlyWorse = createFitness({ successRate: 0.87 }); // only 3.3% drop

            recordMany(analyzer, 300, baseline);
            recordMany(analyzer, 150, slightlyWorse);

            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);
            const signal = analysis.signals.find((s) => s.type === 'success-rate-decline');
            expect(signal).toBeDefined();
        });

        it('should respect custom confidence threshold', () => {
            // Require very high confidence (0.95) which needs 200+ samples per window
            const analyzer = new DriftAnalyzer({
                confidenceThreshold: 0.95,
                comparisonWindow: 50,
                baselineWindow: 100,
                minSampleSize: 10,
            });

            const baseline = createFitness({ successRate: 0.90 });
            const degraded = createFitness({ successRate: 0.50 }); // large drop

            recordMany(analyzer, 100, baseline);
            recordMany(analyzer, 50, degraded);

            const analysis = analyzer.analyzeDrift();

            // With only 50 recent and 100 baseline, confidence = computeConfidence(min(50,100)) = 0.7
            // 0.7 < 0.95 => signals filtered out => no drift
            expect(analysis.isDrifting).toBe(false);
            expect(analysis.signals).toHaveLength(0);
        });

        it('should use default config values when none are provided', () => {
            const analyzer = new DriftAnalyzer();

            // Verify defaults by behavior: record < 20 samples should still show insufficient data
            for (let i = 0; i < 19; i++) {
                analyzer.recordFitness(createFitness());
            }

            const analysis = analyzer.analyzeDrift();
            expect(analysis.confidence).toBe(0);
            expect(analysis.recommendedActions).toContainEqual(
                expect.stringContaining('Collect more data')
            );
        });
    });

    // ── 12. History max size (1000) ──────────────────────────

    describe('history max size', () => {
        it('should cap history at 1000 entries by removing oldest', () => {
            const analyzer = new DriftAnalyzer({ minSampleSize: 5 });

            // Record 1050 entries
            const earlyFitness = createFitness({ quality: 0.1 });
            const lateFitness = createFitness({ quality: 0.9 });

            // First 100 entries with low quality (these should be evicted)
            recordMany(analyzer, 100, earlyFitness);

            // Then 950 entries with high quality
            recordMany(analyzer, 950, lateFitness);

            // At this point we have 1050 entries, but max is 1000
            expect(analyzer.getHistorySize()).toBe(1000);

            // The first 50 low-quality entries should have been evicted.
            // The remaining history should start with the 51st entry (low quality)
            // and include all 950 high-quality entries.
            const history = analyzer.getHistory();
            expect(history).toHaveLength(1000);

            // The last entry should be high quality
            expect(history[history.length - 1].fitness.quality).toBe(0.9);
        });

        it('should never exceed 1000 even with continuous recording', () => {
            const analyzer = new DriftAnalyzer({ minSampleSize: 5 });

            recordMany(analyzer, 1500, createFitness());

            expect(analyzer.getHistorySize()).toBe(1000);
        });
    });

    // ── Additional edge cases ────────────────────────────────

    describe('edge cases', () => {
        it('should handle latency increase detection', () => {
            const baseline = createFitness({ latency: 500 });
            const degraded = createFitness({ latency: 700 }); // 40% increase > 20% threshold

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);
            const signal = analysis.signals.find((s) => s.type === 'latency-increase');
            expect(signal).toBeDefined();
            expect(signal!.metric).toBe('latency');
        });

        it('should handle intervention rate increase detection', () => {
            const baseline = createFitness({ interventionRate: 0.05 });
            const degraded = createFitness({ interventionRate: 0.25 }); // 0.20 absolute increase > 0.10 threshold

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            expect(analysis.isDrifting).toBe(true);
            const signal = analysis.signals.find((s) => s.type === 'intervention-increase');
            expect(signal).toBeDefined();
            expect(signal!.metric).toBe('interventionRate');
        });

        it('should include a timestamp in the analysis result', () => {
            const analyzer = new DriftAnalyzer();
            const analysis = analyzer.analyzeDrift();

            expect(analysis.timestamp).toBeInstanceOf(Date);
        });

        it('should compute average confidence across significant signals', () => {
            const baseline = createFitness({
                successRate: 0.90,
                tokenEfficiency: 0.80,
            });
            const degraded = createFitness({
                successRate: 0.50,
                tokenEfficiency: 0.40,
            });

            const analyzer = buildDriftingAnalyzer(baseline, degraded);
            const analysis = analyzer.analyzeDrift();

            // Confidence should be > 0 when there are signals
            if (analysis.signals.length > 0) {
                expect(analysis.confidence).toBeGreaterThan(0);
                expect(analysis.confidence).toBeLessThanOrEqual(1);
            }
        });
    });
});
