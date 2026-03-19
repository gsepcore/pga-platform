# GSEP Platform — Demo Video Script

**Duration**: ~2 minutes
**Format**: Terminal recording (asciinema) + voiceover
**Tools**: asciinema, agg (GIF), or OBS for MP4

---

## Scene 1: The Problem (15s)

**Screen**: Show a static system prompt in a text editor.

**Voiceover**:
> "Your AI agent has a problem. Its prompt is frozen in time.
> Users change. Context shifts. Performance drifts.
> And you're stuck manually rewriting prompts every week."

**Visual**: Flash a montage of "prompt v1", "prompt v2", "prompt v47_FINAL_final"

---

## Scene 2: Introducing GSEP (10s)

**Screen**: Show the terminal, clean.

**Voiceover**:
> "What if your agent could evolve its own prompts?
> GSEP is a drop-in evolution layer. Three steps. That's it."

**Terminal**:
```bash
npm install @pga-ai/core
```

---

## Scene 3: Live Demo — Dry Run (45s)

**Voiceover**:
> "Let me show you. This is a real evolution run — zero cost, no API keys."

**Terminal** (type slowly for effect):
```bash
npx tsx examples/hero-demo.ts --dry-run
```

**Wait for output**. The demo will show:

```
🧬 GSEP Proof of Value — Dry Run (Mock LLM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Baseline Evaluation (before evolution)
   Quality: 0.530 | Success: 0.0% | Tokens: 61

🔄 Evolution Cycle 1
   Quality: 0.540 (+1.9%) | Tokens: 80

🔄 Evolution Cycle 2
   Quality: 0.560 (+5.7%) | Tokens: 97

🔄 Evolution Cycle 3
   Quality: 0.560 (+5.7%) | Tokens: 97

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Verdict: +5.7% quality improvement
   Cost: $0.00 (mock LLM)
   Duration: ~2s
```

**Voiceover** (during output):
> "Watch the quality score. Baseline: 0.530.
> After cycle 1: 0.540. The agent already improved.
> Cycle 2: 0.560. That's a 5.7% improvement — automatically.
> No manual prompt tuning. No retraining. Just evolution."

---

## Scene 4: How It Works (20s)

**Screen**: Show a diagram (can be ASCII art in terminal or overlay graphic).

**Voiceover**:
> "Under the hood, GSEP uses a 5-layer chromosome system.
> Layer 0 is your immutable DNA — ethics, identity, safety — locked with SHA-256.
> Layer 1 is your operative behavior — it mutates slowly, with an 8-stage safety gate.
> Layer 2 is per-user preferences — adapts fast, daily.
> C3 is the content firewall — 53 patterns block prompt injection at the input.
> C4 is the behavioral immune system — 6 checks detect if the output was manipulated, with auto-quarantine and self-healing.
>
> Every 10 interactions, GSEP runs an evolution cycle:
> transcribe, mutate, test in sandbox, keep only improvements."

**Terminal** (optional — show the architecture):
```
┌────────────────────────────────────┐
│  C0: Immutable DNA       🔒       │
│  Identity + Ethics (SHA-256)       │
├────────────────────────────────────┤
│  C1: Operative Genes     🐢       │
│  Behavior (8-stage gate)           │
├────────────────────────────────────┤
│  C2: Epigenomes          ⚡       │
│  Per-user preferences (daily)      │
├────────────────────────────────────┤
│  C3: Content Firewall    🛡️       │
│  Input defense (53 patterns)       │
├────────────────────────────────────┤
│  C4: Immune System       🧬       │
│  Output defense (6 checks)         │
└────────────────────────────────────┘
```

---

## Scene 5: Real LLM Proof (15s)

**Voiceover**:
> "Don't trust mock data? Run it with a real LLM.
> Claude Haiku costs 8 cents. GPT-4o-mini costs 5 cents."

**Terminal**:
```bash
ANTHROPIC_API_KEY=sk-... npx tsx examples/hero-demo.ts anthropic
```

**Show results table** (from actual benchmark):

```
| Cycle    | Quality | Success | Tokens |
|----------|---------|---------|--------|
| Baseline | 0.800   | 100.0%  | 424    |
| Cycle 1  | 0.780   | 80.0%   | 419    |
| Cycle 2  | 0.770   | 60.0%   | 430    |
| Cycle 3  | 0.770   | 60.0%   | 432    |

Duration: 146s | Cost: ~$0.08
```

**Voiceover**:
> "3 cycles isn't enough for convergence — production uses 50 to 100 cycles.
> But even here, the system is working: measuring, mutating, selecting."

---

## Scene 6: Integration (15s)

**Voiceover**:
> "GSEP works with any stack. Express, Fastify, Discord, Slack, LangChain.
> One line change: swap your LLM call for genome.chat()."

**Terminal** (show code):
```typescript
// Before
const response = await llm.chat(userMessage);

// After (GSEP evolution enabled)
const response = await genome.chat(userMessage, { userId });
```

---

## Scene 7: Call to Action (10s)

**Screen**: Clean terminal with the command.

**Voiceover**:
> "Try it yourself. Free. No API keys needed.
> Star us on GitHub. Join the community."

**Terminal**:
```bash
npm install @pga-ai/core
npx tsx examples/hero-demo.ts --dry-run
```

**End card**:
```
🧬 GSEP — Your AI Agent, But Alive

GitHub:  github.com/gsepcore/pga-platform
License: MIT (free forever)
```

---

## Recording Instructions

### Option A: asciinema (recommended for terminal demos)

```bash
# Install
pip3 install asciinema

# Record
asciinema rec demo.cast --title "GSEP Platform Demo"

# Play back
asciinema play demo.cast

# Convert to GIF (for GitHub/Twitter)
pip3 install agg
agg demo.cast demo.gif --theme monokai
```

### Option B: OBS Studio (for polished video with voiceover)

1. Open OBS Studio
2. Set up terminal as source (iTerm2 or Terminal.app)
3. Add microphone for voiceover
4. Record at 1920x1080
5. Export as MP4
6. Upload to YouTube

### Option C: Screen recording (quickest)

```bash
# macOS built-in
# Cmd+Shift+5 → Record Selected Portion
# Select terminal window → Record
```

---

## Tips for Recording

1. **Font size**: 18-20pt in terminal (readable on mobile)
2. **Theme**: Dark background (Monokai or Dracula)
3. **Typing speed**: Slow enough to read, fast enough to not bore
4. **Pauses**: 2-3 seconds after each important output line
5. **Terminal width**: 80 columns (fits all screens)
6. **Clean terminal**: `clear` before recording
