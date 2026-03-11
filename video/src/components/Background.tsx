import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { THEME } from "../styles/theme";

export const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();

  // Subtle animated gradient
  const gradientAngle = interpolate(frame, [0, 3000], [135, 225], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${THEME.bg} 0%, #0a0f1a 40%, #0d1220 70%, ${THEME.bg} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Subtle DNA helix dots pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 25% 50%, ${THEME.purple}08 0%, transparent 50%),
                           radial-gradient(circle at 75% 30%, ${THEME.accent}06 0%, transparent 50%),
                           radial-gradient(circle at 50% 80%, ${THEME.emerald}05 0%, transparent 50%)`,
          opacity: 0.8,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
