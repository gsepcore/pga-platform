import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { FadeInText, Narration } from "../../components/AnimatedText";
import { ChromosomeStack } from "../../components/ChromosomeStack";
import { Background } from "../../components/Background";

/**
 * S04_Chromosomes_Short — 60 seconds (1800 frames @ 30fps)
 *
 * Condensed walkthrough of the 5-chromosome architecture:
 *   C0 Immutable DNA, C1 Operative Genes, C2 Epigenomes, C3 Content Firewall, C4 Immune System.
 */

interface DetailSection {
  title: string;
  color: string;
  facts: string[];
  factStartFrame: number;
  factInterval: number;
}

const SECTIONS: {
  highlightIndex: number;
  startFrame: number;
  endFrame: number;
  detail: DetailSection;
}[] = [
  {
    highlightIndex: 0,
    startFrame: 120,
    endFrame: 450,
    detail: {
      title: "C0: Immutable DNA",
      color: THEME.red,
      facts: [
        "SHA-256 integrity verification",
        "Never mutates -- quarantine protected",
        "Core ethics & security rules",
        "Identity preserved across generations",
      ],
      factStartFrame: 150,
      factInterval: 30,
    },
  },
  {
    highlightIndex: 1,
    startFrame: 450,
    endFrame: 750,
    detail: {
      title: "C1: Operative Genes",
      color: THEME.accent,
      facts: [
        "Slow, validated mutations only",
        "Sandbox testing before promotion",
        "8-stage promotion gate",
        "Tool usage & reasoning patterns",
      ],
      factStartFrame: 480,
      factInterval: 30,
    },
  },
  {
    highlightIndex: 2,
    startFrame: 750,
    endFrame: 1050,
    detail: {
      title: "C2: Epigenomes",
      color: THEME.green,
      facts: [
        "Fast daily adaptation",
        "Per-user personalization",
        "Communication style & formatting",
        "Response length preferences",
      ],
      factStartFrame: 780,
      factInterval: 30,
    },
  },
  {
    highlightIndex: 3,
    startFrame: 1050,
    endFrame: 1300,
    detail: {
      title: "C3: Content Firewall",
      color: THEME.emerald,
      facts: [
        "53 detection patterns",
        "Real-time content scanning",
        "Blocks prompt injection & hijacking",
        "Brand & data exfiltration protection",
      ],
      factStartFrame: 1080,
      factInterval: 30,
    },
  },
  {
    highlightIndex: 4,
    startFrame: 1300,
    endFrame: 1550,
    detail: {
      title: "C4: Immune System",
      color: THEME.lime,
      facts: [
        "6 deterministic checks",
        "No extra LLM calls",
        "Auto-quarantine pipeline",
        "Persistent immune memory",
        "Detects prompt leakage",
        "Self-healing recovery",
      ],
      factStartFrame: 1330,
      factInterval: 25,
    },
  },
];

const narrationLines = [
  { text: "At the heart of GSEP is a five-chromosome architecture.", startFrame: 0, endFrame: 120 },
  { text: "C0 is immutable DNA, protected by SHA-256.", startFrame: 120, endFrame: 450 },
  { text: "C1 contains operative genes that evolve slowly through validation.", startFrame: 450, endFrame: 750 },
  { text: "C2 is the epigenome, fast-adapting to each user's preferences.", startFrame: 750, endFrame: 1050 },
  { text: "C3 is the content firewall with 53 security patterns.", startFrame: 1050, endFrame: 1300 },
  { text: "C4 is the behavioral immune system — six deterministic checks detect if the agent's own response was manipulated, with auto-quarantine and self-healing.", startFrame: 1300, endFrame: 1550 },
  { text: "Together, they create a layered, intelligent system.", startFrame: 1550, endFrame: 1800 },
];

