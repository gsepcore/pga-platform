# GSEP Reddit Distribution Strategy

## Target Communities (ordered by priority)

### Tier 1 — Post this week
| Subreddit | Members | Post Style | GSEP Angle |
|---|---|---|---|
| **r/AI_Agents** | 212K | Technical deep-dives, tools | "How I made AI agent prompts self-evolving" |
| **r/LocalLLaMA** | 541K | OSS tools, benchmarks | "Open-source prompt evolution for local models" |
| **r/selfhosted** | 300K+ | Self-promo welcome | "MIT-licensed SDK for self-evolving AI prompts" |

### Tier 2 — Post next week
| Subreddit | Members | Post Style | GSEP Angle |
|---|---|---|---|
| **r/ChatGPTCoding** | Large | Practical tips | "Your coding agent's prompts degrade — here's proof" |
| **r/MachineLearning** | 3M+ | Research, papers | "Genetic algorithms applied to LLM prompt optimization" |
| **r/artificial** | 600K+ | News, discussion | "Why static prompts are a dead end for AI agents" |

### Tier 3 — Engage first, post later
| Subreddit | Members | Strategy |
|---|---|---|
| **r/LangChain** | 100K+ | Comment on integration questions, mention GSEP when relevant |
| **r/OpenAI** | 1M+ | Engage in prompt engineering discussions |

---

## Post Templates

### r/AI_Agents — Main Post

**Title**: "I built a genetic algorithm that makes AI agent prompts evolve automatically — open source, MIT licensed"

**Body**:
```
I've been building AI agents for 2 years and the biggest pain point was always prompt maintenance. Every model update, every edge case, every user behavior shift = manually rewriting prompts.

So I built GSEP — an open-source SDK that wraps your existing agent with a genomic evolution layer.

How it works:
- Your prompt is split into "genes" (identity, coding patterns, user preferences)
- Each interaction is scored across 6 fitness dimensions
- The system generates mutations (prompt rewrites) and tests them in sandbox
- Good mutations get deployed via canary rollout. Bad ones auto-rollback.

Safety:
- Layer 0 (core identity/ethics) is SHA-256 protected — NEVER mutates
- Content firewall with 57 threat patterns
- Output immune system (6 checks per response)

Results in testing: +16% quality, +25% satisfaction, -45% human interventions.

Works with Claude, GPT-4, Gemini, Ollama (local), Perplexity. MIT licensed.

GitHub: github.com/gsepcore/gsep

Happy to answer questions about the architecture or trade-offs.
```

### r/LocalLLaMA — Main Post

**Title**: "Open-source prompt evolution SDK — works with Ollama and any local model (MIT license)"

**Body**:
```
Hey LocalLLaMA community,

I built an SDK called GSEP that adds automatic prompt evolution to any LLM agent. Since I know this community cares about local-first: it works with Ollama and any model you run locally.

The idea: instead of static system prompts, your prompts evolve like DNA based on interaction quality. The system tracks 6 fitness dimensions, generates mutations, validates them in sandbox, and deploys via canary rollout.

Key technical details:
- 3-layer genome: immutable identity (SHA-256), slow-mutation operative genes, fast-mutation per-user preferences
- Epsilon-greedy allele selection (90% exploit / 10% explore)
- EMA-based fitness tracking
- Content firewall (57 patterns, no LLM calls needed)

npm install @gsep/core @gsep/adapters-llm-ollama

MIT license. 1600+ tests. TypeScript.

GitHub: github.com/gsepcore/gsep

Built this solo over 18 months. Would love feedback from this community on the local model integration.
```

### r/selfhosted — Main Post

**Title**: "[Self-Promotion] GSEP — MIT-licensed SDK that makes AI agent prompts self-evolving"

**Body**:
```
Hi r/selfhosted,

Just open-sourced GSEP (Genomic Self-Evolving Prompts) — an SDK that wraps any AI agent to make its prompts evolve automatically.

Instead of manually tuning prompts when they degrade, the system:
1. Tracks performance across 6 metrics
2. Detects drift before users notice
3. Generates improved prompt variants
4. Tests them safely (sandbox + canary deployment)
5. Auto-rollbacks bad changes

Works with local models (Ollama), cloud models (Claude, GPT-4, Gemini), or any custom adapter.

Storage: in-memory for testing, PostgreSQL for production (stores genome state, interaction logs, mutation history).

MIT licensed. TypeScript. 1600+ tests.

npm install @gsep/core
GitHub: github.com/gsepcore/gsep

Happy to answer questions!
```

---

## Hacker News Strategy

### Account Karma Building (weeks 1-2)
1. Comment thoughtfully on AI/LLM posts (especially agent-related)
2. Engage in "Ask HN: What are you working on?" threads
3. Upvote and comment on Show HN posts in the AI space
4. Target: 30+ karma before Show HN post

### Show HN Post (week 3+)

**Title**: "Show HN: GSEP – Genetic algorithm that evolves AI agent prompts automatically"

**Body**:
```
Hey HN,

I built GSEP (Genomic Self-Evolving Prompts) — an open-source TypeScript SDK that wraps any AI agent with a prompt evolution layer.

The problem: AI agent prompts degrade over time (model updates, user behavior shifts, edge cases). The typical fix is manual rewriting.

GSEP automates this using biological evolution principles:
- Prompts are split into "genes" organized in 3 layers (immutable/slow-mutation/fast-mutation)
- Each interaction updates fitness scores (6 dimensions)
- When drift is detected, the system generates mutations (4 operators: restructuring, pattern extraction, crossover, breakthrough)
- Mutations are validated through sandbox testing, quality gates, and canary deployment
- Bad mutations auto-rollback via an immune system

Safety is core: immutable identity layer (SHA-256), content firewall (57 patterns), output verification (6 checks).

Works with any LLM (Claude, GPT-4, Gemini, Ollama, Perplexity).

Technical stack: TypeScript, 1600+ tests, MIT licensed.

GitHub: https://github.com/gsepcore/gsep

I've been building this solo for 18 months in Germany. Happy to discuss the architecture and trade-offs.
```

---

## Timeline

| Day | Action |
|---|---|
| **Today (Fri)** | Post on r/AI_Agents |
| **Saturday** | Post on r/LocalLLaMA |
| **Sunday** | Post on r/selfhosted |
| **Mon-Fri** | Comment on 5 HN posts/day (build karma) |
| **Next Mon** | Post on r/ChatGPTCoding |
| **Next Wed** | Publish Article #1 on dev.to |
| **Next Fri** | Publish Article #2 on dev.to + Medium |
| **Week 3** | Show HN post (once karma > 30) |
| **Ongoing** | Engage in all threads, answer questions |

## Rules
1. **NEVER spam** — one post per subreddit, then ENGAGE in comments
2. **Lead with the PROBLEM**, not the solution
3. **End every post with "Happy to answer questions"** — this generates comments
4. **Cross-post articles to**: dev.to, Medium, Hashnode, LinkedIn
5. **Stop the X ads** — organic content only for developer tools
