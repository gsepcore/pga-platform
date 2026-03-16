#!/bin/bash
# Generate TTS voiceover audio files using macOS 'say' command
# Usage: bash scripts/generate-tts-macos.sh
# Voice options: Reed, Daniel, Samantha, Flo, Eddy

VOICE="${VOICE:-Reed}"
OUTPUT_DIR="$(dirname "$0")/../public/audio"
RATE="${RATE:-180}"  # Words per minute (default 180, normal speech)

mkdir -p "$OUTPUT_DIR"

echo ""
echo "GSEP Demo Video — macOS TTS Generation"
echo "Voice: $VOICE | Rate: $RATE wpm"
echo "Output: $OUTPUT_DIR"
echo ""

generate() {
  local id=$1
  local text=$2
  local aiff_file="/tmp/gsep-tts-${id}.aiff"
  local m4a_file="${OUTPUT_DIR}/voiceover-${id}.m4a"

  echo "  Generating ${id}..."
  say -v "$VOICE" -r "$RATE" -o "$aiff_file" "$text"
  afconvert "$aiff_file" "$m4a_file" -d aac -f m4af
  rm -f "$aiff_file"
  local size=$(du -k "$m4a_file" | cut -f1)
  echo "    Saved: voiceover-${id}.m4a (${size} KB)"
}

# S01 — Hook
generate "s01" "What if your AI agent could evolve its own intelligence? ... GSEP transforms static prompts into living, learning systems. ... Watch how it adapts, improves, and self-heals automatically. ... Just three lines of code. No retraining. No fine-tuning."

# S02 — Core Pitch
generate "s02" "GSEP is a drop-in upgrade for any AI agent. ... No expensive retraining. No complex fine-tuning. ... Just three lines of code, and your agent starts learning. ... Compatible with Claude, GPT-4, Gemini, and more."

# S03 — Problem
generate "s03" "Traditional AI agents suffer from four critical problems. ... Static prompts. Manual tuning. Blind degradation. Isolated knowledge. ... Each problem compounds, making agents unreliable at scale. ... GSEP solves all four, automatically."

# S04 — Chromosomes
generate "s04" "GSEP uses a four-chromosome architecture. ... C-zero is immutable DNA, with SHA-256 protection. It defines core identity, ethics, and security rules that never change. ... C-one contains operative genes that evolve slowly through validation. Tool usage, coding patterns, and reasoning strategies get better over time. ... C-two adapts quickly to each user's preferences. Communication style, formatting, and behavior adjust per user, daily. ... C-three is the content firewall, with 53 security patterns. It defends against prompt injection, role hijacking, and data exfiltration. ... Together, they create a layered, intelligent system."

# S05 — Evolution Cycle
generate "s05" "GSEP follows a four-phase evolution cycle. ... First, transcription. Every interaction is logged with quality metrics. Success rate, token efficiency, latency, and user satisfaction are tracked. ... Then, variation. The system generates mutations using eight operators. From synonym replacement and instruction rephrasing, to prompt expansion and compression. ... Next, simulation. Candidates are tested in a sandbox environment. Each mutation runs against historical scenarios to measure improvement. ... Finally, selection. Only improvements that pass all four gates are deployed. Statistical significance, safety checks, rollback capability, and fitness gain. ... Canary deployment rolls out changes gradually, with automatic rollback if performance drops."

# S06 — Fitness 6D
generate "s06" "The fitness system evaluates agent performance across six dimensions. ... Quality measures output coherence and correctness. Success rate tracks tasks completed successfully. Token efficiency measures cognitive compression. Latency tracks response time in milliseconds. Cost per success measures economic efficiency. And intervention rate tracks manual corrections needed. ... These metrics combine into a composite score with weighted importance. ... Confidence scales with sample size, reaching 95 percent at 200 or more samples."

# S07 — Drift Detection
generate "s07" "Drift detection enables proactive performance monitoring. ... The system tracks metrics over time to identify degradation patterns. When drift is detected, the system alerts and prepares to heal. ... Five drift types are monitored: success rate, efficiency, latency, cost, and intervention. ... Severity is categorized from minor to critical, triggering appropriate responses. ... Critical drift triggers emergency rollback and auto-healing. No manual intervention needed. Your agent recovers on its own."

# S08 — Living Agent
generate "s08" "The Living Agent integrates ten cognitive layers for genuine self-awareness. ... Self-Model enables the agent to know its own strengths and weaknesses. ... Metacognition provides pre and post-response introspection. Before each reply, the agent evaluates its confidence level. ... Emotional Model detects user emotions and adapts communication tone. ... Calibrated Autonomy learns when to act independently versus ask for guidance. ... Pattern Memory remembers successful interaction patterns. ... Personal Narrative tracks the relationship history with each user. ... Analytic Memory maintains a knowledge graph of entities and relations. ... Enhanced Self-Model tracks purpose alignment and evolving capabilities. ... Purpose Survival implements a state machine from thriving to critical. When purpose alignment drops, the agent enters survival mode. ... Strategic Autonomy enables goal-based strategic decision making. ... Together, these layers create an agent that is genuinely self-aware."

