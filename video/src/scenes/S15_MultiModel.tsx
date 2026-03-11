import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { CodeBlock } from "../components/CodeBlock";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "GSEP is model agnostic. Use any LLM.", startFrame: 0, endFrame: 120 },
  { text: "Anthropic Claude. Haiku, Sonnet, Opus.", startFrame: 120, endFrame: 280 },
  { text: "OpenAI. GPT-4, GPT-4-Turbo.", startFrame: 280, endFrame: 420 },
  { text: "Google Gemini. Pro and Flash.", startFrame: 420, endFrame: 560 },
  { text: "Ollama for local models. Llama, Mistral, CodeLlama.", startFrame: 560, endFrame: 700 },
  { text: "Perplexity for web search-augmented generation.", startFrame: 700, endFrame: 840 },
  { text: "Want to add your own model?", startFrame: 840, endFrame: 960 },
  { text: "Implement one method. That's it.", startFrame: 960, endFrame: 1200 },
];

const providers = [
  { name: "Anthropic Claude", models: "Haiku, Sonnet, Opus", color: THEME.accent, startFrame: 60 },
  { name: "OpenAI", models: "GPT-4, GPT-4-Turbo", color: THEME.green, startFrame: 200 },
  { name: "Google Gemini", models: "Pro, Flash", color: THEME.cyan, startFrame: 340 },
  { name: "Ollama", models: "Llama, Mistral, CodeLlama (local)", color: THEME.orange, startFrame: 480 },
  { name: "Perplexity", models: "Sonar (web search)", color: THEME.purple, startFrame: 620 },
];

export default function S15_MultiModel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const byomOpacity = interpolate(frame, [800, 860], [0, 1], { extrapolateRight: "clamp" });

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
            marginBottom: 60,
          }}>
            Model Agnostic
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {providers.map((provider, i) => {
            const cardOpacity = interpolate(
              frame,
              [provider.startFrame, provider.startFrame + 60],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const cardY = interpolate(
              frame,
              [provider.startFrame, provider.startFrame + 60],
              [20, 0],
              { extrapolateRight: "clamp" }
            );

            return (
              <div
                key={provider.name}
                style={{
                  opacity: cardOpacity,
                  transform: `translateY(${cardY}px)`,
                  backgroundColor: THEME.bgCard,
                  borderLeft: `4px solid ${provider.color}`,
                  borderRadius: 8,
                  padding: "20px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{
                  fontFamily: FONTS.heading,
                  fontSize: 28,
                  color: provider.color,
                  fontWeight: 700,
                }}>
                  {provider.name}
                </div>
                <div style={{
                  fontFamily: FONTS.body,
                  fontSize: 18,
                  color: THEME.textMuted,
                }}>
                  {provider.models}
                </div>
              </div>
            );
          })}
        </div>

        {frame >= 800 && (
          <div style={{ opacity: byomOpacity }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 36,
              color: THEME.white,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Bring Your Own Model
            </h2>
            <CodeBlock
              code={`interface LLMAdapter {
  chat(messages: Message[]): Promise<ChatResponse>;
}
// One method. That's it.`}
              delay={10}
              lineDelay={10}
              fontSize={20}
            />
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
