import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { Narration } from "../../components/AnimatedText";
import { CodeBlock } from "../../components/CodeBlock";
import { GlowBadge } from "../../components/Badge";
import { Background } from "../../components/Background";

const TOTAL = 540; // 18s x 30fps

const narrationLines = [
  {
    text: "What if your AI agent could evolve its own intelligence?",
    startFrame: 0,
    endFrame: 120,
  },
  {
    text: "GSEP is a drop-in upgrade that transforms static agents into living systems.",
    startFrame: 120,
    endFrame: 300,
  },
  {
    text: "Three lines of code. No retraining. No fine-tuning.",
    startFrame: 300,
    endFrame: TOTAL,
  },
];

const beforeItems = [
  "Static prompt",
  "Same for all users",
  "Never improves",
  "Manual tuning",
];

const afterItems = [
  "Evolving prompt",
  "Adapts per user",
  "Auto-improves",
  "Self-healing",
];

const S01_Hook_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: Title (0-60f) ---
  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  });
  const titleOpacity = interpolate(titleScale, [0, 1], [0, 1]);

  // Subtitle + badge (30-50f)
  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 2: Comparison boxes (60-280f) ---
  const comparisonOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const comparisonY = interpolate(frame, [60, 90], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 3: Code block (300-540f) ---
  const codeOpacity = interpolate(frame, [300, 330], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeY = interpolate(frame, [300, 330], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title/comparison fade out to make room for code
  const phase1Opacity = interpolate(frame, [270, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {/* ---- Phase 1 + 2: Title & Comparison (0-300f) ---- */}
        {frame < 300 && (
          <div
            style={{
              opacity: phase1Opacity,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Title Block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                transform: `scale(${titleScale})`,
                opacity: titleOpacity,
              }}
            >
              <h1
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 110,
                  fontWeight: 800,
                  color: THEME.white,
                  margin: 0,
                  letterSpacing: -2,
                }}
              >
                GSEP
              </h1>
              <div style={{ opacity: subtitleOpacity }}>
                <h2
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: 36,
                    fontWeight: 500,
                    color: THEME.textMuted,
                    margin: 0,
                  }}
                >
                  Genomic Self-Evolving Prompts
                </h2>
              </div>
              <div style={{ opacity: subtitleOpacity, marginTop: 6 }}>
                <GlowBadge
                  text="Patentado \u00B7 v0.8.0"
                  delay={30}
                  color={THEME.accent}
                />
              </div>
            </div>

            {/* Before / After Comparison */}
            {frame >= 60 && (
              <div
                style={{
                  display: "flex",
                  gap: 50,
                  marginTop: 50,
                  opacity: comparisonOpacity,
                  transform: `translateY(${comparisonY}px)`,
                }}
              >
                {/* BEFORE Box */}
                <div
                  style={{
                    width: 380,
                    padding: 32,
                    backgroundColor: THEME.bgCard,
                    borderRadius: 14,
                    border: `2px solid ${THEME.textMuted}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 20,
                      fontWeight: 700,
                      color: THEME.textMuted,
                      marginBottom: 20,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    BEFORE
                  </div>
                  {beforeItems.map((text, i) => {
                    const itemDelay = 80 + i * 20; // 80, 100, 120, 140
                    const itemOpacity = interpolate(
                      frame,
                      [itemDelay, itemDelay + 15],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          fontFamily: FONTS.body,
                          fontSize: 19,
                          color: THEME.text,
                          marginBottom: 14,
                          opacity: itemOpacity,
                        }}
                      >
                        <span style={{ color: THEME.red }}>&#10005;</span>{" "}
                        {text}
                      </div>
                    );
                  })}
                </div>

                {/* AFTER GSEP Box */}
                <div
                  style={{
                    width: 380,
                    padding: 32,
                    backgroundColor: THEME.bgCard,
                    borderRadius: 14,
                    border: `2px solid ${THEME.green}`,
                    boxShadow: `0 0 24px ${THEME.green}33`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 20,
                      fontWeight: 700,
                      color: THEME.green,
                      marginBottom: 20,
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    AFTER GSEP
                  </div>
                  {afterItems.map((text, i) => {
                    const itemDelay = 120 + i * 20; // 120, 140, 160, 180
                    const itemOpacity = interpolate(
                      frame,
                      [itemDelay, itemDelay + 15],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          fontFamily: FONTS.body,
                          fontSize: 19,
                          color: THEME.text,
                          marginBottom: 14,
                          opacity: itemOpacity,
                        }}
                      >
                        <span style={{ color: THEME.green }}>&#10003;</span>{" "}
                        {text}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Phase 3: Code Block (300-540f) ---- */}
        {frame >= 300 && (
          <div
            style={{
              opacity: codeOpacity,
              transform: `translateY(${codeY}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 30,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 38,
                fontWeight: 700,
                color: THEME.white,
                textAlign: "center",
              }}
            >
              Three lines. That's it.
            </div>
            <CodeBlock
              code={`import { GenomeKernel } from '@pga-ai/core';

const genome = new GenomeKernel({ model: 'claude-sonnet-4-5' });

const response = await genome.chat(message, { userId });`}
              delay={310}
              fontSize={24}
              lineDelay={8}
            />
          </div>
        )}

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S01_Hook_Short;
