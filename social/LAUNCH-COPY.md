# GSEP Launch Copy — 16 March 2026

All copy ready to paste. Times in CET.

---

## 1. HACKER NEWS — Show HN (14:00 CET)

### Title (choose one):

**Option A (recommended):**
```
Show HN: GSEP – AI agents that evolve their prompts through genetic algorithms
```

**Option B:**
```
Show HN: GSEP – Open-source framework where AI prompts mutate, compete, and evolve
```

**Option C:**
```
Show HN: GSEP – Treat your AI agent's prompts like DNA with 4 chromosomes
```

### Link:
```
https://github.com/gsepcore/pga-platform
```

### First Comment (post IMMEDIATELY after submitting):

```
Hi HN, I'm Luis from Germany.

I built GSEP because I kept hitting the same problem: AI agents degrade over time.
Prompts that work today break tomorrow. There's no systematic way to improve them
without manually rewriting everything.

GSEP applies biological evolution to AI prompts. Each agent has a genome with 4
chromosome layers:

- C0 (Immutable DNA): Core identity, ethics, security constraints. SHA-256 protected,
  never mutates. Think of it as the agent's constitution.
- C1 (Operative Genes): Tool usage patterns, coding style, domain expertise. Mutates
  slowly through an 8-stage promotion gate with sandbox testing.
- C2 (Epigenomes): Per-user preferences, communication style. Adapts fast based on
  interaction patterns.
- C3 (Content Firewall): 53 threat detection patterns. Scans all content flowing
  through the agent.

The evolution works through actual selection pressure:
1. Mutations are generated (point mutations, crossover, gene transfer)
2. Each mutation is sandbox-tested before deployment
3. Fitness is measured across 6 dimensions (task completion, safety, coherence,
   user satisfaction, efficiency, consistency)
4. Bad mutations are rolled back. Good ones propagate.

The key insight: don't fine-tune the model — evolve the prompt layer. This works
with any LLM (Claude, GPT-4, Gemini, Ollama, Perplexity) without retraining.

Tech details:
- TypeScript, MIT licensed
- 1555 tests across 66 test files
- Zero-config quickstart: `const agent = PGA.wrap('my-agent', { provider: 'anthropic' })`
- Includes 30 opt-in intelligence modules (consciousness, memory, metacognition,
  curiosity engine, etc.)
- InMemoryStorage for dev, PostgreSQL adapter for production
- Patented architecture (3 utility patents filed)

Quickstart:

    npm install @pga-ai/core

    import { PGA } from '@pga-ai/core';
    const agent = PGA.wrap('my-agent', {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      preset: 'standard',
    });
    const reply = await agent.chat('Hello', { userId: 'user-1' });

I'm happy to answer questions about the evolutionary algorithms, the chromosome
architecture, fitness functions, or why I chose biological metaphors over
gradient-based approaches (like DSPy).

Repo: https://github.com/gsepcore/pga-platform
Docs: https://gsepcore.com
```

---

## 2. PRODUCT HUNT (09:01 CET)

### Tagline (60 chars max):
```
AI agents that evolve their own prompts like DNA
```

### Description:

```
GSEP (Genomic Self-Evolving Prompts) is an open-source TypeScript framework that
makes AI agents improve themselves automatically.

Instead of manually rewriting prompts, GSEP treats them as biological DNA with 4
chromosome layers — each with different mutation speeds and safety constraints.

How it works:
- Your agent's prompts mutate through genetic algorithms
- Mutations are sandbox-tested before deployment
- Fitness is measured across 6 dimensions
- Bad mutations get rolled back, good ones propagate
- Per-user adaptation happens automatically

What makes it different:
- Works with any LLM (Claude, GPT-4, Gemini, Ollama)
- No model retraining needed — evolution happens at the prompt layer
- 30 opt-in intelligence modules (consciousness, memory, curiosity)
- Zero-config quickstart with PGA.wrap()
- C0 immutable layer protects core identity with SHA-256

Built with TypeScript, 1555 tests, MIT licensed. Patented architecture.

Get started:
npm install @pga-ai/core
```

### First Comment on PH:

```
Hey Product Hunt! I'm Luis, a developer from Germany.

I built GSEP because I believe AI agents should get better over time without human
intervention. Current prompt engineering is manual, fragile, and doesn't scale.

GSEP applies biological evolution to solve this:
- Prompts are DNA with 4 chromosome layers
- Mutations happen automatically based on performance
- Natural selection keeps what works, discards what doesn't

The "aha moment" for me was realizing that prompts are just genetic code for AI
behavior. Why not let them evolve the same way biology does?

This is v0.8.0 — the core evolution engine works, and we have 30 intelligence
modules you can enable. We'd love feedback from the community on what to
prioritize next.

Try it: npm install @pga-ai/core
Repo: https://github.com/gsepcore/pga-platform
```

---

## 3. X / TWITTER (09:05 CET)

### Launch Tweet:

```
Your AI agent's prompts are DNA.

GSEP makes them evolve.

4 chromosome layers. 6D fitness. Genetic algorithms.
Prompts mutate, compete, and improve — automatically.

Open source. MIT licensed. Works with Claude, GPT-4, Gemini, Ollama.

npm install @pga-ai/core

https://github.com/gsepcore/pga-platform
```

### Thread (reply to launch tweet):

**Tweet 2:**
```
How it works:

C0: Immutable DNA (SHA-256 protected — never changes)
C1: Operative genes (slow mutation, sandbox-tested)
C2: Epigenomes (fast, per-user adaptation)
C3: Content firewall (57 threat patterns)

Mutations are generated, tested, scored across 6 dimensions, then deployed or rolled back.
```

