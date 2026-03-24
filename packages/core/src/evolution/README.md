# GSEP Evolution Engine - Living OS Core

**Version**: 2.0.0
**Author**: Luis Alfredo Velasquez Duran
**Created**: 2026-02-27

The Evolution Engine is the heart of GSEP's "Living OS" - enabling autonomous self-improvement without human intervention.

---

## 🎯 Overview

The Evolution Engine consists of 4 interconnected components that form a complete autonomous evolution cycle:

```
┌─────────────────────────────────────────────────────┐
│                 EVOLUTION CYCLE                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. DRIFT DETECTION (Proactive)                     │
│     DriftAnalyzer monitors performance               │
│     Triggers mutation when drift detected            │
│                                                      │
│  2. MUTATION GENERATION                              │
│     MutationEngine generates 3 candidates            │
│     Each optimized for specific improvement          │
│                                                      │
│  3. FITNESS EVALUATION                               │
│     FitnessCalculator computes multi-objective       │
│     6-dimensional optimization                       │
│                                                      │
│  4. EVOLUTION GUARDRAILS                             │
│     EvolutionGuardrailsManager validates mutation    │
│     4-gate checks: Quality, Sandbox, Economic,      │
│     Stability — with canary deployment fallback      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Components

### 1. DriftAnalyzer

**Purpose**: Proactive performance monitoring - detects issues BEFORE user feedback.

**Key Features**:
- Detects 5 types of drift: success rate, token efficiency, latency, cost, intervention rate
- Configurable thresholds per metric
- Confidence scoring based on sample size
- Automated recommendations

**Usage**:
```typescript
import { DriftAnalyzer } from '@gsep/core';

const analyzer = new DriftAnalyzer({
  successRateThreshold: 0.10,     // 10% drop triggers alert
  tokenEfficiencyThreshold: 0.15, // 15% worse triggers alert
  latencyThreshold: 0.20,          // 20% slower triggers alert
});

// Record after each interaction
analyzer.recordFitness(fitnessVector);

// Check for drift
const analysis = analyzer.analyzeDrift();

if (analysis.isDrifting) {
  console.log(`Severity: ${analysis.overallSeverity}`);
  console.log(`Signals: ${analysis.signals.length}`);
  console.log(`Actions: ${analysis.recommendedActions}`);
}
```

**Output**:
```typescript
{
  isDrifting: true,
  overallSeverity: 'moderate',
  signals: [
    {
      type: 'token-efficiency-decline',
      severity: 'moderate',
      metric: 'tokenEfficiency',
      currentValue: 0.70,
      baselineValue: 0.85,
      percentageChange: -17.6,
      confidence: 0.88,
      recommendation: 'Apply compress_instructions mutation'
    }
  ],
  recommendedActions: [
    'Token usage increasing. Apply compress_instructions mutation',
    'Consider reorder_constraints to improve efficiency'
  ],
  confidence: 0.88
}
```

---

### 2. MutationOperator

**Purpose**: Generates controlled mutations optimized for specific improvements.

**Built-in Operators**:
1. **compress_instructions** - Reduces token count (-15-20%)
2. **reorder_constraints** - Improves quality (+10%)
3. **safety_reinforcement** - Reduces interventions (-8-15%)
4. **tool_selection_bias** - Optimizes tool usage (+12%)

**Usage**:
```typescript
import { MutationEngine } from '@gsep/core';

const engine = new MutationEngine();

// Generate 3 mutation candidates
const mutants = await engine.generateMutants({
  genome: currentGenome,
  targetChromosome: 'c1',
  reason: 'Token efficiency declining',
  evidence: { currentEfficiency: 0.70, baseline: 0.85 }
}, 3);

// Each mutant includes:
mutants.forEach(m => {
  console.log(`${m.mutation.operation}: +${m.expectedImprovement * 100}%`);
  console.log(`Description: ${m.description}`);
});
```

**Creating Custom Operators**:
```typescript
import { IMutationOperator } from '@gsep/core';

