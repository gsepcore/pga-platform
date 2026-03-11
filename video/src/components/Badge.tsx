import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FONTS, THEME } from "../styles/theme";

interface BadgeProps {
  text: string;
  delay?: number;
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  delay = 0,
  color = THEME.accent,
  bgColor,
  fontSize = 14,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ fps, frame: frame - delay, config: { damping: 15, stiffness: 120 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const scale = interpolate(s, [0, 1], [0.8, 1]);

  return (
    <span
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "inline-block",
        padding: "6px 16px",
        borderRadius: 20,
        fontSize,
        fontFamily: FONTS.body,
        fontWeight: 600,
        color,
        background: bgColor || `${color}20`,
        border: `1px solid ${color}40`,
        letterSpacing: 0.5,
      }}
    >
      {text}
    </span>
  );
};

interface GlowBadgeProps {
  text: string;
  delay?: number;
  color?: string;
}

export const GlowBadge: React.FC<GlowBadgeProps> = ({
  text,
  delay = 0,
  color = THEME.green,
}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin((frame - delay) * 0.08) * 0.3 + 0.7;

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        opacity,
        display: "inline-block",
        padding: "8px 20px",
        borderRadius: 24,
        fontSize: 13,
        fontFamily: FONTS.body,
        fontWeight: 700,
        color,
        background: `${color}15`,
        border: `1px solid ${color}50`,
        boxShadow: `0 0 ${12 * pulse}px ${color}40`,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
};
