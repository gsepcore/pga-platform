# Changelog

All notable changes to GSEP (Genomic Self-Evolving Prompts) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0] - 2026-03-19

### C4 Behavioral Immune System

Fifth chromosome layer — post-output IPI detection and self-healing. The world's first behavioral immune system for LLM agents.

### Added
- **BehavioralImmuneSystem** engine — scans agent output for signs of Indirect Prompt Injection
- **6 deterministic output checks** (no extra LLM calls): system prompt leakage, injection echo, role confusion, purpose deviation, instruction compliance, data exfiltration
- **Auto-quarantine pipeline** — GenomeKernel evidence snapshots + LLM retry + safe fallback
- **Persistent immune memory** — attack signatures stored across scans (max 100 entries)
- **Bidirectional C3 scanning** — `agent-output` ContentSource added to C3 firewall
- 26 immune-specific tests covering all checks and graceful degradation
- Integrated into `chat()` flow — activates automatically when C3 is active

### Changed
- **GSEP.ts** — auto-initializes `BehavioralImmuneSystem` in `GenomeInstance` constructor
- **getIntegrityStatus()** — now includes `immuneSystem` stats (scans, threats, quarantines)
- Architecture designation updated from 4-chromosome to **5-chromosome** (C0→C1→C2→C3→C4)
- README, video scenes, landing page, and all marketing updated to reflect C4

---

## [0.8.0] - 2026-03-06

### C3 Content Firewall

Fourth chromosome layer — defense-in-depth against prompt injection, skill poisoning, and supply-chain attacks.

### Added
- **ContentFirewall** engine — scans all external content before it enters the system prompt
- **53 detection patterns** across 7 threat categories (prompt-injection, role-hijacking, instruction-override, data-exfiltration, encoding-evasion, privilege-escalation, content-smuggling)
- **Trust Registry** — 4 trust levels (system, validated, external, untrusted) with per-source scan policies
- **Content Tagging** — Spotlighting-inspired delimiters (`<<<TRUSTED:C0>>>` / `<<<UNTRUSTED:PLUGIN>>>`)
- **SHA-256 integrity** — core patterns are cryptographically immutable
- **Multi-language detection** — English, Spanish, German, French, Chinese
- **Sanitization engine** — removes zero-width chars, HTML comments, script tags
- **Firewall analytics** — track detections by category, source, and pattern
- `Chromosome3` type in `GenomeV2.ts`
- Integrated into all 12+ injection points in `PromptAssembler`
- Enabled by default, opt-out with `firewall: { enabled: false }`
- 36 firewall-specific tests

### Changed
- **PromptAssembler** — all content now flows through `processContent()` → `ContentFirewall.scan()`
- **GSEP.ts** — auto-initializes `ContentFirewall` in `GenomeInstance` constructor
- README updated with four-layer chromosome architecture

---

## [0.7.0] - 2026-03-04

### Three Pillars of Life + Evolution Rewrite

### Added
- **EnhancedSelfModel** — purpose-aware self-awareness with capability tracking, evolution trajectory, health scoring
- **PurposeSurvival** — state machine (THRIVING > STABLE > STRESSED > SURVIVAL > CRITICAL), threat detection, genome snapshots, purpose fidelity gates
- **StrategicAutonomy** — goal-based decisions, evolution prioritization, adaptive mutation rates, task refusal
- **AgentVitals** — unified health scoring across all living agent systems
- **ProofOfValueRunner** — objective measurement of GSEP's impact with fitness curve reporting
- **LLM-powered mutation operators** — 4 mutation types rewritten with intelligence-fed evolution
- **GSEP.wrap()** — universal self-evolving agent middleware for any LLM call
- **@gsep/server** — secure Pull/Push evolution server for external agents (HMAC auth, rate limiting)
- `reportExternalMetrics()` on `GenomeInstance` for external agent metric ingestion

---

## [0.6.0] - 2026-02-28

### Living Agent — 10 Cognitive Layers

### Added
- **Metacognition** — confidence analysis, pre-response reasoning assessment
- **EmotionalModel** — user emotion detection, empathetic response adaptation
- **CalibratedAutonomy** — learns when to act vs ask, per-task-type autonomy levels
- **PersonalNarrative** — relationship history tracking, interaction milestones
- **AnalyticMemoryEngine** — knowledge graph with entity extraction, semantic connections
- All 5 systems integrated into `PromptAssembler` with `toPromptSection()` pattern
- Google Gemini, Ollama, and Perplexity LLM adapters
- Connected canary deployment, gene registry, and feedback loop systems

