import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components/AnimatedText";
import { CodeBlock } from "../components/CodeBlock";
import { GlowBadge } from "../components/Badge";
import { Background } from "../components/Background";

const S01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title spring animation (0-90)
  const titleScale = spring({
    frame: frame - 0,
    fps,
    config: {
      damping: 12,
      mass: 0.5,
    },
  });

  // Subtitle fade (30-60)
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge fade (30-60)
  const badgeOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Comparison boxes (90-450)
  const comparisonOpacity = interpolate(frame, [90, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const comparisonY = interpolate(frame, [90, 150], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Code block (450-750)
  const codeOpacity = interpolate(frame, [450, 510], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const codeY = interpolate(frame, [450, 510], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const narrationLines = [
    { text: "What if your AI agent could evolve its own intelligence?", startFrame: 0, endFrame: 90 },
    { text: "GSEP transforms static prompts into living, learning systems.", startFrame: 90, endFrame: 270 },
    { text: "Watch how it adapts, improves, and self-heals automatically.", startFrame: 270, endFrame: 450 },
    { text: "Just three lines of code. No retraining. No fine-tuning.", startFrame: 450, endFrame: 750 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Title and subtitle */}
        {frame < 450 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              transform: `scale(${titleScale})`,
              marginTop: -100,
            }}
          >
            <h1
              style={{
                fontFamily: FONTS.heading,
                fontSize: 120,
                fontWeight: 800,
                color: THEME.white,
                margin: 0,
                letterSpacing: -2,
              }}
            >
              🧬 GSEP
            </h1>
            <div style={{ opacity: subtitleOpacity }}>
              <h2
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 42,
                  fontWeight: 500,
                  color: THEME.textMuted,
                  margin: 0,
                }}
              >
                Genomic Self-Evolving Prompts
              </h2>
            </div>
            <div style={{ opacity: badgeOpacity, marginTop: 10 }}>
              <GlowBadge text="Patentado · v0.8.0" delay={30} color={THEME.accent} />
            </div>
          </div>
        )}

        {/* Before/After Comparison */}
        {frame >= 90 && frame < 450 && (
          <div
            style={{
              display: "flex",
              gap: 60,
              opacity: comparisonOpacity,
              transform: `translateY(${comparisonY}px)`,
              marginTop: 80,
            }}
          >
            {/* BEFORE Box */}
            <div
              style={{
                width: 400,
                padding: 40,
                backgroundColor: THEME.bgCard,
                borderRadius: 16,
                border: `2px solid ${THEME.textMuted}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 24,
                  fontWeight: 700,
                  color: THEME.textMuted,
                  marginBottom: 24,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                BEFORE
              </div>
              {["Static prompt", "Same for all", "Never improves", "Manual tuning"].map((text, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 20,
                    color: THEME.text,
                    marginBottom: 16,
                    opacity: interpolate(frame, [120 + i * 40, 150 + i * 40], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  ❌ {text}
                </div>
              ))}
            </div>

            {/* AFTER Box */}
            <div
              style={{
                width: 400,
                padding: 40,
                backgroundColor: THEME.bgCard,
                borderRadius: 16,
                border: `2px solid ${THEME.green}`,
                boxShadow: `0 0 30px ${THEME.green}33`,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 24,
                  fontWeight: 700,
                  color: THEME.green,
                  marginBottom: 24,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                AFTER GSEP
              </div>
              {[
                "🧬 Evolving prompt",
                "Adapts per user",
                "Auto-improves",
                "Self-healing",
              ].map((text, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 20,
                    color: THEME.text,
                    marginBottom: 16,
                    opacity: interpolate(frame, [180 + i * 40, 210 + i * 40], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  ✅ {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Block */}
        {frame >= 450 && (
          <div
            style={{
              opacity: codeOpacity,
              transform: `translateY(${codeY}px)`,
            }}
          >
            <CodeBlock
              code={`const response = await genome.chat(message, { userId });`}
              delay={450}
              fontSize={32}
            />
          </div>
        )}

        {/* Narration */}
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0 }}>
          <Narration lines={narrationLines} />
        </div>
      </AbsoluteFill>
    </Background>
  );
};

export default S01_Hook;
