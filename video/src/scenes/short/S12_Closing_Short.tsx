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

const TOTAL = 510; // 17s x 30fps

const narrationLines = [
  { text: "Your agent, but alive.", startFrame: 0, endFrame: 150 },
  { text: "Genomic Self-Evolving Prompts. Patentado. Production ready.", startFrame: 150, endFrame: 380 },
  { text: "Let your agent evolve.", startFrame: 380, endFrame: 510 },
];

const S12_Closing_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: DNA emoji springs in (0-60f)
  const dnaSpring = spring({
    fps,
    frame,
    config: { damping: 10, mass: 0.6, stiffness: 90 },
  });
  const dnaScale = interpolate(dnaSpring, [0, 1], [0.2, 1]);
  const dnaOpacity = interpolate(dnaSpring, [0, 1], [0, 1]);

  // Phase 2: Title springs in (60-150f)
  const titleSpring = spring({
    fps,
    frame: frame - 60,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.6, 1]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Phase 3: Version text fades in (150-220f)
  const versionOpacity = interpolate(frame, [150, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const versionY = interpolate(frame, [150, 185], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 4: Badges staggered (220-320f)
  const badge1Spring = spring({
    fps,
    frame: frame - 220,
    config: { damping: 14, stiffness: 120 },
  });
  const badge2Spring = spring({
    fps,
    frame: frame - 250,
    config: { damping: 14, stiffness: 120 },
  });
  const badge3Spring = spring({
    fps,
    frame: frame - 280,
    config: { damping: 14, stiffness: 120 },
  });

  // Phase 5: Author text (320-380f)
  const authorOpacity = interpolate(frame, [320, 355], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const authorY = interpolate(frame, [320, 355], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 6: Final tagline with pulsing glow (380-510f)
  const taglineSpring = spring({
    fps,
    frame: frame - 380,
    config: { damping: 10, mass: 0.6, stiffness: 80 },
  });
  const taglineScale = interpolate(taglineSpring, [0, 1], [0.7, 1]);
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);
  const glowPulse = frame >= 380
    ? Math.sin((frame - 380) * 0.06) * 0.4 + 0.6
    : 0;

  const renderBadge = (
    text: string,
    color: string,
    springVal: number,
  ) => {
    const opacity = interpolate(springVal, [0, 1], [0, 1]);
    const scale = interpolate(springVal, [0, 1], [0.7, 1]);
    return (
      <span
        style={{
          opacity,
          transform: `scale(${scale})`,
          display: "inline-block",
          padding: "8px 22px",
          borderRadius: 24,
          fontSize: 16,
          fontFamily: FONTS.body,
          fontWeight: 600,
          color,
          background: `${color}15`,
          border: `1.5px solid ${color}60`,
          letterSpacing: 0.5,
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${THEME.purple}30, ${THEME.bg} 70%)`,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* DNA emoji */}
        <div
          style={{
            opacity: dnaOpacity,
            transform: `scale(${dnaScale})`,
            fontSize: 120,
            lineHeight: 1,
          }}
        >
          {"\ud83e\uddec"}
        </div>

        {/* Title: "Your Agent, But Alive." */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontFamily: FONTS.heading,
            fontSize: 64,
            fontWeight: 800,
            color: THEME.white,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Your Agent, But Alive.
        </div>

        {/* Version text */}
        <div
          style={{
            opacity: versionOpacity,
            transform: `translateY(${versionY}px)`,
            fontFamily: FONTS.body,
            fontSize: 22,
            color: THEME.textMuted,
            textAlign: "center",
          }}
        >
          Genomic Self-Evolving Prompts v0.8.0
        </div>

        {/* Badges row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 10,
          }}
        >
          {renderBadge("Patentado", THEME.amber, badge1Spring)}
          {renderBadge("MIT Licensed", THEME.green, badge2Spring)}
          {renderBadge("Production Ready", THEME.accent, badge3Spring)}
        </div>

        {/* Author text */}
        <div
          style={{
            opacity: authorOpacity,
            transform: `translateY(${authorY}px)`,
            fontFamily: FONTS.body,
            fontSize: 18,
            color: THEME.textMuted,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Created by Luis Alfredo Velasquez Duran
        </div>

        {/* Final tagline with pulsing glow */}
        {frame >= 380 && (
          <div
            style={{
              opacity: taglineOpacity,
              transform: `scale(${taglineScale})`,
              fontFamily: FONTS.heading,
              fontSize: 48,
              fontWeight: 700,
              color: THEME.accent,
              textAlign: "center",
              marginTop: 20,
              textShadow: `0 0 ${20 * glowPulse}px ${THEME.accent}80, 0 0 ${40 * glowPulse}px ${THEME.accent}40`,
            }}
          >
            Let your agent evolve.
          </div>
        )}
      </div>

      {/* Narration subtitles */}
      <Narration lines={narrationLines} />
    </AbsoluteFill>
  );
};

export default S12_Closing_Short;
