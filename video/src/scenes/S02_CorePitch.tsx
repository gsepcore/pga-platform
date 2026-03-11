import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components/AnimatedText";
import { Badge } from "../components/Badge";
import { Background } from "../components/Background";

const S02_CorePitch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation (0-120)
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0, 60], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Benefit cards (120-400)
  const benefitCards = [
    { icon: "✗", title: "No retraining. No fine-tuning.", delay: 120 },
    { icon: "{ }", title: "Just 3 lines of code.", delay: 210 },
    { icon: "🧠", title: "Your agent learns autonomously.", delay: 300 },
  ];

  // Big text (400-700)
  const bigTextOpacity = interpolate(frame, [400, 480], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bigTextScale = spring({
    frame: frame - 400,
    fps,
    config: {
      damping: 10,
      mass: 0.3,
    },
  });

  // Provider badges (700-900)
  const providersOpacity = interpolate(frame, [700, 760], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const narrationLines = [
    { text: "GSEP is a drop-in upgrade for any AI agent.", startFrame: 0, endFrame: 120 },
    { text: "No expensive retraining. No complex fine-tuning.", startFrame: 120, endFrame: 300 },
    { text: "Just three lines of code, and your agent starts learning.", startFrame: 300, endFrame: 500 },
    { text: "Compatible with Claude, GPT-4, Gemini, and more.", startFrame: 700, endFrame: 900 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Title */}
        {frame < 400 && (
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              textAlign: "center",
              marginTop: -200,
            }}
          >
            <h1
              style={{
                fontFamily: FONTS.heading,
                fontSize: 72,
                fontWeight: 800,
                color: THEME.white,
                margin: 0,
                marginBottom: 20,
              }}
            >
              Drop-in Upgrade for Any AI Agent
            </h1>
            <p
              style={{
                fontFamily: FONTS.body,
                fontSize: 32,
                color: THEME.textMuted,
                margin: 0,
              }}
            >
              Transform your agent in minutes, not months
            </p>
          </div>
        )}

        {/* Benefit Cards */}
        {frame >= 120 && frame < 400 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 40,
              marginTop: 50,
            }}
          >
            {benefitCards.map((card, i) => {
              const cardOpacity = interpolate(frame, [card.delay, card.delay + 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              const cardX = interpolate(frame, [card.delay, card.delay + 60], [-100, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 30,
                    padding: "30px 50px",
                    backgroundColor: THEME.bgCard,
                    borderRadius: 12,
                    border: `2px solid ${THEME.accent}`,
                    opacity: cardOpacity,
                    transform: `translateX(${cardX}px)`,
                    minWidth: 700,
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      width: 80,
                      height: 80,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: THEME.accent + "22",
                      borderRadius: 12,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.heading,
                      fontSize: 36,
                      fontWeight: 600,
                      color: THEME.white,
                    }}
                  >
                    {card.title}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Big Emphasized Text */}
        {frame >= 400 && frame < 700 && (
          <div
            style={{
              opacity: bigTextOpacity,
              transform: `scale(${bigTextScale})`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 64,
                fontWeight: 800,
                color: THEME.white,
                marginBottom: 20,
              }}
            >
              This is NOT a framework.
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 80,
                fontWeight: 900,
                color: THEME.green,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              This is an UPGRADE.
            </div>
          </div>
        )}

        {/* Provider Badges */}
        {frame >= 700 && (
          <div
            style={{
              opacity: providersOpacity,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 28,
                color: THEME.textMuted,
                marginBottom: 30,
              }}
            >
              Works with:
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {["Claude", "GPT-4", "Gemini", "Ollama", "Perplexity"].map((provider, i) => (
                <div
                  key={i}
                  style={{
                    opacity: interpolate(frame, [720 + i * 20, 750 + i * 20], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <Badge text={provider} delay={720 + i * 20} color={THEME.white} bgColor={THEME.accent} fontSize={24} />
                </div>
              ))}
            </div>
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

export default S02_CorePitch;