class CustomOperator implements IMutationOperator {
  name = 'my-custom-mutation';
  description = 'My custom mutation logic';
  targetChromosome = 'c1';

  async mutate(context) {
    const mutant = deepClone(context.genome);

    // Your mutation logic here
    mutant.chromosomes.c1.operations = modifyOperations(
      mutant.chromosomes.c1.operations
    );

    return {
      success: true,
      mutant,
      mutation: createMutationRecord(),
      description: 'Applied custom mutation',
      expectedImprovement: 0.12
    };
  }

  estimateImprovement(context) {
    return 0.12; // 12% expected improvement
  }
}

// Register custom operator
engine.registerOperator(new CustomOperator());
```

---

### 3. FitnessCalculator

**Purpose**: Multi-objective optimization - balances quality, efficiency, and cost.

**6-Dimensional Optimization**:
```typescript
{
  quality: 0.89,           // 30% weight - Output correctness
  successRate: 0.94,       // 25% weight - Task completion
  tokenEfficiency: 0.82,   // 20% weight - Cognitive compression
  latency: 1250,           // 10% weight - Response speed
  costPerSuccess: 0.0042,  // 10% weight - Economic efficiency
  interventionRate: 0.06,  //  5% weight - Human corrections
  composite: 0.87          // ← Final score (weighted average)
}
```

**Usage**:
```typescript
import { FitnessCalculator, InteractionData } from '@gsep/core';

const calc = new FitnessCalculator({
  weights: {
    quality: 0.30,
    successRate: 0.25,
    tokenEfficiency: 0.20,
    latency: 0.10,
    costPerSuccess: 0.10,
    interventionRate: 0.05
  }
});

// Compute fitness from interactions
const interactions: InteractionData[] = [
  {
    success: true,
    quality: 0.92,
    inputTokens: 450,
    outputTokens: 1200,
    latency: 1250,
    model: 'claude-sonnet-4.5',
    interventionNeeded: false,
    timestamp: new Date()
  },
  // ... more interactions
];

const fitness = calc.computeFitness(interactions);

console.log(`Composite fitness: ${fitness.composite}`);
console.log(`Sample size: ${fitness.sampleSize}`);
console.log(`Confidence: ${fitness.confidence}`);
```

**Comparison**:
```typescript
const improvement = calc.computeImprovement(baseline, current);
console.log(`Improvement: ${(improvement * 100).toFixed(1)}%`);

const meetsThreshold = calc.meetsThreshold(current, baseline, 0.05);
console.log(`Meets 5% threshold: ${meetsThreshold}`);
```

---

### 4. EvolutionGuardrailsManager

**Purpose**: Validates mutations before deployment - ensures only beneficial changes go live.

**4-Gate Validation**:
1. ✅ **Quality Gate** - Fitness >= 60% threshold
2. ✅ **Sandbox Gate** - Safety pass rate >= 70%
3. ✅ **Economic Gate** - Cost <= $0.10/task, compression >= 65%
4. ✅ **Stability Gate** - Min 10 samples, rollback rate <= 20%

**Usage**:
```typescript
import { EvolutionGuardrailsManager } from '@gsep/core';

const manager = new EvolutionGuardrailsManager(storage, {
  minQualityScore: 0.60,
  minSandboxScore: 0.70,
  maxCostPerTask: 0.10,
  maxRollbackRate: 0.20,
  gateMode: 'AND',
});

// Evaluate mutation candidate
const result = await manager.evaluateCandidate(candidate, genomeId);

