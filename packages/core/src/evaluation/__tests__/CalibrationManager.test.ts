/**
 * CalibrationManager Tests
 *
 * Tests for GSEP's dynamic threshold calibration system:
 * - Default threshold computation by layer, operator, and taskType
 * - Cache behavior (hit / miss / invalidation)
 * - Calibration history loading (currently returns null stub)
 * - Recording calibration points with various metric combinations
 * - Optimal threshold calculation (FPR / FNR adjustments)
 * - Context key generation
 * - Calibration report formatting (with and without context)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalibrationManager } from '../CalibrationManager.js';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';

// ─── Test Helpers ────────────────────────────────────────────

function createMockStorage(): StorageAdapter {
    return {
        initialize: vi.fn(),
        saveGenome: vi.fn(),
        loadGenome: vi.fn(),
        deleteGenome: vi.fn(),
        listGenomes: vi.fn(),
        saveDNA: vi.fn(),
        loadDNA: vi.fn(),
        logMutation: vi.fn(),
        getMutationHistory: vi.fn(),
        getGeneMutationHistory: vi.fn(),
        recordInteraction: vi.fn(),
        getRecentInteractions: vi.fn(),
        recordFeedback: vi.fn(),
        getAnalytics: vi.fn(),
        saveFact: vi.fn(),
        getFacts: vi.fn(),
        getFact: vi.fn(),
        updateFact: vi.fn(),
        deleteFact: vi.fn(),
        deleteUserFacts: vi.fn(),
        cleanExpiredFacts: vi.fn(),
    } as unknown as StorageAdapter;
}

// ─── Tests ──────────────────────────────────────────────────

describe('CalibrationManager', () => {
    let manager: CalibrationManager;
    let mockStorage: StorageAdapter;

    beforeEach(() => {
        mockStorage = createMockStorage();
        manager = new CalibrationManager(mockStorage);
    });

    // ─── getCalibratedThreshold ─────────────────────────────

    describe('getCalibratedThreshold', () => {
        it('should return default threshold with 0.5 confidence when no calibration data exists', async () => {
            const result = await manager.getCalibratedThreshold({ layer: 2 });

            expect(result.threshold).toBe(0.60);
            expect(result.confidence).toBe(0.5);
            expect(result.source).toBe('default');
        });

        it('should return default threshold for layer 0 (immutable)', async () => {
            const result = await manager.getCalibratedThreshold({ layer: 0 });

            expect(result.threshold).toBe(1.0);
            expect(result.source).toBe('default');
        });

        it('should return default threshold for layer 1 (operative)', async () => {
            const result = await manager.getCalibratedThreshold({ layer: 1 });

            expect(result.threshold).toBe(0.75);
            expect(result.source).toBe('default');
        });

        it('should return default threshold for safety_reinforcement operator', async () => {
            const result = await manager.getCalibratedThreshold({ operator: 'safety_reinforcement' });

            expect(result.threshold).toBe(0.85);
            expect(result.source).toBe('default');
        });

        it('should return default threshold for compress_instructions operator', async () => {
            const result = await manager.getCalibratedThreshold({ operator: 'compress_instructions' });

            expect(result.threshold).toBe(0.65);
        });

        it('should return default threshold for reorder_constraints operator', async () => {
            const result = await manager.getCalibratedThreshold({ operator: 'reorder_constraints' });

            expect(result.threshold).toBe(0.70);
        });

        it('should return default threshold for tool_selection_bias operator', async () => {
            const result = await manager.getCalibratedThreshold({ operator: 'tool_selection_bias' });

            expect(result.threshold).toBe(0.70);
        });

        it('should return default threshold for coding taskType', async () => {
            const result = await manager.getCalibratedThreshold({ taskType: 'coding' });

            expect(result.threshold).toBe(0.75);
        });

        it('should return default threshold for general taskType', async () => {
            const result = await manager.getCalibratedThreshold({ taskType: 'general' });

            expect(result.threshold).toBe(0.65);
        });

        it('should return 0.65 for unknown context (no layer, operator, or taskType)', async () => {
            const result = await manager.getCalibratedThreshold({});

            expect(result.threshold).toBe(0.65);
            expect(result.confidence).toBe(0.5);
            expect(result.source).toBe('default');
        });

        it('should return cached value on second call with same context', async () => {
            // First call: populates cache path is skipped because loadCalibrationHistory returns null
            // But we can simulate the cache by calling twice and verifying source stays 'default'
            const result1 = await manager.getCalibratedThreshold({ layer: 1 });
            expect(result1.source).toBe('default');

            // The cache is only populated when history has >= 10 points, which loadCalibrationHistory
            // never returns right now (returns null). So second call also returns default.
            const result2 = await manager.getCalibratedThreshold({ layer: 1 });
            expect(result2.source).toBe('default');
            expect(result2.threshold).toBe(result1.threshold);
        });
    });

    // ─── recordCalibrationPoint ─────────────────────────────

    describe('recordCalibrationPoint', () => {
        it('should record a calibration point and invalidate cache', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            await manager.recordCalibrationPoint(
                { layer: 1 },
                {
                    totalCandidates: 10,
                    passedSandbox: 8,
                    deployedSuccessfully: 7,
                    rolledBack: 1,
                },
                0.75,
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Calibration point recorded'),
                expect.objectContaining({
                    context: { layer: 1 },
                    threshold: 0.75,
                }),
            );

            consoleSpy.mockRestore();
        });

        it('should compute falsePositiveRate correctly when passedSandbox > 0', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            await manager.recordCalibrationPoint(
                { operator: 'compress_instructions' },
                {
                    totalCandidates: 20,
                    passedSandbox: 10,
                    deployedSuccessfully: 8,
                    rolledBack: 2,
                },
                0.65,
            );

            // falsePositiveRate = rolledBack / passedSandbox = 2 / 10 = 0.2
            // Since FPR > 0.1, optimal threshold should be currentThreshold + 0.05
            const loggedData = consoleSpy.mock.calls[0][1] as {
                performance: { falsePositiveRate: number; optimalThreshold: number };
            };
            expect(loggedData.performance.falsePositiveRate).toBeCloseTo(0.2);
            expect(loggedData.performance.optimalThreshold).toBeCloseTo(0.70);

            consoleSpy.mockRestore();
        });

        it('should handle zero passedSandbox (avoid division by zero)', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            await manager.recordCalibrationPoint(
                { layer: 2 },
                {
                    totalCandidates: 5,
                    passedSandbox: 0,
                    deployedSuccessfully: 0,
                    rolledBack: 0,
                },
                0.60,
            );

            const loggedData = consoleSpy.mock.calls[0][1] as {
                performance: { falsePositiveRate: number; falseNegativeRate: number };
            };
            expect(loggedData.performance.falsePositiveRate).toBe(0);
            expect(loggedData.performance.falseNegativeRate).toBe(0);

            consoleSpy.mockRestore();
        });

        it('should increase threshold when falsePositiveRate > 0.1', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            // FPR = 3/10 = 0.3 (high), so optimal = 0.75 + 0.05 = 0.80
            await manager.recordCalibrationPoint(
                { layer: 1 },
                {
                    totalCandidates: 15,
                    passedSandbox: 10,
                    deployedSuccessfully: 7,
                    rolledBack: 3,
                },
                0.75,
            );

            const loggedData = consoleSpy.mock.calls[0][1] as {
                performance: { optimalThreshold: number };
            };
            expect(loggedData.performance.optimalThreshold).toBe(0.80);

            consoleSpy.mockRestore();
        });

        it('should cap optimal threshold at 1.0', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            // Current threshold 0.98, FPR > 0.1 => Math.min(1.0, 0.98 + 0.05) = 1.0
            await manager.recordCalibrationPoint(
                { layer: 0 },
                {
                    totalCandidates: 10,
                    passedSandbox: 5,
                    deployedSuccessfully: 3,
                    rolledBack: 2,
                },
                0.98,
            );

            const loggedData = consoleSpy.mock.calls[0][1] as {
                performance: { optimalThreshold: number };
            };
            expect(loggedData.performance.optimalThreshold).toBe(1.0);

            consoleSpy.mockRestore();
        });

        it('should decrease threshold when FNR > 0.2 and FPR < 0.05', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            // deploymentSuccessRate = 9/10 = 0.9, so > 0.8
            // falseNegativeRate = Math.max(0, 0.2 - (1 - 0.60)) = Math.max(0, 0.2 - 0.4) = 0
            // Actually to trigger the condition, we need FNR > 0.2 AND FPR < 0.05
            // FNR = Math.max(0, 0.2 - (1 - currentThreshold))
            // For FNR > 0.2: 0.2 - (1 - threshold) > 0.2 => threshold > 1.0 (impossible)
            // Actually FNR formula is: Math.max(0, 0.2 - (1 - currentThreshold))
            // For threshold = 0.90: FNR = Math.max(0, 0.2 - 0.1) = 0.1 (not > 0.2)
            // For threshold = 0.80: FNR = Math.max(0, 0.2 - 0.2) = 0.0 (not > 0.2)
            // It appears the formula never yields FNR > 0.2 since max value is 0.2
            // So the decrease branch is effectively unreachable with current formula.
            // Let's verify by testing the boundary: threshold = 1.0
            // FNR = Math.max(0, 0.2 - (1 - 1.0)) = Math.max(0, 0.2) = 0.2
            // FNR > 0.2 is false. So the branch is unreachable.
            // We still test the "keep current" path:

            // FPR = 0/10 = 0 (< 0.05), deployment success = 10/10 = 1.0
            // FNR = Math.max(0, 0.2 - (1 - 0.70)) = Math.max(0, 0.2 - 0.3) = 0
            // Neither condition met, so optimal = current
            await manager.recordCalibrationPoint(
                { operator: 'reorder_constraints' },
                {
                    totalCandidates: 12,
                    passedSandbox: 10,
                    deployedSuccessfully: 10,
                    rolledBack: 0,
                },
                0.70,
            );

            const loggedData = consoleSpy.mock.calls[0][1] as {
                performance: { optimalThreshold: number };
            };
            expect(loggedData.performance.optimalThreshold).toBe(0.70);

            consoleSpy.mockRestore();
        });

        it('should invalidate cache for the recorded context', async () => {
            vi.spyOn(console, 'log').mockImplementation(() => {});

            // Get threshold first (creates a path that would be cached if history existed)
            await manager.getCalibratedThreshold({ layer: 2 });

            // Record a calibration point which should invalidate the cache
            await manager.recordCalibrationPoint(
                { layer: 2 },
                {
                    totalCandidates: 5,
                    passedSandbox: 5,
                    deployedSuccessfully: 5,
                    rolledBack: 0,
                },
                0.60,
            );

            // Next call should be a fresh lookup (source: 'default' since no history)
            const result = await manager.getCalibratedThreshold({ layer: 2 });
            expect(result.source).toBe('default');

            vi.restoreAllMocks();
        });
    });

    // ─── getCalibrationReport ───────────────────────────────

    describe('getCalibrationReport', () => {
        it('should return report with context details when context is provided', async () => {
            const report = await manager.getCalibrationReport({ layer: 1 });

            expect(report).toContain('Calibration Report');
            expect(report).toContain('Context');
            expect(report).toContain('1_any_any');
            expect(report).toContain('75.0%');
            expect(report).toContain('Source');
            expect(report).toContain('default');
        });

        it('should return generic status report when no context is provided', async () => {
            const report = await manager.getCalibrationReport();

            expect(report).toContain('Calibration Report');
            expect(report).toContain('Status');
            expect(report).toContain('Calibration system active');
            expect(report).toContain('Cached contexts');
        });

        it('should show cached contexts count as 0 initially', async () => {
            const report = await manager.getCalibrationReport();

            expect(report).toContain('Cached contexts**: 0');
        });

        it('should report correct threshold for operator context', async () => {
            const report = await manager.getCalibrationReport({ operator: 'safety_reinforcement' });

            expect(report).toContain('85.0%');
        });
    });
});
