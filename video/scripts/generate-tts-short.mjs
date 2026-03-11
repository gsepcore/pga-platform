#!/usr/bin/env node
/**
 * Generate TTS for the condensed GSEP demo (12 scenes, ~5:30)
 * Uses OpenAI TTS API with HD model
 *
 * Usage: OPENAI_API_KEY=sk-... node scripts/generate-tts-short.mjs
 */

import { writeFileSync, mkdirSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "../public/audio");
mkdirSync(outputDir, { recursive: true });

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Error: OPENAI_API_KEY required.");
  process.exit(1);
}

const VOICE = process.env.VOICE || "onyx";
const MODEL = "tts-1-hd";
const SPEED = 0.95;

// Condensed narration scripts — punchy, clear, developer-friendly
const scenes = [
  {
    id: "short-s01",
    title: "Hook",
    text: `What if your AI agent could evolve its own intelligence? GSEP, Genomic Self-Evolving Prompts, is a drop-in upgrade that transforms static agents into living, self-improving systems. Three lines of code. No retraining. No fine-tuning.`,
  },
  {
    id: "short-s02",
    title: "Core Pitch",
    text: `GSEP wraps your existing LLM calls with an evolutionary layer. Your agent learns from every interaction. It adapts to each user. It self-heals when performance degrades. Works with Claude, GPT-4, Gemini, Ollama, and any LLM you choose.`,
  },
  {
    id: "short-s03",
    title: "Problem",
    text: `Today's AI agents have four critical problems. Static prompts that never improve. Manual tuning that doesn't scale. Blind degradation you don't notice until users complain. And isolated knowledge that dies with each conversation. GSEP solves all four automatically.`,
  },
  {
    id: "short-s04",
    title: "4-Chromosome Architecture",
    text: `At the heart of GSEP is a four-chromosome architecture. C-zero is immutable DNA, protected by SHA-256. It holds core identity, ethics, and security rules that never change. C-one contains operative genes that evolve slowly through validation: tool usage patterns, reasoning strategies, coding behaviors. C-two is the epigenome, fast-adapting to each user's preferences. Communication style, formatting, response length, all personalized daily. C-three is the content firewall with 53 security patterns, defending against prompt injection, role hijacking, and data exfiltration.`,
  },
  {
    id: "short-s05",
    title: "Evolution Cycle",
    text: `Evolution happens in four phases. Transcription logs every interaction with quality metrics. Variation generates mutations using eight operators, from synonym replacement to prompt compression. Simulation tests each candidate in a sandbox against historical scenarios. And selection deploys only mutations that pass all gates: statistical significance, safety checks, and fitness gain. Canary deployment rolls changes out gradually with automatic rollback.`,
  },
  {
    id: "short-s06",
    title: "Fitness + Drift",
    text: `The fitness system tracks six dimensions: quality, success rate, token efficiency, latency, cost per success, and intervention rate. When any metric degrades, the drift detector catches it automatically. Five drift types are monitored with severity levels from minor to critical. Critical drift triggers emergency rollback. No manual intervention needed.`,
  },
  {
    id: "short-s07",
    title: "Living Agent",
    text: `The Living Agent adds ten cognitive layers to your agent. Self-Model, so it knows its own strengths. Metacognition for pre and post-response introspection. Emotional intelligence to adapt to user mood. Calibrated autonomy to decide when to act versus ask. Pattern memory, personal narrative, and analytic memory for deep context awareness. Plus three advanced pillars: enhanced self-model for health tracking, purpose survival for self-preservation, and strategic autonomy for goal-based decision making.`,
  },
  {
    id: "short-s08",
    title: "Firewall",
    text: `The C-three content firewall defends against seven attack categories. Prompt injection, role hijacking, data exfiltration, encoding evasion, privilege escalation, and more. 53 detection patterns. Five languages supported. Zero external dependencies.`,
  },
  {
    id: "short-s09",
    title: "Integration",
    text: `Integration takes three steps. Install the core package and your LLM adapter. Initialize PGA with your chosen model. Replace your LLM call with genome-dot-chat. That's it. One line change. Works with Express, Discord bots, LangChain, or any Node.js app. Your agent now evolves.`,
  },
  {
    id: "short-s10",
    title: "Benchmarks",
    text: `The results speak for themselves. User satisfaction up 25 percent. Task success rate up 18 percent. Token efficiency up 12 percent. And manual interventions down 45 percent. All measured across 20-plus configurations with our standard benchmark suite.`,
  },
  {
    id: "short-s11",
    title: "Get Started",
    text: `GSEP is open source. MIT licensed core, free forever. Run npm install at-pga-ai-slash-core to get started. Read the docs at gsepcore.com. Star us on GitHub. Join the Discord community. Your agent, but alive. It starts now.`,
  },
  {
    id: "short-s12",
    title: "Closing",
    text: `Genomic Self-Evolving Prompts. Patented. Production ready. Let your agent evolve.`,
  },
];

async function generateTTS(scene) {
  const cleanText = scene.text.replace(/\s+/g, " ").trim();
  console.log(`  [${scene.id}] ${scene.title} (${cleanText.length} chars)...`);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: cleanText,
      response_format: "mp3",
      speed: SPEED,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const outPath = resolve(outputDir, `${scene.id}.mp3`);
  writeFileSync(outPath, buffer);
  const size = statSync(outPath).size;
  console.log(`    Saved: ${scene.id}.mp3 (${(size / 1024).toFixed(0)} KB)`);
  return size;
}

async function main() {
  console.log(`\nGSEP Demo Short — OpenAI TTS Generation`);
  console.log(`Voice: ${VOICE} | Model: ${MODEL} | Speed: ${SPEED}\n`);

  let totalSize = 0;
  for (const scene of scenes) {
    try {
      totalSize += await generateTTS(scene);
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! ${scenes.length} files, ${(totalSize / 1024 / 1024).toFixed(1)} MB total.\n`);
}

main();
