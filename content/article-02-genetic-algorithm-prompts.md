# I Built a Genetic Algorithm for LLM Prompts — Here's What I Learned

> What if you could apply natural selection to your AI agent's system prompts? I tried it. After 18 months of building, here's what actually works — and what doesn't.

## The Idea

I'm an AI engineer who got tired of manually rewriting system prompts every time a model updated or user behavior shifted. So I asked a dumb question:

**What if prompts could evolve like DNA?**

Not metaphorically. Literally. With mutations, fitness scoring, natural selection, and inheritance.

## The Architecture

I built [GSEP](https://github.com/gsepcore/pga-platform) (Genomic Self-Evolving Prompts) — an open-source SDK that wraps any AI agent with an evolution layer.

Here's how it works:

### The Genome

Your agent's prompt is split into **genes**. Each gene handles one aspect:

```
Genome
├── Layer 0 (Immutable DNA) — identity, ethics, security
│   └── core-identity: "You are a coding assistant that..."
│
├── Layer 1 (Operative Genes) — slow mutation, validated
│   ├── coding-patterns: "When writing TypeScript, prefer..."
│   ├── tool-usage: "Use the read tool before editing..."
│   └── error-handling: "When an error occurs..."
│
└── Layer 2 (Epigenomes) — fast mutation, per-user
    ├── communication-style: "Respond in a formal tone..."
    └── response-length: "Keep responses concise..."
```

### The Evolution Cycle

Every N interactions (configurable), the system runs a full evolution cycle:

```
1. TRANSCRIPTION — Record interaction quality metrics
2. DRIFT DETECTION — Check if any gene is underperforming
3. MUTATION — Generate candidate prompt rewrites
4. VALIDATION — Sandbox test + quality gate + compression check
5. SELECTION — Promote the best variant or reject
6. DEPLOYMENT — Canary rollout → full deployment
7. ROLLBACK — Auto-revert if performance drops
```

### The Mutation Operators

I implemented 4 mutation types (inspired by real genetics):

1. **Semantic Restructuring** — Rewrites the prompt while preserving meaning
2. **Pattern Extraction** — Identifies successful patterns across interactions and codifies them
3. **Crossover** — Combines the best parts of two prompt variants
4. **Breakthrough** — Completely reimagines a gene from scratch (rare, high-risk/high-reward)

Each operator is selected based on past success using an **epsilon-greedy strategy** (90% exploit / 10% explore).

## What I Learned

### 1. Immutability is Non-Negotiable

The first thing I learned: you CANNOT let everything evolve. Core identity must be locked.

Layer 0 is protected by SHA-256 hash verification. If anyone (including the evolution system itself) tries to modify the agent's identity, ethics, or security constraints, the system halts.

Without this, agents literally "forget who they are" after enough mutations.

### 2. Fitness Must Be Multi-Dimensional

Single-metric optimization is a trap. An agent that optimizes ONLY for user satisfaction might become sycophantic. One that optimizes ONLY for accuracy might become unbearably verbose.

I use 6 dimensions:

```typescript
{
  quality: 0.82,         // Output correctness
  successRate: 0.91,     // Task completion
  tokenEfficiency: 0.75, // Compute efficiency
  latency: 0.88,         // Speed
  costPerSuccess: 0.70,  // ROI
  interventionRate: 0.95  // Human override frequency
}
```

The composite fitness uses weighted averaging with configurable priorities. For a coding assistant, you might weight quality and success rate higher. For a chatbot, latency and token efficiency matter more.

### 3. Canary Deployments Save Lives

Early on, I deployed mutations directly. A bad mutation tanked an agent's quality from 0.85 to 0.40 for ALL users simultaneously.

Now every mutation goes through a canary phase:
- Deploy to 10% of traffic
- Monitor fitness for a configurable window
- Only promote to 100% if metrics hold
- Auto-rollback on any significant drop

This is the same pattern Netflix uses for code deployments, applied to prompts.

### 4. The Immune System Was Essential

The scariest scenario isn't a bad mutation — it's a **manipulated** mutation. What if malicious user input influences the evolution system to inject harmful content into prompts?

I built two defense layers:
- **C3 (Content Firewall)** — 57 patterns scanning ALL input for prompt injection, role hijacking, data exfiltration
- **C4 (Immune System)** — 6 deterministic checks on every OUTPUT, detecting if the response was compromised

No LLM calls needed. Pure pattern matching + heuristics. Fast and reliable.

### 5. Per-User Adaptation Is the Killer Feature

The biggest surprise: Layer 2 (epigenomes) matters more than I expected.

When the system adapts communication style, verbosity, and format preferences per-user, satisfaction jumps dramatically. One user prefers terse code-only responses. Another wants detailed explanations. Same agent, different evolved prompts.

This is like having a personalized prompt for every user, but it happens automatically.

## The Numbers

Running a proof-of-value benchmark:

```
+16% quality improvement over 5 evolution cycles
+25% user satisfaction in internal testing
-45% human intervention rate
```

These aren't cherry-picked. The [proof-of-value runner](https://github.com/gsepcore/pga-platform/tree/main/examples) is built into the SDK — you can verify on your own agent.

## How to Use It

```bash
npm install @gsep/core @gsep/adapters-llm-anthropic
```

```typescript
import { PGA, InMemoryStorageAdapter } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';

const gsep = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY }),
  storage: new InMemoryStorageAdapter(),
});
await gsep.initialize();

const agent = await gsep.createGenome({ name: 'my-assistant' });

// This replaces your direct LLM call:
const response = await agent.chat('Help me optimize this SQL query');
// Every interaction now makes your agent smarter.
```

It works with **any LLM**: Claude, GPT-4, Gemini, Ollama (local), Perplexity.

## What's Next

The Gene Bank — a marketplace where agents can share successful gene variants across organizations. Think "npm for AI behaviors." A coding pattern that works great for one agent can be adopted (with safety checks) by another.

## Try It

- **GitHub**: [github.com/gsepcore/pga-platform](https://github.com/gsepcore/pga-platform) (MIT License)
- **Docs**: [gsepcore.com](https://gsepcore.com)
- **Discord**: [discord.gg/7rtUa6aU](https://discord.gg/7rtUa6aU)

I'd love feedback from anyone building AI agents. What's your biggest pain point with prompt maintenance?

---

*GSEP is not a framework to build agents. It wraps your existing agent to make it self-evolving. You keep your stack.*
