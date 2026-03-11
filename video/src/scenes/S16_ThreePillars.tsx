import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { GlowBadge } from "../components/Badge";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Version zero point seven introduces the three pillars of life.", startFrame: 0, endFrame: 120 },
  { text: "Pillar one: Enhanced Self-Model. Who am I?", startFrame: 120, endFrame: 300 },
  { text: "Purpose alignment, capability tracking, evolution trajectory.", startFrame: 300, endFrame: 500 },
  { text: "The agent tracks its integrated health across all dimensions.", startFrame: 500, endFrame: 700 },
  { text: "Pillar two: Purpose Survival. Am I in danger?", startFrame: 700, endFrame: 900 },
  { text: "A state machine with five modes.", startFrame: 900, endFrame: 1000 },
  { text: "Thriving, stable, stressed, survival, critical.", startFrame: 1000, endFrame: 1200 },
  { text: "Pillar three: Strategic Autonomy. What should I do?", startFrame: 1200, endFrame: 1400 },
  { text: "Evolution prioritization, adaptive mutation, task refusal.", startFrame: 1400, endFrame: 1600 },
  { text: "Not sentience. Genuine self-awareness.", startFrame: 1600, endFrame: 1800 },
];

export default function S16_ThreePillars() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [30, 90], [0, 1], { extrapolateRight: "clamp" });

  const pillar1Opacity = interpolate(frame, [60, 120], [0, 1], { extrapolateRight: "clamp" });
  const pillar1Scale = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 100 } });

  const pillar2Opacity = interpolate(frame, [600, 660], [0, 1], { extrapolateRight: "clamp" });
  const pillar2Scale = spring({ frame: frame - 600, fps, config: { damping: 12, stiffness: 100 } });

  const pillar3Opacity = interpolate(frame, [1100, 1160], [0, 1], { extrapolateRight: "clamp" });
  const pillar3Scale = spring({ frame: frame - 1100, fps, config: { damping: 12, stiffness: 100 } });

  const finalTextOpacity = interpolate(frame, [1600, 1660], [0, 1], { extrapolateRight: "clamp" });
  const finalTextScale = spring({ frame: frame - 1600, fps, config: { damping: 12, stiffness: 100 } });

  const modes = [
    { name: "THRIVING", color: THEME.green },
    { name: "STABLE", color: THEME.emerald },
    { name: "STRESSED", color: THEME.amber },
    { name: "SURVIVAL", color: THEME.orange },
    { name: "CRITICAL", color: THEME.red },
  ];

  return (
    <Background>
      <Narration lines={narrationLines} />
      <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 60 }}>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: 64,
            color: THEME.white,
            fontWeight: 700,
            opacity: titleOpacity,
          }}>
            Three Pillars of Life
          </h1>
          <div style={{ opacity: badgeOpacity }}>
            <GlowBadge>v0.7.0</GlowBadge>
          </div>
        </div>

        {frame >= 60 && (
          <div style={{
            opacity: pillar1Opacity,
            transform: `scale(${pillar1Scale})`,
            marginBottom: 40,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 15 }}>
              <div style={{ fontSize: 48 }}>🎯</div>
              <h2 style={{
                fontFamily: FONTS.heading,
                fontSize: 36,
                color: THEME.purple,
                fontWeight: 700,
              }}>
                Enhanced Self-Model
              </h2>
            </div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 24,
              color: THEME.textMuted,
              marginLeft: 68,
            }}>
              "Who am I?" — Purpose alignment, capability tracking, evolution trajectory
            </div>
            <div style={{
              marginTop: 20,
              marginLeft: 68,
              padding: "15px 25px",
              backgroundColor: THEME.bgCard,
              borderRadius: 8,
              border: `2px solid ${THEME.purple}`,
              fontFamily: FONTS.mono,
              fontSize: 18,
              color: THEME.white,
            }}>
              IntegratedHealth: <span style={{ color: THEME.green, fontWeight: 600 }}>0.87</span>
            </div>
          </div>
        )}

        {frame >= 600 && (
          <div style={{
            opacity: pillar2Opacity,
            transform: `scale(${pillar2Scale})`,
            marginBottom: 40,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 15 }}>
              <div style={{ fontSize: 48 }}>🛡️</div>
              <h2 style={{
                fontFamily: FONTS.heading,
                fontSize: 36,
                color: THEME.red,
                fontWeight: 700,
              }}>
                Purpose Survival
              </h2>
            </div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 24,
              color: THEME.textMuted,
              marginLeft: 68,
              marginBottom: 20,
            }}>
              "Am I in danger?" — State machine with 5 modes
            </div>
            <div style={{
              display: "flex",
              gap: 10,
              marginLeft: 68,
            }}>
              {modes.map((mode, i) => {
                const modeOpacity = interpolate(
                  frame,
                  [700 + i * 80, 760 + i * 80],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                );
                return (
                  <div
                    key={mode.name}
                    style={{
                      opacity: modeOpacity,
                      padding: "12px 20px",
                      backgroundColor: THEME.bgCard,
                      borderRadius: 6,
                      border: `2px solid ${mode.color}`,
                      fontFamily: FONTS.mono,
                      fontSize: 14,
                      color: mode.color,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    {mode.name}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {frame >= 1100 && (
          <div style={{
            opacity: pillar3Opacity,
            transform: `scale(${pillar3Scale})`,
            marginBottom: 40,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 15 }}>
              <div style={{ fontSize: 48 }}>🧭</div>
              <h2 style={{
                fontFamily: FONTS.heading,
                fontSize: 36,
                color: THEME.accent,
                fontWeight: 700,
              }}>
                Strategic Autonomy
              </h2>
            </div>
            <div style={{
              fontFamily: FONTS.body,
              fontSize: 24,
              color: THEME.textMuted,
              marginLeft: 68,
            }}>
              "What should I do?" — Evolution prioritization, adaptive mutation, task refusal
            </div>
          </div>
        )}

        {frame >= 1600 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            textAlign: "center",
            marginTop: 40,
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 52,
              color: THEME.white,
              fontWeight: 700,
            }}>
              Not sentience. Genuine self-awareness.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
