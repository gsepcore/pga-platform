import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";
import { THEME, FONTS } from "../../styles/theme";
import { FadeInText, Narration } from "../../components/AnimatedText";
import { Background } from "../../components/Background";

const TOTAL = 660; // 22s x 30fps

const narrationLines = [
  { text: "The results speak for themselves.", startFrame: 0, endFrame: 120 },
  { text: "User satisfaction up 25%. Task success rate up 18%.", startFrame: 120, endFrame: 280 },
  { text: "Token efficiency up 12%. Manual interventions down 45%.", startFrame: 280, endFrame: 500 },
  { text: "Measured across 20+ configurations with our standard benchmark suite.", startFrame: 500, endFrame: 660 },
];

interface BenchmarkItem {
  label: string;
  value: string;
  percent: number;
  color: string;
  barDelay: number;
}

const benchmarks: BenchmarkItem[] = [
  { label: "User Satisfaction", value: "+25%", percent: 0.75, color: THEME.green, barDelay: 40 },
  { label: "Task Success Rate", value: "+18%", percent: 0.68, color: THEME.green, barDelay: 120 },
  { label: "Token Efficiency", value: "+12%", percent: 0.55, color: THEME.cyan, barDelay: 200 },
  { label: "User Retention", value: "+34%", percent: 0.84, color: THEME.green, barDelay: 280 },
  { label: "Manual Interventions", value: "-45%", percent: 0.45, color: THEME.red, barDelay: 360 },
];

const BenchmarkBar: React.FC<{ item: BenchmarkItem }> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring for bar width growth
  const barSpring = spring({
    fps,
    frame: frame - item.barDelay,
    config: { damping: 18, mass: 0.8, stiffness: 80 },
  });
  const barWidth = interpolate(barSpring, [0, 1], [0, item.percent * 100]);

  // Spring for badge scale-in
  const badgeSpring = spring({
    fps,
    frame: frame - (item.barDelay + 15),
    config: { damping: 14, mass: 0.4, stiffness: 120 },
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);

  // Row fade in
  const rowOpacity = interpolate(frame - item.barDelay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rowY = interpolate(frame - item.barDelay, [0, 15], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: rowOpacity,
        transform: `translateY(${rowY}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: 22,
            fontWeight: 500,
            color: THEME.text,
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            display: "inline-block",
            fontFamily: FONTS.mono,
            fontSize: 20,
            fontWeight: 700,
            color: item.color,
            background: `${item.color}20`,
            border: `1px solid ${item.color}50`,
            padding: "4px 14px",
            borderRadius: 20,
          }}
        >
          {item.value}
        </span>
      </div>

      {/* Bar track */}
      <div
        style={{
          width: "100%",
          height: 14,
          backgroundColor: `${THEME.textMuted}20`,
          borderRadius: 7,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            backgroundColor: item.color,
            borderRadius: 7,
            boxShadow: `0 0 12px ${item.color}60`,
          }}
        />
      </div>
    </div>
  );
};

const S10_Benchmarks_Short: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase 1: Title (0-40f)
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 30], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: Summary text (500-660f)
  const summaryOpacity = interpolate(frame, [500, 530], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const summaryY = interpolate(frame, [500, 530], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 120px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: 900,
            gap: 20,
          }}
        >
          {/* Title */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontFamily: FONTS.heading,
              fontSize: 64,
              fontWeight: 800,
              color: THEME.white,
              textAlign: "center",
              marginBottom: 30,
            }}
          >
            Performance Impact
          </div>

          {/* Benchmark bars */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
              width: "100%",
            }}
          >
            {benchmarks.map((item, i) => (
              <BenchmarkBar key={i} item={item} />
            ))}
          </div>

          {/* Summary text */}
          <div
            style={{
              opacity: summaryOpacity,
              transform: `translateY(${summaryY}px)`,
              fontFamily: FONTS.body,
              fontSize: 20,
              color: THEME.textMuted,
              textAlign: "center",
              marginTop: 30,
            }}
          >
            Measured with standard benchmark suite across 20+ configurations
          </div>
        </div>

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S10_Benchmarks_Short;
