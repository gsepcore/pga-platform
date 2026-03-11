import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components/AnimatedText";
import { ChromosomeStack } from "../components/ChromosomeStack";
import { Background } from "../components/Background";

const S04_Chromosomes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation (0-60)
  const titleOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Section title (60-180)
  const sectionOpacity = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Determine which chromosome to highlight
  let highlightIndex = -1;
  let detailsData: { title: string; facts: string[] } | null = null;

  if (frame >= 180 && frame < 500) {
    highlightIndex = 0;
    detailsData = {
      title: "C0: Immutable DNA",
      facts: [
        "🔒 SHA-256 integrity verification",
        "⛔ Never mutates",
        "🛡️ Quarantine protection",
        "Core ethics & security rules",
      ],
    };
  } else if (frame >= 500 && frame < 850) {
    highlightIndex = 1;
    detailsData = {
      title: "C1: Operative Genes",
      facts: [
        "🐢 Slow, validated mutations",
        "🧪 Sandbox testing required",
        "🚪 4 promotion gates",
        "Tool usage & coding patterns",
      ],
    };
  } else if (frame >= 850 && frame < 1150) {
    highlightIndex = 2;
    detailsData = {
      title: "C2: Epigenomes",
      facts: [
        "⚡ Fast daily mutations",
        "👤 Per-user personalization",
        "🎨 Style preferences",
        "Adapts to individual needs",
      ],
    };
  } else if (frame >= 1150 && frame < 1450) {
    highlightIndex = 3;
    detailsData = {
      title: "C3: Content Firewall",
      facts: [
        "🛡️ 53 security patterns",
        "🔍 Real-time content scanning",
        "⚠️ Blocks toxic/harmful output",
        "Protects brand reputation",
      ],
    };
  } else if (frame >= 1450 && frame < 1600) {
    highlightIndex = -1;
  }

  // Detail box animation
  const detailOpacity = interpolate(
    frame,
    [
      highlightIndex === 0 ? 200 : highlightIndex === 1 ? 520 : highlightIndex === 2 ? 870 : 1170,
      highlightIndex === 0 ? 260 : highlightIndex === 1 ? 580 : highlightIndex === 2 ? 930 : 1230,
    ],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Summary text (1600-1800)
  const summaryOpacity = interpolate(frame, [1600, 1680], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const narrationLines = [
    { text: "GSEP uses a 4-chromosome architecture.", startFrame: 0, endFrame: 180 },
    { text: "C0 is immutable DNA with SHA-256 protection.", startFrame: 180, endFrame: 500 },
    { text: "C1 contains operative genes that evolve slowly through validation.", startFrame: 500, endFrame: 850 },
    { text: "C2 adapts quickly to each user's preferences.", startFrame: 850, endFrame: 1150 },
    { text: "C3 is the content firewall with 53 security patterns.", startFrame: 1150, endFrame: 1450 },
    { text: "Together, they create a layered, intelligent system.", startFrame: 1450, endFrame: 1800 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Title */}
        {frame < 180 && (
          <div
            style={{
              position: "absolute",
              top: 100,
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
              The 4-Chromosome Architecture
            </h1>
          </div>
        )}

        {/* Section title */}
        {frame >= 60 && frame < 180 && (
          <div
            style={{
              opacity: sectionOpacity,
              textAlign: "center",
              marginTop: 100,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 48,
                fontWeight: 700,
                color: THEME.accent,
                marginBottom: 10,
              }}
            >
              Heart of GSEP
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: 28,
                color: THEME.textMuted,
              }}
            >
              Four layers of evolving intelligence
            </div>
          </div>
        )}

        {/* ChromosomeStack and Details */}
        {frame >= 180 && frame < 1600 && (
          <div
            style={{
              display: "flex",
              gap: 80,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Chromosome Stack */}
            <div>
              <ChromosomeStack highlightIndex={highlightIndex} delay={180} compact={false} />
            </div>

            {/* Detail Box */}
            {detailsData && (
              <div
                style={{
                  width: 500,
                  padding: 40,
                  backgroundColor: THEME.bgCard,
                  borderRadius: 16,
                  border: `2px solid ${THEME.accent}`,
                  opacity: detailOpacity,
                }}
              >
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: 36,
                    fontWeight: 700,
                    color: THEME.white,
                    marginBottom: 30,
                  }}
                >
                  {detailsData.title}
                </div>
                {detailsData.facts.map((fact, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 22,
                      color: THEME.text,
                      marginBottom: 20,
                      opacity: interpolate(
                        frame,
                        [
                          (highlightIndex === 0 ? 220 : highlightIndex === 1 ? 540 : highlightIndex === 2 ? 890 : 1190) + i * 30,
                          (highlightIndex === 0 ? 260 : highlightIndex === 1 ? 580 : highlightIndex === 2 ? 930 : 1230) + i * 30,
                        ],
                        [0, 1],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      ),
                    }}
                  >
                    {fact}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Summary Text */}
        {frame >= 1600 && (
          <div
            style={{
              opacity: summaryOpacity,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 56,
                fontWeight: 700,
                color: THEME.white,
                maxWidth: 1000,
                lineHeight: 1.4,
              }}
            >
              Together, they create a layered, intelligent system
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

export default S04_Chromosomes;
