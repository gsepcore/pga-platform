import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { FadeInText, Narration } from "../../components/AnimatedText";
import { Background } from "../../components/Background";

const TOTAL = 540; // 18s x 30fps

const narrationLines = [
  {
    text: "Today's AI agents have four critical problems.",
    startFrame: 0,
    endFrame: 100,
  },
  {
    text: "Static prompts that never improve. Manual tuning that doesn't scale.",
    startFrame: 100,
    endFrame: 220,
  },
  {
    text: "Blind degradation you don't notice until users complain.",
    startFrame: 220,
    endFrame: 340,
  },
  {
    text: "And isolated knowledge that dies with each conversation. GSEP solves all four automatically.",
    startFrame: 340,
    endFrame: TOTAL,
  },
];

const problems = [
  {
    title: "Static Prompt",
    subtitle: "Same for all users, never adapts",
    icon: "\uD83D\uDD12",
    delay: 40,
  },
  {
    title: "Manual Tuning",
    subtitle: "Requires constant human effort",
    icon: "\uD83D\uDD27",
    delay: 100,
  },
  {
    title: "Blind Degradation",
    subtitle: "Failing without anyone noticing",
    icon: "\uD83D\uDC41\uFE0F",
    delay: 160,
  },
  {
    title: "Isolated Knowledge",
    subtitle: "Every agent reinvents the wheel",
    icon: "\uD83D\uDD0C",
    delay: 220,
  },
];

// Transform stagger start frames
const TRANSFORM_START = 360;
const TRANSFORM_STAGGER = 20; // 360, 380, 400, 420

const S03_Problem_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade in (0-40f)
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 80,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: FONTS.heading,
              fontSize: 72,
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
            gap: 32,
            maxWidth: 1300,
            marginTop: 60,
          }}
        >
          {problems.map((problem, i) => {
            // Card entrance spring
            const cardScale = spring({
              frame: frame - problem.delay,
              fps,
              config: { damping: 12, mass: 0.5, stiffness: 100 },
            });
            const cardOpacity = interpolate(
              frame,
              [problem.delay, problem.delay + 40],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            // Transform phase: red -> green
            const transformFrame = TRANSFORM_START + i * TRANSFORM_STAGGER;
            const transformProgress = interpolate(
              frame,
              [transformFrame, transformFrame + 30],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            const isTransforming = frame >= transformFrame;

            // Interpolate border and title color from red to green
            const borderColor = isTransforming
              ? transformProgress >= 0.5
                ? THEME.green
                : THEME.red
              : THEME.red;

            const titleColor = isTransforming
              ? transformProgress >= 0.5
                ? THEME.green
                : THEME.red
              : THEME.red;

            const glowColor = isTransforming
              ? transformProgress >= 0.5
                ? THEME.green
                : THEME.red
              : THEME.red;

            // Check/cross opacity
            const checkOpacity = interpolate(
              frame,
              [transformFrame + 10, transformFrame + 25],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );
            const crossOpacity = interpolate(
              frame,
              [transformFrame, transformFrame + 15],
              [1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            return (
              <div
                key={i}
                style={{
                  opacity: cardOpacity,
                  transform: `scale(${cardScale})`,
                  padding: 36,
                  backgroundColor: THEME.bgCard,
                  borderRadius: 14,
                  border: `3px solid ${borderColor}`,
                  boxShadow: `0 0 24px ${glowColor}33`,
                  position: "relative",
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    fontSize: 48,
                    marginBottom: 14,
                    filter: isTransforming && transformProgress >= 0.5
                      ? "grayscale(0)"
                      : "grayscale(1)",
                  }}
                >
                  {problem.icon}
                </div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: 28,
                    fontWeight: 700,
                    color: titleColor,
                    marginBottom: 8,
                  }}
                >
                  {problem.title}
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 19,
                    color: THEME.textMuted,
                    marginBottom: 16,
                  }}
                >
                  {problem.subtitle}
                </div>

                {/* Status indicator at bottom of card */}
                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {!isTransforming && (
                    <div
                      style={{
                        fontSize: 32,
                        color: THEME.red,
                      }}
                    >
                      &#10005;
                    </div>
                  )}
                  {isTransforming && (
                    <>
                      {/* Fading cross */}
                      <div
                        style={{
                          fontSize: 32,
                          color: THEME.red,
                          opacity: crossOpacity,
                          position: "absolute",
                          bottom: 36,
                          left: 36,
                        }}
                      >
                        &#10005;
                      </div>
                      {/* Appearing check + text */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          opacity: checkOpacity,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 32,
                            color: THEME.green,
                          }}
                        >
                          &#10003;
                        </div>
                        <div
                          style={{
                            fontFamily: FONTS.body,
                            fontSize: 17,
                            fontWeight: 600,
                            color: THEME.green,
                          }}
                        >
                          GSEP solves this
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S03_Problem_Short;
