import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { CodeBlock } from "../components/CodeBlock";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "Don't take our word for it. Prove it yourself.", startFrame: 0, endFrame: 120 },
  { text: "Run the proof of value script.", startFrame: 120, endFrame: 300 },
  { text: "Five cycles. Ten interactions each.", startFrame: 300, endFrame: 450 },
  { text: "Verdict: improvement proven. Plus sixteen percent quality.", startFrame: 450, endFrame: 700 },
  { text: "Watch quality climb from point five to point five eight.", startFrame: 700, endFrame: 1000 },
  { text: "Token usage rises as the agent learns to be more thorough.", startFrame: 1000, endFrame: 1300 },
  { text: "The line chart shows the evolution trajectory.", startFrame: 1300, endFrame: 1600 },
  { text: "Hard data, not promises. Prove ROI to your team.", startFrame: 1600, endFrame: 2100 },
];

export default function S13_ProofOfValue() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const terminalOpacity = interpolate(frame, [60, 120], [0, 1], { extrapolateRight: "clamp" });

  const tableOpacity = interpolate(frame, [600, 660], [0, 1], { extrapolateRight: "clamp" });

  const rowData = [
    { cycle: "Base", quality: 0.50, success: "0.0%", tokens: 52 },
    { cycle: "Cycle1", quality: 0.51, success: "0.0%", tokens: 81 },
    { cycle: "Cycle2", quality: 0.58, success: "0.0%", tokens: 107 },
    { cycle: "Cycle3", quality: 0.58, success: "0.0%", tokens: 107 },
    { cycle: "Cycle4", quality: 0.58, success: "0.0%", tokens: 107 },
  ];

  const chartOpacity = interpolate(frame, [1400, 1460], [0, 1], { extrapolateRight: "clamp" });
  const chartProgress = interpolate(frame, [1400, 1700], [0, 1], { extrapolateRight: "clamp" });

  const finalTextOpacity = interpolate(frame, [1800, 1860], [0, 1], { extrapolateRight: "clamp" });
  const finalTextScale = spring({
    frame: frame - 1800,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <Background>
      <Narration lines={narrationLines} />
      <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
        <div style={{ opacity: titleOpacity }}>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: 64,
            color: THEME.white,
            fontWeight: 700,
            marginBottom: 60,
          }}>
            Proof of Value
          </h1>
        </div>

        {frame >= 60 && (
          <div style={{ opacity: terminalOpacity, marginBottom: 40 }}>
            <CodeBlock
              code={`$ npx tsx examples/proof-of-value.ts

Running GSEP Proof of Value...
Cycles: 5 | Interactions/cycle: 10

VERDICT: [OK] IMPROVEMENT PROVEN (+16.0% quality)`}
              delay={10}
              lineDelay={15}
              fontSize={20}
              style={{ backgroundColor: THEME.bgCode }}
            />
          </div>
        )}

        {frame >= 600 && (
          <div style={{ opacity: tableOpacity, marginBottom: 40 }}>
            <div style={{
              fontFamily: FONTS.mono,
              fontSize: 18,
              backgroundColor: THEME.bgCard,
              border: `1px solid ${THEME.textMuted}40`,
              borderRadius: 8,
              padding: 20,
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 16,
                borderBottom: `1px solid ${THEME.textMuted}40`,
                paddingBottom: 12,
                marginBottom: 12,
              }}>
                <div style={{ color: THEME.textMuted, fontWeight: 600 }}>Cycle</div>
                <div style={{ color: THEME.textMuted, fontWeight: 600 }}>Quality</div>
                <div style={{ color: THEME.textMuted, fontWeight: 600 }}>Success</div>
                <div style={{ color: THEME.textMuted, fontWeight: 600 }}>Tokens</div>
              </div>
              {rowData.map((row, i) => {
                const rowFrame = 660 + i * 100;
                const rowOpacity = interpolate(frame, [rowFrame, rowFrame + 40], [0, 1], { extrapolateRight: "clamp" });
                const isImprovement = row.quality >= 0.58;
                return (
                  <div
                    key={row.cycle}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: 16,
                      paddingTop: 8,
                      paddingBottom: 8,
                      opacity: rowOpacity,
                    }}
                  >
                    <div style={{ color: THEME.text }}>{row.cycle}</div>
                    <div style={{ color: isImprovement ? THEME.green : THEME.text, fontWeight: isImprovement ? 600 : 400 }}>
                      {row.quality.toFixed(2)}
                    </div>
                    <div style={{ color: THEME.text }}>{row.success}</div>
                    <div style={{ color: THEME.text }}>{row.tokens}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {frame >= 1400 && (
          <div style={{ opacity: chartOpacity, marginBottom: 40 }}>
            <svg width="800" height="200" style={{ marginLeft: 40 }}>
              <line x1="50" y1="150" x2="750" y2="150" stroke={THEME.textMuted} strokeWidth="2" />
              <line x1="50" y1="50" x2="50" y2="150" stroke={THEME.textMuted} strokeWidth="2" />

              <text x="20" y="55" fill={THEME.textMuted} fontSize="14">1.0</text>
              <text x="20" y="105" fill={THEME.textMuted} fontSize="14">0.75</text>
              <text x="20" y="155" fill={THEME.textMuted} fontSize="14">0.5</text>

              <text x="50" y="175" fill={THEME.textMuted} fontSize="14">0</text>
              <text x="225" y="175" fill={THEME.textMuted} fontSize="14">1</text>
              <text x="400" y="175" fill={THEME.textMuted} fontSize="14">2</text>
              <text x="575" y="175" fill={THEME.textMuted} fontSize="14">3</text>
              <text x="750" y="175" fill={THEME.textMuted} fontSize="14">4</text>

              {chartProgress > 0 && (
                <polyline
                  points={`
                    50,${150 - 0.50 * 100}
                    ${50 + 175 * Math.min(chartProgress * 4, 1)},${150 - 0.51 * 100}
                    ${chartProgress > 0.25 ? 50 + 350 * Math.min((chartProgress - 0.25) * 4, 1) : 50 + 175},${150 - 0.58 * 100}
                    ${chartProgress > 0.5 ? 50 + 525 * Math.min((chartProgress - 0.5) * 4, 1) : 50 + 350},${150 - 0.58 * 100}
                    ${chartProgress > 0.75 ? 50 + 700 * Math.min((chartProgress - 0.75) * 4, 1) : 50 + 525},${150 - 0.58 * 100}
                  `}
                  fill="none"
                  stroke={THEME.green}
                  strokeWidth="3"
                />
              )}
            </svg>
          </div>
        )}

        {frame >= 1800 && (
          <div style={{
            opacity: finalTextOpacity,
            transform: `scale(${finalTextScale})`,
            textAlign: "center",
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 48,
              color: THEME.white,
              fontWeight: 700,
            }}>
              Hard data, not promises. Prove ROI to your team.
            </h1>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
