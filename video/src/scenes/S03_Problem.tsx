import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";

const S03_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation (0-60)
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Problem cards data
  const problems = [
    { title: "Static Prompt", subtitle: "Same for all users", icon: "🔒", delay: 60 },
    { title: "Manual Tuning", subtitle: "Requires you to fix it", icon: "🔧", delay: 180 },
    { title: "Blind Degradation", subtitle: "You don't know it's failing", icon: "👁️", delay: 300 },
    { title: "Isolated Knowledge", subtitle: "Each agent reinvents the wheel", icon: "🔌", delay: 420 },
  ];

  // Transform phase (600-750)
  const transformPhase = frame >= 600;

  const narrationLines = [
    { text: "Traditional AI agents suffer from four critical problems.", startFrame: 0, endFrame: 180 },
    { text: "Static prompts. Manual tuning. Blind degradation. Isolated knowledge.", startFrame: 180, endFrame: 420 },
    { text: "Each problem compounds, making agents unreliable at scale.", startFrame: 420, endFrame: 600 },
    { text: "GSEP solves all four automatically.", startFrame: 600, endFrame: 750 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 100,
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
            The Problem
          </h1>
        </div>

        {/* 2x2 Grid of Problem Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 40,
            maxWidth: 1400,
            marginTop: 100,
          }}
        >
          {problems.map((problem, i) => {
            const cardOpacity = interpolate(frame, [problem.delay, problem.delay + 80], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const cardScale = spring({
              frame: frame - problem.delay,
              fps,
              config: {
                damping: 12,
                mass: 0.5,
              },
            });

            // Transform animation
            const isTransformed = transformPhase;
            const transformOpacity = interpolate(frame, [600 + i * 20, 650 + i * 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  opacity: cardOpacity,
                  transform: `scale(${cardScale})`,
                  padding: 50,
                  backgroundColor: THEME.bgCard,
                  borderRadius: 16,
                  border: `3px solid ${isTransformed ? THEME.green : THEME.red}`,
                  boxShadow: `0 0 30px ${isTransformed ? THEME.green : THEME.red}33`,
                  transition: "all 0.5s ease",
                  position: "relative",
                  minHeight: 280,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    fontSize: 64,
                    marginBottom: 20,
                    filter: isTransformed ? "grayscale(0)" : "grayscale(1)",
                  }}
                >
                  {problem.icon}
                </div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: 32,
                    fontWeight: 700,
                    color: isTransformed ? THEME.green : THEME.red,
                    marginBottom: 12,
                  }}
                >
                  {problem.title}
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 22,
                    color: THEME.textMuted,
                    marginBottom: 20,
                  }}
                >
                  {problem.subtitle}
                </div>

                {/* Status indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 30,
                    left: 50,
                    right: 50,
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                  }}
                >
                  {!isTransformed && (
                    <div
                      style={{
                        fontSize: 40,
                        color: THEME.red,
                      }}
                    >
                      ❌
                    </div>
                  )}
                  {isTransformed && (
                    <>
                      <div
                        style={{
                          fontSize: 40,
                          color: THEME.green,
                          opacity: transformOpacity,
                        }}
                      >
                        ✅
                      </div>
                      <div
                        style={{
                          fontFamily: FONTS.body,
                          fontSize: 20,
                          fontWeight: 600,
                          color: THEME.green,
                          opacity: transformOpacity,
                        }}
                      >
                        GSEP solves this
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Narration */}
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0 }}>
          <Narration lines={narrationLines} />
        </div>
      </AbsoluteFill>
    </Background>
  );
};

export default S03_Problem;