**Tweet 3:**
```
Why evolve prompts instead of fine-tuning models?

- Works with ANY LLM (no retraining)
- Per-user adaptation without separate models
- Safety constraints are immutable (C0 can't mutate)
- Rollback is instant (just revert the genome)

Fine-tuning changes the brain. GSEP evolves the instructions.
```

**Tweet 4:**
```
Built in TypeScript. 1555 tests. Patented architecture.

Zero-config quickstart:

const agent = PGA.wrap('my-agent', {
  provider: 'anthropic',
  preset: 'conscious'
});

const reply = await agent.chat('Help me', { userId: 'u1' });

// The agent remembers, adapts, evolves.
```

**Tweet 5:**
```
GSEP is open source (MIT) — we believe evolution should be accessible.

Star it: https://github.com/gsepcore/pga-platform
Try it: npm install @pga-ai/core
Site: https://gsepcore.com

Built by @LuisvelMarketer from Germany.

Your agent, but alive.
```

---

## 4. LINKEDIN (09:15 CET)

### Post:

```
I just open-sourced GSEP — a framework where AI agents evolve their own prompts.

The problem: AI agents degrade over time. Prompts that work today break tomorrow.
Prompt engineering is manual, fragile, and doesn't scale to thousands of users.

The solution: Treat prompts like DNA.

GSEP organizes AI behavior into 4 chromosome layers:

C0 — Immutable: Core identity and ethics. Protected by SHA-256. Never changes.
C1 — Operative: Tool usage and domain skills. Slow mutation with sandbox testing.
C2 — Epigenomes: User preferences and style. Adapts fast, per-user.
C3 — Firewall: 53 threat detection patterns. Scans everything.

The system uses genetic algorithms: mutations happen automatically, fitness is
measured across 6 dimensions, bad changes get rolled back, good ones propagate.

Key differentiator: No model retraining needed. Evolution happens at the prompt
layer, so it works with any LLM — Claude, GPT-4, Gemini, or local models
through Ollama.

Technical details:
- TypeScript / MIT Licensed
- 1555 tests across 66 files
- 30 opt-in intelligence modules
- Zero-config quickstart
- Patented architecture (3 utility patents)

After 8 months of development and rigorous testing, GSEP v0.8.0 is live.

I'd love feedback from the AI engineering community. What features would make
this useful for your agents?

GitHub: https://github.com/gsepcore/pga-platform
Website: https://gsepcore.com
Get started: npm install @pga-ai/core

#AI #OpenSource #MachineLearning #TypeScript #AIAgents #PromptEngineering
```

---

## 5. TIMING SCHEDULE — 16 March 2026

| Time (CET) | Platform      | Action                              |
|------------|---------------|-------------------------------------|
| 09:01      | Product Hunt  | Publish launch                      |
| 09:02      | Product Hunt  | Post first comment                  |
| 09:05      | X / Twitter   | Launch tweet                        |
| 09:06      | X / Twitter   | Reply thread (tweets 2-5)           |
| 09:15      | LinkedIn      | Publish post                        |
| 14:00      | Hacker News   | Submit Show HN                      |
| 14:01      | Hacker News   | Post first comment                  |
| 14:05      | X / Twitter   | Share HN link                       |
| 14:30      | All           | Monitor and reply to all comments   |

---

## 6. REPLY TEMPLATES FOR TOUGH QUESTIONS

### "How is this different from DSPy?"
```
Great question. DSPy optimizes prompts through gradient-based search — it treats
prompts as parameters to tune. GSEP takes a biological approach: prompts are DNA
that mutate, compete, and evolve through natural selection. The key differences:
1) GSEP has immutable layers (C0 can't be optimized away), 2) evolution is continuous
and per-user, not a one-time optimization pass, 3) fitness is multi-dimensional
(6D), not single-objective. Different paradigms for different needs.
```

### "30 intelligence systems sounds overhyped"
```
Fair skepticism. Each "system" is a discrete TypeScript module with its own test
file. For example, PatternMemory (83 lines) tracks behavioral patterns,
MetacognitionEngine (120 lines) does pre/post response analysis. They're all opt-in
via configuration presets — you can run with just 4 (minimal preset) or all 21 flags
(full preset). Here are the test files: [link to tests directory]
```

### "3000-line god class?"
```
You're right, PGA.ts is large. It's the orchestrator that wires 30 optional systems
together. Refactoring to a pipeline/middleware architecture is planned for v0.9.0.
For now, each system is a separate module — PGA.ts just coordinates them. We
prioritized shipping a working, tested system over perfect architecture.
```

### "Does the evolution actually work?"
```
Honest answer: the evolution engine is fully implemented and tested (mutation
operators, fitness calculation, sandbox testing, rollback). What we don't have yet
is large-scale production benchmarks. That's exactly why we're launching as open
source beta — we need real-world usage data to validate that the evolutionary
pressure produces measurable improvement. The infrastructure is there; now we need
production traffic.
```

### "Why not just fine-tune?"
```
Fine-tuning changes the model. GSEP evolves the instructions sent to the model.
Benefits: 1) Works with any LLM without API access to weights, 2) per-user
adaptation without per-user models, 3) instant rollback (just revert the genome),
4) immutable safety constraints that can't be trained away, 5) you can switch
LLM providers and keep your evolved prompts.
```

---

## 7. IMAGES

- OG Social Card: `social/og-card.html` (1200x630)
- Product Hunt Banner: `social/product-hunt-banner.html` (1270x760)
- Video Thumbnail: `video/thumbnail.html` (1280x720)
- DNA Launch Image: `social/launch-image.html` (1200x675)

Export: Open in Chrome → DevTools → Cmd+Shift+P → "Capture full size screenshot"
