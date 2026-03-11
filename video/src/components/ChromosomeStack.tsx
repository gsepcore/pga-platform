import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { FONTS, THEME } from "../styles/theme";

interface ChromosomeLayer {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  color: string;
  icon: string;
  tag: string;
}

const CHROMOSOMES: ChromosomeLayer[] = [
  {
    id: "c0",
    label: "C0: Immutable DNA",
    sublabel: "Security, Ethics, Core Identity",
    description: "NEVER mutates — SHA-256 protected",
    color: THEME.red,
    icon: "🔒",
    tag: "IMMUTABLE",
  },
  {
    id: "c1",
    label: "C1: Operative Genes",
    sublabel: "Tool Usage, Coding Patterns, Reasoning",
    description: "SLOW mutation — sandbox-tested, 4-gate validation",
    color: THEME.accent,
    icon: "🧬",
    tag: "VALIDATED",
  },
  {
    id: "c2",
    label: "C2: Epigenomes",
    sublabel: "User Preferences, Style, Context",
    description: "FAST mutation — adapts per-user daily",
    color: THEME.green,
    icon: "⚡",
    tag: "ADAPTIVE",
  },
  {
    id: "c3",
    label: "C3: Content Firewall",
    sublabel: "Prompt Injection Defense",
    description: "53 detection patterns — SHA-256 core integrity",
    color: THEME.emerald,
    icon: "🛡️",
    tag: "DEFENSE-IN-DEPTH",
  },
];

interface ChromosomeStackProps {
  highlightIndex?: number; // which chromosome to highlight (-1 = none)
  delay?: number;
  compact?: boolean;
}

export const ChromosomeStack: React.FC<ChromosomeStackProps> = ({
  highlightIndex = -1,
  delay = 0,
  compact = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 12,
        width: "100%",
        maxWidth: 800,
      }}
    >
      {CHROMOSOMES.map((chr, i) => {
        const layerDelay = delay + i * 20;
        const s = spring({
          fps,
          frame: frame - layerDelay,
          config: { damping: 14, stiffness: 80 },
        });

        const opacity = interpolate(s, [0, 1], [0, 1]);
        const translateX = interpolate(s, [0, 1], [-60, 0]);
        const isHighlighted = highlightIndex === i;
        const borderWidth = isHighlighted ? 2 : 1;
        const glow = isHighlighted
          ? `0 0 20px ${chr.color}40, inset 0 0 20px ${chr.color}10`
          : "none";

        return (
          <div
            key={chr.id}
            style={{
              opacity,
              transform: `translateX(${translateX}px) scale(${isHighlighted ? 1.02 : 1})`,
              background: `linear-gradient(135deg, ${chr.color}15 0%, ${chr.color}05 100%)`,
              border: `${borderWidth}px solid ${chr.color}${isHighlighted ? "80" : "30"}`,
              borderRadius: 16,
              padding: compact ? "14px 20px" : "20px 28px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              boxShadow: glow,
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: compact ? 40 : 52,
                height: compact ? 40 : 52,
                borderRadius: 12,
                background: `${chr.color}20`,
                border: `1px solid ${chr.color}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: compact ? 20 : 26,
                flexShrink: 0,
              }}
            >
              {chr.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: compact ? 16 : 20,
                    fontWeight: 700,
                    color: chr.color,
                    fontFamily: FONTS.heading,
                  }}
                >
                  {chr.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: chr.color,
                    background: `${chr.color}20`,
                    padding: "2px 10px",
                    borderRadius: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  {chr.tag}
                </span>
              </div>
              {!compact && (
                <>
                  <div
                    style={{
                      fontSize: 15,
                      color: THEME.textMuted,
                      fontFamily: FONTS.body,
                      marginBottom: 2,
                    }}
                  >
                    {chr.sublabel}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: THEME.textMuted,
                      fontFamily: FONTS.body,
                      fontStyle: "italic",
                    }}
                  >
                    {chr.description}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
