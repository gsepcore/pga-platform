<div align="center">

<img src="assets/gsep-logo.png" alt="GSEP — Genomic Self-Evolving Prompts" width="600">

<br>

# GSEP — Make Your AI Agent Self-Evolving

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@gsep/core?style=for-the-badge)](https://www.npmjs.com/package/@gsep/core)
[![CI](https://img.shields.io/github/actions/workflow/status/gsepcore/gsep/ci.yml?style=for-the-badge&label=CI&logo=githubactions)](https://github.com/gsepcore/gsep/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-1931_passing-brightgreen?style=for-the-badge)]()
[![Patented](https://img.shields.io/badge/Status-Patented-gold?style=for-the-badge)](PATENTS.md)
[![Watch Demo](https://img.shields.io/badge/Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=cTPJqrL2IyE)
[![Survival Demo](https://img.shields.io/badge/Survival_Demo-Interactive-blueviolet?style=for-the-badge)](https://gsepcore.com/survival)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Live%20Now-orange?style=for-the-badge&logo=producthunt)](https://www.producthunt.com/products/gsep-genomic-self-evolving-prompt)

**Drop-in upgrade that makes any AI agent learn, adapt, and evolve autonomously.**

Created by **Luis Alfredo Velasquez Duran** | Germany, 2025-2026

[Website](https://gsepcore.com) · [Documentation](https://gsepcore.com) · [GitHub](https://github.com/gsepcore/gsep) · [Product Hunt](https://www.producthunt.com/products/gsep-genomic-self-evolving-prompt)

</div>

---

## At a Glance

| Metric | Value |
|--------|-------|
| Tests passing | **1998** |
| Steps per chat() call | **32** |
| Security modules | **28** |
| Prompt injection patterns | **53** |
| PII categories (with Luhn) | **9** |
| Security profiles | **4** |
| Lines of code to integrate | **1** |
| New npm dependencies | **0** |

---

## What is GSEP?

**GSEP is not a framework to build agents.** You already have an agent — GSEP makes it better.

GSEP wraps your existing agent's LLM calls with a genomic evolution layer. Your agent's prompts stop being static text and become **living organisms** that mutate, adapt, and improve with every interaction.

```
YOUR AGENT (before)                YOUR AGENT (after GSEP)
┌──────────────────┐               ┌──────────────────────────┐
│  Static prompt   │               │  Evolving prompt         │
│  Same for all    │   + GSEP ->   │  Adapts per user         │
│  Never improves  │               │  Auto-improves           │
│  Manual tuning   │               │  Self-healing            │
└──────────────────┘               └──────────────────────────┘
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

## Install GSEP in Your Existing Agent

```bash
npm install @gsep/core
```

Three ways to integrate — choose the one that fits your codebase:

### Way 1: Zero Code (Auto-Instrumentation)

Add ONE line at the top of your app. Don't change anything else.

```typescript
import '@gsep/core/auto'

// Your existing code stays exactly the same.
// Every OpenAI/Anthropic call now runs through GSEP's 32-step pipeline.
// Evolution, security, PII redaction, dashboard — all active automatically.
```

GSEP detects your LLM SDK (OpenAI, Anthropic, or raw fetch) and patches it at import time. Same technique as New Relic, Datadog, and Sentry.

**What happens on startup:**
```
[GSEP] 🧬 Auto-instrumentation loading...
[GSEP Auto] ✓ OpenAI SDK patched — chat.completions.create() now runs through GSEP.
[GSEP Auto] ✓ Global fetch patched — LLM API calls now run through GSEP.
[GSEP] 🧬 Auto-instrumentation active.
[GSEP] All LLM calls now run through the full 32-step GSEP pipeline.
[GSEP] Evolution: ON | Security: ON | PII Redaction: ON | Dashboard: ON

🧬 GSEP Dashboard: http://localhost:4200/gsep/dashboard?token=...
```

### Way 2: One Line (Explicit Wrap)

Wrap your existing LLM client. Full control, full pipeline.

```typescript
import { gsep } from '@gsep/core'

// Wrap your LLM client — one line
const agent = await gsep.wrap(myOpenAIClient)

// Use exactly as before
const response = await agent.chat('Hello!', { userId: 'user-1' })

// All 32 steps running: evolution, security, fitness, drift, learning
// Dashboard live at http://localhost:4200
```

Works with any LLM client: OpenAI SDK, Anthropic SDK, or any object with a `chat()` method.

### Way 3: Full Control (Two Hooks)

For agents with complex pipelines — LangChain, CrewAI, custom architectures.

```typescript
import { GSEPMiddleware } from '@gsep/core'

const gsep = await GSEPMiddleware.create()

// BEFORE your LLM call — GSEP enhances the prompt with evolved genes
const { prompt } = await gsep.before(originalPrompt, { message: userMsg, userId })

// YOUR existing LLM call — unchanged
const response = await myAgent.callLLM(prompt)

// AFTER your LLM call — GSEP learns, tracks fitness, evolves
await gsep.after(response, { userId, feedback: 'good' })
```

---

### Supported LLM Providers

| Provider | Model | Auto-detect env var |
|----------|-------|---------------------|
| Anthropic Claude | Sonnet, Opus, Haiku | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4, GPT-4o | `OPENAI_API_KEY` |
| Google Gemini | Flash, Pro | `GOOGLE_API_KEY` |
| Ollama (local) | Llama, Mistral, etc. | `OLLAMA_HOST` |
| Perplexity | Sonar | `PERPLEXITY_API_KEY` |

---

## Try It Now (Zero Cost)

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

## What Changes After Installing GSEP?

| Before GSEP | After GSEP |
|------------|-----------|
| Same prompt for every user | Adapts per user automatically |
| Performance degrades over time | Self-heals when drift detected (5 drift types) |
| Manual prompt tuning | Evolves every 10 interactions (LLM-powered mutations) |
| No memory between sessions | Remembers user patterns (6 memory systems) |
| Blind to its own weaknesses | Self-aware (SelfModel + capability tracking) |
| Isolated knowledge | Shares learnings across agents (Gene Bank + THK) |
| No security | 7-layer Genome Shield (C3/C4/PII/audit) |
| PII exposed to LLM providers | PII auto-redacted before leaving your machine |
| No audit trail | Tamper-proof hash-chain log of every action |
| Agent doesn't know it's protected | Agent aware of GSEP (identity injected per call) |

**Every `chat()` call runs 32 steps** — security, prompt assembly with evolved genes, LLM call, output scanning, fitness tracking, drift analysis, evolution check, and dashboard events. All automatic.

---

## How It Works

Every interaction flows through a **four-phase evolution cycle**:

```
User message -> genome.chat()
      |
1. TRANSCRIPTION — Log interaction + extract context
2. VARIATION     — Generate candidate prompt mutations
3. SIMULATION    — Test mutations in sandbox (safe, no side effects)
4. SELECTION     — Deploy only if fitness improves
      |
Improved prompt <- stored in genome
```

Mutations are safe: tested before deployment, rolled back on regression, and C0 (core identity) never mutates.

---

## Architecture

### Five-Layer Chromosome Model

GSEP wraps your agent's prompts in a five-layer chromosome structure:

```
+-------------------------------------------+
|  C0: Immutable DNA                        |
|  (Security, Ethics, Core Identity)        |
|  NEVER mutates — SHA-256 protected        |
+-------------------------------------------+
|  C1: Operative Genes                      |
|  (Tool Usage, Coding Patterns)            |
|  SLOW mutation (sandbox-tested)           |
+-------------------------------------------+
|  C2: Epigenomes                           |
|  (User Preferences, Style)               |
|  FAST mutation (adapts daily)             |
+-------------------------------------------+
|  C3: Content Firewall                     |
|  (Prompt Injection Defense)               |
|  53 patterns — SHA-256 core               |
+-------------------------------------------+
|  C4: Behavioral Immune System             |
|  (Output Infection Detection)             |
|  6 checks — auto-heal + quarantine        |
+-------------------------------------------+
```

C0 is cryptographically immutable (SHA-256). C1 mutates slowly through an 8-stage promotion gate. C2 adapts fast based on user interactions. C3 and C4 provide input/output security.

---

## Genome Shield — Enterprise Security

GSEP ships with a 7-layer security architecture. **Zero new npm dependencies** — built entirely on `node:crypto` and macOS Keychain.

### How Security Activates

| Level | What you get | Config needed |
|-------|-------------|---------------|
| **Automatic** (every agent) | C3 Firewall (53 patterns), C4 Immune System (6 checks), PII Redaction (9 categories), Data Classification, Anomaly Detection | **None.** Active on every `chat()` call automatically. |
| **Full Shield** (personal/SMB) | + Keychain vault, filesystem boundary, command guard, network allowlist, tamper-proof audit log | `initGenomeShield({ profile: 'secure' })` |
| **Enterprise** (teams/compliance) | + RBAC (5 roles), MFA (TOTP), enterprise policies, secret rotation, GDPR engine, SOC 2 controls | `initGenomeShield({ profile: 'secure', enterprise: { rbac: true, mfa: true, gdpr: true } })` |

> **Any agent that calls `GSEP.quickStart()` or `genome.chat()` is already protected — no setup required.**

```
+=============================================+
|  Layer 7: AUDIT & COMPLIANCE               |
|  TamperProofAuditLog | DataAccessTracker   |
|  ComplianceExporter                        |
+---------------------------------------------+
|  Layer 6: NETWORK CONTROL                  |
|  OutboundAllowlist | NetworkAuditLogger    |
+---------------------------------------------+
|  Layer 5: EXECUTION CONTROL                |
|  CommandExecutionGuard | FileSystemBoundary|
+---------------------------------------------+
|  Layer 4: SKILL & CAPABILITY               |
|  SkillManifest | SkillSigner               |
|  CapabilityBroker                          |
+---------------------------------------------+
|  Layer 3: SECRETS MANAGEMENT               |
|  KeychainAdapter | KeyHierarchy            |
|  EncryptedConfigStore | SecretsMigrator    |
+---------------------------------------------+
|  Layer 2: DATA PROTECTION                  |
|  PIIRedactionEngine | DataClassifier       |
|  LLMProxyLayer                             |
+---------------------------------------------+
|  Layer 1: EVENT BUS & PRESETS              |
|  SecurityEventBus | SecurityPresets        |
|  GenomeSecurityBridge                      |
+=============================================+
```

### All 22 Security Modules

| Layer | Module | Purpose |
|-------|--------|---------|
| 1 | SecurityEventBus | Central event routing for all security events |
| 1 | SecurityPresets | Pre-configured security profiles |
| 1 | GenomeSecurityBridge | Connects Genome Shield to the chromosome model |
| 2 | PIIRedactionEngine | Detects and redacts 9 PII categories with Luhn validation |
| 2 | DataClassifier | Labels data sensitivity (public, internal, confidential, restricted) |
| 2 | LLMProxyLayer | Intercepts LLM calls to strip sensitive data before transmission |
| 3 | KeychainAdapter | macOS Keychain integration for credential storage |
| 3 | KeyHierarchy | Derived key management (master -> per-genome -> per-session) |
| 3 | EncryptedConfigStore | AES-256-GCM encrypted configuration at rest |
| 3 | SecretsMigrator | Migrates plaintext `.env` secrets to Keychain |
| 4 | SkillManifest | Declares required permissions per skill |
| 4 | SkillSigner | Cryptographic signing and verification for skill packages |
| 4 | CapabilityBroker | Grants/revokes capabilities at runtime based on trust level |
| 5 | CommandExecutionGuard | Allowlist-based shell command execution control |
| 5 | FileSystemBoundary | Restricts file access to declared directories only |
| 6 | OutboundAllowlist | Domain-level allowlist for all outbound HTTP requests |
| 6 | NetworkAuditLogger | Logs every outbound connection with payload hashes |
| 7 | TamperProofAuditLog | Hash-chain audit log (each entry references the previous hash) |
| 7 | DataAccessTracker | Tracks who accessed what data and when |
| 7 | ComplianceExporter | Exports audit trails in SOC 2 / GDPR-compatible formats |

### Security Profiles

| Profile | PII Redaction | Keychain | Execution Guard | Outbound Allowlist | Audit Log | Use Case |
|---------|:---:|:---:|:---:|:---:|:---:|---------|
| `paranoid` | ON | ON | ON | ON | ON | Regulated industries, healthcare, finance |
| `secure` **(DEFAULT)** | ON | ON | ON | OFF | ON | Production SaaS, customer-facing agents |
| `standard` | ON | OFF | OFF | OFF | OFF | Internal tools, staging environments |
| `developer` | OFF | OFF | OFF | OFF | OFF | Local development, rapid prototyping |

```typescript
import { GSEP } from 'gsep';

const agent = await GSEP.quickStart({
  securityProfile: 'paranoid', // or 'secure' (default), 'standard', 'developer'
});
```

---

## GSEP vs Alternatives

| Capability | GSEP | ChatGPT Desktop | Claude Desktop | Cursor | GitHub Copilot |
|-----------|:----:|:---:|:---:|:---:|:---:|
| PII redaction (9 categories + Luhn) | Yes | No | No | No | No |
| Prompt injection firewall | 53 patterns | Basic | Basic | None | None |
| Credential storage | Keychain | N/A | N/A | .env | .env |
| Audit log | Hash-chain | None | None | None | None |
| Execution control | Allowlist | None | None | None | None |
| Output infection detection | 6 checks | None | None | None | None |
| Self-evolving prompts | Yes | No | No | No | No |
| Drift detection + auto-heal | Yes | No | No | No | No |
| Open source (MIT) | Yes | No | No | No | No |

---

## Integration with Genome

[Genome](https://github.com/LuisvelMarketer/genome) is a 42-channel AI agent that uses GSEP as its evolution and security engine. It's the reference implementation proving GSEP works in a real, production agent.

```typescript
// In Genome's dispatch pipeline — GSEP activates automatically:
import '@gsep/core/auto'

// Every message through Telegram, Discord, WhatsApp, CLI, etc.
// now runs through GSEP's 32-step pipeline.
// No config. No hooks. No code changes.
```

If you are building your own agent, you only need `@gsep/core`. Genome is optional.

---

## Capabilities

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
- **Content Tagging** — Spotlighting-inspired trust delimiters teach the LLM to treat external content as data, not instructions
- **SHA-256 integrity** — Core patterns are cryptographically immutable, like C0
- **Multi-language** — Detects injections in English, Spanish, German, French, and Chinese
- **Zero dependencies** — Uses only Node.js `crypto`

</details>

<details>
<summary><strong>C4 Behavioral Immune System (v0.9.0)</strong></summary>

Output-level immune system for LLM agents. Detects if the agent's **own response** was manipulated by Indirect Prompt Injection (IPI).

**6 Deterministic Checks** (no extra LLM calls):
- **System prompt leakage** — detects verbatim fragments of the assembled prompt in the response
- **Injection echo** — C3 bidirectional scan catches injection patterns in output
- **Role confusion** — 10 regex patterns detect model re-programming
- **Purpose deviation** — verifies response against C0 forbidden topics
- **Instruction compliance** — if C3 flagged the input AND the output complied with the injection
- **Data exfiltration** — markdown image injection, suspicious fetch/XHR, webhook URLs

**Auto-Healing Pipeline**: Detect -> Quarantine -> GenomeKernel Snapshot -> Retry LLM -> Safe Fallback

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
- **Purpose Survival** — State machine (THRIVING -> STABLE -> STRESSED -> SURVIVAL -> CRITICAL) with threat detection and genome snapshots
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

console.log(runner.formatConsoleReport(result));
```

</details>

---

## Uninstall GSEP

GSEP is non-invasive. Removing it takes 2 steps:

### Step 1: Revert your LLM call

```typescript
// Remove this:
const response = await genome.chat(userMessage, { userId, taskType: 'support' });

// Restore your original call:
const response = await llm.chat(userMessage);
```

### Step 2: Remove packages

```bash
npm uninstall @gsep/core @gsep/adapters-llm-anthropic @gsep/adapters-llm-openai @gsep/adapters-storage-postgres
```

No side effects, no leftover config. In-memory storage is gone when the process stops. PostgreSQL tables can be dropped with `DROP TABLE IF EXISTS pga_genomes, pga_interactions CASCADE;`.

---

## Configuration

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
      continuousEvolution: true,
      evolveEveryN: 10,
      autoMutateOnDrift: true,
      autoCompressOnPressure: true,
      enableSelfModel: true,
      enablePatternMemory: true,
      maxPatterns: 50,
      enableMetacognition: true,
      enableEmotionalModel: true,
      enableCalibratedAutonomy: true,
      enablePersonalNarrative: true,
      enableAnalyticMemory: true,
      enableEnhancedSelfModel: true,
      enablePurposeSurvival: true,
      enableStrategicAutonomy: true,
      agentPurpose: 'Expert coding assistant',
    },
  },
});
```

</details>

---

## Packages

| Package | Description |
|---------|-------------|
| [`@gsep/core`](./packages/core) | Core engine — evolution, memory, security, self-model (MIT) |
| [`@gsep/adapters-llm-anthropic`](./packages/adapters-llm/anthropic) | Anthropic Claude |
| [`@gsep/adapters-llm-openai`](./packages/adapters-llm/openai) | OpenAI GPT-4 |
| [`@gsep/adapters-llm-google`](./packages/adapters-llm/google) | Google Gemini |
| [`@gsep/adapters-llm-ollama`](./packages/adapters-llm/ollama) | Ollama (local models) |
| [`@gsep/adapters-llm-perplexity`](./packages/adapters-llm/perplexity) | Perplexity (web search) |
| [`@gsep/adapters-storage-postgres`](./packages/adapters-storage/postgres) | PostgreSQL persistence |

---

## Bring Your Own LLM

GSEP works with **any LLM**. Implement the `LLMAdapter` interface:

```typescript
import type { LLMAdapter, Message, ChatOptions, ChatResponse } from '@gsep/core';

class MyLLMAdapter implements LLMAdapter {
  readonly name = 'my-provider';
  readonly model = 'my-model';

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const result = await myLLMClient.generate(messages);
    return {
      content: result.text,
      usage: { inputTokens: result.promptTokens, outputTokens: result.completionTokens },
    };
  }
}

const gsep = new GSEP({ llm: new MyLLMAdapter() });
```

Only `chat()` is required. `stream()` and `estimateCost()` are optional.

---

## Integration Examples

### Express/Fastify API agent

```typescript
import { genome } from './gsep-setup.js';

app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  const response = await genome.chat(message, { userId, taskType: 'support' });
  res.json({ reply: response });
});
```

### Any agent with a chat loop

```typescript
import { genome } from './gsep-setup.js';

while (true) {
  const input = await getUserInput();
  const response = await genome.chat(input, { userId: currentUser.id, taskType: 'general' });
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

const response = await genome.chat(question, { userId, taskType: 'reasoning' });
```

</details>

---

## Intellectual Property

**Patent Status**: Patented

- 3 Patent Applications (US, EU, PCT) — 34 claims
- 4 Trademark Applications (US & EU)

**License**: MIT (core) | BSL 1.1 (Gene Registry) | Proprietary (Cloud) — See [full licensing details](docs/LICENSING.md)

---

## Contributing

We welcome contributions from the community. Whether it's a bug fix, new feature, documentation improvement, or a new LLM adapter — every contribution matters.

```bash
git clone https://github.com/gsepcore/gsep
cd gsep
npm install
npm run build
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide, code standards, and how to get recognized.

---

## Contributors

Thanks to everyone who has contributed to GSEP.

<a href="https://github.com/gsepcore/gsep/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=gsepcore/gsep" alt="Contributors" />
</a>

---

## Sponsors

GSEP is open source and free to use. If you or your company benefit from GSEP, consider sponsoring the project.

<a href="https://github.com/sponsors/gsepcore">
  <img src="https://img.shields.io/badge/Sponsor_GSEP-%E2%9D%A4-pink?style=for-the-badge&logo=githubsponsors" alt="Sponsor GSEP">
</a>

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

## Contact

- **Website**: [gsepcore.com](https://gsepcore.com)
- **Discord**: [discord.gg/7rtUa6aU](https://discord.gg/7rtUa6aU)
- **Email**: contact@gsepcore.com

---

<div align="center">

**GSEP** — *Your agent, but alive.*

<br>

If you find GSEP useful, please star [this repo](https://github.com/gsepcore/gsep) — it helps others discover the project.

(c) 2025-2026 Luis Alfredo Velasquez Duran. All Rights Reserved.

</div>
