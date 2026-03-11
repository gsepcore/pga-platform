import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME } from "../styles/theme";
import { FadeInText } from "../components/AnimatedText";
import { Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";

interface DriftCardProps {
  title: string;
  threshold: string;
  delay: number;
}

const DriftCard: React.FC<DriftCardProps> = ({ title, threshold, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateRight: "clamp" });
  const translateY = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const y = interpolate(translateY, [0, 1], [30, 0]);

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.red}` }}>
        <div style={{ fontSize: 32, marginRight: 16, color: THEME.red }}>↓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 14, color: THEME.textMuted }}>Threshold: {threshold}</div>
        </div>
      </div>
    </div>
  );
};

const S07_DriftDetection: React.FC = () => {
  const frame = useCurrentFrame();

  // Chart data points (normalized 0-1 range for y-axis)
  const dataPoints = [
    { x: 0, y: 0.6 },
    { x: 100, y: 0.7 },
    { x: 200, y: 0.75 },
    { x: 300, y: 0.8 },
    { x: 400, y: 0.85 },
    { x: 500, y: 0.88 },
    { x: 600, y: 0.7 }, // Drift starts
    { x: 700, y: 0.6 }, // Drift detected
    { x: 800, y: 0.65 }, // Recovery starts
    { x: 900, y: 0.82 }, // Healing
    { x: 1000, y: 0.87 }, // Complete
  ];

  const chartWidth = 900;
  const chartHeight = 300;
  const chartProgress = interpolate(frame, [60, 800], [0, dataPoints.length], { extrapolateRight: "clamp" });
  const visiblePoints = Math.floor(chartProgress);

  // Generate SVG path
  const pathPoints = dataPoints.slice(0, visiblePoints + 1).map((point, index) => {
    const x = (point.x / 1000) * chartWidth;
    const y = chartHeight - (point.y * chartHeight);
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");

  const driftDetectedOpacity = interpolate(frame, [700, 750], [0, 1], { extrapolateRight: "clamp" });
  const driftTypesOpacity = interpolate(frame, [800, 850], [0, 1], { extrapolateRight: "clamp" });
  const severityOpacity = interpolate(frame, [1300, 1350], [0, 1], { extrapolateRight: "clamp" });
  const healingOpacity = interpolate(frame, [1500, 1550], [0, 1], { extrapolateRight: "clamp" });

  const driftTypes = [
    { title: "Success Rate Decline", threshold: "-10%", delay: 850 },
    { title: "Efficiency Decline", threshold: "-15%", delay: 950 },
    { title: "Latency Increase", threshold: "+20%", delay: 1050 },
    { title: "Cost Increase", threshold: "+25%", delay: 1150 },
    { title: "Intervention Increase", threshold: "+10%", delay: 1250 },
  ];

  const narrationLines = [
    { text: "Drift detection enables proactive performance monitoring.", startFrame: 0, endFrame: 150 },
    { text: "The system tracks metrics over time to identify degradation.", startFrame: 60, endFrame: 700 },
    { text: "When drift is detected, the system alerts and prepares to heal.", startFrame: 700, endFrame: 1000 },
    { text: "Five drift types are monitored: success rate, efficiency, latency, cost, and intervention.", startFrame: 800, endFrame: 1300 },
    { text: "Severity is categorized from minor to critical, triggering appropriate responses.", startFrame: 1300, endFrame: 1500 },
    { text: "Critical drift triggers emergency rollback and auto-healing.", startFrame: 1500, endFrame: 1650 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, display: "flex", flexDirection: "column" }}>
        <FadeInText text="Drift Detection — Proactive Healing" fontSize={56} fontWeight={800} delay={0} duration={60} />

        {frame >= 60 && frame < 1300 && (
          <div style={{ marginTop: 60, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <svg width={chartWidth} height={chartHeight} style={{ backgroundColor: THEME.bgCard, borderRadius: 12, padding: 30 }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((y, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={chartHeight - y * chartHeight}
                  x2={chartWidth}
                  y2={chartHeight - y * chartHeight}
                  stroke={THEME.bgCode}
                  strokeWidth={1}
                />
              ))}

              {/* Drift zone highlight */}
              {visiblePoints >= 6 && (
                <rect
                  x={(600 / 1000) * chartWidth}
                  y={0}
                  width={(200 / 1000) * chartWidth}
                  height={chartHeight}
                  fill={THEME.red}
                  opacity={0.1}
                />
              )}

              {/* Chart line */}
              <path
                d={pathPoints}
                fill="none"
                stroke={visiblePoints < 7 ? THEME.green : THEME.red}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Recovery line */}
              {frame >= 800 && (
                <path
                  d={dataPoints.slice(7, visiblePoints + 1).map((point, index) => {
                    const x = (point.x / 1000) * chartWidth;
                    const y = chartHeight - (point.y * chartHeight);
                    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke={THEME.green}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        )}

        {frame >= 700 && frame < 1300 && (
          <div style={{ opacity: driftDetectedOpacity, textAlign: "center", marginTop: 30 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: THEME.red }}>⚠️ DRIFT DETECTED</div>
          </div>
        )}

        {frame >= 800 && frame < 1300 && (
          <div style={{ opacity: driftTypesOpacity, marginTop: 40 }}>
            {driftTypes.map((type, index) => (
              <DriftCard key={index} {...type} />
            ))}
          </div>
        )}

        {frame >= 1300 && (
          <div style={{ opacity: severityOpacity, marginTop: 60 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: THEME.text, marginBottom: 30 }}>Severity Scale</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.amber}` }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>Minor</div>
                <div style={{ fontSize: 14, color: THEME.textMuted }}>&lt;15% degradation</div>
              </div>
              <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.orange}` }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>Moderate</div>
                <div style={{ fontSize: 14, color: THEME.textMuted }}>15-30% degradation</div>
              </div>
              <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.red}` }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>Severe</div>
                <div style={{ fontSize: 14, color: THEME.textMuted }}>30-50% degradation</div>
              </div>
              <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.red}`, boxShadow: `0 0 20px ${THEME.red}40` }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: THEME.red }}>Critical</div>
                <div style={{ fontSize: 14, color: THEME.textMuted }}>≥50% degradation</div>
                <div style={{ fontSize: 12, color: THEME.red, marginTop: 8, fontWeight: 600 }}>EMERGENCY ROLLBACK</div>
              </div>
            </div>
          </div>
        )}

        {frame >= 1500 && (
          <div style={{ opacity: healingOpacity, textAlign: "center", marginTop: 40 }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: THEME.green }}>✓ Auto-healing complete</div>
          </div>
        )}

        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S07_DriftDetection;
