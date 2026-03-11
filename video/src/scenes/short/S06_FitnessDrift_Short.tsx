import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { FadeInText, Narration } from "../../components/AnimatedText";
import { Background } from "../../components/Background";

/**
 * S06_FitnessDrift_Short — 28 seconds (840 frames @ 30fps)
 *
 * COMBINED scene: Fitness System (6 metrics) + Drift Detection (5 types).
 * Tight animation budget -- every element fits within 840 frames.
 */

interface Metric {
  label: string;
  value: number | string;
  displayValue: string;
  fill: number; // 0-1 for bar width
  color: string;
  delay: number;
}

const METRICS: Metric[] = [
  { label: "Quality", value: 0.85, displayValue: "0.85", fill: 0.85, color: THEME.accent, delay: 40 },
  { label: "Success Rate", value: 0.92, displayValue: "0.92", fill: 0.92, color: THEME.green, delay: 80 },
  { label: "Token Efficiency", value: 0.78, displayValue: "0.78", fill: 0.78, color: THEME.cyan, delay: 120 },
  { label: "Latency", value: 120, displayValue: "120ms", fill: 0.6, color: THEME.purple, delay: 160 },
  { label: "Cost per Success", value: 0.08, displayValue: "$0.08", fill: 0.53, color: THEME.orange, delay: 200 },
  { label: "Intervention Rate", value: 0.05, displayValue: "0.05", fill: 0.25, color: THEME.amber, delay: 240 },
];

interface DriftType {
  title: string;
  icon: string;
  delay: number;
}

const DRIFT_TYPES: DriftType[] = [
  { title: "Success Rate Decline", icon: "\u2193", delay: 560 },
  { title: "Efficiency Decline", icon: "\u2193", delay: 580 },
  { title: "Latency Increase", icon: "\u2191", delay: 600 },
  { title: "Cost Increase", icon: "\u2191", delay: 620 },
  { title: "Intervention Increase", icon: "\u2191", delay: 640 },
];

interface SeverityLevel {
  label: string;
  threshold: string;
  color: string;
  critical?: boolean;
}

const SEVERITY_LEVELS: SeverityLevel[] = [
  { label: "Minor", threshold: "<15%", color: THEME.amber },
  { label: "Moderate", threshold: "15-30%", color: THEME.orange },
  { label: "Severe", threshold: "30-50%", color: THEME.red },
  { label: "Critical", threshold: ">=50%", color: THEME.red, critical: true },
];

const narrationLines = [
  { text: "The fitness system tracks six dimensions.", startFrame: 0, endFrame: 200 },
  { text: "Quality, success rate, token efficiency, latency, cost, and intervention rate.", startFrame: 200, endFrame: 480 },
  { text: "When any metric degrades, the drift detector catches it automatically.", startFrame: 480, endFrame: 640 },
  { text: "Five drift types monitored with severity from minor to critical.", startFrame: 640, endFrame: 780 },
  { text: "Critical drift triggers emergency rollback. No manual intervention.", startFrame: 780, endFrame: 840 },
];