---

## [0.5.0] - 2026-02-20

### Autonomous Agent

### Added
- **GenesisBootstrap** — autonomous genome initialization from purpose description
- **SelfModel** — agent self-awareness (strengths, weaknesses, capability tracking)
- **PatternMemory** — behavioral pattern detection and prediction
- Continuous evolution mode (`evolveEveryN` interactions)
- Auto-mutation on drift detection
- Auto-compression on token pressure

---

## [0.4.0] - 2026-02-15

### Living OS v2.0 Types + Infrastructure

### Added
- **GenomeV2** types — complete Living OS type system (`Chromosome0`, `Chromosome1`, `Chromosome2`)
- **GenomeKernel** — core genome management with C0 SHA-256 integrity verification
- **DriftAnalyzer** — proactive performance monitoring (5 drift types)
- **FitnessCalculator** — multi-objective optimization (6 dimensions)
- **MutationOperator** — 4 mutation types with safety checks
- **PromotionGate** — 8-stage validation before C1 deployment
- Gene Registry schema (PostgreSQL)
- Evolution guardrails and multi-gate promotion system
- Multi-model routing for cost optimization
- Canary deployment system
- CI/CD pipeline (GitHub Actions, Dependabot, security audit)

---

## [0.3.0] - 2026-02-10

### Advanced Intelligence Systems

### Added
- **Layered Memory** — 3-tier architecture (short/medium/long-term) with 85-95% token reduction
- **RAG Engine** — vector search with semantic embeddings, knowledge-grounded responses
- **Reasoning Engine** — 5 strategies (Direct, CoT, Self-Consistency, Tree-of-Thought, Reflection)
- **Monitoring system** — real-time drift detection, performance metrics, alerting
- OpenAI GPT-4 adapter (`@gsep/adapters-llm-openai`)
- Evaluation framework for objective benchmarking
- Plugin system architecture
- Circuit breaker and retry logic

---

## [0.2.0] - 2025-02-27

### Intelligence Boost

### Added
- **ContextMemory** — conversation history, project detection, preference learning
- **ProactiveSuggestions** — anticipates user needs, error detection, task reminders
- **LearningAnnouncer** — real-time learning announcements, progress tracking
- Adaptive behavior (style, verbosity, tone matching)
- `PromptAssembler` intelligence injection (memory + suggestions)

---

## [0.1.0] - 2025-02-26

### Initial Release

### Added
- Three-layer genome architecture (Layer 0, 1, 2)
- Epsilon-greedy selection for exploration vs exploitation
- Fitness tracking with EMA (Exponential Moving Average)
- Immune system with auto-rollback on >20% performance drop
- Sandbox testing before deployment
- Anthropic Claude adapter (`@gsep/adapters-llm-anthropic`)
- PostgreSQL storage adapter (`@gsep/adapters-storage-postgres`)
- Welcome message system (4 styles)
- Monorepo structure with Turborepo

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| **0.9.0** | 2026-03-19 | C4 Behavioral Immune System — output IPI detection |
| **0.8.0** | 2026-03-06 | C3 Content Firewall — prompt injection defense |
| **0.7.0** | 2026-03-04 | Three Pillars of Life + evolution rewrite |
| **0.6.0** | 2026-02-28 | Living Agent — 10 cognitive layers |
| **0.5.0** | 2026-02-20 | Autonomous Agent (SelfModel, PatternMemory) |
| **0.4.0** | 2026-02-15 | Living OS v2.0 types + infrastructure |
| **0.3.0** | 2026-02-10 | Advanced intelligence (Memory, RAG, Reasoning) |
| **0.2.0** | 2025-02-27 | Intelligence Boost |
| **0.1.0** | 2025-02-26 | Initial release — core engine + adapters |

---

## Links

- **Repository**: https://github.com/gsepcore/gsep
- **Website**: https://gsepcore.com
- **Issues**: https://github.com/gsepcore/gsep/issues

---

## Contributors

- **Luis Alfredo Velasquez Duran** — Creator & Lead Developer

---

## License

- **@gsep/core**: MIT License
- **Gene Registry**: BSL 1.1 (converts to Apache 2.0 in 2029)
- **GSEP Cloud**: Proprietary

See [LICENSE](./LICENSE) for details.
