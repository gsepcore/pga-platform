import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { CodeBlock } from "../components/CodeBlock";
import { Badge } from "../components/Badge";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Integrating GSEP takes just three steps.", startFrame: 0, endFrame: 90 },
  { text: "First, install the core package and your LLM adapter.", startFrame: 90, endFrame: 240 },
  { text: "We support Claude, GPT-4, Gemini, Ollama, and Perplexity.", startFrame: 240, endFrame: 400 },
  { text: "Second, initialize GSEP with your chosen LLM and storage.", startFrame: 400, endFrame: 600 },
  { text: "Create a genome for your agent. That's your evolutionary container.", startFrame: 600, endFrame: 850 },
  { text: "Third, replace your existing LLM call with genome dot chat.", startFrame: 850, endFrame: 1050 },
  { text: "It's literally a one-line change.", startFrame: 1050, endFrame: 1200 },
  { text: "That's it. Your agent now evolves.", startFrame: 1200, endFrame: 1350 },
];

export default function S11_Integration() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const step1Opacity = interpolate(frame, [60, 120], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [200, 260], [0, 1], { extrapolateRight: "clamp" });

  const step2Opacity = interpolate(frame, [400, 460], [0, 1], { extrapolateRight: "clamp" });

  const step3Opacity = interpolate(frame, [850, 910], [0, 1], { extrapolateRight: "clamp" });

  const finalTextOpacity = interpolate(frame, [1200, 1260], [0, 1], { extrapolateRight: "clamp" });
  const finalTextScale = spring({
    frame: frame - 1200,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <Background>
      <Narration lines={narrationLines} />
      <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
        <div style={{ opacity: titleOpacity }}>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: 64,
            color: THEME.white,
            fontWeight: 700,
            marginBottom: 80,
          }}>
            Integrate in 3 Steps
          </h1>
        </div>

        {frame >= 60 && (
          <div style={{ opacity: step1Opacity, marginBottom: 60 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 36,
              color: THEME.accent,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Step 1: Install
            </h2>
            <CodeBlock
              code="npm install @gsep/core @gsep/adapters-llm-anthropic"
              delay={10}
              fontSize={20}
            />
            <div style={{
              marginTop: 20,
              opacity: badgeOpacity,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <Badge>Claude</Badge>
              <Badge>GPT-4</Badge>
              <Badge>Gemini</Badge>
              <Badge>Ollama</Badge>
              <Badge>Perplexity</Badge>
            </div>
          </div>
        )}

        {frame >= 400 && (
          <div style={{ opacity: step2Opacity, marginBottom: 60 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 36,
              color: THEME.green,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Step 2: Initialize
            </h2>
            <CodeBlock
              code={`import { PGA, InMemoryStorageAdapter } from '@gsep/core';
import { ClaudeAdapter } from '@gsep/adapters-llm-anthropic';

const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY }),
  storage: new InMemoryStorageAdapter(),
});
const genome = await pga.createGenome({ name: 'my-agent' });`}
              delay={10}
              lineDelay={8}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 850 && (
          <div style={{ opacity: step3Opacity, marginBottom: 60 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 36,
              color: THEME.purple,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Step 3: Replace
            </h2>
            <CodeBlock
              code={`// BEFORE:
const response = await llm.chat(userMessage);

// AFTER (one line change):
const response = await genome.chat(userMessage, { userId: user.id });`}
              delay={10}
              lineDelay={8}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 1200 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            marginTop: 60,
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 56,
              color: THEME.white,
              fontWeight: 700,
              textAlign: "center",
            }}>
              That's it. Your agent now evolves.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
