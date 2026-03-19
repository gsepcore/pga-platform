/**
 * Narration scripts for all 20 scenes.
 * Each scene has a combined text for TTS generation,
 * with natural pauses between lines using "..."
 */

export interface SceneNarration {
  id: string;
  title: string;
  durationSec: number;
  text: string;
}

export const narrations: SceneNarration[] = [
  {
    id: "S01",
    title: "Hook",
    durationSec: 25,
    text: `What if your AI agent could evolve its own intelligence?
... GSEP transforms static prompts into living, learning systems.
... Watch how it adapts, improves, and self-heals automatically.
... Just three lines of code. No retraining. No fine-tuning.`,
  },
  {
    id: "S02",
    title: "Core Pitch",
    durationSec: 30,
    text: `GSEP is a drop-in upgrade for any AI agent.
... No expensive retraining. No complex fine-tuning.
... Just three lines of code, and your agent starts learning.
... Compatible with Claude, GPT-4, Gemini, and more.`,
  },
  {
    id: "S03",
    title: "Problem",
    durationSec: 25,
    text: `Traditional AI agents suffer from four critical problems.
... Static prompts. Manual tuning. Blind degradation. Isolated knowledge.
... Each problem compounds, making agents unreliable at scale.
... GSEP solves all four, automatically.`,
  },
  {
    id: "S04",
    title: "Chromosomes",
    durationSec: 60,
    text: `GSEP uses a five-chromosome architecture.
... C-zero is immutable DNA, with SHA-256 protection.
It defines core identity, ethics, and security rules that never change.
... C-one contains operative genes that evolve slowly through validation.
Tool usage, coding patterns, and reasoning strategies get better over time.
... C-two adapts quickly to each user's preferences.
Communication style, formatting, and behavior adjust per user, daily.
... C-three is the content firewall, with 53 security patterns.
It defends against prompt injection, role hijacking, and data exfiltration.
... C-four is the behavioral immune system — six deterministic checks detect if the agent's own response was manipulated, with auto-quarantine and self-healing.
... Together, they create a layered, intelligent system.`,
  },
  {
    id: "S05",
    title: "Evolution Cycle",
    durationSec: 75,
    text: `GSEP follows a four-phase evolution cycle.
... First, transcription. Every interaction is logged with quality metrics.
Success rate, token efficiency, latency, and user satisfaction are tracked.
... Then, variation. The system generates mutations using eight operators.
From synonym replacement and instruction rephrasing, to prompt expansion and compression.
... Next, simulation. Candidates are tested in a sandbox environment.
Each mutation runs against historical scenarios to measure improvement.
... Finally, selection. Only improvements that pass all four gates are deployed.
Statistical significance, safety checks, rollback capability, and fitness gain.
... Canary deployment rolls out changes gradually, with automatic rollback if performance drops.`,
  },
  {
    id: "S06",
    title: "Fitness 6D",
    durationSec: 50,
    text: `The fitness system evaluates agent performance across six dimensions.
... Quality measures output coherence and correctness.
Success rate tracks tasks completed successfully.
Token efficiency measures cognitive compression.
Latency tracks response time in milliseconds.
Cost per success measures economic efficiency.
And intervention rate tracks manual corrections needed.
... These metrics combine into a composite score with weighted importance.
... Confidence scales with sample size, reaching 95% at 200 or more samples.`,
  },
  {
    id: "S07",
    title: "Drift Detection",
    durationSec: 55,
    text: `Drift detection enables proactive performance monitoring.
... The system tracks metrics over time to identify degradation patterns.
When drift is detected, the system alerts and prepares to heal.
... Five drift types are monitored: success rate, efficiency, latency, cost, and intervention.
... Severity is categorized from minor to critical, triggering appropriate responses.
... Critical drift triggers emergency rollback and auto-healing.
No manual intervention needed. Your agent recovers on its own.`,
  },
  {
    id: "S08",
    title: "Living Agent — 10 Cognitive Layers",
    durationSec: 90,
    text: `The Living Agent integrates ten cognitive layers for genuine self-awareness.
... Self-Model enables the agent to know its own strengths and weaknesses.
... Metacognition provides pre and post-response introspection.
Before each reply, the agent evaluates its confidence level.
... Emotional Model detects user emotions and adapts communication tone.
... Calibrated Autonomy learns when to act independently versus ask for guidance.
... Pattern Memory remembers successful interaction patterns.
... Personal Narrative tracks the relationship history with each user.
... Analytic Memory maintains a knowledge graph of entities and relations.
... Enhanced Self-Model tracks purpose alignment and evolving capabilities.
... Purpose Survival implements a state machine from thriving to critical.
When purpose alignment drops, the agent enters survival mode.
... Strategic Autonomy enables goal-based strategic decision making.
... Together, these layers create an agent that is genuinely self-aware.`,
  },
  {
    id: "S09",
    title: "Content Firewall C3",
    durationSec: 45,
    text: `C-three, the Content Firewall, protects against seven categories of attacks.
... Prompt injection attempts to override system instructions.
Role hijacking tries to change the agent's identity.
Data exfiltration attempts to steal conversation data.
Encoding evasion uses tricks like Base64 to bypass detection.
Privilege escalation tries to gain unauthorized access.
Instruction override attempts to inject new system messages.
And content smuggling hides malicious content in hypothetical scenarios.
... Three defense mechanisms work together: content tagging, pattern detection, and trust registry.
... The system supports five major languages for global protection.
Zero dependencies. Maximum security.`,
  },
  {
    id: "S10",
    title: "Gene Bank + Marketplace",
    durationSec: 60,
    text: `Gene Bank stores locally proven genes with high fitness scores.
Each gene has been validated through real-world performance.
... The GSEP Marketplace is like npm for AI behaviors.
Developers publish proven genes, others adopt them.
... Seven gene types are available: tool usage, reasoning, communication, error recovery, context management, workflows, and domain expertise.
... Adoption follows a three-step safety process.
First, a compatibility check. Then, a sandbox test. Finally, safe integration.
... Quality tiers ensure only proven genes are available.
From experimental to certified elite.`,
  },
  {
    id: "S11",
    title: "3-Step Integration",
    durationSec: 45,
    text: `Integrating GSEP takes just three steps.
... First, install the core package and your LLM adapter.
We support Claude, GPT-4, Gemini, Ollama, and Perplexity.
... Second, initialize PGA with your chosen LLM and storage.
Create a genome for your agent. That's your evolutionary container.
... Third, replace your existing LLM call with genome-dot-chat.
It's literally a one-line change.
... That's it. Your agent now evolves.`,
  },
  {
    id: "S12",
    title: "Configuration",
    durationSec: 50,
    text: `Configuration gives you control over evolution behavior.
... Start with a minimal configuration.
Enable continuous evolution, set frequency, and auto-mutate on drift.
... Or go full living agent.
Enable self-model, metacognition, and emotional modeling.
Add calibrated autonomy, personal narrative, and analytic memory.
Unlock enhanced self-model, purpose survival, and strategic autonomy.
... Start simple. Upgrade as you see value.`,
  },
  {
    id: "S13",
    title: "Proof of Value",
    durationSec: 70,
    text: `Don't take our word for it. Prove it yourself.
... Run the proof-of-value script.
Five cycles. Ten interactions each.
... Verdict: improvement proven. Plus sixteen percent quality.
... Watch quality climb from point five to point five eight.
Token usage rises as the agent learns to be more thorough.
... The line chart shows the evolution trajectory.
... Hard data, not promises. Prove ROI to your team.`,
  },
  {
    id: "S14",
    title: "Real-World Examples",
    durationSec: 60,
    text: `GSEP works everywhere your agent lives.
... Express API? One-line replacement.
Pass the user message and ID. Evolution happens automatically.
... Discord bot? Same pattern.
Intercept the message, call genome-chat, reply.
... LangChain? Replace your LLM call inside any chain.
... GSEP is middleware. It sits between your agent and the LLM.
Zero refactoring. Maximum evolution.`,
  },
  {
    id: "S15",
    title: "Multi-Model Support",
    durationSec: 40,
    text: `GSEP is model-agnostic. Use any LLM.
... Anthropic Claude. Haiku, Sonnet, Opus.
OpenAI. GPT-4, GPT-4-Turbo.
Google Gemini. Pro and Flash.
Ollama for local models. Llama, Mistral, CodeLlama.
Perplexity for web search-augmented generation.
... Want to add your own model?
Implement one method. That's it.`,
  },
  {
    id: "S16",
    title: "Three Pillars of Life",
    durationSec: 60,
    text: `Version zero point seven introduces the three pillars of life.
... Pillar one: Enhanced Self-Model. Who am I?
Purpose alignment, capability tracking, evolution trajectory.
The agent tracks its integrated health across all dimensions.
... Pillar two: Purpose Survival. Am I in danger?
A state machine with five modes: thriving, stable, stressed, survival, critical.
... Pillar three: Strategic Autonomy. What should I do?
Evolution prioritization, adaptive mutation, task refusal when overwhelmed.
... Not sentience. Genuine self-awareness.`,
  },
  {
    id: "S17",
    title: "Benchmarks",
    durationSec: 50,
    text: `What's the performance impact?
... User satisfaction: up twenty-five percent.
Task success rate: up eighteen percent.
Token efficiency: up twelve percent.
User retention: up thirty-four percent.
Manual interventions: down forty-five percent.
... Measured with our standard benchmark suite across twenty-plus configurations.`,
  },
  {
    id: "S18",
    title: "Licensing",
    durationSec: 40,
    text: `GSEP is open source and sustainable.
... The core engine, adapters, and CLI are MIT licensed. Free forever. Use it anywhere.
... Gene Registry is Business Source License.
Free to use. Converts to Apache 2.0 in 2029.
... GSEP Cloud and Enterprise features are proprietary.
... Solo devs and small teams: one hundred percent free.
Scale companies: contribute.`,
  },
  {
    id: "S19",
    title: "Get Started",
    durationSec: 45,
    text: `Ready to get started?
... Read the documentation at gsep-core dot com slash docs.
Star us on GitHub.
Join our Discord community.
Or install now with npm install at-pga-ai-slash-core.
... Your agent, but alive. It starts now.`,
  },
  {
    id: "S20",
    title: "Closing",
    durationSec: 30,
    text: `Your agent... but alive.
... Genomic Self-Evolving Prompts. Version zero point nine.
Patented. MIT licensed. Production ready.
... Created by Luis Alfredo Velasquez Duran.
... Let your agent evolve.`,
  },
];
