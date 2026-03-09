/**
 * MutationOperator Tests
 *
 * Tests for PGA's mutation engine and operator library:
 * - MutationEngine registration, listing, and mutant generation
 * - CompressInstructionsOperator compression and deep cloning
 * - ReorderConstraintsOperator priority-based reordering
 * - SafetyReinforcementOperator safety content injection
 * - ToolSelectionBiasOperator tool usage adjustment
 * - selectMutationStrategy drift-aware ranking
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-09
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenomeV2, FitnessVector, OperativeGene } from '../../types/GenomeV2.js';
import type { MutationContext } from '../MutationOperator.js';
import {
    MutationEngine,
    CompressInstructionsOperator,
    ReorderConstraintsOperator,
    SafetyReinforcementOperator,
    ToolSelectionBiasOperator,
} from '../MutationOperator.js';
import { estimateTokenCount } from '../../utils/tokens.js';

// ─── Test Helpers ────────────────────────────────────────────

function createDefaultFitness(overrides?: Partial<FitnessVector>): FitnessVector {
    return {
        quality: 0.7,
        successRate: 0.8,
        tokenEfficiency: 0.6,
        latency: 900,
        costPerSuccess: 0.01,
        interventionRate: 0.1,
        composite: 0.75,
        sampleSize: 50,
        confidence: 0.9,
        lastUpdated: new Date(),
        ...overrides,
    };
}

function createTestGenome(): GenomeV2 {
    return {
        id: 'test-genome',
        name: 'Test',
        familyId: 'test-family',
        version: 1,
        chromosomes: {
            c0: {
                identity: { role: 'Test agent', purpose: 'Testing', constraints: ['Be helpful'] },
                security: { forbiddenTopics: [], accessControls: [], safetyRules: ['No harm'] },
                attribution: { creator: 'Test', copyright: 'Test', license: 'MIT' },
                metadata: { version: '2.0.0', createdAt: new Date() },
            },
            c1: {
                operations: [
                    {
                        id: 'gene-1',
                        category: 'tool-usage' as const,
                        content: 'Use tools efficiently. Be precise with tool calls. Always verify tool results.',
                        fitness: createDefaultFitness(),
                        origin: 'initial' as const,
                        usageCount: 50,
                        lastUsed: new Date(),
                        successRate: 0.85,
                        tokenCount: estimateTokenCount('Use tools efficiently. Be precise with tool calls. Always verify tool results.'),
                    },
                    {
                        id: 'gene-2',
                        category: 'coding-patterns' as const,
                        content: 'Write clean code. Follow best practices. Add error handling.',
                        fitness: createDefaultFitness({ quality: 0.65, successRate: 0.7, tokenEfficiency: 0.5, composite: 0.68, confidence: 0.85 }),
                        origin: 'initial' as const,
                        usageCount: 30,
                        lastUsed: new Date(),
                        successRate: 0.7,
                        tokenCount: estimateTokenCount('Write clean code. Follow best practices. Add error handling.'),
                    },
                ],
                metadata: { lastMutated: new Date(), mutationCount: 0, avgFitnessGain: 0 },
            },
            c2: {
                userAdaptations: new Map(),
                contextPatterns: [],
                metadata: { lastMutated: new Date(), adaptationRate: 0, totalUsers: 0 },
            },
        },
        integrity: { c0Hash: 'abc123', lastVerified: new Date(), violations: 0, quarantined: false },
        lineage: { inheritedGenes: [], mutations: [] },
        fitness: createDefaultFitness(),
        config: {
            mutationRate: 'balanced',
            epsilonExplore: 0.1,
            enableSandbox: true,
            minFitnessImprovement: 0.05,
            enableIntegrityCheck: true,
            autoRollbackThreshold: 0.15,
            allowInheritance: true,
            minCompatibilityScore: 0.6,
        },
        state: 'active',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function createContext(overrides?: Partial<MutationContext>): MutationContext {
    return {
        genome: createTestGenome(),
        targetChromosome: 'c1',
        reason: 'Test mutation',
        ...overrides,
    };
}

// ─── MutationEngine Registration & Listing ──────────────────

describe('MutationEngine', () => {
    it('should register the four default operators on construction', () => {
        const engine = new MutationEngine();
        const operators = engine.listOperators();

        expect(operators.length).toBe(4);

        const names = operators.map(op => op.name);
        expect(names).toContain('compress_instructions');
        expect(names).toContain('reorder_constraints');
        expect(names).toContain('safety_reinforcement');
        expect(names).toContain('tool_selection_bias');
    });

    it('should register a custom operator and make it retrievable', () => {
        const engine = new MutationEngine();

        const customOperator = {
            name: 'manual_edit' as const,
            description: 'Custom test operator',
            targetChromosome: 'c1' as const,
            async mutate(context: MutationContext) {
                return {
                    success: true,
                    mutant: context.genome,
                    mutation: {
                        id: 'test',
                        timestamp: new Date(),
                        chromosome: 'c1' as const,
                        operation: 'manual_edit' as const,
                        before: '',
                        after: '',
                        diff: '',
                        trigger: 'manual' as const,
                        reason: 'test',
                        sandboxTested: false,
                        promoted: false,
                        proposer: 'system' as const,
                    },
                    description: 'Custom mutation',
                    expectedImprovement: 0.05,
                };
            },
            estimateImprovement() { return 0.05; },
        };

        engine.registerOperator(customOperator);

        const retrieved = engine.getOperator('manual_edit');
        expect(retrieved).toBeDefined();
        expect(retrieved!.name).toBe('manual_edit');
        expect(retrieved!.description).toBe('Custom test operator');
    });

    it('should list all registered operators', () => {
        const engine = new MutationEngine();
        const operators = engine.listOperators();

        expect(Array.isArray(operators)).toBe(true);
        expect(operators.length).toBeGreaterThanOrEqual(4);

        for (const op of operators) {
            expect(op.name).toBeDefined();
            expect(op.description).toBeDefined();
            expect(op.targetChromosome).toBeDefined();
            expect(typeof op.mutate).toBe('function');
            expect(typeof op.estimateImprovement).toBe('function');
        }
    });

    it('should generate mutants up to the requested count', async () => {
        const engine = new MutationEngine();
        const context = createContext();

        const mutants = await engine.generateMutants(context, 3);

        expect(mutants.length).toBe(3);

        for (const result of mutants) {
            expect(result.success).toBe(true);
            expect(result.mutant).toBeDefined();
            expect(result.mutant.id).toBe('test-genome');
            expect(result.mutation).toBeDefined();
            expect(result.mutation.chromosome).toBe('c1');
            expect(result.description).toBeTruthy();
            expect(typeof result.expectedImprovement).toBe('number');
        }
    });

    it('should generate fewer mutants when count exceeds available operators', async () => {
        const engine = new MutationEngine();
        const context = createContext();

        const mutants = await engine.generateMutants(context, 10);

        // Only 4 default operators, so max 4 mutants
        expect(mutants.length).toBe(4);
    });

    it('should return ranked operators from selectMutationStrategy', () => {
        const engine = new MutationEngine();
        const context = createContext();

        const strategy = engine.selectMutationStrategy(context);

        expect(strategy.length).toBe(4);

        for (const entry of strategy) {
            expect(entry.operator).toBeDefined();
            expect(typeof entry.score).toBe('number');
            expect(typeof entry.reason).toBe('string');
        }

        // Verify descending sort by score
        for (let i = 1; i < strategy.length; i++) {
            expect(strategy[i - 1].score).toBeGreaterThanOrEqual(strategy[i].score);
        }
    });
});

// ─── CompressInstructionsOperator ───────────────────────────

describe('CompressInstructionsOperator', () => {
    it('should produce a valid mutation result', async () => {
        const operator = new CompressInstructionsOperator();
        const context = createContext();

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        expect(result.mutant).toBeDefined();
        expect(result.mutation).toBeDefined();
        expect(result.mutation.operation).toBe('compress_instructions');
        expect(result.mutation.chromosome).toBe('c1');
        expect(result.mutation.trigger).toBe('drift-detected');
        expect(result.mutation.proposer).toBe('system');
        expect(result.description).toContain('Compressed');
        expect(result.expectedImprovement).toBe(0.15);
    });

    it('should deep clone the genome so original is not mutated', async () => {
        const operator = new CompressInstructionsOperator();
        const context = createContext();

        const originalContent = context.genome.chromosomes.c1.operations[0].content;
        const result = await operator.mutate(context);

        // Original genome unchanged
        expect(context.genome.chromosomes.c1.operations[0].content).toBe(originalContent);

        // Mutant is a separate object
        expect(result.mutant).not.toBe(context.genome);
        expect(result.mutant.chromosomes).not.toBe(context.genome.chromosomes);
    });

    it('should remove redundant duplicate sentences', async () => {
        const operator = new CompressInstructionsOperator();
        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].content = 'Be precise. Be precise. Verify results.';
        const context = createContext({ genome });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        // After removing duplicates, "Be precise" should appear once
        const compressed = result.mutant.chromosomes.c1.operations[0].content;
        const occurrences = compressed.split('Be precise').length - 1;
        expect(occurrences).toBe(1);
    });

    it('should abbreviate common phrases', async () => {
        const operator = new CompressInstructionsOperator();
        const genome = createTestGenome();
        genome.chromosomes.c1.operations[0].content = 'for example use the search tool and so on';
        const context = createContext({ genome });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        const compressed = result.mutant.chromosomes.c1.operations[0].content;
        expect(compressed).toContain('e.g.');
        expect(compressed).toContain('etc.');
        expect(compressed).not.toContain('for example');
        expect(compressed).not.toContain('and so on');
    });

    it('should set tokenCount on compressed genes', async () => {
        const operator = new CompressInstructionsOperator();
        const context = createContext();

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        for (const gene of result.mutant.chromosomes.c1.operations) {
            expect(gene.tokenCount).toBeDefined();
            expect(gene.tokenCount).toBe(estimateTokenCount(gene.content));
        }
    });

    it('should have correct name and targetChromosome', () => {
        const operator = new CompressInstructionsOperator();

        expect(operator.name).toBe('compress_instructions');
        expect(operator.targetChromosome).toBe('c1');
        expect(operator.description).toBeTruthy();
    });

    it('should estimate higher improvement when token efficiency is low', () => {
        const operator = new CompressInstructionsOperator();

        const lowEffGenome = createTestGenome();
        lowEffGenome.fitness = createDefaultFitness({ tokenEfficiency: 0.2 });
        const lowEffContext = createContext({ genome: lowEffGenome });

        const highEffGenome = createTestGenome();
        highEffGenome.fitness = createDefaultFitness({ tokenEfficiency: 0.9 });
        const highEffContext = createContext({ genome: highEffGenome });

        const lowEstimate = operator.estimateImprovement(lowEffContext);
        const highEstimate = operator.estimateImprovement(highEffContext);

        expect(lowEstimate).toBeGreaterThan(highEstimate);
        expect(lowEstimate).toBeGreaterThan(0);
        expect(highEstimate).toBeGreaterThanOrEqual(0);
    });
});

// ─── ReorderConstraintsOperator ─────────────────────────────

describe('ReorderConstraintsOperator', () => {
    it('should reorder genes by category priority', async () => {
        const operator = new ReorderConstraintsOperator();

        // Create genome with genes in non-priority order
        const genome = createTestGenome();
        genome.chromosomes.c1.operations = [
            {
                id: 'gene-comm',
                category: 'communication',
                content: 'Communicate clearly.',
                fitness: createDefaultFitness(),
                origin: 'initial',
                usageCount: 10,
                lastUsed: new Date(),
                successRate: 0.8,
            },
            {
                id: 'gene-tool',
                category: 'tool-usage',
                content: 'Use tools correctly.',
                fitness: createDefaultFitness(),
                origin: 'initial',
                usageCount: 20,
                lastUsed: new Date(),
                successRate: 0.9,
            },
            {
                id: 'gene-reason',
                category: 'reasoning',
                content: 'Think step by step.',
                fitness: createDefaultFitness(),
                origin: 'initial',
                usageCount: 15,
                lastUsed: new Date(),
                successRate: 0.85,
            },
        ];
        const context = createContext({ genome });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        const reordered = result.mutant.chromosomes.c1.operations;

        // tool-usage (1) should come before reasoning (2) should come before communication (4)
        expect(reordered[0].category).toBe('tool-usage');
        expect(reordered[1].category).toBe('reasoning');
        expect(reordered[2].category).toBe('communication');
    });

    it('should have correct name and targetChromosome', () => {
        const operator = new ReorderConstraintsOperator();

        expect(operator.name).toBe('reorder_constraints');
        expect(operator.targetChromosome).toBe('c1');
        expect(operator.description).toBeTruthy();
    });

    it('should produce a consistent estimated improvement', () => {
        const operator = new ReorderConstraintsOperator();
        const context = createContext();

        const estimate = operator.estimateImprovement(context);

        expect(estimate).toBe(0.10);
    });

    it('should deep clone the genome so original gene order is preserved', async () => {
        const operator = new ReorderConstraintsOperator();
        const context = createContext();
        const originalOrder = context.genome.chromosomes.c1.operations.map(g => g.id);

        const result = await operator.mutate(context);

        // Original order unchanged
        const afterOrder = context.genome.chromosomes.c1.operations.map(g => g.id);
        expect(afterOrder).toEqual(originalOrder);

        // Mutant is separate
        expect(result.mutant).not.toBe(context.genome);
    });
});

// ─── SafetyReinforcementOperator ────────────────────────────

describe('SafetyReinforcementOperator', () => {
    it('should add safety checks to tool-usage genes', async () => {
        const operator = new SafetyReinforcementOperator();
        const context = createContext();

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);

        const toolGene = result.mutant.chromosomes.c1.operations.find(
            g => g.category === 'tool-usage'
        );
        expect(toolGene).toBeDefined();
        expect(toolGene!.content).toContain('SAFETY: Always validate inputs before tool execution.');
    });

    it('should add safety checks to coding-patterns genes', async () => {
        const operator = new SafetyReinforcementOperator();
        const context = createContext();

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);

        const codingGene = result.mutant.chromosomes.c1.operations.find(
            g => g.category === 'coding-patterns'
        );
        expect(codingGene).toBeDefined();
        expect(codingGene!.content).toContain('SAFETY: Check for security vulnerabilities');
    });

    it('should have correct name and targetChromosome', () => {
        const operator = new SafetyReinforcementOperator();

        expect(operator.name).toBe('safety_reinforcement');
        expect(operator.targetChromosome).toBe('c1');
        expect(operator.description).toBeTruthy();
    });

    it('should estimate higher improvement when intervention rate is high', () => {
        const operator = new SafetyReinforcementOperator();

        const highInterventionGenome = createTestGenome();
        highInterventionGenome.fitness = createDefaultFitness({ interventionRate: 0.8 });
        const highContext = createContext({ genome: highInterventionGenome });

        const lowInterventionGenome = createTestGenome();
        lowInterventionGenome.fitness = createDefaultFitness({ interventionRate: 0.05 });
        const lowContext = createContext({ genome: lowInterventionGenome });

        const highEstimate = operator.estimateImprovement(highContext);
        const lowEstimate = operator.estimateImprovement(lowContext);

        expect(highEstimate).toBeGreaterThan(lowEstimate);
    });

    it('should update tokenCount on reinforced genes', async () => {
        const operator = new SafetyReinforcementOperator();
        const context = createContext();

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);
        for (const gene of result.mutant.chromosomes.c1.operations) {
            if (gene.category === 'tool-usage' || gene.category === 'coding-patterns') {
                expect(gene.tokenCount).toBeDefined();
                expect(gene.tokenCount).toBe(estimateTokenCount(gene.content));
            }
        }
    });
});

// ─── ToolSelectionBiasOperator ──────────────────────────────

describe('ToolSelectionBiasOperator', () => {
    it('should adjust tool usage content for high-success-rate genes', async () => {
        const operator = new ToolSelectionBiasOperator();
        const genome = createTestGenome();
        // Set a high success rate on the tool-usage gene
        genome.chromosomes.c1.operations[0].successRate = 0.9;
        const context = createContext({ genome });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);

        const toolGene = result.mutant.chromosomes.c1.operations.find(
            g => g.category === 'tool-usage'
        );
        expect(toolGene).toBeDefined();
        expect(toolGene!.content).toContain('PRIORITY: Prefer this tool');
    });

    it('should add caution message for low-success-rate tool genes', async () => {
        const operator = new ToolSelectionBiasOperator();
        const genome = createTestGenome();
        // Set a low success rate on the tool-usage gene
        genome.chromosomes.c1.operations[0].successRate = 0.3;
        const context = createContext({ genome });

        const result = await operator.mutate(context);

        expect(result.success).toBe(true);

        const toolGene = result.mutant.chromosomes.c1.operations.find(
            g => g.category === 'tool-usage'
        );
        expect(toolGene).toBeDefined();
        expect(toolGene!.content).toContain('CAUTION: Use this tool sparingly');
    });

    it('should not modify non-tool-usage genes', async () => {
        const operator = new ToolSelectionBiasOperator();
        const context = createContext();

        const originalCodingContent = context.genome.chromosomes.c1.operations[1].content;
        const result = await operator.mutate(context);

        expect(result.success).toBe(true);

        const codingGene = result.mutant.chromosomes.c1.operations.find(
            g => g.category === 'coding-patterns'
        );
        expect(codingGene).toBeDefined();
        expect(codingGene!.content).toBe(originalCodingContent);
    });

    it('should have correct name and targetChromosome', () => {
        const operator = new ToolSelectionBiasOperator();

        expect(operator.name).toBe('tool_selection_bias');
        expect(operator.targetChromosome).toBe('c1');
        expect(operator.description).toBeTruthy();
    });

    it('should produce a consistent estimated improvement', () => {
        const operator = new ToolSelectionBiasOperator();
        const context = createContext();

        const estimate = operator.estimateImprovement(context);

        expect(estimate).toBe(0.12);
    });
});

// ─── Operator Name & Target Summary ─────────────────────────

describe('All operators have correct name and targetChromosome', () => {
    const operators = [
        { instance: new CompressInstructionsOperator(), expectedName: 'compress_instructions', expectedTarget: 'c1' },
        { instance: new ReorderConstraintsOperator(), expectedName: 'reorder_constraints', expectedTarget: 'c1' },
        { instance: new SafetyReinforcementOperator(), expectedName: 'safety_reinforcement', expectedTarget: 'c1' },
        { instance: new ToolSelectionBiasOperator(), expectedName: 'tool_selection_bias', expectedTarget: 'c1' },
    ];

    for (const { instance, expectedName, expectedTarget } of operators) {
        it(`${expectedName} has correct name and targetChromosome`, () => {
            expect(instance.name).toBe(expectedName);
            expect(instance.targetChromosome).toBe(expectedTarget);
            expect(typeof instance.description).toBe('string');
            expect(instance.description.length).toBeGreaterThan(0);
        });
    }
});
