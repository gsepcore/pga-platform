import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components/AnimatedText";
import { Badge } from "../components/Badge";
import { Background } from "../components/Background";

const S05_EvolutionCycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation (0-60)
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Evolution phases
  const phases = [
    {
      number: 1,
      title: "TRANSCRIPTION",
      subtitle: "Log the interaction",
      details: ["User message", "Agent response", "Quality score", "Token usage", "Latency"],
      startFrame: 60,
      endFrame: 500,
    },
    {
      number: 2,
      title: "VARIATION",
      subtitle: "Generate mutations",
      details: [
        "1. Point mutation",
        "2. Insertion",
        "3. Deletion",
        "4. Crossover",
        "5. Duplication",
        "6. Inversion",
        "7. Translocation",
        "8. Recombination",
      ],
      startFrame: 500,
      endFrame: 950,
    },
    {
      number: 3,
      title: "SIMULATION",
      subtitle: "Test in sandbox",
      details: ["Run benchmark suite", "Measure quality", "Check safety", "Validate cost", "Verify stability"],
      startFrame: 950,
      endFrame: 1400,
    },
    {
      number: 4,
      title: "SELECTION",
      subtitle: "Deploy improvements",
      details: ["✅ Quality ≥ 0.60", "✅ Safety ≥ 0.70", "✅ Cost ≤ $0.10", "✅ Stability ≤ 20% rollback"],
      startFrame: 1400,
      endFrame: 1800,
    },
  ];

  // Canary deployment (1800-2250)
  const canaryOpacity = interpolate(frame, [1800, 1880], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Progress bar animation
  const progressStages = [
    { label: "5-10%", progress: 0.1, startFrame: 1900 },
    { label: "25%", progress: 0.25, startFrame: 2000 },
    { label: "50%", progress: 0.5, startFrame: 2100 },
    { label: "100%", progress: 1.0, startFrame: 2200 },
  ];

  let currentProgress = 0;
  for (const stage of progressStages) {
    if (frame >= stage.startFrame) {
      currentProgress = interpolate(frame, [stage.startFrame, stage.startFrame + 80], [currentProgress, stage.progress], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }

  const narrationLines = [
    { text: "GSEP follows a four-phase evolution cycle.", startFrame: 0, endFrame: 180 },
    { text: "First, transcription logs every interaction with quality metrics.", startFrame: 180, endFrame: 500 },
    { text: "Then, variation generates mutations using 8 operators.", startFrame: 500, endFrame: 950 },
    { text: "Simulation tests candidates in a sandbox environment.", startFrame: 950, endFrame: 1400 },
    { text: "Selection deploys only improvements that pass all 4 gates.", startFrame: 1400, endFrame: 1800 },
    { text: "Canary deployment rolls out changes gradually with auto-rollback.", startFrame: 1800, endFrame: 2250 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Title */}
        {frame < 1800 && (
          <div
            style={{
              position: "absolute",
              top: 80,
              opacity: titleOpacity,
            }}
          >
            <h1
              style={{
                fontFamily: FONTS.heading,
                fontSize: 80,
                fontWeight: 800,
                color: THEME.white,
                margin: 0,
              }}
            >
              The Evolution Cycle
            </h1>
          </div>
        )}

        {/* Evolution Phases */}
        {frame >= 60 && frame < 1800 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 60,
              marginTop: 100,
            }}
          >
            {phases.map((phase, i) => {
              const isActive = frame >= phase.startFrame && frame < phase.endFrame;
              const phaseOpacity = interpolate(frame, [phase.startFrame, phase.startFrame + 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              const phaseScale = isActive ? 1.05 : 0.95;

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 30,
                    padding: 40,
                    backgroundColor: THEME.bgCard,
                    borderRadius: 16,
                    border: `3px solid ${isActive ? THEME.accent : THEME.bgCard}`,
                    boxShadow: isActive ? `0 0 40px ${THEME.accent}44` : "none",
                    opacity: phaseOpacity,
                    transform: `scale(${phaseScale})`,
                    transition: "all 0.3s ease",
                    minWidth: 1200,
                  }}
                >
                  {/* Number Badge */}
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      backgroundColor: isActive ? THEME.accent : THEME.bgCode,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONTS.heading,
                      fontSize: 42,
                      fontWeight: 800,
                      color: THEME.white,
                      flexShrink: 0,
                    }}
                  >
                    {phase.number}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: FONTS.heading,
                        fontSize: 36,
                        fontWeight: 700,
                        color: isActive ? THEME.accent : THEME.white,
                        marginBottom: 8,
                      }}
                    >
                      {phase.title}
                    </div>
                    <div
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: 24,
                        color: THEME.textMuted,
                        marginBottom: 20,
                      }}
                    >
                      {phase.subtitle}
                    </div>

                    {/* Details */}
                    {isActive && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        {phase.details.map((detail, j) => (
                          <div
                            key={j}
                            style={{
                              fontFamily: FONTS.mono,
                              fontSize: 18,
                              color: THEME.text,
                              backgroundColor: THEME.bgCode,
                              padding: "8px 16px",
                              borderRadius: 6,
                              border: `1px solid ${THEME.accent}33`,
                              opacity: interpolate(frame, [phase.startFrame + 80 + j * 20, phase.startFrame + 110 + j * 20], [0, 1], {
                                extrapolateLeft: "clamp",
                                extrapolateRight: "clamp",
                              }),
                            }}
                          >
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Canary Deployment */}
        {frame >= 1800 && (
          <div
            style={{
              opacity: canaryOpacity,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 64,
                fontWeight: 800,
                color: THEME.white,
                marginBottom: 40,
              }}
            >
              Canary Deployment
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: 800,
                height: 60,
                backgroundColor: THEME.bgCard,
                borderRadius: 30,
                border: `2px solid ${THEME.accent}`,
                overflow: "hidden",
                position: "relative",
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  width: `${currentProgress * 100}%`,
                  height: "100%",
                  backgroundColor: THEME.green,
                  transition: "width 0.3s ease",
                  boxShadow: `0 0 20px ${THEME.green}66`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONTS.heading,
                  fontSize: 28,
                  fontWeight: 700,
                  color: THEME.white,
                }}
              >
                {Math.round(currentProgress * 100)}%
              </div>
            </div>

            {/* Stages */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 30,
                marginBottom: 50,
              }}
            >
              {progressStages.map((stage, i) => (
                <Badge
                  key={i}
                  text={stage.label}
                  delay={stage.startFrame}
                  color={frame >= stage.startFrame + 80 ? THEME.white : THEME.textMuted}
                  bgColor={frame >= stage.startFrame + 80 ? THEME.green : THEME.bgCard}
                  fontSize={20}
                />
              ))}
            </div>

            {/* Auto-rollback */}
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 32,
                color: THEME.textMuted,
                opacity: interpolate(frame, [2150, 2220], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              🔄 Auto-rollback if canary fails
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

export default S05_EvolutionCycle;