const S06_FitnessDrift_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-40) ---
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Composite Score (480-540) ---
  const compositeSpring = spring({
    fps,
    frame: frame - 480,
    config: { damping: 12, stiffness: 80 },
  });
  const compositeOpacity = interpolate(compositeSpring, [0, 1], [0, 1]);
  const compositeScale = interpolate(compositeSpring, [0, 1], [0.6, 1]);

  // --- Drift Detected flash (540-560) ---
  const driftFlash = interpolate(frame, [540, 555], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driftPulse = frame >= 540 ? Math.sin((frame - 540) * 0.15) * 0.3 + 0.7 : 0;

  // --- Severity grid (700-780) ---
  const severityOpacity = interpolate(frame, [700, 720], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Auto-healing (780-840) ---
  const healingOpacity = interpolate(frame, [780, 800], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: "40px 70px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ---- Title ---- */}
        <div
          style={{
            opacity: titleOpacity,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontFamily: FONTS.heading,
              fontSize: 56,
              fontWeight: 800,
              color: THEME.white,
              margin: 0,
            }}
          >
            Fitness & Drift Detection
          </h1>
        </div>

        {/* ---- Metric Bars (40-480) ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {METRICS.map((metric) => (
            <MetricBarCompact
              key={metric.label}
              metric={metric}
              frame={frame}
              fps={fps}
            />
          ))}
        </div>

        {/* ---- Composite Score (480-540) ---- */}
        {frame >= 480 && frame < 540 && (
          <div
            style={{
              textAlign: "center",
              opacity: compositeOpacity,
              transform: `scale(${compositeScale})`,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 18,
                color: THEME.textMuted,
                marginRight: 16,
              }}
            >
              Composite Score
            </span>
            <span
              style={{
                fontFamily: FONTS.heading,
                fontSize: 56,
                fontWeight: 900,
                color: THEME.accent,
              }}
            >
              0.84
            </span>
          </div>
        )}

        {/* ---- DRIFT DETECTED + drift types (540-700) ---- */}
        {frame >= 540 && (
          <div style={{ marginBottom: 8 }}>
            {/* Alert banner */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 14,
                opacity: driftFlash,
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 32,
                  fontWeight: 800,
                  color: THEME.red,
                  textShadow: `0 0 ${18 * driftPulse}px ${THEME.red}80`,
                }}
              >
                DRIFT DETECTED
              </span>
            </div>

            {/* Drift type cards */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              {DRIFT_TYPES.map((dt) => {
                const dtOpacity = interpolate(
                  frame,
                  [dt.delay, dt.delay + 15],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const dtY = interpolate(
                  frame,
                  [dt.delay, dt.delay + 15],
                  [10, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );

                return (
                  <div
                    key={dt.title}
                    style={{
                      opacity: dtOpacity,
                      transform: `translateY(${dtY}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      backgroundColor: THEME.bgCard,
                      borderRadius: 8,
                      borderLeft: `3px solid ${THEME.red}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONTS.mono,
                        fontSize: 18,
                        fontWeight: 700,
                        color: THEME.red,
                      }}
                    >
                      {dt.icon}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: 15,
                        fontWeight: 600,
                        color: THEME.text,
                      }}
                    >
                      {dt.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- Severity Scale (700-780) ---- */}
        {frame >= 700 && (
          <div
            style={{
              opacity: severityOpacity,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 20,
                fontWeight: 700,
                color: THEME.text,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Severity Scale
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              {SEVERITY_LEVELS.map((sev) => (
                <div
                  key={sev.label}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: THEME.bgCard,
                    borderRadius: 8,
                    borderLeft: `4px solid ${sev.color}`,
                    boxShadow: sev.critical ? `0 0 16px ${sev.color}30` : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: sev.critical ? sev.color : THEME.text,
                      fontFamily: FONTS.heading,
                      marginBottom: 4,
                    }}
                  >
                    {sev.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: THEME.textMuted,
                      fontFamily: FONTS.body,
                    }}
                  >
                    {sev.threshold} degradation
                  </div>
                  {sev.critical && (
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.red,
                        fontWeight: 700,
                        fontFamily: FONTS.mono,
                        marginTop: 4,
                        letterSpacing: 0.5,
                      }}
                    >
                      EMERGENCY ROLLBACK
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Auto-healing Complete (780-840) ---- */}
        {frame >= 780 && (
          <div
            style={{
              opacity: healingOpacity,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.heading,
                fontSize: 28,
                fontWeight: 800,
                color: THEME.green,
              }}
            >
              Auto-healing complete
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontSize: 22,
                color: THEME.textMuted,
                marginLeft: 16,
              }}
            >
              &mdash; Emergency rollback executed
            </span>
          </div>
        )}

        {/* ---- Narration Subtitles ---- */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

/* ---------- Compact Metric Bar Sub-component ---------- */

const MetricBarCompact: React.FC<{
  metric: Metric;
  frame: number;
  fps: number;
}> = ({ metric, frame, fps }) => {
  const progress = spring({
    frame: frame - metric.delay,
    fps,
    config: { damping: 22, stiffness: 60 },
  });

  const barWidth = interpolate(progress, [0, 1], [0, metric.fill * 100]);
  const rowOpacity = interpolate(frame, [metric.delay, metric.delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity: rowOpacity }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: 16,
            fontWeight: 600,
            color: THEME.text,
            width: 160,
            textAlign: "right",
          }}
        >
          {metric.label}
        </span>

        {/* Bar track */}
        <div
          style={{
            flex: 1,
            height: 16,
            backgroundColor: THEME.bgCard,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              backgroundColor: metric.color,
              borderRadius: 8,
              boxShadow: `0 0 8px ${metric.color}40`,
            }}
          />
        </div>

        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 18,
            fontWeight: 700,
            color: metric.color,
            width: 80,
          }}
        >
          {metric.displayValue}
        </span>
      </div>
    </div>
  );
};

export default S06_FitnessDrift_Short;