const S04_Chromosomes_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-60) ---
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Subtitle (60-120) ---
  const subtitleOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Determine active section ---
  const activeSection = SECTIONS.find(
    (s) => frame >= s.startFrame && frame < s.endFrame
  );
  const highlightIndex = activeSection ? activeSection.highlightIndex : -1;

  // --- Summary (1550-1800) ---
  const summaryOpacity = interpolate(frame, [1550, 1590], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const summaryScale = spring({
    fps,
    frame: frame - 1550,
    config: { damping: 14, stiffness: 80 },
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {/* ---- Title Block (0-120) ---- */}
        {frame < 120 && (
          <div
            style={{
              textAlign: "center",
              marginTop: 140,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
            }}
          >
            <h1
              style={{
                fontFamily: FONTS.heading,
                fontSize: 68,
                fontWeight: 800,
                color: THEME.white,
                margin: 0,
                marginBottom: 16,
              }}
            >
              The 5-Chromosome Architecture
            </h1>
            <div
              style={{
                opacity: subtitleOpacity,
                fontFamily: FONTS.body,
                fontSize: 28,
                color: THEME.textMuted,
              }}
            >
              Heart of GSEP &mdash; Five layers of evolving intelligence
            </div>
          </div>
        )}

        {/* ---- Chromosome Detail Sections (120-1550) ---- */}
        {frame >= 120 && frame < 1550 && (
          <div
            style={{
              display: "flex",
              gap: 60,
              alignItems: "flex-start",
              justifyContent: "center",
              marginTop: 40,
              flex: 1,
            }}
          >
            {/* Left: ChromosomeStack */}
            <div style={{ flexShrink: 0 }}>
              <ChromosomeStack
                highlightIndex={highlightIndex}
                delay={120}
                compact
              />
            </div>

            {/* Right: Detail Panel */}
            {activeSection && (
              <DetailPanel
                section={activeSection.detail}
                frame={frame}
                fps={fps}
              />
            )}
          </div>
        )}

        {/* ---- Summary (1550-1800) ---- */}
        {frame >= 1550 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: summaryOpacity,
              transform: `scale(${interpolate(summaryScale, [0, 1], [0.9, 1])})`,
            }}
          >
            <div
              style={{
                textAlign: "center",
                maxWidth: 1000,
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 52,
                  fontWeight: 700,
                  color: THEME.white,
                  lineHeight: 1.4,
                  marginBottom: 24,
                }}
              >
                Together, they create a layered, intelligent system
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 20,
                  opacity: interpolate(frame, [1610, 1650], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {["Immutable", "Validated", "Adaptive", "Defended", "Immune"].map(
                  (label, i) => {
                    const colors = [THEME.red, THEME.accent, THEME.green, THEME.emerald, THEME.lime];
                    return (
                      <span
                        key={label}
                        style={{
                          padding: "8px 20px",
                          borderRadius: 20,
                          fontSize: 16,
                          fontWeight: 600,
                          fontFamily: FONTS.body,
                          color: colors[i],
                          background: `${colors[i]}20`,
                          border: `1px solid ${colors[i]}40`,
                        }}
                      >
                        C{i}: {label}
                      </span>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Narration Subtitles ---- */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

/* ---------- Detail Panel Sub-component ---------- */

const DetailPanel: React.FC<{
  section: DetailSection;
  frame: number;
  fps: number;
}> = ({ section, frame, fps }) => {
  const panelSpring = spring({
    fps,
    frame: frame - (section.factStartFrame - 30),
    config: { damping: 16, stiffness: 100 },
  });
  const panelOpacity = interpolate(panelSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: 520,
        padding: 36,
        backgroundColor: THEME.bgCard,
        borderRadius: 16,
        border: `2px solid ${section.color}60`,
        boxShadow: `0 0 30px ${section.color}20`,
        opacity: panelOpacity,
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: 32,
          fontWeight: 700,
          color: section.color,
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            width: 8,
            height: 32,
            borderRadius: 4,
            backgroundColor: section.color,
            display: "inline-block",
          }}
        />
        {section.title}
      </div>

      {/* Facts list */}
      {section.facts.map((fact, i) => {
        const factDelay = section.factStartFrame + i * section.factInterval;
        const factOpacity = interpolate(
          frame,
          [factDelay, factDelay + 20],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const factX = interpolate(
          frame,
          [factDelay, factDelay + 20],
          [-15, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={i}
            style={{
              opacity: factOpacity,
              transform: `translateX(${factX}px)`,
              fontFamily: FONTS.body,
              fontSize: 20,
              color: THEME.text,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: section.color,
                flexShrink: 0,
              }}
            />
            {fact}
          </div>
        );
      })}
    </div>
  );
};

export default S04_Chromosomes_Short;
