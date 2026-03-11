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

// ----------------------------------------------------------------
// Scene 7 (Short): Living Agent -- 10 Cognitive Layers
// Duration: 45 s = 1350 frames @ 30 fps
// ----------------------------------------------------------------

interface CompactLayerCardProps {
  icon: string;
  name: string;
  description: string;
  color: string;
  delay: number;
  glow: boolean;
}

const CompactLayerCard: React.FC<CompactLayerCardProps> = ({
  icon,
  name,
  description,
  color,
  delay,
  glow,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const springVal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 90 },
  });

  const translateY = interpolate(springVal, [0, 1], [30, 0]);

  const glowShadow = glow
    ? `0 0 18px ${color}55, 0 0 6px ${color}33`
    : "none";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: THEME.bgCard,
          borderRadius: 10,
          borderLeft: `4px solid ${color}`,
          boxShadow: glowShadow,
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div style={{ fontSize: 28, marginRight: 14, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: THEME.text,
              fontFamily: FONTS.heading,
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 14,
              color: THEME.textMuted,
              fontFamily: FONTS.body,
              lineHeight: 1.3,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};

const narrationLines = [
  {
    text: "The Living Agent adds ten cognitive layers to your agent.",
    startFrame: 0,
    endFrame: 150,
  },
  {
    text: "SelfModel, Metacognition, Emotional intelligence, Calibrated autonomy.",
    startFrame: 150,
    endFrame: 480,
  },
  {
    text: "Pattern memory, personal narrative, and analytic memory.",
    startFrame: 480,
    endFrame: 810,
  },
  {
    text: "Plus three advanced pillars: enhanced self-model, purpose survival, strategic autonomy.",
    startFrame: 810,
    endFrame: 1150,
  },
  {
    text: "Together: an agent that's genuinely self-aware.",
    startFrame: 1150,
    endFrame: 1350,
  },
];

const leftColumn = [
  {
    icon: "\u{1F9E0}",
    name: "SelfModel",
    description: "Knows own strengths & weaknesses",
    color: THEME.purple,
    delay: 40,
  },
  {
    icon: "\u{1F50D}",
    name: "Metacognition",
    description: "Pre/post response introspection",
    color: THEME.cyan,
    delay: 150,
  },
  {
    icon: "\u2764\uFE0F",
    name: "EmotionalModel",
    description: "Detects user emotions, adapts tone",
    color: THEME.red,
    delay: 260,
  },
  {
    icon: "\u2696\uFE0F",
    name: "CalibratedAutonomy",
    description: "Learns when to act vs ask",
    color: THEME.amber,
    delay: 370,
  },
  {
    icon: "\u{1F504}",
    name: "PatternMemory",
    description: "Remembers successful patterns",
    color: THEME.green,
    delay: 480,
  },
];

const rightColumn = [
  {
    icon: "\u{1F4D6}",
    name: "PersonalNarrative",
    description: "Tracks relationship history",
    color: THEME.orange,
    delay: 590,
  },
  {
    icon: "\u{1F578}\uFE0F",
    name: "AnalyticMemory",
    description: "Knowledge graph: entities + relations",
    color: THEME.cyan,
    delay: 700,
  },
  {
    icon: "\u{1F3AF}",
    name: "EnhancedSelfModel",
    description: "Purpose + capability tracking",
    color: THEME.purple,
    delay: 810,
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    name: "PurposeSurvival",
    description: "THRIVING \u2192 CRITICAL state machine",
    color: THEME.red,
    delay: 920,
  },
  {
    icon: "\u{1F9ED}",
    name: "StrategicAutonomy",
    description: "Goal-based strategic decisions",
    color: THEME.accent,
    delay: 1030,
  },
];

const S07_LivingAgent_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // All-glow phase: cards glow starting at frame 1150
  const glowActive = frame >= 1150;

  // Summary text fade in at 1150
  const summaryOpacity = interpolate(frame, [1150, 1200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const summaryScale = spring({
    frame: frame - 1150,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const summaryScaleVal = interpolate(summaryScale, [0, 1], [0.85, 1]);

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: "60px 70px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <FadeInText
          text="Living Agent \u2014 10 Cognitive Layers"
          fontSize={50}
          fontWeight={800}
          delay={0}
          duration={40}
        />

        {/* Two-column grid of layer cards */}
        <div
          style={{
            display: "flex",
            gap: 30,
            marginTop: 40,
            flex: 1,
          }}
        >
          {/* Left Column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {leftColumn.map((layer, i) => (
              <CompactLayerCard
                key={i}
                icon={layer.icon}
                name={layer.name}
                description={layer.description}
                color={layer.color}
                delay={layer.delay}
                glow={glowActive}
              />
            ))}
          </div>

          {/* Right Column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {rightColumn.map((layer, i) => (
              <CompactLayerCard
                key={i}
                icon={layer.icon}
                name={layer.name}
                description={layer.description}
                color={layer.color}
                delay={layer.delay}
                glow={glowActive}
              />
            ))}
          </div>
        </div>

        {/* Summary text at the bottom */}
        {frame >= 1150 && (
          <div
            style={{
              opacity: summaryOpacity,
              transform: `scale(${summaryScaleVal})`,
              textAlign: "center",
              marginTop: 20,
              padding: "20px 40px",
              backgroundColor: THEME.bgCard,
              borderRadius: 14,
              border: `2px solid ${THEME.accent}40`,
              boxShadow: `0 0 30px ${THEME.accent}20`,
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: THEME.accent,
                fontFamily: FONTS.heading,
                lineHeight: 1.4,
              }}
            >
              Together: an agent that's genuinely self-aware
            </div>
          </div>
        )}

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S07_LivingAgent_Short;
