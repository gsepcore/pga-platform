import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "GSEP is open source and sustainable.", startFrame: 0, endFrame: 120 },
  { text: "The core engine, adapters, and CLI are MIT licensed.", startFrame: 120, endFrame: 300 },
  { text: "Free forever. Use it anywhere.", startFrame: 300, endFrame: 450 },
  { text: "Gene Registry is Business Source License.", startFrame: 450, endFrame: 650 },
  { text: "Free to use. Converts to Apache two point oh in twenty twenty-nine.", startFrame: 650, endFrame: 850 },
  { text: "GSEP Cloud and Enterprise features are proprietary.", startFrame: 850, endFrame: 1050 },
  { text: "Solo devs and small teams: one hundred percent free.", startFrame: 1050, endFrame: 1200 },
  { text: "Scale companies: contribute.", startFrame: 1200, endFrame: 1350 },
];

const licenses = [
  {
    title: "Core Engine, Adapters, CLI",
    badge: "MIT License",
    description: "Free forever",
    color: THEME.green,
    startFrame: 60,
  },
  {
    title: "Gene Registry",
    badge: "BSL 1.1 → Apache 2.0 (2029)",
    description: "Free to use",
    color: THEME.amber,
    startFrame: 400,
  },
  {
    title: "GSEP Cloud, Enterprise",
    badge: "Proprietary",
    description: "Commercial support",
    color: THEME.purple,
    startFrame: 700,
  },
];

export default function S18_Licensing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const finalTextOpacity = interpolate(frame, [1000, 1060], [0, 1], { extrapolateRight: "clamp" });
  const finalTextScale = spring({
    frame: frame - 1000,
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
            Open Source + Sustainable
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {licenses.map((license) => {
            const cardOpacity = interpolate(
              frame,
              [license.startFrame, license.startFrame + 60],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const cardScale = spring({
              frame: frame - license.startFrame,
              fps,
              config: { damping: 12, stiffness: 100 },
            });

            return (
              <div
                key={license.title}
                style={{
                  opacity: cardOpacity,
                  transform: `scale(${cardScale})`,
                  backgroundColor: THEME.bgCard,
                  borderLeft: `6px solid ${license.color}`,
                  borderRadius: 12,
                  padding: "30px 40px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <h2 style={{
                  fontFamily: FONTS.heading,
                  fontSize: 32,
                  color: THEME.white,
                  fontWeight: 700,
                }}>
                  {license.title}
                </h2>
                <div style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  backgroundColor: license.color,
                  borderRadius: 20,
                  fontFamily: FONTS.mono,
                  fontSize: 16,
                  color: THEME.white,
                  fontWeight: 600,
                  alignSelf: "flex-start",
                }}>
                  {license.badge}
                </div>
                <p style={{
                  fontFamily: FONTS.body,
                  fontSize: 22,
                  color: THEME.textMuted,
                }}>
                  {license.description}
                </p>
              </div>
            );
          })}
        </div>

        {frame >= 1000 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            textAlign: "center",
            marginTop: 60,
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 44,
              color: THEME.white,
              fontWeight: 700,
              lineHeight: 1.4,
            }}>
              Solo devs & small teams: 100% free.<br />
              Scale companies: contribute.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
