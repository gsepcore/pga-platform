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
import { CodeBlock } from "../../components/CodeBlock";
import { Badge } from "../../components/Badge";
import { Background } from "../../components/Background";

const TOTAL = 600; // 20s x 30fps

const narrationLines = [
  { text: "GSEP is open source. MIT licensed core, free forever.", startFrame: 0, endFrame: 200 },
  { text: "Run npm install @pga-ai/core to get started.", startFrame: 200, endFrame: 350 },
  { text: "Read the docs. Star on GitHub. Join the Discord community.", startFrame: 350, endFrame: 500 },
  { text: "Your agent, but alive. It starts now.", startFrame: 500, endFrame: 600 },
];

interface CTACardProps {
  icon: string;
  title: string;
  subtitle: string;
  delay: number;
}

const CTACard: React.FC<CTACardProps> = ({ icon, title, subtitle, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, mass: 0.5, stiffness: 100 },
  });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const translateY = interpolate(s, [0, 1], [30, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: 260,
        padding: "28px 24px",
        backgroundColor: THEME.bgCard,
        borderRadius: 16,
        border: `1px solid ${THEME.accent}30`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
      }}
    >
      <span style={{ fontSize: 40 }}>{icon}</span>
      <span
        style={{
          fontFamily: FONTS.heading,
          fontSize: 22,
          fontWeight: 700,
          color: THEME.white,
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: FONTS.body,
          fontSize: 15,
          color: THEME.textMuted,
        }}
      >
        {subtitle}
      </span>
    </div>
  );
};

const S11_GetStarted_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Title (0-40f)
  const titleSpring = spring({
    fps,
    frame,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.6, 1]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Phase 2: Badges (40-200f)
  // Badges use the Badge component with built-in spring delay

  // Phase 3: Code block (200-350f)
  const codeOpacity = interpolate(frame, [200, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeY = interpolate(frame, [200, 225], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Transition: Phase 1+2 fades out as code appears
  const topSectionOpacity = interpolate(frame, [180, 200], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3+4 group: code + CTA cards fade out for tagline
  const middleSectionOpacity = interpolate(frame, [470, 500], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 5: Tagline (500-600f)
  const taglineSpring = spring({
    fps,
    frame: frame - 500,
    config: { damping: 10, mass: 0.6, stiffness: 80 },
  });
  const taglineScale = interpolate(taglineSpring, [0, 1], [0.7, 1]);
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);

  return (
    <Background>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 100px",
        }}
      >
        {/* Phase 1+2: Title + Badges (0-200f) */}
        {frame < 210 && (
          <div
            style={{
              opacity: topSectionOpacity,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 30,
            }}
          >
            {/* Title */}
            <div
              style={{
                opacity: titleOpacity,
                transform: `scale(${titleScale})`,
                fontFamily: FONTS.heading,
                fontSize: 80,
                fontWeight: 800,
                color: THEME.white,
                textAlign: "center",
              }}
            >
              Get Started
            </div>

            {/* Badges */}
            <div
              style={{
                display: "flex",
                gap: 16,
              }}
            >
              <Badge text="Open Source" delay={40} color={THEME.green} fontSize={18} />
              <Badge text="MIT Licensed" delay={80} color={THEME.accent} fontSize={18} />
              <Badge text="Free Forever" delay={120} color={THEME.emerald} fontSize={18} />
            </div>
          </div>
        )}

        {/* Phase 3+4: Code block + CTA cards (200-500f) */}
        {frame >= 200 && frame < 510 && (
          <div
            style={{
              opacity: middleSectionOpacity,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 50,
            }}
          >
            {/* Install command */}
            <div
              style={{
                opacity: codeOpacity,
                transform: `translateY(${codeY}px)`,
              }}
            >
              <CodeBlock
                code="npm install @pga-ai/core"
                delay={205}
                fontSize={28}
                lineDelay={5}
                style={{ padding: "20px 40px" }}
              />
            </div>

            {/* CTA cards */}
            {frame >= 350 && (
              <div
                style={{
                  display: "flex",
                  gap: 30,
                }}
              >
                <CTACard
                  icon="\ud83d\udcc4"
                  title="Read the Docs"
                  subtitle="gsepcore.com"
                  delay={350}
                />
                <CTACard
                  icon="\u2b50"
                  title="Star on GitHub"
                  subtitle="github.com/pga-ai"
                  delay={390}
                />
                <CTACard
                  icon="\ud83d\udcac"
                  title="Join Discord"
                  subtitle="Community"
                  delay={430}
                />
              </div>
            )}
          </div>
        )}

        {/* Phase 5: Big tagline (500-600f) */}
        {frame >= 500 && (
          <div
            style={{
              opacity: taglineOpacity,
              transform: `scale(${taglineScale})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.heading,
                fontSize: 60,
                fontWeight: 800,
                color: THEME.white,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              Your agent, but alive.
            </span>
            <span
              style={{
                fontFamily: FONTS.heading,
                fontSize: 48,
                fontWeight: 600,
                color: THEME.accent,
                textAlign: "center",
              }}
            >
              It starts now.
            </span>
          </div>
        )}

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S11_GetStarted_Short;
