/**
 * GSEP Reels / Shorts — English (30-60s each)
 *
 * 10 standalone micro-videos for TikTok, Instagram Reels, YouTube Shorts.
 * Each reel covers ONE topic with a hook → explanation → CTA structure.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

export interface ReelScript {
  id: string;
  title: string;
  hashtags: string[];
  durationSec: number;
  hook: string;
  body: string;
  cta: string;
}

export const reels: ReelScript[] = [
  {
    id: "R01",
    title: "Your AI Agent Is Dying",
    hashtags: ["#AI", "#LLM", "#AgentDev", "#GSEP"],
    durationSec: 35,
    hook: `Your AI agent is getting dumber every day — and you don't even know it.`,
    body: `Prompt drift is real. LLM updates, user behavior shifts, edge cases pile up.
Without evolution, your agent degrades silently.
GSEP detects drift across 5 dimensions and auto-heals before users notice.
Zero manual tuning. Your agent fixes itself.`,
    cta: `Link in bio. npm install @gsep/core. Let your agent evolve.`,
  },
  {
    id: "R02",
    title: "3 Lines to Self-Evolving AI",
    hashtags: ["#CodingTips", "#AI", "#DevTools", "#GSEP"],
    durationSec: 40,
    hook: `What if I told you 3 lines of code could make your AI agent self-improving?`,
    body: `Step 1: Import GSEP and your LLM adapter.
Step 2: Create a genome — your agent's evolutionary container.
Step 3: Replace your LLM call with genome.chat().
That's it. Every interaction now makes your agent smarter.
It learns user preferences, optimizes token usage, and auto-corrects when performance drops.`,
    cta: `Free. MIT licensed. gsepcore.com. Try it now.`,
  },
  {
    id: "R03",
    title: "5 Chromosomes of AI",
    hashtags: ["#AIArchitecture", "#Security", "#GSEP", "#Innovation"],
    durationSec: 50,
    hook: `Your AI agent needs DNA. Here are 5 chromosomes that make it alive.`,
    body: `C0: Immutable identity. SHA-256 locked. Ethics and safety that NEVER change.
C1: Operative genes. Tool usage and reasoning that evolve slowly through validation.
C2: Epigenome. User preferences that adapt fast — daily personalization.
C3: Content Firewall. 53 patterns blocking prompt injection at the INPUT.
C4: Immune System. 6 checks detecting manipulation in the OUTPUT.
Input defense plus output defense. Full-stack security for AI agents.`,
    cta: `Open source. gsepcore.com. Your agent, but alive.`,
  },
  {
    id: "R04",
    title: "AI Security Nobody Talks About",
    hashtags: ["#CyberSecurity", "#AI", "#PromptInjection", "#GSEP"],
    durationSec: 45,
    hook: `Everyone talks about prompt injection defense. Nobody talks about OUTPUT infection.`,
    body: `Your agent's response can be manipulated too.
Indirect Prompt Injection embeds attacks in context — documents, emails, tool outputs.
The agent's own response becomes the weapon.
GSEP's C4 Immune System runs 6 deterministic checks on every output.
System prompt leakage. Role confusion. Data exfiltration. Injection echo.
No extra LLM calls. Auto-quarantine. Self-healing.`,
    cta: `The world's first behavioral immune system for AI agents. gsepcore.com`,
  },
  {
    id: "R05",
    title: "AI Agents That Remember You",
    hashtags: ["#AI", "#Personalization", "#UX", "#GSEP"],
    durationSec: 35,
    hook: `Your AI agent forgets everything between sessions. Mine doesn't.`,
    body: `GSEP's C2 epigenome adapts to each user daily.
Communication style. Formatting preferences. Response length. Tone.
It tracks successful interaction patterns and reinforces what works.
Not just memory — evolution. Your agent doesn't just remember, it gets better at being useful to YOU.`,
    cta: `Free forever. MIT license. npm install @gsep/core`,
  },
  {
    id: "R06",
    title: "6D Fitness for AI",
    hashtags: ["#AI", "#Metrics", "#MLOps", "#GSEP"],
    durationSec: 40,
    hook: `You're measuring your AI agent wrong. Here are the 6 dimensions that matter.`,
    body: `Quality — is the output correct and coherent?
Success rate — does it complete tasks?
Token efficiency — how much compute per answer?
Latency — how fast?
Cost per success — what's the real ROI?
Intervention rate — how often do humans fix it?
GSEP tracks all 6 in real-time with composite scoring and confidence intervals.`,
    cta: `Stop guessing. Start measuring. gsepcore.com`,
  },
  {
    id: "R07",
    title: "Natural Selection for Prompts",
    hashtags: ["#Evolution", "#AI", "#Biotech", "#GSEP"],
    durationSec: 45,
    hook: `What if prompts evolved like DNA? That's exactly what GSEP does.`,
    body: `Every 10 interactions, GSEP runs a full evolution cycle.
Transcription: log everything with quality metrics.
Variation: generate mutations with 8 operators.
Simulation: test in sandbox against real scenarios.
Selection: only deploy improvements that pass 4 safety gates.
Canary deployment. Automatic rollback. Zero downtime.
It's natural selection, but for AI behavior.`,
    cta: `Patented. Production-ready. gsepcore.com`,
  },
  {
    id: "R08",
    title: "10 Cognitive Layers",
    hashtags: ["#AI", "#Consciousness", "#AGI", "#GSEP"],
    durationSec: 50,
    hook: `Your AI agent has zero self-awareness. GSEP gives it ten cognitive layers.`,
    body: `Self-Model: knows its strengths and weaknesses.
Metacognition: thinks before responding.
Emotional intelligence: adapts to user mood.
Calibrated autonomy: decides when to act vs ask.
Pattern memory: remembers what works.
Personal narrative: tracks relationship history.
Analytic memory: knowledge graph of concepts.
Enhanced self-model: health tracking across all dimensions.
Purpose survival: state machine from thriving to critical.
Strategic autonomy: goal-based decision making.
Not sentience. Genuine self-awareness.`,
    cta: `10 layers. One import. gsepcore.com`,
  },
  {
    id: "R09",
    title: "Prove AI ROI in 5 Minutes",
    hashtags: ["#AI", "#ROI", "#Startup", "#GSEP"],
    durationSec: 35,
    hook: `Your boss wants AI ROI? Prove it in 5 minutes with hard data.`,
    body: `GSEP's Proof of Value runner measures improvement objectively.
5 evolution cycles. 10 interactions each.
Watch quality climb from 0.5 to 0.58 — that's +16% verified.
A fitness curve chart your CTO can't argue with.
No promises. No vibes. Just data.`,
    cta: `npx tsx examples/proof-of-value.ts. Try it yourself. gsepcore.com`,
  },
  {
    id: "R10",
    title: "Gene Marketplace for AI",
    hashtags: ["#AI", "#Marketplace", "#OpenSource", "#GSEP"],
    durationSec: 40,
    hook: `What if there was an npm for AI behaviors? That's the GSEP Gene Marketplace.`,
    body: `Developers publish proven prompt genes. Others adopt them.
7 gene types: reasoning, communication, tool usage, error recovery, and more.
Every gene is fitness-verified through real-world performance.
3-step safety adoption: compatibility check, sandbox test, safe integration.
Quality tiers from experimental to certified elite.
Publish once. Earn 80 to 95% of every sale.`,
    cta: `Build genes. Share knowledge. gsepcore.com/marketplace`,
  },
];