# S09 — Content Firewall
generate "s09" "C-three, the Content Firewall, protects against seven categories of attacks. ... Prompt injection attempts to override system instructions. Role hijacking tries to change the agent's identity. Data exfiltration attempts to steal conversation data. Encoding evasion uses tricks like Base64 to bypass detection. Privilege escalation tries to gain unauthorized access. Instruction override attempts to inject new system messages. And content smuggling hides malicious content in hypothetical scenarios. ... Three defense mechanisms work together: content tagging, pattern detection, and trust registry. ... The system supports five major languages for global protection. Zero dependencies. Maximum security."

# S10 — Gene Bank + Marketplace
generate "s10" "Gene Bank stores locally proven genes with high fitness scores. Each gene has been validated through real-world performance. ... The GSEP Marketplace is like npm for AI behaviors. Developers publish proven genes, others adopt them. ... Seven gene types are available: tool usage, reasoning, communication, error recovery, context management, workflows, and domain expertise. ... Adoption follows a three-step safety process. First, a compatibility check. Then, a sandbox test. Finally, safe integration. ... Quality tiers ensure only proven genes are available. From experimental to certified elite."

# S11 — Integration
generate "s11" "Integrating GSEP takes just three steps. ... First, install the core package and your LLM adapter. We support Claude, GPT-4, Gemini, Ollama, and Perplexity. ... Second, initialize PGA with your chosen LLM and storage. Create a genome for your agent. That's your evolutionary container. ... Third, replace your existing LLM call with genome dot chat. It's literally a one-line change. ... That's it. Your agent now evolves."

# S12 — Configuration
generate "s12" "Configuration gives you control over evolution behavior. ... Start with a minimal configuration. Enable continuous evolution, set frequency, and auto-mutate on drift. ... Or go full living agent. Enable self-model, metacognition, and emotional modeling. Add calibrated autonomy, personal narrative, and analytic memory. Unlock enhanced self-model, purpose survival, and strategic autonomy. ... Start simple. Upgrade as you see value."

# S13 — Proof of Value
generate "s13" "Don't take our word for it. Prove it yourself. ... Run the proof-of-value script. Five cycles. Ten interactions each. ... Verdict: improvement proven. Plus sixteen percent quality. ... Watch quality climb from point five to point five eight. Token usage rises as the agent learns to be more thorough. ... The line chart shows the evolution trajectory. ... Hard data, not promises. Prove ROI to your team."

# S14 — Real-World Examples
generate "s14" "GSEP works everywhere your agent lives. ... Express API? One-line replacement. Pass the user message and ID. Evolution happens automatically. ... Discord bot? Same pattern. Intercept the message, call genome chat, reply. ... LangChain? Replace your LLM call inside any chain. ... GSEP is middleware. It sits between your agent and the LLM. Zero refactoring. Maximum evolution."

# S15 — Multi-Model Support
generate "s15" "GSEP is model-agnostic. Use any LLM. ... Anthropic Claude. Haiku, Sonnet, Opus. OpenAI. GPT-4, GPT-4-Turbo. Google Gemini. Pro and Flash. Ollama for local models. Llama, Mistral, CodeLlama. Perplexity for web search-augmented generation. ... Want to add your own model? Implement one method. That's it."

# S16 — Three Pillars of Life
generate "s16" "Version zero point seven introduces the three pillars of life. ... Pillar one: Enhanced Self-Model. Who am I? Purpose alignment, capability tracking, evolution trajectory. The agent tracks its integrated health across all dimensions. ... Pillar two: Purpose Survival. Am I in danger? A state machine with five modes: thriving, stable, stressed, survival, critical. ... Pillar three: Strategic Autonomy. What should I do? Evolution prioritization, adaptive mutation, task refusal when overwhelmed. ... Not sentience. Genuine self-awareness."

# S17 — Benchmarks
generate "s17" "What's the performance impact? ... User satisfaction: up twenty-five percent. Task success rate: up eighteen percent. Token efficiency: up twelve percent. User retention: up thirty-four percent. Manual interventions: down forty-five percent. ... Measured with our standard benchmark suite across twenty-plus configurations."

# S18 — Licensing
generate "s18" "GSEP is open source and sustainable. ... The core engine, adapters, and CLI are MIT licensed. Free forever. Use it anywhere. ... Gene Registry is Business Source License. Free to use. Converts to Apache 2.0 in 2029. ... GSEP Cloud and Enterprise features are proprietary. ... Solo devs and small teams: one hundred percent free. Scale companies: contribute."

# S19 — Get Started
generate "s19" "Ready to get started? ... Read the documentation at gsep-core dot com slash docs. Star us on GitHub. Join our Discord community. Or install now with npm install at-pga-ai-slash-core. ... Your agent, but alive. It starts now."

# S20 — Closing
generate "s20" "Your agent... but alive. ... Genomic Self-Evolving Prompts. Version zero point eight. Patented. MIT licensed. Production ready. ... Created by Luis Alfredo Velasquez Duran. ... Let your agent evolve."

echo ""
echo "Done! Generated 20 voiceover files."
echo "Total size: $(du -sh "$OUTPUT_DIR" | cut -f1)"
echo ""
echo "Next: run 'npm run dev' to preview with audio."