console.log(`Decision: ${result.finalDecision}`);  // promote | reject | canary
console.log(`Reason: ${result.reason}`);
console.log(`Quality: ${result.gates.quality.passed}`);
console.log(`Sandbox: ${result.gates.sandbox.passed}`);
```

**Decision Logic**:
- ✅ **4/4 gates pass** → `promote` (deploy to production)
- ⚠️ **3/4 gates pass** → `canary` (deploy to 5-10% traffic)
- ❌ **<3 gates pass** → `reject` (mutation discarded)

---

## 🔄 Actual Evolution Loop (as implemented in GSEP.ts)

The evolution loop is the real call chain that runs inside `GenomeInstance`. Here's the
actual flow traced from GSEP.ts source:

```
chat() [GSEP.ts:671]
  │
  ├─ assemblePrompt() ─── builds prompt with C0/C1/C2 genes + intelligence layers
  ├─ LLM call ─── generates response
  ├─ estimateQuality() ─── scores response quality (0-1)
  ├─ fitnessCalculator.computeFitness() ─── converts to 6D fitness vector
  ├─ driftAnalyzer.recordFitness(fitnessVector) [GSEP.ts:789]
  ├─ canaryManager.recordRequest() ─── if canary active, record metrics
  │
  └─ interactionCount % N === 0 [GSEP.ts:806] ─── TRIGGER (default N=10)
       │
       ▼
       runEvolutionCycle() [GSEP.ts:1862]
         │
         ├─ Step 0: SURVIVAL CHECK
         │    ├─ driftAnalyzer.analyzeDrift() [GSEP.ts:1864]
         │    ├─ purposeSurvival.evaluateThreats()
         │    ├─ if CRITICAL → restore snapshot, exit
         │    └─ if STRESSED/SURVIVAL → snapshot current genome
         │
         ├─ Step 1: AUTO-MUTATE ON DRIFT
         │    ├─ if strategicAutonomy available:
         │    │    ├─ enhancedSelfModel.assessFull()
         │    │    ├─ strategicAutonomy.prioritizeEvolution()
         │    │    ├─ purposeSurvival.purposeFidelity() ← safety gate
         │    │    └─ mutate() for each high-priority gene
         │    └─ else (fallback):
         │         └─ mutate() for each drift signal
         │
         ├─ Step 2: AUTO-COMPRESS (if token pressure)
         │    └─ compressGenes() if active C1 tokens > 1600
         │
         ├─ Step 3: EVALUATE CANARIES
         │    └─ for each active canary deployment:
         │         ├─ canaryManager.evaluateCanary()
         │         ├─ promote (winner) / rollback (loser) / rampUp (marginal)
         │         └─ update active allele accordingly
         │
         ├─ Step 4: PUBLISH HIGH-FITNESS GENES
         │    └─ for alleles with fitness >= 0.85:
         │         └─ geneBank.storeGene() ← shared knowledge
         │
         ├─ Step 5: INHERIT FROM FAMILY REGISTRY
         │    └─ if familyId present & drifting:
         │         └─ storage.getBestRegistryGene() ← cross-genome learning
         │
         └─ Step 6: SWARM IMPORT
              └─ if geneBank & drifting (severe):
                   └─ geneBank.searchGenes() ← adopt proven genes
```

### mutate() Pipeline [GSEP.ts:1134]

Each mutation goes through a 4-step pipeline:

```
mutate(layer, gene, candidates)
  │
  ├─ 1. Find current active allele for target gene
  │
  ├─ 2. Generate mutation candidates
  │    └─ mutationEngine.generateMutants(context, N)
  │         └─ LLM-powered: 4 operators (compress, reorder, safety, tool-bias)
  │
  ├─ 3. Evaluate through EvolutionGuardrailsManager [GSEP.ts:1226]
  │    ├─ Quality Gate:   fitness >= 0.60
  │    ├─ Sandbox Gate:   safety score >= 0.70
  │    ├─ Economic Gate:  cost <= $0.10/task
  │    └─ Stability Gate: rollback rate <= 20%, min 10 samples
  │
  └─ 4. Promotion decision
       ├─ 4/4 gates → PROMOTE (apply immediately)
       ├─ 3/4 gates → CANARY (deploy to 5-10% traffic)
       └─ <3 gates  → REJECT (discard mutation)
```

### API Example

```typescript
import {
  GenomeKernel,
  DriftAnalyzer,
  MutationEngine,
  FitnessCalculator,
  EvolutionGuardrailsManager
} from '@gsep/core';

