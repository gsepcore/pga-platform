# GSEP Examples

26 runnable examples organized by complexity. Start with the hero demo, then explore by topic.

---

## Quickstart (No API Key Needed)

These examples use mock LLMs — zero cost, zero configuration.

| Example | What it shows | Command |
|---------|--------------|---------|
| [hero-demo.ts](./hero-demo.ts) | Full evolution pipeline: baseline, 3 cycles, quality measurement, fitness curve | `npx tsx examples/hero-demo.ts --dry-run` |
| [proof-of-value.ts](./proof-of-value.ts) | Multi-cycle experiment with progressive improvement simulation | `npx tsx examples/proof-of-value.ts` |

## Core Features

| Example | What it shows | Est. cost | Command |
|---------|--------------|-----------|---------|
| [basic-usage.ts](./basic-usage.ts) | Initialize GSEP, create genome, chat, record feedback, view analytics | ~$0.02 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/basic-usage.ts` |
| [hero-demo.ts](./hero-demo.ts) | Same hero demo with real Claude/GPT evolution | ~$0.08 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/hero-demo.ts anthropic` |
| [evolution-boost-demo.ts](./evolution-boost-demo.ts) | Multi-cycle evolution with fitness tracking and mutation selection | ~$0.15 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/evolution-boost-demo.ts` |
| [intelligence-boost-demo.ts](./intelligence-boost-demo.ts) | SelfModel, pattern memory, drift detection, metacognition | ~$0.10 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/intelligence-boost-demo.ts` |
| [living-agent-demo.ts](./living-agent-demo.ts) | Metacognition, emotional model, calibrated autonomy, Three Pillars | ~$0.15 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/living-agent-demo.ts` |
| [welcome-messages.ts](./welcome-messages.ts) | 4 welcome message styles (short, detailed, technical, casual) | ~$0.01 | `ANTHROPIC_API_KEY=sk-... npx tsx examples/welcome-messages.ts` |

## Evaluation and Benchmarks

| Example | What it shows | Est. cost | Requirements |
|---------|--------------|-----------|-------------|
| [evaluation-demo.ts](./evaluation-demo.ts) | Evaluator framework: single benchmark, comparison, learning velocity | ~$0.20 | `ANTHROPIC_API_KEY` + `DATABASE_URL` |
| [evaluation-suite.ts](./evaluation-suite.ts) | Full benchmark suite runner across all 4 versioned suites | ~$0.30 | `ANTHROPIC_API_KEY` + `DATABASE_URL` |
| [proof-of-value-real-llm.ts](./proof-of-value-real-llm.ts) | Real LLM proof-of-value (Claude or GPT-4) | ~$0.08 | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| [validation-end-to-end.ts](./validation-end-to-end.ts) | Complete E2E validation of all GSEP subsystems | ~$0.10 | `ANTHROPIC_API_KEY` |

Use `--save-report` on any benchmark example to export a markdown report.

## Memory and Knowledge

| Example | What it shows | Est. cost | Requirements |
|---------|--------------|-----------|-------------|
| [layered-memory-demo.ts](./layered-memory-demo.ts) | 3-layer memory architecture (C0 immutable, C1 slow, C2 fast) | ~$0.05 | `ANTHROPIC_API_KEY` |
| [memory-compaction-demo.ts](./memory-compaction-demo.ts) | Automatic memory compression under token pressure | ~$0.08 | `ANTHROPIC_API_KEY` |
| [gene-bank-demo.ts](./gene-bank-demo.ts) | Gene Bank + THK (cross-genome knowledge sharing) | ~$0.10 | `ANTHROPIC_API_KEY` |
| [thk-real-world-example.ts](./thk-real-world-example.ts) | Real-world THK cross-genome knowledge transfer | ~$0.10 | `ANTHROPIC_API_KEY` + `DATABASE_URL` |

## RAG and Reasoning

| Example | What it shows | Est. cost | Requirements |
|---------|--------------|-----------|-------------|
| [rag-demo.ts](./rag-demo.ts) | RAG integration with GSEP evolution | ~$0.10 | `ANTHROPIC_API_KEY` |
| [rag-evaluation.ts](./rag-evaluation.ts) | RAG quality evaluation with benchmarks | ~$0.15 | `ANTHROPIC_API_KEY` |
| [reasoning-demo.ts](./reasoning-demo.ts) | Chain-of-thought reasoning with self-reflection | ~$0.10 | `ANTHROPIC_API_KEY` |
| [reasoning-evaluation.ts](./reasoning-evaluation.ts) | Reasoning quality evaluation with benchmarks | ~$0.15 | `ANTHROPIC_API_KEY` |

## Monitoring and Observability

| Example | What it shows | Est. cost | Requirements |
|---------|--------------|-----------|-------------|
| [monitoring-demo.ts](./monitoring-demo.ts) | Basic drift detection and monitoring setup | ~$0.02 | `ANTHROPIC_API_KEY` |
| [monitoring-demo-direct.ts](./monitoring-demo-direct.ts) | Direct monitoring API (without PGA wrapper) | ~$0.02 | `ANTHROPIC_API_KEY` |
| [monitoring-complete-demo.ts](./monitoring-complete-demo.ts) | Full monitoring dashboard with alerts | ~$0.05 | `ANTHROPIC_API_KEY` |
| [observability-demo.ts](./observability-demo.ts) | Real-time observability and metrics export | ~$0.05 | `ANTHROPIC_API_KEY` |

## Production and Advanced

| Example | What it shows | Est. cost | Requirements |
|---------|--------------|-----------|-------------|
| [postgres-quickstart.ts](./postgres-quickstart.ts) | PostgreSQL adapter setup (persistent storage) | Free | `DATABASE_URL` |
| [pga-with-monitoring-production.ts](./pga-with-monitoring-production.ts) | Production-grade setup with monitoring and alerting | ~$0.05 | `ANTHROPIC_API_KEY` + `DATABASE_URL` |
| [quick-start.ts](./quick-start.ts) | Minimal Gene Bank integration | ~$0.02 | `ANTHROPIC_API_KEY` |

## Starter Templates

Ready-to-fork project templates in [`examples/starter-templates/`](./starter-templates/):

| Template | Description |
|----------|-------------|
| [code-review-assistant.ts](./starter-templates/code-review-assistant.ts) | Code review assistant with GSEP-powered evolution |
| [customer-support-bot.ts](./starter-templates/customer-support-bot.ts) | Customer support bot with per-user adaptation |

---

## Running Examples

All examples run with `npx tsx`:

```bash
# Free (no API key)
npx tsx examples/hero-demo.ts --dry-run

# With Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-... npx tsx examples/<example>.ts

# With OpenAI (where supported)
OPENAI_API_KEY=sk-... npx tsx examples/<example>.ts openai
```

Use `--save-report` to export benchmark results as markdown.
