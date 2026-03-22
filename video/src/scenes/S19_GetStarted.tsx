import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Ready to get started?", startFrame: 0, endFrame: 90 },
  { text: "Read the documentation at gsepcore dot com slash docs.", startFrame: 90, endFrame: 300 },
  { text: "Star us on GitHub at github dot com slash pga dash ai slash pga dash platform.", startFrame: 300, endFrame: 550 },
  { text: "Join our Discord community at discord dot gg slash gsep.", startFrame: 550, endFrame: 750 },
  { text: "Or install now with npm install at pga dash ai slash core.", startFrame: 750, endFrame: 1000 },
  { text: "Your agent, but alive. It starts now.", startFrame: 1000, endFrame: 1350 },
];

const ctaCards = [
  {
    icon: "📖",
    title: "Documentation",
    url: "gsepcore.com/docs",
    color: THEME.accent,
    startFrame: 60,
  },
  {
    icon: "⭐",
    title: "Star on GitHub",
    url: "github.com/gsepcore/pga-platform",
    color: THEME.amber,
    startFrame: 160,
  },
  {
    icon: "💬",
    title: "Join Discord",
    url: "https://discord.gg/7rtUa6aU",
    color: THEME.purple,
    startFrame: 260,
  },
  {
    icon: "🚀",
    title: "Install Now",
    url: "npm install @gsep/core",
    color: THEME.green,
    startFrame: 360,
  },
];

export default function S19_GetStarted() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const finalTextOpacity = interpolate(frame, [1100, 1160], [0, 1], { extrapolateRight: "clamp" });
  const finalTextScale = spring({
    frame: frame - 1100,
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
            Get Started
          </h1>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          marginBottom: 80,
        }}>
          {ctaCards.map((card) => {
            const cardOpacity = interpolate(
              frame,
              [card.startFrame, card.startFrame + 60],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const cardScale = spring({
              frame: frame - card.startFrame,
              fps,
              config: { damping: 15, stiffness: 120 },
            });

            return (
              <div
                key={card.title}
                style={{
                  opacity: cardOpacity,
                  transform: `scale(${cardScale})`,
                  backgroundColor: THEME.bgCard,
                  border: `3px solid ${card.color}`,
                  borderRadius: 16,
                  padding: "40px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  boxShadow: `0 0 30px ${card.color}40`,
                  minHeight: 200,
                }}
              >
                <div style={{ fontSize: 72 }}>{card.icon}</div>
                <h2 style={{
                  fontFamily: FONTS.heading,
                  fontSize: 32,
                  color: THEME.white,
                  fontWeight: 700,
                  textAlign: "center",
                }}>
                  {card.title}
                </h2>
                <p style={{
                  fontFamily: FONTS.mono,
                  fontSize: 18,
                  color: card.color,
                  textAlign: "center",
                }}>
                  {card.url}
                </p>
              </div>
            );
          })}
        </div>

        {frame >= 1100 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            textAlign: "center",
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 56,
              color: THEME.white,
              fontWeight: 700,
            }}>
              Your agent, but alive. It starts now.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
