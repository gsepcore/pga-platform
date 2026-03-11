import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { FadeInText, Narration } from "../../components/AnimatedText";
import { Badge } from "../../components/Badge";
import { Background } from "../../components/Background";

/**
 * S05_EvolutionCycle_Short — 40 seconds (1200 frames @ 30fps)
 *
 * Condensed 4-phase evolution cycle:
 *   Transcription -> Variation -> Simulation -> Selection -> Canary Deployment
 */

interface Phase {
  number: number;
  title: string;
  subtitle: string;
  details: string[];
  color: string;
  startFrame: number;
  endFrame: number;
  detailStartFrame: number;
  detailInterval: number;
}

const PHASES: Phase[] = [
  {
    number: 1,
    title: "TRANSCRIPTION",
    subtitle: "Log the interaction",
    details: ["User message", "Agent response", "Quality score", "Token usage", "Latency"],
    color: THEME.cyan,
    startFrame: 50,
    endFrame: 250,
    detailStartFrame: 80,
    detailInterval: 18,
  },
  {
    number: 2,
    title: "VARIATION",
    subtitle: "Generate mutations",
    details: [
      "Point mutation",
      "Insertion",
      "Deletion",
      "Crossover",
      "Duplication",
      "Inversion",
      "Translocation",
      "Recombination",
    ],
    color: THEME.purple,
    startFrame: 250,
    endFrame: 450,
    detailStartFrame: 275,
    detailInterval: 14,
  },
  {
    number: 3,
    title: "SIMULATION",
    subtitle: "Test in sandbox",
    details: ["Benchmark suite", "Quality check", "Safety validation", "Cost analysis", "Stability test"],
    color: THEME.orange,
    startFrame: 450,
    endFrame: 650,
    detailStartFrame: 475,
    detailInterval: 18,
  },
  {
    number: 4,
    title: "SELECTION",
    subtitle: "Deploy improvements",
    details: ["Quality >= 0.60", "Safety >= 0.70", "Cost <= $0.10", "Stability <= 20%"],
    color: THEME.green,
    startFrame: 650,
    endFrame: 850,
    detailStartFrame: 680,
    detailInterval: 20,
  },
];

const CANARY_STAGES = [
  { label: "5%", progress: 0.05, startFrame: 900 },
  { label: "25%", progress: 0.25, startFrame: 950 },
  { label: "50%", progress: 0.5, startFrame: 1000 },
  { label: "100%", progress: 1.0, startFrame: 1050 },
];

const narrationLines = [
  { text: "Evolution happens in four phases.", startFrame: 0, endFrame: 100 },
  { text: "Transcription logs every interaction with quality metrics.", startFrame: 100, endFrame: 250 },
  { text: "Variation generates mutations using eight operators.", startFrame: 250, endFrame: 450 },
  { text: "Simulation tests each candidate in a sandbox.", startFrame: 450, endFrame: 650 },
  { text: "Selection deploys only mutations that pass all gates.", startFrame: 650, endFrame: 850 },
  { text: "Canary deployment rolls changes out gradually with automatic rollback.", startFrame: 850, endFrame: 1200 },
];

