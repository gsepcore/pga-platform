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
import { Badge } from "../../components/Badge";
import { Background } from "../../components/Background";

const TOTAL = 660; // 22s x 30fps

const narrationLines = [
  {
    text: "GSEP wraps your existing LLM calls with an evolutionary layer.",
    startFrame: 0,
    endFrame: 120,
  },
  {
    text: "Your agent learns from every interaction. It adapts to each user.",
    startFrame: 120,
    endFrame: 280,
  },
  {
    text: "It self-heals when performance degrades.",
    startFrame: 280,
    endFrame: 400,
  },
  {
    text: "Works with Claude, GPT-4, Gemini, Ollama, and any LLM you choose.",
    startFrame: 480,
    endFrame: TOTAL,
  },
];

const benefitCards = [
  {
    icon: "\u2717",
    title: "No retraining. No fine-tuning.",
    delay: 60,
  },
  {
    icon: "{ }",
    title: "Just 3 lines of code.",
    delay: 120,
  },
  {
    icon: "\uD83E\uDDE0",
    title: "Your agent learns autonomously.",
    delay: 180,
  },
];

const providers = ["Claude", "GPT-4", "Gemini", "Ollama", "Perplexity"];

const S02_CorePitch_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: Title (0-50f) ---
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title + cards fade out before big text
  const phase1Opacity = interpolate(frame, [270, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 2: Big text (300-480f) ---
  const bigTextScale = spring({
    frame: frame - 300,
    fps,
    config: { damping: 10, mass: 0.3, stiffness: 120 },
  });
  const bigTextOpacity = interpolate(frame, [300, 340], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Big text fade out before providers
  const bigTextFadeOut = interpolate(frame, [450, 480], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 3: Providers (480-660f) ---
  const providersOpacity = interpolate(frame, [480, 510], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {/* ---- Phase 1: Title + Benefit Cards (0-300f) ---- */}
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
            {/* Title */}
            <div
              style={{
                opacity: titleOpacity,
                transform: `translateY(${titleY}px)`,
                textAlign: "center",
                marginBottom: 40,
              }}
            >
              <h1
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 64,
                  fontWeight: 800,
                  color: THEME.white,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Drop-in Upgrade for Any AI Agent
              </h1>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 28,
                  color: THEME.textMuted,
                  margin: 0,
                }}
              >
                Transform your agent in minutes, not months
              </p>
            </div>

            {/* Benefit Cards */}
            {frame >= 60 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                  alignItems: "center",
                }}
              >
                {benefitCards.map((card, i) => {
                  const cardOpacity = interpolate(
                    frame,
                    [card.delay, card.delay + 40],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }
                  );
                  const cardX = interpolate(
                    frame,
                    [card.delay, card.delay + 40],
                    [-80, 0],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }
                  );

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 24,
                        padding: "24px 44px",
                        backgroundColor: THEME.bgCard,
                        borderRadius: 12,
                        border: `2px solid ${THEME.accent}`,
                        opacity: cardOpacity,
                        transform: `translateX(${cardX}px)`,
                        minWidth: 650,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 40,
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: `${THEME.accent}22`,
                          borderRadius: 10,
                          fontFamily: FONTS.mono,
                          color: THEME.accent,
                        }}
                      >
                        {card.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: FONTS.heading,
                          fontSize: 30,
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
          </div>
        )}

        {/* ---- Phase 2: Big Emphasized Text (300-480f) ---- */}
        {frame >= 300 && frame < 480 && (
          <div
            style={{
              opacity: bigTextOpacity * bigTextFadeOut,
              transform: `scale(${bigTextScale})`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 58,
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
                fontSize: 72,
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

        {/* ---- Phase 3: Provider Badges (480-660f) ---- */}
        {frame >= 480 && (
          <div
            style={{
              opacity: providersOpacity,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 44,
                fontWeight: 700,
                color: THEME.white,
                marginBottom: 16,
              }}
            >
              Works with every major LLM
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 24,
                color: THEME.textMuted,
                marginBottom: 40,
              }}
            >
              One integration. All providers.
            </div>
            <div
              style={{
                display: "flex",
                gap: 20,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {providers.map((provider, i) => {
                const badgeDelay = 500 + i * 20; // 500, 520, 540, 560, 580
                const badgeOpacity = interpolate(
                  frame,
                  [badgeDelay, badgeDelay + 20],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                );
                const badgeScale = interpolate(
                  frame,
                  [badgeDelay, badgeDelay + 20],
                  [0.7, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                );

                return (
                  <div
                    key={i}
                    style={{
                      opacity: badgeOpacity,
                      transform: `scale(${badgeScale})`,
                    }}
                  >
                    <Badge
                      text={provider}
                      delay={badgeDelay}
                      color={THEME.white}
                      bgColor={`${THEME.accent}cc`}
                      fontSize={22}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S02_CorePitch_Short;
