import { describe, it, expect } from 'vitest';
import { PGA } from '../../PGA';
import type { LLMAdapter, Message } from '../../interfaces/LLMAdapter';
import type { StorageAdapter } from '../../interfaces/StorageAdapter';
import type { Genome, MutationLog, UserDNA, GeneRegistryEntry } from '../../types';

class MockLLM implements LLMAdapter {
  readonly name = 'mock';
  readonly model = 'mock-1';

  async chat(messages: Message[]) {
    const last = messages[messages.length - 1];
    return {
      content: `echo:${last.content}`,
      usage: { inputTokens: 10, outputTokens: 5 },
    };
  }
}

class MemoryStorage implements StorageAdapter {
  genomes = new Map<string, Genome>();
  dna = new Map<string, UserDNA>();
  interactions: unknown[] = [];
  mutations: MutationLog[] = [];
  registry: GeneRegistryEntry[] = [];

  async initialize(): Promise<void> {}
  async saveGenome(genome: Genome): Promise<void> { this.genomes.set(genome.id, structuredClone(genome)); }
  async loadGenome(genomeId: string): Promise<Genome | null> { return this.genomes.get(genomeId) || null; }
  async deleteGenome(genomeId: string): Promise<void> { this.genomes.delete(genomeId); }
  async listGenomes(): Promise<Genome[]> { return [...this.genomes.values()]; }

  async saveDNA(userId: string, genomeId: string, dna: UserDNA): Promise<void> {
    this.dna.set(`${userId}:${genomeId}`, dna);
  }
  async loadDNA(userId: string, genomeId: string): Promise<UserDNA | null> {
    return this.dna.get(`${userId}:${genomeId}`) || null;
  }

  async logMutation(mutation: MutationLog): Promise<void> { this.mutations.push(mutation); }
  async getMutationHistory(genomeId: string): Promise<MutationLog[]> {
    return this.mutations.filter(m => m.genomeId === genomeId);
  }
  async getGeneMutationHistory(genomeId: string, gene: string): Promise<MutationLog[]> {
    return this.mutations.filter(m => m.genomeId === genomeId && m.gene === gene);
  }

  async recordInteraction(interaction: { genomeId: string; userId: string; userMessage: string; assistantResponse: string; toolCalls: unknown[]; score?: number; timestamp: Date; }): Promise<void> {
    this.interactions.push(interaction);
  }
  async getRecentInteractions(genomeId: string, userId: string): Promise<unknown[]> {
    return this.interactions.filter((i: any) => i.genomeId === genomeId && i.userId === userId);
  }
  async recordFeedback(): Promise<void> {}

  async saveGeneRegistryEntry(entry: GeneRegistryEntry): Promise<void> { this.registry.push(entry); }
  async listGeneRegistryEntries(familyId: string, gene?: string): Promise<GeneRegistryEntry[]> {
    return this.registry.filter(e => e.familyId === familyId && (!gene || e.gene === gene));
  }

  async getAnalytics(): Promise<{ totalMutations: number; totalInteractions: number; avgFitnessImprovement: number; userSatisfaction: number; topGenes: Array<{ gene: string; fitness: number }>; }> {
    return {
      totalMutations: this.mutations.length,
      totalInteractions: this.interactions.length,
      avgFitnessImprovement: 0,
      userSatisfaction: 0,
      topGenes: [],
    };
  }
}