const S05_EvolutionCycle_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-50) ---
  const titleOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Determine active phase ---
  const activePhaseIndex = PHASES.findIndex(
    (p) => frame >= p.startFrame && frame < p.endFrame
  );

  // --- Canary section (850-1200) ---
  const canaryOpacity = interpolate(frame, [850, 880], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated progress bar
  let currentProgress = 0;
  for (const stage of CANARY_STAGES) {
    if (frame >= stage.startFrame) {
      const prevProgress = currentProgress;
      currentProgress = interpolate(
        frame,
        [stage.startFrame, stage.startFrame + 40],
        [prevProgress, stage.progress],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
    }
  }

  // Auto-rollback text
  const rollbackOpacity = interpolate(frame, [1100, 1130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: "50px 70px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ---- Title ---- */}
        <div
          style={{
            opacity: titleOpacity,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              fontFamily: FONTS.heading,
              fontSize: 64,
              fontWeight: 800,
              color: THEME.white,
              margin: 0,
            }}
          >
            The Evolution Cycle
          </h1>
        </div>

        {/* ---- Phases (50-850) ---- */}
        {frame >= 50 && frame < 850 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
            }}
          >
            {PHASES.map((phase, i) => {
              const isVisible = frame >= phase.startFrame;
              const isActive = i === activePhaseIndex;

              // Phase card entrance
              const enterOpacity = interpolate(
                frame,
                [phase.startFrame, phase.startFrame + 20],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              if (!isVisible) return null;

              return (
                <div
                  key={phase.number}
                  style={{
                    display: "flex",
                    gap: 20,
                    padding: isActive ? "20px 28px" : "14px 28px",
                    backgroundColor: THEME.bgCard,
                    borderRadius: 14,
                    border: `2px solid ${isActive ? phase.color : "transparent"}`,
                    boxShadow: isActive ? `0 0 24px ${phase.color}30` : "none",
                    opacity: enterOpacity,
                    transition: "padding 0.2s ease",
                  }}
                >
                  {/* Number circle */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      backgroundColor: isActive ? phase.color : THEME.bgCode,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONTS.heading,
                      fontSize: 24,
                      fontWeight: 800,
                      color: THEME.white,
                      flexShrink: 0,
                    }}
                  >
                    {phase.number}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                      <span
                        style={{
                          fontFamily: FONTS.heading,
                          fontSize: isActive ? 28 : 22,
                          fontWeight: 700,
                          color: isActive ? phase.color : THEME.textMuted,
                        }}
                      >
                        {phase.title}
                      </span>
                      <span
                        style={{
                          fontFamily: FONTS.body,
                          fontSize: 16,
                          color: THEME.textMuted,
                        }}
                      >
                        {phase.subtitle}
                      </span>
                    </div>

                    {/* Details: only shown when active */}
                    {isActive && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 14,
                        }}
                      >
                        {phase.details.map((detail, j) => {
                          const dDelay = phase.detailStartFrame + j * phase.detailInterval;
                          const dOpacity = interpolate(
                            frame,
                            [dDelay, dDelay + 12],
                            [0, 1],
                            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                          );
                          const dX = interpolate(
                            frame,
                            [dDelay, dDelay + 12],
                            [-8, 0],
                            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                          );

                          return (
                            <span
                              key={j}
                              style={{
                                opacity: dOpacity,
                                transform: `translateX(${dX}px)`,
                                fontFamily: FONTS.mono,
                                fontSize: 14,
                                color: THEME.text,
                                backgroundColor: THEME.bgCode,
                                padding: "6px 14px",
                                borderRadius: 6,
                                border: `1px solid ${phase.color}30`,
                                display: "inline-block",
                              }}
                            >
                              {detail}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Canary Deployment (850-1200) ---- */}
        {frame >= 850 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: canaryOpacity,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 52,
                fontWeight: 800,
                color: THEME.white,
                marginBottom: 40,
                textAlign: "center",
              }}
            >
              Canary Deployment
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: 800,
                height: 48,
                backgroundColor: THEME.bgCard,
                borderRadius: 24,
                border: `2px solid ${THEME.accent}40`,
                overflow: "hidden",
                position: "relative",
                marginBottom: 30,
              }}
            >
              <div
                style={{
                  width: `${currentProgress * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${THEME.green}, ${THEME.emerald})`,
                  borderRadius: 22,
                  boxShadow: `0 0 20px ${THEME.green}50`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONTS.heading,
                  fontSize: 22,
                  fontWeight: 700,
                  color: THEME.white,
                }}
              >
                {Math.round(currentProgress * 100)}% deployed
              </div>
            </div>

            {/* Stage badges */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginBottom: 40,
              }}
            >
              {CANARY_STAGES.map((stage, i) => {
                const reached = frame >= stage.startFrame + 40;
                const stageOpacity = interpolate(
                  frame,
                  [stage.startFrame, stage.startFrame + 15],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                return (
                  <span
                    key={i}
                    style={{
                      opacity: stageOpacity,
                      display: "inline-block",
                      padding: "10px 24px",
                      borderRadius: 20,
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: FONTS.body,
                      color: reached ? THEME.white : THEME.textMuted,
                      backgroundColor: reached ? THEME.green : THEME.bgCard,
                      border: `1px solid ${reached ? THEME.green : THEME.textMuted}40`,
                    }}
                  >
                    {stage.label}
                  </span>
                );
              })}
            </div>

            {/* Auto-rollback note */}
            <div
              style={{
                opacity: rollbackOpacity,
                fontFamily: FONTS.body,
                fontSize: 26,
                color: THEME.textMuted,
                textAlign: "center",
              }}
            >
              <span style={{ color: THEME.green, fontWeight: 700 }}>Auto-rollback</span> if canary
              fails &mdash; zero downtime
            </div>
          </div>
        )}

        {/* ---- Narration Subtitles ---- */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S05_EvolutionCycle_Short;
