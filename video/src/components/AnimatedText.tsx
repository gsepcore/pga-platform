import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { FONTS, THEME } from "../styles/theme";

interface FadeInTextProps {
  text: string;
  delay?: number;
  duration?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  style?: React.CSSProperties;
}

export const FadeInText: React.FC<FadeInTextProps> = ({
  text,
  delay = 0,
  duration = 20,
  fontSize = 24,
  color = THEME.text,
  fontWeight = 400,
  textAlign = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame - delay, [0, duration], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontSize,
        color,
        fontWeight,
        fontFamily: FONTS.body,
        textAlign,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

interface TypewriterProps {
  text: string;
  delay?: number;
  speed?: number; // chars per frame
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  delay = 0,
  speed = 0.8,
  fontSize = 24,
  color = THEME.text,
  style,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const charCount = Math.min(Math.floor(adjustedFrame * speed), text.length);

  return (
    <div
      style={{
        fontSize,
        color,
        fontFamily: FONTS.mono,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    >
      {text.substring(0, charCount)}
      {charCount < text.length && (
        <span
          style={{
            opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0,
            color: THEME.accent,
          }}
        >
          █
        </span>
      )}
    </div>
  );
};

interface SpringTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}

export const SpringText: React.FC<SpringTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = THEME.text,
  fontWeight = 700,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, mass: 0.5, stiffness: 100 },
  });

  const scale = interpolate(s, [0, 1], [0.5, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        fontSize,
        color,
        fontWeight,
        fontFamily: FONTS.heading,
        textAlign: "center",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

interface NarrationProps {
  lines: { text: string; startFrame: number; endFrame: number }[];
}

export const Narration: React.FC<NarrationProps> = ({ lines }) => {
  const frame = useCurrentFrame();

  const currentLine = lines.find(
    (l) => frame >= l.startFrame && frame < l.endFrame
  );
  if (!currentLine) return null;

  const progress = frame - currentLine.startFrame;
  const opacity = interpolate(
    progress,
    [0, 10, currentLine.endFrame - currentLine.startFrame - 10, currentLine.endFrame - currentLine.startFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 80,
        right: 80,
        opacity,
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          padding: "16px 32px",
          borderRadius: 12,
          display: "inline-block",
          maxWidth: "85%",
        }}
      >
        <span
          style={{
            fontSize: 22,
            color: THEME.text,
            fontFamily: FONTS.body,
            lineHeight: 1.6,
          }}
        >
          {currentLine.text}
        </span>
      </div>
    </div>
  );
};
