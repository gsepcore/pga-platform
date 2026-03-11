import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Your agent, but alive.", startFrame: 0, endFrame: 180 },
  { text: "Genomic Self-Evolving Prompts. Version zero point eight point oh.", startFrame: 180, endFrame: 400 },
  { text: "Patentado. MIT licensed. Production ready.", startFrame: 400, endFrame: 650 },
  { text: "Created by Luis Alfredo Velasquez Duran.", startFrame: 650, endFrame: 800 },
  { text: "Let your agent evolve.", startFrame: 800, endFrame: 900 },
];

export default function S20_Closing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dnaOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  const dnaScale = spring({
    frame,
    fps,
    from: 0.5,
    to: 1,
    config: { damping: 15, stiffness: 100 },
  });

  const taglineOpacity = interpolate(frame, [100, 160], [0, 1], { extrapolateRight: "clamp" });
  const taglineScale = spring({
    frame: frame - 100,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const versionOpacity = interpolate(frame, [300, 360], [0, 1], { extrapolateRight: "clamp" });
  const badgesOpacity = interpolate(frame, [400, 460], [0, 1], { extrapolateRight: "clamp" });
  const authorOpacity = interpolate(frame, [500, 560], [0, 1], { extrapolateRight: "clamp" });

  const closingOpacity = interpolate(frame, [600, 660], [0, 1], { extrapolateRight: "clamp" });
  const closingPulse = Math.sin((frame - 600) / 20) * 0.1 + 1;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${THEME.purple}30, ${THEME.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      <Narration lines={narrationLines} />

      <div style={{
        opacity: dnaOpacity,
        transform: `scale(${dnaScale})`,
        fontSize: 120,
      }}>
        🧬
      </div>

      <div style={{
        opacity: taglineOpacity,
        transform: `scale(${taglineScale})`,
      }}>
        <h1 style={{
          fontFamily: FONTS.heading,
          fontSize: 56,
          color: THEME.white,
          fontWeight: 700,
          textAlign: "center",
        }}>
          Your Agent, But Alive.
        </h1>
      </div>

      <div style={{ opacity: versionOpacity }}>
        <p style={{
          fontFamily: FONTS.mono,
          fontSize: 20,
          color: THEME.textMuted,
          textAlign: "center",
        }}>
          Genomic Self-Evolving Prompts v0.8.0
        </p>
      </div>

      <div style={{
        opacity: badgesOpacity,
        display: "flex",
        gap: 20,
      }}>
        <div style={{
          padding: "10px 24px",
          backgroundColor: THEME.bgCard,
          borderRadius: 20,
          border: `2px solid ${THEME.amber}`,
          fontFamily: FONTS.body,
          fontSize: 16,
          color: THEME.amber,
          fontWeight: 600,
        }}>
          Patentado
        </div>
        <div style={{
          padding: "10px 24px",
          backgroundColor: THEME.bgCard,
          borderRadius: 20,
          border: `2px solid ${THEME.green}`,
          fontFamily: FONTS.body,
          fontSize: 16,
          color: THEME.green,
          fontWeight: 600,
        }}>
          MIT Licensed
        </div>
        <div style={{
          padding: "10px 24px",
          backgroundColor: THEME.bgCard,
          borderRadius: 20,
          border: `2px solid ${THEME.accent}`,
          fontFamily: FONTS.body,
          fontSize: 16,
          color: THEME.accent,
          fontWeight: 600,
        }}>
          Production Ready
        </div>
      </div>

      <div style={{ opacity: authorOpacity }}>
        <p style={{
          fontFamily: FONTS.body,
          fontSize: 18,
          color: THEME.textMuted,
          textAlign: "center",
        }}>
          Created by Luis Alfredo Velasquez Duran
        </p>
      </div>

      <div style={{
        opacity: closingOpacity,
        transform: `scale(${closingPulse})`,
        marginTop: 20,
      }}>
        <h2 style={{
          fontFamily: FONTS.heading,
          fontSize: 40,
          color: THEME.white,
          fontWeight: 700,
          textAlign: "center",
          textShadow: `0 0 20px ${THEME.purple}80`,
        }}>
          Let your agent evolve.
        </h2>
      </div>
    </AbsoluteFill>
  );
}