const kernel = new GenomeKernel(genome);
const analyzer = new DriftAnalyzer();
const engine = new MutationEngine();
const calc = new FitnessCalculator();
const guardrails = new EvolutionGuardrailsManager(storage);

// Record fitness after each interaction
const fitness = calc.computeFitness([interactionData]);
analyzer.recordFitness(fitness);

// Check for drift
const analysis = analyzer.analyzeDrift();

if (analysis.isDrifting) {
  // Generate candidates & evaluate through guardrails
  const mutants = await engine.generateMutants({
    genome,
    targetChromosome: 'c1',
    reason: analysis.signals[0].recommendation
  }, 3);

  const best = mutants[0];
  const result = await guardrails.evaluateCandidate({
    layer: 1,
    gene: best.mutation.operation,
    variant: `v${Date.now()}`,
    content: JSON.stringify(best.mutant.chromosomes.c1.operations),
    fitness: best.expectedImprovement + currentFitness,
    sandboxScore: 0.85,
    sampleCount: 20,
  }, genome.id);

  console.log(`Decision: ${result.finalDecision}`); // promote | canary | reject
}
```

---

## 📊 Performance Characteristics

| Component | Latency | Memory | CPU |
|-----------|---------|--------|-----|
| **DriftAnalyzer** | ~2ms | ~1KB per fitness point | Low |
| **MutationEngine** | ~10ms | ~50KB per mutant | Medium |
| **FitnessCalculator** | ~2ms | ~1KB | Low |
| **EvolutionGuardrailsManager** | ~5ms | ~10KB | Low |
| **Total Overhead** | **~20ms** | **~70KB** | **Low** |

**Conclusion**: <1% overhead for massive capability gain.

---

## 🎯 Best Practices

### 1. Drift Detection
- ✅ Record fitness after EVERY interaction
- ✅ Use realistic thresholds (10-20% drops)
- ✅ Check drift periodically (every 10-100 interactions)
- ❌ Don't trigger on small sample sizes (<20)

### 2. Mutation Generation
- ✅ Generate 3+ candidates for selection
- ✅ Match operator to detected drift type
- ✅ Log all mutations for audit trail
- ❌ Don't mutate C0 (use C1/C2 only)

### 3. Fitness Calculation
- ✅ Customize weights for your use case
- ✅ Track model pricing accurately
- ✅ Include all 6 dimensions
- ❌ Don't rely on single metric

### 4. Promotion Validation
- ✅ Always sandbox test before promotion
- ✅ Use strict thresholds for production
- ✅ Create snapshots before mutations
- ❌ Don't skip validation checks

---

## 🔒 Security Considerations

### C0 Integrity
- ✅ **NEVER** mutate Chromosome 0
- ✅ Verify integrity before EVERY operation
- ✅ Automatic quarantine on violation
- ✅ Rollback to last known good version

### Mutation Safety
- ✅ All mutations sandbox-tested
- ✅ Fitness must improve >5%
- ✅ No critical check failures allowed
- ✅ Full audit trail maintained

### Resource Limits
- ✅ Limit mutation frequency (cooldown)
- ✅ Cap mutation budget (max per day)
- ✅ Monitor compute costs
- ✅ Rate limit promotions

---

## 📚 See Also

- [RFC-001: Genome Contract v2](../../../../RFC-001-GENOME-CONTRACT-V2.md)
- [GenomeKernel](../core/GenomeKernel.ts) - C0 integrity verification
- [GenomeV2 Types](../types/GenomeV2.ts) - Complete type definitions
- [SCIENTIFIC-VALIDATION.md](../../../../SCIENTIFIC-VALIDATION.md) - Benchmarks

---

## 🤝 Contributing

Want to add a custom mutation operator? See [CONTRIBUTING.md](../../../../CONTRIBUTING.md) for guidelines.

---

**Built with GSEP Platform** 🧬
**The Living OS for AI Agents**

*© 2026 Luis Alfredo Velasquez Duran - Germany*
