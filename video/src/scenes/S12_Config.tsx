import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { CodeBlock } from "../components/CodeBlock";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Configuration gives you control over evolution behavior.", startFrame: 0, endFrame: 90 },
  { text: "Start with a minimal configuration.", startFrame: 90, endFrame: 240 },
  { text: "Enable continuous evolution, set frequency, and auto-mutate on drift.", startFrame: 240, endFrame: 500 },
  { text: "Or go full living agent.", startFrame: 500, endFrame: 600 },
  { text: "Enable self-model, metacognition, emotional modeling.", startFrame: 600, endFrame: 800 },
  { text: "Add calibrated autonomy, personal narrative, and analytic memory.", startFrame: 800, endFrame: 1000 },
  { text: "Unlock enhanced self-model, purpose survival, and strategic autonomy.", startFrame: 1000, endFrame: 1200 },
  { text: "Start simple. Upgrade as you see value.", startFrame: 1200, endFrame: 1500 },
];

export default function S12_Config() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const minimalOpacity = interpolate(frame, [60, 120], [0, 1], { extrapolateRight: "clamp" });
  const minimalY = interpolate(frame, [60, 120], [20, 0], { extrapolateRight: "clamp" });

  const fullOpacity = interpolate(frame, [500, 560], [0, 1], { extrapolateRight: "clamp" });
  const fullY = interpolate(frame, [500, 560], [20, 0], { extrapolateRight: "clamp" });

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
            marginBottom: 60,
          }}>
            Configuration
          </h1>
        </div>

        {frame >= 60 && (
          <div style={{
            opacity: minimalOpacity,
            transform: `translateY(${minimalY}px)`,
            marginBottom: 40,
          }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 32,
              color: THEME.accent,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Minimal Configuration
            </h2>
            <CodeBlock
              code={`autonomous: {
  continuousEvolution: true,
  evolveEveryN: 10,
  autoMutateOnDrift: true,
}`}
              delay={10}
              lineDelay={8}
              fontSize={22}
            />
          </div>
        )}

        {frame >= 500 && (
          <div style={{
            opacity: fullOpacity,
            transform: `translateY(${fullY}px)`,
            marginBottom: 40,
          }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 32,
              color: THEME.green,
              fontWeight: 600,
              marginBottom: 20,
            }}>
              Full Living Agent
            </h2>
            <CodeBlock
              code={`autonomous: {
  continuousEvolution: true,
  evolveEveryN: 10,
  enableSelfModel: true,
  enableMetacognition: true,
  enableEmotionalModel: true,
  enableCalibratedAutonomy: true,
  enablePersonalNarrative: true,
  enableAnalyticMemory: true,
  enableEnhancedSelfModel: true,
  enablePurposeSurvival: true,
  enableStrategicAutonomy: true,
}`}
              delay={10}
              lineDelay={6}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 1200 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            marginTop: 40,
            textAlign: "center",
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 48,
              color: THEME.white,
              fontWeight: 700,
            }}>
              Start simple. Upgrade as you see value.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
