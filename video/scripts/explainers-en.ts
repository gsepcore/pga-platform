/**
 * GSEP Explainer Videos — English (2-3 min each)
 *
 * 5 mid-length videos for YouTube, website embeds, and marketing.
 * Each explainer covers 3-4 related topics in depth.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

export interface ExplainerScript {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  sections: {
    title: string;
    durationSec: number;
    narration: string;
  }[];
}

export const explainers: ExplainerScript[] = [
  {
    id: "EX01",
    title: "GSEP in 2 Minutes — Your Agent, But Alive",
    description: "Complete overview: the problem, the solution, and how to get started with GSEP.",
    durationSec: 120,
    sections: [
      {
        title: "The Problem",
        durationSec: 25,
        narration: `Every AI agent starts strong. But over time, prompts go stale. LLM updates break assumptions. User needs shift. Performance degrades silently. By the time you notice, users have already left. Manual prompt tuning doesn't scale. You can't A/B test every instruction. And fine-tuning costs thousands of dollars per iteration.`,
      },
      {
        title: "The Solution",
        durationSec: 30,
        narration: `GSEP — Genomic Self-Evolving Prompts — is a drop-in middleware that makes any AI agent self-improving. Three lines of code. No retraining. No fine-tuning. Your agent wraps its prompts in a 5-chromosome genome and evolves automatically. Every interaction generates data. Every 10 interactions, GSEP runs an evolution cycle: mutate, test in sandbox, keep only improvements. It's natural selection for AI behavior.`,
      },
      {
        title: "How It Works",
        durationSec: 35,
        narration: `Five chromosomes protect and evolve your agent. C0 is immutable DNA — identity, ethics, safety rules locked with SHA-256. C1 holds operative genes that evolve slowly through 8-stage validation. C2 is the epigenome — fast user-level adaptation. C3 is a content firewall with 53 patterns blocking prompt injection. And C4 is the behavioral immune system — 6 deterministic checks on every output to detect if your agent's response was manipulated. Plus 10 cognitive layers: self-model, metacognition, emotional intelligence, calibrated autonomy, and more.`,
      },
      {
        title: "Get Started",
        durationSec: 30,
        narration: `Install the core package and your LLM adapter. Initialize GSEP. Replace your LLM call with genome.chat(). That's it. Works with Claude, GPT-4, Gemini, Ollama, and Perplexity. Express, Discord, LangChain — any Node.js app. MIT licensed. Free forever. Run the proof-of-value script and see +16% quality improvement in 5 minutes. Your agent, but alive. gsepcore.com.`,
      },
    ],
  },
  {
    id: "EX02",
    title: "The 5-Chromosome Architecture — Deep Dive",
    description: "How GSEP's biological architecture protects and evolves AI agent behavior.",
    durationSec: 150,
    sections: [
      {
        title: "Why Chromosomes?",
        durationSec: 25,
        narration: `In biology, chromosomes separate critical DNA from adaptive genes. GSEP applies the same principle to AI prompts. Not everything should mutate. Your agent's ethics and safety rules must be immutable. But tool usage patterns, reasoning strategies, and user preferences should evolve. The 5-chromosome architecture gives each layer the right mutation speed and protection level.`,
      },
      {
        title: "C0 + C1 + C2: The Core Layers",
        durationSec: 40,
        narration: `C0 is immutable DNA. Identity, ethics, security constraints. Locked with SHA-256 hashing. If any byte changes, the integrity check fails and the genome enters quarantine. Nothing evolves here. Ever. C1 holds operative genes — tool usage patterns, coding behaviors, reasoning strategies. These mutate slowly. Every mutation passes through an 8-stage promotion gate: statistical significance, safety regression, rollback testing, and more. Only verified improvements ship. C2 is the epigenome — per-user personalization. Communication style, response length, formatting preferences. This layer adapts fast, daily, based on interaction patterns. Different users get different behaviors, all from the same genome.`,
      },
      {
        title: "C3: Content Firewall",
        durationSec: 35,
        narration: `C3 scans all external content before it enters the system prompt. 53 detection patterns across 7 threat categories: prompt injection, role hijacking, data exfiltration, encoding evasion, privilege escalation, instruction override, and content smuggling. A trust registry assigns 4 trust levels: system, validated, external, and untrusted. Content tagging teaches the LLM to treat external data as data, not instructions. Multi-language support covers English, Spanish, German, French, and Chinese. SHA-256 integrity on core patterns — they can't be tampered with.`,
      },
      {
        title: "C4: Behavioral Immune System",
        durationSec: 35,
        narration: `C4 is the world's first output-level immune system for AI agents. While C3 scans the input, C4 scans the output. 6 deterministic checks, no extra LLM calls: system prompt leakage detection, injection echo via bidirectional C3 scanning, role confusion patterns, purpose deviation against C0 constraints, instruction compliance with injected commands, and data exfiltration patterns. If threats are detected: classify severity, quarantine the response, create a GenomeKernel evidence snapshot, retry the LLM call, or return a safe fallback. Persistent immune memory stores up to 100 attack signatures across scans.`,
      },
      {
        title: "The Full Pipeline",
        durationSec: 15,
        narration: `User message enters through C3. Prompt assembles from C0, C1, C2. LLM generates response. C4 scans the output. Clean responses pass through. Infected responses are quarantined and retried. 5 layers. Full-stack protection. Automatic evolution. Your agent gets smarter and safer over time.`,
      },
    ],
  },
  {
    id: "EX03",
    title: "Evolution Engine — How GSEP Makes Agents Smarter",
    description: "The 4-phase evolution cycle, 6D fitness, drift detection, and proof of value.",
    durationSec: 150,
    sections: [
      {
        title: "The Evolution Cycle",
        durationSec: 40,
        narration: `Every 10 interactions, GSEP runs a full evolution cycle. Phase 1: Transcription. Every interaction is logged with quality metrics — success rate, token efficiency, latency, user satisfaction. Phase 2: Variation. The system generates candidate mutations using 8 operators. Synonym replacement, instruction rephrasing, prompt expansion, prompt compression, section reordering, emphasis adjustment, context enrichment, and constraint relaxation. Phase 3: Simulation. Each candidate runs in a sandbox against historical scenarios. Real data, safe environment. Phase 4: Selection. Only mutations that pass all 4 gates deploy: statistical significance, safety regression check, rollback capability, and net fitness gain. Canary deployment rolls changes to 10% of traffic first. Automatic rollback if performance drops.`,
      },
      {
        title: "6D Fitness System",
        durationSec: 30,
        narration: `GSEP doesn't just track accuracy. It evaluates 6 dimensions simultaneously. Quality: output coherence and correctness. Success rate: tasks completed. Token efficiency: cognitive compression — doing more with fewer tokens. Latency: response time. Cost per success: economic ROI. Intervention rate: how often humans need to fix the output. These combine into a weighted composite score. Confidence scales logarithmically with sample size, reaching 95% at 200 or more samples. Each dimension can be weighted differently based on your use case.`,
      },
      {
        title: "Drift Detection",
        durationSec: 30,
        narration: `Most teams discover performance degradation from angry user tickets. GSEP catches it automatically. 5 drift types are monitored in real-time: success rate drift, efficiency drift, latency drift, cost drift, and intervention drift. Severity levels: minor, moderate, severe, critical. Minor drift gets logged. Moderate triggers alerts. Severe increases mutation rate for faster adaptation. Critical triggers emergency rollback to the last known good genome version. Your agent heals itself before users even notice a problem.`,
      },
      {
        title: "Proof of Value",
        durationSec: 25,
        narration: `Don't trust marketing. Run the proof yourself. GSEP's Proof of Value runner measures improvement objectively. Configure cycles and interactions per cycle. Watch the fitness curve climb. A typical run: 5 cycles, 10 interactions each. Result: +16% quality improvement verified. The output is a fitness curve chart, a markdown report, and a console summary. Hard data you can show your team. npx tsx examples/proof-of-value.ts. Five minutes to verified ROI.`,
      },
    ],
  },
  {
    id: "EX04",
    title: "Living Agent — 10 Cognitive Layers Explained",
    description: "How GSEP creates genuinely self-aware AI agents with 10 cognitive systems.",
    durationSec: 150,
    sections: [
      {
        title: "What Is a Living Agent?",
        durationSec: 20,
        narration: `A Living Agent isn't just an LLM with a prompt. It's an AI system that knows itself, understands its users, and makes strategic decisions about its own evolution. GSEP achieves this through 10 cognitive layers that work together. Each layer adds a dimension of awareness. Together, they create something genuinely new: an agent that is self-aware without being sentient.`,
      },
      {
        title: "Awareness Layers (1-5)",
        durationSec: 40,
        narration: `Layer 1: Self-Model. The agent maintains an internal model of its own strengths, weaknesses, and capabilities. It knows what it's good at and what it struggles with. Layer 2: Metacognition. Before each response, the agent evaluates its confidence level. After each response, it reflects on quality. This pre and post introspection prevents overconfident answers. Layer 3: Emotional Model. Detects user emotions from text signals and adapts communication tone. Frustrated users get concise, solution-focused responses. Curious users get detailed explanations. Layer 4: Calibrated Autonomy. The agent learns, per task type, when to act independently versus when to ask for guidance. Over time, it builds a trust model with each user. Layer 5: Pattern Memory. Successful interaction patterns are stored and reinforced. The agent recognizes recurring situations and applies proven strategies.`,
      },
      {
        title: "Deep Context Layers (6-7)",
        durationSec: 30,
        narration: `Layer 6: Personal Narrative. Tracks the relationship history with each user. Interaction milestones, shared context, communication evolution over time. Your agent remembers your journey together. Layer 7: Analytic Memory. Maintains a knowledge graph of entities, relations, and concepts extracted from conversations. Not just keyword memory — semantic understanding. The agent connects ideas across sessions and surfaces relevant context automatically.`,
      },
      {
        title: "Three Pillars of Life (8-10)",
        durationSec: 40,
        narration: `Layer 8: Enhanced Self-Model. Goes beyond basic self-awareness. Tracks purpose alignment, evolution trajectory, and integrated health scores across all cognitive dimensions. The agent knows not just what it can do, but how well it's fulfilling its purpose. Layer 9: Purpose Survival. A state machine with 5 modes: thriving, stable, stressed, survival, critical. When purpose alignment drops — maybe the agent is being asked to do things outside its domain — it enters survival mode. Genome snapshots are created. Mutation rates drop to prevent damage. The agent protects its core identity. Layer 10: Strategic Autonomy. Goal-based decision making for evolution. The agent prioritizes which genes to evolve, adjusts mutation rates based on current health, and can even refuse tasks that would compromise its purpose. It's an agent that makes strategic decisions about its own future.`,
      },
      {
        title: "Integration",
        durationSec: 20,
        narration: `All 10 layers activate with a single configuration flag. They inject context into every prompt via the PromptAssembler. No manual wiring. Each layer produces a prompt section that the LLM reads alongside your system prompt. Start with layers 1 through 5. Add deep context when you see value. Unlock the three pillars for production agents that need maximum resilience. Start simple. Upgrade as you grow.`,
      },
    ],
  },
  {
    id: "EX05",
    title: "GSEP for Your Stack — Integration Guide",
    description: "How to integrate GSEP into Express, Discord, LangChain, and any Node.js app.",
    durationSec: 120,
    sections: [
      {
        title: "3-Step Setup",
        durationSec: 25,
        narration: `Step 1: Install. npm install @pga-ai/core and your LLM adapter. We support @pga-ai/adapters-llm-anthropic for Claude, @pga-ai/adapters-llm-openai for GPT-4, @pga-ai/adapters-llm-google for Gemini, @pga-ai/adapters-llm-ollama for local models, and @pga-ai/adapters-llm-perplexity for web search. Step 2: Initialize. Create a PGA instance with your LLM and storage adapter. Create a genome with a name and system prompt. Step 3: Replace your LLM call with genome.chat(). Pass the user message and optional user ID. That's it. Your agent now evolves.`,
      },
      {
        title: "Express API",
        durationSec: 25,
        narration: `For Express APIs, replace your chat endpoint's LLM call with genome.chat(). Pass request.body.message and request.body.userId. The response comes back in the same format. Evolution happens in the background. Token counting, fitness tracking, drift detection — all automatic. Add error handling and you're production-ready. GSEP is middleware: it sits between your route handler and the LLM.`,
      },
      {
        title: "Discord Bot",
        durationSec: 25,
        narration: `For Discord bots, intercept the message event. Call genome.chat() with message.content and message.author.id. Reply with the response. The genome evolves per user. Each Discord user gets personalized C2 adaptations. The bot remembers interaction patterns, adapts tone, and improves over time. Same 3-step setup. Same evolution engine. Different transport layer.`,
      },
      {
        title: "Configuration Deep Dive",
        durationSec: 25,
        narration: `Start minimal: enable continuous evolution, set evolveEveryN to 10 interactions, enable autoMutateOnDrift. That's the essential config. Want more? Enable selfModel, metacognition, and emotionalModel for awareness. Add calibratedAutonomy and patternMemory for learning. Unlock purposeSurvival and strategicAutonomy for resilience. The firewall and immune system activate automatically. Every feature is opt-in. Start simple. Upgrade as you see value. Configuration is a single object — no external services, no infrastructure changes.`,
      },
      {
        title: "Multi-Model Routing",
        durationSec: 20,
        narration: `GSEP is model-agnostic. Use Claude for complex reasoning and GPT-4 for creative tasks. Use Ollama for local development and Claude in production. The model router optimizes cost and quality automatically. Want to add your own model? Implement the LLMAdapter interface: one chat method, optional stream and estimateCost. That's it. Your custom model gets all GSEP features: evolution, fitness tracking, drift detection, firewall, and immune system. Zero lock-in.`,
      },
    ],
  },
];