describe('Genome evolution foundations', () => {
  it('creates genomes with family/version/lineage/c0 hash', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({ name: 'agent-a', familyId: 'fam-a' });
    const exported = await genome.export();

    expect(exported.familyId).toBe('fam-a');
    expect(exported.version).toBe(1);
    expect(exported.lineage.parentVersion).toBe(null);
    expect(exported.c0IntegrityHash.startsWith('sha256:')).toBe(true);
  });

  it('supports mutation + rollback + registry publish/inherit', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const sourceGenome = await pga.createGenome({ name: 'agent-b-source', familyId: 'fam-b' });
    const targetGenome = await pga.createGenome({ name: 'agent-b-target', familyId: 'fam-b' });

    await sourceGenome.mutate({
      userId: 'u1',
      layer: 2,
      operators: ['reorder_constraints'],
      candidates: 1,
      minImprovement: -1,
      taskType: 'general',
    });

    const afterMutation = await sourceGenome.export();
    expect(afterMutation.version).toBeGreaterThan(1);

    const activeMut = afterMutation.layers.layer2.find(a => a.variant.startsWith('mut-'));
    expect(activeMut).toBeDefined();

    await sourceGenome.publishGeneToRegistry({ layer: 2, gene: activeMut!.gene, variant: activeMut!.variant });
    const inherited = await targetGenome.inheritGeneFromRegistry({ layer: 2, gene: activeMut!.gene, minFitness: 0 });
    expect(inherited).toBe(true);

    await sourceGenome.rollback({ layer: 2, gene: activeMut!.gene, variant: activeMut!.variant });
    const postRollback = await sourceGenome.export();
    const retired = postRollback.layers.layer2.find(a => a.variant === activeMut!.variant);
    expect(retired?.status).toBe('retired');
  });



  it('applies promotion gate threshold for mutations', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({ name: 'agent-c', familyId: 'fam-c' });
    const beforeVersion = (await genome.export()).version;

    await genome.mutate({
      layer: 2,
      operators: ['compress_instructions'],
      candidates: 2,
      minImprovement: 0.5, // deliberately high threshold to force rejection
    });

    const after = await genome.export();
    expect(after.version).toBe(beforeVersion);

    const history = await storage.getMutationHistory(after.id);
    expect(history.some(m => m.deployed === false)).toBe(true);
  });


  it('rejects mutation when sandbox gate fails all candidates', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({ name: 'agent-e', familyId: 'fam-e' });
    const beforeVersion = (await genome.export()).version;

    await genome.mutate({
      layer: 2,
      operators: ['compress_instructions'],
      candidates: 2,
      taskType: 'general',
      minImprovement: 0.01,
    });

    const after = await genome.export();
    expect(after.version).toBe(beforeVersion);

    const history = await storage.getMutationHistory(after.id);
    const reject = history.find(m => m.details?.reason === 'sandbox_gate_failed');
    expect(reject).toBeDefined();
    expect(typeof reject?.details?.sandboxGateThreshold).toBe('number');
    expect(Array.isArray(reject?.details?.candidates)).toBe(true);
    expect(reject?.details?.candidates?.every((c: any) => Array.isArray(c.failedCaseIds))).toBe(true);
    expect(reject?.details?.candidates?.some((c: any) => c.failedCaseIds.length > 0)).toBe(true);
  });

  it('promotes mutation when sandbox suite passes semantic checks', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({ name: 'agent-f', familyId: 'fam-f' });
    const beforeVersion = (await genome.export()).version;

    await genome.mutate({
      layer: 2,
      operators: ['reorder_constraints'],
      candidates: 1,
      taskType: 'general',
      minImprovement: -1,
    });

    const after = await genome.export();
    expect(after.version).toBeGreaterThan(beforeVersion);

    const history = await storage.getMutationHistory(after.id);
    expect(history.some(m => m.deployed === true && m.mutationType === 'exploratory')).toBe(true);
  });


  it('rejects mutation when economic guardrail compression threshold is not met', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({
      name: 'agent-g',
      familyId: 'fam-g',
      config: {
        evolutionGuardrails: {
          minCompressionScore: 0.99,
          minSandboxScore: 0.6,
          minQualityDelta: -1,
        },
      },
    });

    const beforeVersion = (await genome.export()).version;

    await genome.mutate({
      layer: 2,
      operators: ['reorder_constraints'],
      candidates: 1,
      taskType: 'general',
      minImprovement: -1,
    });

    const after = await genome.export();
    expect(after.version).toBe(beforeVersion);

    const history = await storage.getMutationHistory(after.id);
    const reject = history.find(m => m.details?.reason === 'economic_gate_failed');
    expect(reject).toBeDefined();
  });

  it('computes evolution health metrics', async () => {
    const storage = new MemoryStorage();
    const pga = new PGA({ llm: new MockLLM(), storage });

    const genome = await pga.createGenome({ name: 'agent-d', familyId: 'fam-d' });

    await genome.mutate({ layer: 2, operators: ['reorder_constraints'], candidates: 2, minImprovement: -1, taskType: 'coding' });
    await genome.mutate({ layer: 2, operators: ['reorder_constraints'], candidates: 2, minImprovement: 0.9, taskType: 'coding' });

    const exported = await genome.export();
    const activeMut = exported.layers.layer2.find(a => a.variant.startsWith('mut-') && a.status === 'active');
    if (activeMut) {
      await genome.rollback({ layer: 2, gene: activeMut.gene, variant: activeMut.variant });
    }

    const health = await genome.getEvolutionHealth();

    expect(health.totalMutations).toBeGreaterThan(0);
    expect(health.promotionAccepted).toBeGreaterThanOrEqual(1);
    expect(health.promotionRejected).toBeGreaterThanOrEqual(1);
    expect(health.rollbackCount).toBeGreaterThanOrEqual(0);
    expect(health.acceptanceRate).toBeGreaterThanOrEqual(0);
    expect(health.acceptanceRate).toBeLessThanOrEqual(1);
  });

});
