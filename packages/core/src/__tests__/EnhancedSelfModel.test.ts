/**
 * EnhancedSelfModel Tests
 *
 * Tests for purpose-aware self-model with capability tracking,
 * evolution trajectory, and integrated health scoring.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import { describe, it, expect, vi } from 'vitest';
import { EnhancedSelfModel } from '../advanced-ai/EnhancedSelfModel.js';
import type { DriftAnalyzer, DriftAnalysis } from '../evolution/DriftAnalyzer.js';
import type { Genome } from '../types/index.js';

// ─── Helpers ────────────────────────────────────────────

function createMockGenome(overrides: Partial<Genome> = {}): Genome {
    return {
        id: 'genome-test',
        name: 'Test Agent',
        version: 1,
        layers: {
            layer0: [{
                gene: 'identity',
                variant: 'default',
                content: 'You are a helpful coding assistant.',
                fitness: 1.0,
                status: 'active' as const,
                createdAt: new Date(),
            }],
            layer1: [
                {
                    gene: 'tool-usage',
                    variant: 'default',
                    content: 'Use the right tool for the job.',
                    fitness: 0.8,
                    status: 'active' as const,
                    sampleCount: 10,
                    createdAt: new Date(),
                },
                {
                    gene: 'coding-patterns',
                    variant: 'default',
                    content: 'Write clean, maintainable code.',
                    fitness: 0.3,
                    status: 'active' as const,
                    sampleCount: 5,
                    createdAt: new Date(),
                },
            ],
            layer2: [
                {
                    gene: 'communication-style',
                    variant: 'default',
                    content: 'Be concise and direct.',
                    fitness: 0.6,
                    status: 'active' as const,
                    sampleCount: 3,
                    createdAt: new Date(),
                },
            ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Genome;
}

function createMockDriftAnalyzer(isDrifting = false, signals: DriftAnalysis['signals'] = []): DriftAnalyzer {
    return {
        analyzeDrift: vi.fn().mockReturnValue({
            isDrifting,
            overallSeverity: isDrifting ? 'moderate' : 'minor',
            signals,
            recommendedActions: [],
            confidence: 0.8,
            timestamp: new Date(),
        } satisfies DriftAnalysis),
        recordFitnessVector: vi.fn(),
    } as unknown as DriftAnalyzer;
}

// ─── Tests ──────────────────────────────────────────────

describe('EnhancedSelfModel', () => {
    describe('assessFull()', () => {
        it('should compute integrated health with all components', () => {
            const genome = createMockGenome();
            const driftAnalyzer = createMockDriftAnalyzer();
            const model = new EnhancedSelfModel(genome, driftAnalyzer, 'coding assistant');

            const health = model.assessFull();

            expect(health.score).toBeGreaterThan(0);
            expect(health.score).toBeLessThanOrEqual(1);
            expect(health.fitnessComponent).toBeGreaterThan(0);
            expect(health.driftComponent).toBe(1.0); // No drift
            expect(health.purposeComponent).toBeGreaterThan(0);
            expect(health.trajectoryComponent).toBe(0.5); // No trajectory data
            expect(['thriving', 'stable', 'stressed', 'struggling', 'critical']).toContain(health.label);
        });

        it('should label as thriving when all scores are high', () => {
            const genome = createMockGenome({
                layers: {
                    layer0: [{
                        gene: 'identity', variant: 'default', content: 'Coding assistant',
                        fitness: 1.0, status: 'active' as const, createdAt: new Date(),
                    }],
                    layer1: [{
                        gene: 'tool-usage', variant: 'default', content: 'Use tools well',
                        fitness: 0.95, status: 'active' as const, sampleCount: 20, createdAt: new Date(),
                    }],
                    layer2: [{
                        gene: 'style', variant: 'default', content: 'Be direct',
                        fitness: 0.9, status: 'active' as const, sampleCount: 10, createdAt: new Date(),
                    }],
                },
            } as unknown);
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'coding assistant');

            const health = model.assessFull();
            expect(health.label).toBe('thriving');
            expect(health.score).toBeGreaterThanOrEqual(0.75);
        });

        it('should decrease drift component when drifting', () => {
            const signals = [{
                type: 'quality-decline' as const,
                severity: 'moderate' as const,
                metric: 'quality',
                currentValue: 0.5,
                baselineValue: 0.8,
                percentageChange: -0.375,
                confidence: 0.85,
                timestamp: new Date(),
                recommendation: 'Investigate quality decline',
            }];
            const genome = createMockGenome();
            const driftAnalyzer = createMockDriftAnalyzer(true, signals);
            const model = new EnhancedSelfModel(genome, driftAnalyzer, 'coding assistant');

            const health = model.assessFull();
            expect(health.driftComponent).toBeLessThan(1.0);
        });

        it('should label as struggling or critical with very low scores', () => {
            const genome = createMockGenome({
                layers: {
                    layer0: [{
                        gene: 'identity', variant: 'default', content: 'Helper',
                        fitness: 1.0, status: 'active' as const, createdAt: new Date(),
                    }],
                    layer1: [
                        {
                            gene: 'tool-usage', variant: 'default', content: 'Use tools',
                            fitness: 0.1, status: 'active' as const, sampleCount: 20, createdAt: new Date(),
                        },
                        {
                            gene: 'coding', variant: 'default', content: 'Write code',
                            fitness: 0.05, status: 'active' as const, sampleCount: 10, createdAt: new Date(),
                        },
                        {
                            gene: 'analysis', variant: 'default', content: 'Analyze',
                            fitness: 0.08, status: 'active' as const, sampleCount: 8, createdAt: new Date(),
                        },
                    ],
                    layer2: [],
                },
            } as unknown);
            const signals = [
                {
                    type: 'quality-decline' as const, severity: 'critical' as const,
                    metric: 'quality', currentValue: 0.1, baselineValue: 0.8,
                    percentageChange: -0.875, confidence: 0.9, timestamp: new Date(),
                    recommendation: 'Critical quality decline',
                },
                {
                    type: 'efficiency-decline' as const, severity: 'critical' as const,
                    metric: 'efficiency', currentValue: 0.1, baselineValue: 0.7,
                    percentageChange: -0.857, confidence: 0.9, timestamp: new Date(),
                    recommendation: 'Critical efficiency decline',
                },
            ];
            const driftAnalyzer = createMockDriftAnalyzer(true, signals);
            const model = new EnhancedSelfModel(genome, driftAnalyzer, 'coding assistant');

            const health = model.assessFull();
            // With very low fitness (~0.077), critical drift (0.0), and multiple weak genes
            // score should be < 0.25 (critical) or < 0.40 (struggling)
            expect(health.score).toBeLessThan(0.40);
            expect(['critical', 'struggling']).toContain(health.label);
        });
    });

    describe('recordCapability()', () => {
        it('should track capability per taskType × gene', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            model.recordCapability('refactoring', 'coding-patterns', 0.85);
            model.recordCapability('debugging', 'tool-usage', 0.75);

            const capabilities = model.getCapabilities();
            expect(capabilities).toHaveLength(2);
            expect(capabilities[0].taskType).toBe('refactoring');
            expect(capabilities[0].gene).toBe('coding-patterns');
            expect(capabilities[0].performanceScore).toBeCloseTo(0.85);
        });

        it('should compute running average on repeated recordings', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            model.recordCapability('coding', 'tool-usage', 0.80);
            model.recordCapability('coding', 'tool-usage', 0.90);

            const capabilities = model.getCapabilities();
            expect(capabilities).toHaveLength(1);
            expect(capabilities[0].sampleCount).toBe(2);
            expect(capabilities[0].performanceScore).toBeCloseTo(0.85);
        });

        it('should detect improving trend', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            // Need at least 3 samples for non-stable trend
            model.recordCapability('coding', 'tool-usage', 0.50);
            model.recordCapability('coding', 'tool-usage', 0.70);
            model.recordCapability('coding', 'tool-usage', 0.90);

            const capabilities = model.getCapabilities();
            expect(capabilities[0].trend).toBe('improving');
        });
    });

    describe('assessPurposeAlignment()', () => {
        it('should return alignment score between 0 and 1', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'coding assistant');

            const alignment = model.assessPurposeAlignment();
            expect(alignment.purpose).toBe('coding assistant');
            expect(alignment.alignmentScore).toBeGreaterThanOrEqual(0);
            expect(alignment.alignmentScore).toBeLessThanOrEqual(1);
        });

        it('should penalize low-fitness genes', () => {
            // Default genome has coding-patterns at 0.3 which is < 0.4
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'coding assistant');

            const alignment = model.assessPurposeAlignment();
            expect(alignment.driftFromPurpose.length).toBeGreaterThan(0);
            expect(alignment.driftFromPurpose[0]).toContain('coding-patterns');
        });
    });

    describe('getHardLimits()', () => {
        it('should return known architectural limits', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            const limits = model.getHardLimits();
            expect(limits.length).toBeGreaterThan(0);
            expect(limits.some(l => l.category === 'architectural')).toBe(true);
            expect(limits.some(l => l.category === 'ethical')).toBe(true);
        });
    });

    describe('recordFitnessSnapshot() + getTrajectories()', () => {
        it('should record snapshots and compute trajectories', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            // Record first snapshot
            model.recordFitnessSnapshot();

            // Modify fitness and record second
            genome.layers.layer1[0].fitness = 0.85;
            model.recordFitnessSnapshot();

            const trajectories = model.getTrajectories();
            expect(trajectories.length).toBeGreaterThan(0);
        });

        it('should detect improving trajectory when fitness increases', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            // Record multiple snapshots with increasing fitness
            model.recordFitnessSnapshot();
            genome.layers.layer1[0].fitness = 0.90;
            model.recordFitnessSnapshot();
            genome.layers.layer1[0].fitness = 0.95;
            model.recordFitnessSnapshot();

            const trajectories = model.getTrajectories();
            const toolUsage = trajectories.find(t => t.gene === 'tool-usage');
            expect(toolUsage).toBeDefined();
            expect(toolUsage!.trend).toBe('improving');
        });

        it('should detect declining trajectory when fitness drops', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            model.recordFitnessSnapshot();
            genome.layers.layer1[0].fitness = 0.5;
            model.recordFitnessSnapshot();
            genome.layers.layer1[0].fitness = 0.3;
            model.recordFitnessSnapshot();

            const trajectories = model.getTrajectories();
            const toolUsage = trajectories.find(t => t.gene === 'tool-usage');
            expect(toolUsage).toBeDefined();
            expect(toolUsage!.trend).toBe('declining');
        });
    });

    describe('toPromptSection()', () => {
        it('should include purpose in output', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'coding assistant');

            const section = model.toPromptSection();
            expect(section).not.toBeNull();
            expect(section).toContain('coding assistant');
            expect(section).toContain('Purpose');
            expect(section).toContain('Health');
        });

        it('should include trajectory info when available', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test agent');

            // Build trajectory
            model.recordFitnessSnapshot();
            genome.layers.layer1[0].fitness = 0.95;
            model.recordFitnessSnapshot();

            const section = model.toPromptSection();
            expect(section).not.toBeNull();
            expect(section).toContain('Improving');
        });
    });

    describe('inherits SelfModel', () => {
        it('should still work with base assess()', () => {
            const genome = createMockGenome();
            const model = new EnhancedSelfModel(genome, createMockDriftAnalyzer(), 'test');

            const assessment = model.assess();
            expect(assessment.overallHealth).toBeDefined();
            expect(assessment.lastAssessed).toBeInstanceOf(Date);
        });
    });
});
