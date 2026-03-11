import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME } from "../styles/theme";
import { FadeInText } from "../components/AnimatedText";
import { Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";
import { Badge } from "../components/Badge";

interface MetricBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  description: string;
  delay: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, maxValue, color, description, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      stiffness: 60,
    },
  });

  const width = interpolate(progress, [0, 1], [0, (value / maxValue) * 100]);
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{label}</span>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{typeof value === "number" && value < 1 ? value.toFixed(2) : value}{typeof value === "string" ? "" : ""}</span>
      </div>
      <div style={{ fontSize: 14, color: THEME.textMuted, marginBottom: 12 }}>{description}</div>
      <div style={{ width: "100%", height: 12, backgroundColor: THEME.bgCard, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", backgroundColor: color, borderRadius: 6 }} />
      </div>
    </div>
  );
};

const S06_Fitness: React.FC = () => {
  const frame = useCurrentFrame();

  const metrics = [
    { label: "Quality", value: 0.85, maxValue: 1, color: THEME.accent, description: "Output coherence and correctness", delay: 60 },
    { label: "Success Rate", value: 0.92, maxValue: 1, color: THEME.green, description: "Tasks completed successfully", delay: 180 },
    { label: "Token Efficiency", value: 0.78, maxValue: 1, color: THEME.cyan, description: "Cognitive compression", delay: 300 },
    { label: "Latency", value: 120, maxValue: 200, color: THEME.purple, description: "Response time (ms)", delay: 420 },
    { label: "Cost per Success", value: 0.08, maxValue: 0.15, color: THEME.orange, description: "Economics ($)", delay: 540 },
    { label: "Intervention Rate", value: 0.05, maxValue: 0.2, color: THEME.amber, description: "Manual corrections needed", delay: 660 },
  ];

  const compositeScore = 0.84;
  const compositeOpacity = interpolate(frame, [900, 950], [0, 1], { extrapolateRight: "clamp" });
  const weightsOpacity = interpolate(frame, [1000, 1050], [0, 1], { extrapolateRight: "clamp" });

  const confidenceOpacity = interpolate(frame, [1200, 1250], [0, 1], { extrapolateRight: "clamp" });

  const narrationLines = [
    { text: "The fitness system evaluates agent performance across 6 dimensions.", startFrame: 0, endFrame: 150 },
    { text: "Quality measures output coherence and correctness.", startFrame: 60, endFrame: 180 },
    { text: "Success rate tracks tasks completed successfully.", startFrame: 180, endFrame: 300 },
    { text: "Token efficiency measures cognitive compression.", startFrame: 300, endFrame: 420 },
    { text: "Latency tracks response time in milliseconds.", startFrame: 420, endFrame: 540 },
    { text: "Cost per success measures economic efficiency.", startFrame: 540, endFrame: 660 },
    { text: "Intervention rate tracks manual corrections needed.", startFrame: 660, endFrame: 900 },
    { text: "These metrics combine into a composite score with weighted importance.", startFrame: 900, endFrame: 1200 },
    { text: "Confidence scales with sample size, reaching 95% at 200+ samples.", startFrame: 1200, endFrame: 1500 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, display: "flex", flexDirection: "column" }}>
        <FadeInText text="Fitness System — 6 Dimensions" fontSize={56} fontWeight={800} delay={0} duration={60} />

        <div style={{ marginTop: 60, flex: 1 }}>
          {metrics.map((metric, index) => (
            <MetricBar key={index} {...metric} />
          ))}
        </div>

        {frame >= 900 && (
          <div style={{ opacity: compositeOpacity, marginTop: 40 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, color: THEME.textMuted, marginBottom: 12 }}>Composite Score</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: THEME.accent }}>{compositeScore.toFixed(2)}</div>
              <div style={{ opacity: weightsOpacity, fontSize: 16, color: THEME.textMuted, marginTop: 20, lineHeight: 1.6 }}>
                Quality 30% · Success 25% · Efficiency 20% · Latency 10% · Cost 10% · Intervention 5%
              </div>
            </div>
          </div>
        )}

        {frame >= 1200 && (
          <div style={{ opacity: confidenceOpacity, marginTop: 40, padding: 30, backgroundColor: THEME.bgCard, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 20 }}>Confidence Scale</div>
            <div style={{ fontSize: 16, color: THEME.textMuted, lineHeight: 2 }}>
              <div>&lt;10 samples: 0.5 confidence</div>
              <div>10-19 samples: 0.6 confidence</div>
              <div>20-49 samples: 0.7 confidence</div>
              <div>50-99 samples: 0.8 confidence</div>
              <div>100-199 samples: 0.9 confidence</div>
              <div>200+ samples: <span style={{ color: THEME.green, fontWeight: 700 }}>0.95 confidence</span></div>
            </div>
          </div>
        )}

        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S06_Fitness;
