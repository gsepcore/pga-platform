<div align="center">

<img src="assets/gsep-logo.png" alt="GSEP — Genomic Self-Evolving Prompts" width="600">

<br>

# 🧬 GSEP — Make Your AI Agent Self-Evolving

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@gsep/core?style=for-the-badge)](https://www.npmjs.com/package/@gsep/core)
[![CI](https://img.shields.io/github/actions/workflow/status/gsepcore/gsep/ci.yml?style=for-the-badge&label=CI&logo=githubactions)](https://github.com/gsepcore/gsep/actions/workflows/ci.yml)
[![Patented](https://img.shields.io/badge/Status-Patented-gold?style=for-the-badge)](PATENTS.md)
[![Watch Demo](https://img.shields.io/badge/Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=cTPJqrL2IyE)
[![Survival Demo](https://img.shields.io/badge/Survival_Demo-Interactive-blueviolet?style=for-the-badge)](https://gsepcore.com/survival)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Live%20Now-orange?style=for-the-badge&logo=producthunt)](https://www.producthunt.com/products/gsep-genomic-self-evolving-prompt)

**Drop-in upgrade that makes any AI agent learn, adapt, and evolve autonomously.**

Created by **Luis Alfredo Velasquez Duran** | Germany, 2025–2026

[Website](https://gsepcore.com) · [Documentation](https://gsepcore.com) · [GitHub](https://github.com/gsepcore/gsep) · [Product Hunt](https://www.producthunt.com/products/gsep-genomic-self-evolving-prompt)

</div>

---

## What is GSEP?

**GSEP is not a framework to build agents.** You already have an agent — GSEP makes it better.

GSEP wraps your existing agent's LLM calls with a genomic evolution layer. Your agent's prompts stop being static text and become **living organisms** that mutate, adapt, and improve with every interaction.

```
YOUR AGENT (before)                YOUR AGENT (after GSEP)
┌──────────────────┐               ┌──────────────────┐
│  Static prompt   │               │  🧬 Evolving prompt  │
│  Same for all    │   + GSEP →   │  Adapts per user      │
│  Never improves  │               │  Auto-improves        │
│  Manual tuning   │               │  Self-healing         │
└──────────────────┘               └──────────────────┘
```

<div align="center">

### See it in action

<a href="https://www.youtube.com/watch?v=cTPJqrL2IyE">
  <img src="assets/gsep-demo.gif" alt="GSEP Demo — prompts evolving in real time" width="600">
</a>

*Click for full demo on YouTube*

**[Try the Survival Demo](https://gsepcore.com/survival)** — Watch mutations, fitness selection, and constitutional guardrails in real-time. No install needed.

</div>

---

## 🚀 Get Started

### Option 1: New Agent (One Line)

```bash
npm install gsep
```

```typescript
import { GSEP } from 'gsep';

const agent = await GSEP.quickStart();
const response = await agent.chat('Hello!', { userId: 'user-1' });
// 27 intelligence systems active. Auto-detects your LLM from env vars.
```

### Option 2: Upgrade Existing Chatbot

```typescript
import { GSEP } from 'gsep';

// Your existing function
const myBot = async (msg: string) => callOpenAI(msg);

// One line — now it's an autonomous agent
const agent = await GSEP.upgrade(myBot, {
  purpose: 'Customer support for Acme Corp',
});
```

### Option 3: Middleware for Complex Agents (OpenClaw, LangChain, etc.)

```typescript
import { GSEP } from 'gsep';

const gsep = await GSEP.middleware();

// In your agent's flow — two hooks, that's it:
const { prompt } = await gsep.before(originalPrompt, { message: userMsg, userId });
const response = await myAgent.callLLM(prompt);
await gsep.after(response, { userId, quality: 0.85 });
```

### Option 4: No-Code Platforms (n8n, Retell AI, Voiceflow, etc.)

```bash
npx gsep serve --port 3000
# Or with Docker:
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... gsepcore/gsep
```

In your platform, change the API URL:
```
Before: https://api.openai.com
After:  http://localhost:3000
```

That's it. Your agent now evolves autonomously.

### Option 5: Serverless (Lambda, Vercel)

```typescript
import { serverlessChat } from 'gsep';

export const handler = async (event) => {
  const response = await serverlessChat({
    llm: myLLMAdapter,
    storage: myPostgresAdapter,  // Required — InMemory loses state
  }, event.body.message, { userId: event.body.userId });

  return { statusCode: 200, body: JSON.stringify({ response }) };
};
```

---

### Supported LLM Providers

| Provider | Model | Auto-detect env var |
|----------|-------|-------------------|
| Anthropic Claude | Sonnet, Opus, Haiku | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4, GPT-4o | `OPENAI_API_KEY` |
| Google Gemini | Flash, Pro | `GOOGLE_API_KEY` |
| Ollama (local) | Llama, Mistral, etc. | `OLLAMA_HOST` |
| Perplexity | Sonar | `PERPLEXITY_API_KEY` |

---

## ▶️ Try It Now (Zero Cost)

See GSEP's evolution pipeline in action — no API key, no cost:

```bash
npx tsx examples/hero-demo.ts --dry-run
```

<details>
<summary><strong>Expected output</strong></summary>

```
================================================================
  GSEP HERO DEMO — Genomic Self-Evolving Prompts
================================================================

  What you will see:
  1. Baseline evaluation (how the LLM performs today)
  2. 3 evolution cycles with 5 interactions each
  3. Quality & fitness measured after every cycle
  4. Side-by-side comparison: before vs after

  Mode:   dry-run
  Model:  mock-consistent
  Tasks:  5 evaluation tasks
  Cycles: 3
  Cost:   $0.00

  Running experiment...

  Cycle      Quality    Success    Tokens
  ---------- ---------- ---------- ----------
  Base       0.57       0.0%       99
  Cycle 1    0.57       0.0%       99
  Cycle 2    0.57       0.0%       99
  Cycle 3    0.57       0.0%       99

  FITNESS CURVE (quality):
  0.57 | *  *  *  *
       +------------
        B  1  2  3
```

The mock LLM produces consistent responses (no fake improvement). This shows the **measurement pipeline** — how GSEP evaluates quality across cycles.

</details>

With a real LLM (~$0.08):

```bash
ANTHROPIC_API_KEY=sk-... npx tsx examples/hero-demo.ts anthropic
```

> **26 more examples** covering evaluation, monitoring, RAG, and reasoning.
> See the [full examples catalog](./examples/README.md).

---

## What changes after installing GSEP?

| Before GSEP | After GSEP |
|------------|-----------|
| Same prompt for every user | Adapts per user automatically |
| Performance degrades over time | Self-heals when drift detected |
| Manual prompt tuning | Evolves every 10 interactions |
| No memory between sessions | Remembers user patterns |
| Blind to its own weaknesses | Self-aware (SelfModel) |
| Isolated knowledge | Shares learnings across agents (THK) |

---

## 🧬 How It Works

Every interaction flows through a **four-phase evolution cycle**:

```
User message → genome.chat()
      ↓
1. TRANSCRIPTION — Log interaction + extract context
2. VARIATION     — Generate candidate prompt mutations
3. SIMULATION    — Test mutations in sandbox (safe, no side effects)
4. SELECTION     — Deploy only if fitness improves
      ↓
Improved prompt ← stored in genome
```

Mutations are safe: tested before deployment, rolled back on regression, and C0 (core identity) never mutates.

---

## 🗑️ Uninstall GSEP

GSEP is non-invasive. Removing it takes 2 steps:

### Step 1: Revert your LLM call

```typescript
// Remove this:
import { genome } from './gsep-setup.js';
const response = await genome.chat(userMessage, { userId, taskType: 'support' });

// Restore your original call:
const response = await llm.chat(userMessage);
```

### Step 2: Remove packages and files

```bash
npm uninstall @gsep/core @gsep/adapters-llm-anthropic @gsep/adapters-llm-openai @gsep/adapters-storage-postgres
rm gsep-setup.ts  # or wherever you placed the setup file
```

Your agent goes back to exactly how it was before. No side effects, no leftover config, no database cleanup needed (in-memory storage is gone when the process stops; PostgreSQL tables can be dropped with `DROP TABLE IF EXISTS pga_genomes, pga_interactions CASCADE;`).

---

## ⚙️ Configuration

### Minimal (just evolution)

```typescript
const genome = await gsep.createGenome({
  name: 'my-agent',
  config: {
    autonomous: {
      continuousEvolution: true,
      evolveEveryN: 10,
      autoMutateOnDrift: true,
    },
  },
});
```

### With persistent storage (production)

```typescript
import { PostgresAdapter } from '@gsep/adapters-storage-postgres';

const gsep = new GSEP({
  llm,
  storage: new PostgresAdapter({
    connectionString: process.env.DATABASE_URL!,
  }),
});
```

### Environment variables

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...        # or OPENAI_API_KEY
DATABASE_URL=postgresql://...        # optional, for persistence
```

<details>
<summary><strong>Full Living Agent config (all features)</strong></summary>

```typescript
const genome = await gsep.createGenome({
  name: 'my-agent',
  config: {
    autonomous: {
      // Evolution (v0.5.0)
      continuousEvolution: true,
      evolveEveryN: 10,
      autoMutateOnDrift: true,
      autoCompressOnPressure: true,
      enableSelfModel: true,
      enablePatternMemory: true,
      maxPatterns: 50,

      // Living Agent (v0.6.0)
      enableMetacognition: true,       // Confidence analysis
      enableEmotionalModel: true,      // Detects user emotions
      enableCalibratedAutonomy: true,  // Learns when to act vs ask
      enablePersonalNarrative: true,   // Tracks relationship history
      enableAnalyticMemory: true,      // Knowledge graph

      // Living Agent v0.7.0 — Three Pillars of Life
      enableEnhancedSelfModel: true,   // Purpose-aware self-model
      enablePurposeSurvival: true,     // Threat detection + mode switching
      enableStrategicAutonomy: true,   // Goal-based strategic decisions
      agentPurpose: 'Expert coding assistant',
    },

    // Content Firewall v0.8.0 (enabled by default)
    // firewall: { enabled: false },  // Uncomment to disable
  },
});
```

</details>

---

## 🔌 Integration Examples

### Express/Fastify API agent

```typescript
import { genome } from './gsep-setup.js';

app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;

  // GSEP handles evolution, memory, adaptation automatically
  const response = await genome.chat(message, {
    userId,
    taskType: 'support',
  });

  res.json({ reply: response });
});
```

### Any agent with a chat loop

```typescript
import { genome } from './gsep-setup.js';

// Whatever your loop looks like — just swap the LLM call
while (true) {
  const input = await getUserInput();
  const response = await genome.chat(input, {
    userId: currentUser.id,
    taskType: 'general',
  });
  displayResponse(response);
}
```

<details>
<summary><strong>More integration examples (Discord, LangChain)</strong></summary>

### Discord/Slack bot

```typescript
import { genome } from './gsep-setup.js';

bot.on('message', async (msg) => {
  const response = await genome.chat(msg.content, {
    userId: msg.author.id,
    taskType: 'general',
  });

  msg.reply(response);
});
```

### LangChain agent

```typescript
import { genome } from './gsep-setup.js';

// Replace your LLM call inside the chain
const response = await genome.chat(question, {
  userId,
  taskType: 'reasoning',
});
```

</details>

---

## 📦 Packages

| Package | Description |
|---------|-------------|
| [`@gsep/core`](./packages/core) | Core engine — evolution, memory, self-model (MIT) |
| [`@gsep/adapters-llm-anthropic`](./packages/adapters-llm/anthropic) | Anthropic Claude |
| [`@gsep/adapters-llm-openai`](./packages/adapters-llm/openai) | OpenAI GPT-4 |
| [`@gsep/adapters-llm-google`](./packages/adapters-llm/google) | Google Gemini |
| [`@gsep/adapters-llm-ollama`](./packages/adapters-llm/ollama) | Ollama (local models) |
| [`@gsep/adapters-llm-perplexity`](./packages/adapters-llm/perplexity) | Perplexity (web search) |
| [`@gsep/adapters-storage-postgres`](./packages/adapters-storage/postgres) | PostgreSQL persistence |

---

## 🔧 Bring Your Own LLM

GSEP works with **any LLM**. If your provider isn't listed above, implement the `LLMAdapter` interface:

```typescript
import type { LLMAdapter, Message, ChatOptions, ChatResponse } from '@gsep/core';

class MyLLMAdapter implements LLMAdapter {
  readonly name = 'my-provider';
  readonly model = 'my-model';

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    // Call your LLM here
    const result = await myLLMClient.generate(messages);
    return {
      content: result.text,
      usage: { inputTokens: result.promptTokens, outputTokens: result.completionTokens },
    };
  }
}

// Use it with GSEP:
const gsep = new GSEP({ llm: new MyLLMAdapter() });
```

Only `chat()` is required. `stream()` and `estimateCost()` are optional.

---

## 🧪 Capabilities

### Core (enabled by default)

- **Autonomous Evolution** — Prompts improve every N interactions without manual tuning
- **Drift Detection** — Auto-corrects when agent performance degrades
- **SelfModel** — Agent tracks its own strengths and weaknesses
- **Pattern Memory** — Learns behavioral patterns to predict user needs
- **Gene Bank + THK** — Agents share successful prompt mutations across genomes

### Security (enabled by default)

<details>
<summary><strong>C3 Content Firewall (v0.8.0)</strong></summary>

Defense-in-depth against prompt injection, skill poisoning, and supply-chain attacks on AI agents. C3 scans **all** external content before it enters the system prompt.

- **53 detection patterns** across 7 threat categories (prompt injection, role hijacking, data exfiltration, encoding evasion, privilege escalation, instruction override, content smuggling)
- **Trust Registry** — 4 trust levels (system, validated, external, untrusted) with per-source scan policies
- **Content Tagging** — Spotlighting-inspired trust delimiters (`<<<TRUSTED:C0>>>` / `<<<UNTRUSTED:PLUGIN>>>`) teach the LLM to treat external content as data, not instructions
- **SHA-256 integrity** — Core patterns are cryptographically immutable, like C0
- **Multi-language** — Detects injections in English, Spanish, German, French, and Chinese
- **Zero dependencies** — Uses only Node.js `crypto`
- Enabled by default, opt-out with `firewall: { enabled: false }`

</details>

<details>
<summary><strong>C4 Behavioral Immune System (v0.9.0)</strong></summary>

Output-level immune system for LLM agents. Detects if the agent's **own response** was manipulated by Indirect Prompt Injection (IPI).

**6 Deterministic Checks** (no extra LLM calls):
- **System prompt leakage** — detects verbatim fragments of the assembled prompt in the response
- **Injection echo** — C3 bidirectional scan catches injection patterns in output
- **Role confusion** — 10 regex patterns detect model re-programming ("I am now...", "jailbreak mode", etc.)
- **Purpose deviation** — verifies response against C0 forbidden topics
- **Instruction compliance** — if C3 flagged the input AND the output complied with the injection
- **Data exfiltration** — markdown image injection, suspicious fetch/XHR, webhook URLs

**Auto-Healing Pipeline**: Detect → Quarantine → GenomeKernel Snapshot → Retry LLM → Safe Fallback

- Activates automatically with C3 (no extra config)
- Persistent immune memory (attack signatures)
- Reports in `getIntegrityStatus()`

</details>

### Advanced (opt-in)

<details>
<summary><strong>Living Agent — 10 cognitive layers (v0.6.0)</strong></summary>

Emotional detection, calibrated autonomy, personal narrative, analytic memory, and more. Each capability is an individual flag in `AutonomousConfig`:

- `enableMetacognition` — Confidence analysis per response
- `enableEmotionalModel` — Detects user emotional state
- `enableCalibratedAutonomy` — Learns when to act vs ask
- `enablePersonalNarrative` — Tracks relationship history
- `enableAnalyticMemory` — Knowledge graph with temporal decay

</details>

<details>
<summary><strong>Three Pillars of Life (v0.7.0)</strong></summary>

- **Enhanced Self-Model** — Purpose-aware self-awareness with capability tracking and evolution trajectory
- **Purpose Survival** — State machine (THRIVING → STABLE → STRESSED → SURVIVAL → CRITICAL) with threat detection and genome snapshots
- **Strategic Autonomy** — Goal-based decisions, evolution prioritization, adaptive mutation rates, and task refusal for dangerous operations

</details>

<details>
<summary><strong>Proof of Value Runner (v0.7.0)</strong></summary>

Measure GSEP's impact objectively. Runs multiple evolution cycles and reports the fitness curve:

```bash
npx tsx examples/proof-of-value.ts
```

```
VERDICT: [OK] IMPROVEMENT PROVEN (+16.0% quality)

  Cycle      Quality    Success    Tokens
  Base       0.50       0.0%       52
  Cycle 1    0.51       0.0%       81
  Cycle 2    0.58       0.0%       107
  Cycle 3    0.58       0.0%       107
  Cycle 4    0.58       0.0%       107
```

Use programmatically:

```typescript
import { ProofOfValueRunner, PROOF_OF_VALUE_V1 } from '@gsep/core';

const runner = new ProofOfValueRunner();
const result = await runner.run(genome, {
  name: 'My Experiment',
  cycles: 5,
  interactionsPerCycle: 10,
  dataset: PROOF_OF_VALUE_V1.tasks,
  userId: 'test-user',
});

console.log(runner.formatConsoleReport(result));   // ASCII table + curve
console.log(runner.formatMarkdownReport(result));  // Markdown report
```

</details>

---

## 🏗️ Architecture

<details>
<summary><strong>Five-layer chromosome model</strong></summary>

GSEP wraps your agent's prompts in a five-layer chromosome structure:

```
┌─────────────────────────────────────────┐
│  C0: Immutable DNA                      │
│  (Security, Ethics, Core Identity)      │
│  🔒 NEVER mutates — SHA-256 protected  │
├─────────────────────────────────────────┤
│  C1: Operative Genes                    │
│  (Tool Usage, Coding Patterns)          │
│  🐢 SLOW mutation (sandbox-tested)     │
├─────────────────────────────────────────┤
│  C2: Epigenomes                         │
│  (User Preferences, Style)              │
│  ⚡ FAST mutation (adapts daily)       │
├─────────────────────────────────────────┤
│  C3: Content Firewall                   │
│  (Prompt Injection Defense)             │
│  🛡️ 53 patterns — SHA-256 core        │
├─────────────────────────────────────────┤
│  C4: Behavioral Immune System           │
│  (Output Infection Detection)           │
│  🧬 6 checks — auto-heal + quarantine  │
└─────────────────────────────────────────┘
```

C0 is cryptographically immutable (SHA-256). C1 mutates slowly through an 8-stage promotion gate. C2 adapts fast based on user interactions. C3 and C4 provide input/output security.

</details>

---

## 🛡️ Intellectual Property

**Patent Status**: Patented

- 3 Patent Applications (US, EU, PCT) — 34 claims
- 4 Trademark Applications (US & EU)

**License**: MIT (core) | BSL 1.1 (Gene Registry) | Proprietary (Cloud) — See [full licensing details](docs/LICENSING.md)

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's a bug fix, new feature, documentation improvement, or a new LLM adapter — every contribution matters.

```bash
git clone https://github.com/gsepcore/gsep
cd gsep
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide, code standards, and how to get recognized.

---

## 👥 Contributors

Thanks to everyone who has contributed to GSEP. Every PR, issue, and idea makes this project better.

<a href="https://github.com/gsepcore/gsep/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=gsepcore/gsep" alt="Contributors" />
</a>

Want to see your avatar here? Check [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

## 💜 Sponsors

GSEP is open source and free to use. If you or your company benefit from GSEP, consider sponsoring the project to support continued development.

<a href="https://github.com/sponsors/gsepcore">
  <img src="https://img.shields.io/badge/Sponsor_GSEP-%E2%9D%A4-pink?style=for-the-badge&logo=githubsponsors" alt="Sponsor GSEP">
</a>

**Why sponsor?**
- Ensure long-term maintenance and new features
- Get your logo displayed here and in the docs
- Priority support and feature requests
- Support independent open-source development

| Tier | Amount | Perks |
|------|--------|-------|
| Backer | $5/mo | Name in Contributors list |
| Supporter | $25/mo | Logo in README + priority issues |
| Gold Sponsor | $100/mo | Large logo + quarterly roadmap input |
| Enterprise | Custom | Dedicated support + custom features |

<!-- SPONSORS:START -->
*Become the first sponsor and your logo will appear here.*
<!-- SPONSORS:END -->

---

## 📬 Contact

- **Website**: [gsepcore.com](https://gsepcore.com)
- **Discord**: [discord.gg/7rtUa6aU](https://discord.gg/7rtUa6aU)
- **Email**: contact@gsepcore.com

---

<div align="center">

**GSEP** 🧬 — *Your agent, but alive.*

<br>

If you find GSEP useful, please ⭐ [star this repo](https://github.com/gsepcore/gsep) — it helps others discover the project!

© 2025–2026 Luis Alfredo Velasquez Duran. All Rights Reserved.

</div>
