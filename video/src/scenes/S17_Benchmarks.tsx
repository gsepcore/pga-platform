import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "What's the performance impact?", startFrame: 0, endFrame: 120 },
  { text: "User satisfaction: up twenty-five percent.", startFrame: 120, endFrame: 350 },
  { text: "Task success rate: up eighteen percent.", startFrame: 350, endFrame: 550 },
  { text: "Token efficiency: up twelve percent.", startFrame: 550, endFrame: 750 },
  { text: "User retention: up thirty-four percent.", startFrame: 750, endFrame: 950 },
  { text: "Manual interventions: down forty-five percent.", startFrame: 950, endFrame: 1150 },
  { text: "Measured with our standard benchmark suite across twenty-plus configurations.", startFrame: 1150, endFrame: 1500 },
];

const benchmarks = [
  { name: "User Satisfaction", value: 25, color: THEME.green, startFrame: 60 },
  { name: "Task Success Rate", value: 18, color: THEME.green, startFrame: 260 },
  { name: "Token Efficiency", value: 12, color: THEME.cyan, startFrame: 460 },
  { name: "User Retention", value: 34, color: THEME.green, startFrame: 660 },
  { name: "Manual Interventions", value: -45, color: THEME.red, startFrame: 860 },
];

export default function S17_Benchmarks() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const finalTextOpacity = interpolate(frame, [1200, 1260], [0, 1], { extrapolateRight: "clamp" });

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
            Performance Impact
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40, marginBottom: 60 }}>
          {benchmarks.map((benchmark) => {
            const barOpacity = interpolate(
              frame,
              [benchmark.startFrame, benchmark.startFrame + 60],
              [0, 1],
              { extrapolateRight: "clamp" }
            );

            const barWidth = spring({
              frame: frame - benchmark.startFrame,
              fps,
              from: 0,
              to: Math.abs(benchmark.value),
              config: { damping: 20, stiffness: 60 },
            });

            const badgeOpacity = interpolate(
              frame,
              [benchmark.startFrame + 80, benchmark.startFrame + 120],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const badgeScale = spring({
              frame: frame - (benchmark.startFrame + 80),
              fps,
              config: { damping: 12, stiffness: 100 },
            });

            return (
              <div key={benchmark.name} style={{ opacity: barOpacity }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}>
                  <h3 style={{
                    fontFamily: FONTS.heading,
                    fontSize: 28,
                    color: THEME.white,
                    fontWeight: 600,
                  }}>
                    {benchmark.name}
                  </h3>
                  <div style={{
                    opacity: badgeOpacity,
                    transform: `scale(${badgeScale})`,
                    padding: "8px 20px",
                    backgroundColor: benchmark.color,
                    borderRadius: 20,
                    fontFamily: FONTS.mono,
                    fontSize: 24,
                    color: THEME.white,
                    fontWeight: 700,
                  }}>
                    {benchmark.value > 0 ? "+" : ""}{benchmark.value}%
                  </div>
                </div>
                <div style={{
                  width: "100%",
                  height: 40,
                  backgroundColor: THEME.bgCard,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute",
                    left: benchmark.value < 0 ? `${100 - barWidth}%` : 0,
                    top: 0,
                    width: `${barWidth}%`,
                    height: "100%",
                    backgroundColor: benchmark.color,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {frame >= 1200 && (
          <div style={{ opacity: finalTextOpacity, textAlign: "center" }}>
            <p style={{
              fontFamily: FONTS.body,
              fontSize: 24,
              color: THEME.textMuted,
              lineHeight: 1.6,
            }}>
              Measured with standard benchmark suite across 20+ configurations
            </p>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
