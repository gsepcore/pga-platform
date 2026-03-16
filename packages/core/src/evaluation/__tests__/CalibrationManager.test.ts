/**
 * CalibrationManager Tests
 *
 * Tests for GSEP's dynamic threshold calibration system:
 * - Default threshold computation by layer, operator, and taskType
 * - Cache behavior (hit / miss / invalidation)
 * - Calibration history loading and persistence via StorageAdapter
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
        saveCalibrationPoint: vi.fn().mockResolvedValue(undefined),
        getCalibrationHistory: vi.fn().mockResolvedValue([]),
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
        it('should record a calibration point without errors', async () => {
            await expect(manager.recordCalibrationPoint(
                { layer: 1 },
                {
                    totalCandidates: 10,
                    passedSandbox: 8,
                    deployedSuccessfully: 7,
                    rolledBack: 1,
                },
                0.75,
            )).resolves.toBeUndefined();
        });

        it('should handle zero passedSandbox (avoid division by zero)', async () => {
            await expect(manager.recordCalibrationPoint(
                { layer: 2 },
                {
                    totalCandidates: 5,
                    passedSandbox: 0,
                    deployedSuccessfully: 0,
                    rolledBack: 0,
                },
                0.60,
            )).resolves.toBeUndefined();
        });

        it('should handle high false positive rate inputs', async () => {
            // FPR = 3/10 = 0.3 (high) — should not throw
            await expect(manager.recordCalibrationPoint(
                { layer: 1 },
                {
                    totalCandidates: 15,
                    passedSandbox: 10,
                    deployedSuccessfully: 7,
                    rolledBack: 3,
                },
                0.75,
            )).resolves.toBeUndefined();
        });

        it('should handle near-max threshold inputs', async () => {
            // Current threshold 0.98, FPR > 0.1 — should cap at 1.0 internally
            await expect(manager.recordCalibrationPoint(
                { layer: 0 },
                {
                    totalCandidates: 10,
                    passedSandbox: 5,
                    deployedSuccessfully: 3,
                    rolledBack: 2,
                },
                0.98,
            )).resolves.toBeUndefined();
        });

        it('should handle perfect deployment rate inputs', async () => {
            await expect(manager.recordCalibrationPoint(
                { operator: 'reorder_constraints' },
                {
                    totalCandidates: 12,
                    passedSandbox: 10,
                    deployedSuccessfully: 10,
                    rolledBack: 0,
                },
                0.70,
            )).resolves.toBeUndefined();
        });

        it('should invalidate cache for the recorded context', async () => {
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
        });
    });

    // ─── calculateOptimalThreshold (private) ─────────────────

    describe('calculateOptimalThreshold', () => {
        // Access private method for unit testing the threshold math
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const calc = (mgr: any) => mgr.calculateOptimalThreshold.bind(mgr);

        it('should increase threshold when falsePositiveRate > 0.1', () => {
            const fn = calc(manager);
            // FPR = 0.3, FNR = 0, current = 0.75 => 0.75 + 0.05 = 0.80
            expect(fn(0.3, 0, 0.75)).toBe(0.80);
        });

        it('should cap optimal threshold at 1.0', () => {
            const fn = calc(manager);
            // FPR = 0.4, current = 0.98 => Math.min(1.0, 1.03) = 1.0
            expect(fn(0.4, 0, 0.98)).toBe(1.0);
        });

        it('should decrease threshold when FNR > 0.2 and FPR < 0.05', () => {
            const fn = calc(manager);
            // Directly test the branch with FNR = 0.25, FPR = 0.01
            expect(fn(0.01, 0.25, 0.70)).toBeCloseTo(0.65);
        });

        it('should floor decreased threshold at 0.5', () => {
            const fn = calc(manager);
            // FNR = 0.25, FPR = 0.01, current = 0.50 => Math.max(0.5, 0.45) = 0.5
            expect(fn(0.01, 0.25, 0.50)).toBe(0.50);
        });

        it('should keep current threshold when neither condition is met', () => {
            const fn = calc(manager);
            // FPR = 0.05, FNR = 0.1, current = 0.70 => 0.70
            expect(fn(0.05, 0.1, 0.70)).toBe(0.70);
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

    // ─── Storage Persistence ─────────────────────────────────

    describe('storage persistence', () => {
        it('should persist calibration point via storage.saveCalibrationPoint', async () => {
            await manager.recordCalibrationPoint(
                { layer: 1, operator: 'compress_instructions' },
                {
                    totalCandidates: 20,
                    passedSandbox: 10,
                    deployedSuccessfully: 8,
                    rolledBack: 2,
                },
                0.65,
            );

            expect(mockStorage.saveCalibrationPoint).toHaveBeenCalledTimes(1);
            expect(mockStorage.saveCalibrationPoint).toHaveBeenCalledWith(
                expect.objectContaining({
                    contextKey: '1_compress_instructions_any',
                    layer: 1,
                    operator: 'compress_instructions',
                    threshold: 0.65,
                    totalCandidates: 20,
                    passedSandbox: 10,
                    rolledBack: 2,
                    falsePositiveRate: 0.2,
                }),
            );
        });

        it('should load history from storage and return calibrated threshold', async () => {
            // Mock storage returns 15 calibration points (>= 10 required)
            const mockPoints = Array.from({ length: 15 }, (_, i) => ({
                contextKey: '1_any_any',
                layer: 1,
                operator: undefined,
                taskType: undefined,
                threshold: 0.75,
                totalCandidates: 10,
                passedSandbox: 8,
                deployedSuccessfully: 7,
                rolledBack: 1,
                falsePositiveRate: 0.125,
                falseNegativeRate: 0,
                optimalThreshold: 0.80,
                timestamp: new Date(Date.now() - i * 3600000),
            }));

            (mockStorage.getCalibrationHistory as ReturnType<typeof vi.fn>)
                .mockResolvedValue(mockPoints);

            const result = await manager.getCalibratedThreshold({ layer: 1 });

            expect(result.source).toBe('calibrated');
            expect(result.threshold).toBeCloseTo(0.80);
            expect(result.confidence).toBeCloseTo(15 / 50);
        });

        it('should return default when storage has fewer than 10 data points', async () => {
            const mockPoints = Array.from({ length: 5 }, (_, i) => ({
                contextKey: '2_any_any',
                layer: 2,
                threshold: 0.60,
                totalCandidates: 5,
                passedSandbox: 5,
                deployedSuccessfully: 5,
                rolledBack: 0,
                falsePositiveRate: 0,
                falseNegativeRate: 0,
                optimalThreshold: 0.60,
                timestamp: new Date(Date.now() - i * 3600000),
            }));

            (mockStorage.getCalibrationHistory as ReturnType<typeof vi.fn>)
                .mockResolvedValue(mockPoints);

            const result = await manager.getCalibratedThreshold({ layer: 2 });

            expect(result.source).toBe('default');
            expect(result.threshold).toBe(0.60);
        });

        it('should return default when storage has no getCalibrationHistory method', async () => {
            // Create storage without calibration methods
            const bareStorage = createMockStorage();
            delete (bareStorage as Record<string, unknown>).getCalibrationHistory;
            delete (bareStorage as Record<string, unknown>).saveCalibrationPoint;

            const bareManager = new CalibrationManager(bareStorage);
            const result = await bareManager.getCalibratedThreshold({ layer: 1 });

            expect(result.source).toBe('default');
            expect(result.threshold).toBe(0.75);
        });

        it('should return cached on second call after calibrated load', async () => {
            const mockPoints = Array.from({ length: 12 }, (_, i) => ({
                contextKey: '1_any_any',
                layer: 1,
                threshold: 0.75,
                totalCandidates: 10,
                passedSandbox: 8,
                deployedSuccessfully: 7,
                rolledBack: 1,
                falsePositiveRate: 0.125,
                falseNegativeRate: 0,
                optimalThreshold: 0.80,
                timestamp: new Date(Date.now() - i * 3600000),
            }));

            (mockStorage.getCalibrationHistory as ReturnType<typeof vi.fn>)
                .mockResolvedValue(mockPoints);

            const result1 = await manager.getCalibratedThreshold({ layer: 1 });
            expect(result1.source).toBe('calibrated');

            const result2 = await manager.getCalibratedThreshold({ layer: 1 });
            expect(result2.source).toBe('cached');
            expect(result2.threshold).toBe(result1.threshold);
        });
    });
});
