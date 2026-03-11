import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME } from "../styles/theme";
import { FadeInText } from "../components/AnimatedText";
import { Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";

interface LayerCardProps {
  icon: string;
  name: string;
  description: string;
  color: string;
  delay: number;
  highlight: boolean;
}

const LayerCard: React.FC<LayerCardProps> = ({ icon, name, description, color, delay, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateRight: "clamp" });
  const translateY = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 25,
      stiffness: 70,
    },
  });

  const y = interpolate(translateY, [0, 1], [40, 0]);
  const scale = highlight ? 1.02 : 1;
  const glowOpacity = highlight ? 0.3 : 0;

  return (
    <div style={{ opacity, transform: `translateY(${y}px) scale(${scale})`, marginBottom: 16, transition: "transform 0.3s ease" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: 24,
          backgroundColor: THEME.bgCard,
          borderRadius: 12,
          borderLeft: `5px solid ${color}`,
          boxShadow: highlight ? `0 0 30px ${color}${Math.floor(glowOpacity * 255).toString(16).padStart(2, '0')}` : "none",
        }}
      >
        <div style={{ fontSize: 40, marginRight: 20 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>{name}</div>
          <div style={{ fontSize: 16, color: THEME.textMuted, lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>
    </div>
  );
};

const S08_LivingAgent: React.FC = () => {
  const frame = useCurrentFrame();

  const layers = [
    { icon: "🧠", name: "SelfModel", description: "Knows own strengths & weaknesses", color: THEME.purple, delay: 60 },
    { icon: "🔍", name: "Metacognition", description: "Pre/post response introspection", color: THEME.cyan, delay: 300 },
    { icon: "❤️", name: "EmotionalModel", description: "Detects user emotions, adapts tone", color: THEME.red, delay: 540 },
    { icon: "⚖️", name: "CalibratedAutonomy", description: "Learns when to act vs ask", color: THEME.amber, delay: 780 },
    { icon: "🔄", name: "PatternMemory", description: "Remembers successful patterns", color: THEME.green, delay: 1020 },
    { icon: "📖", name: "PersonalNarrative", description: "Tracks relationship history", color: THEME.orange, delay: 1260 },
    { icon: "🕸️", name: "AnalyticMemory", description: "Knowledge graph: entities + relations", color: THEME.cyan, delay: 1500 },
    { icon: "🎯", name: "EnhancedSelfModel", description: "Purpose + capability tracking", color: THEME.purple, delay: 1740 },
    { icon: "🛡️", name: "PurposeSurvival", description: "THRIVING → CRITICAL state machine", color: THEME.red, delay: 1980 },
    { icon: "🧭", name: "StrategicAutonomy", description: "Goal-based strategic decisions", color: THEME.accent, delay: 2220 },
  ];

  const allGlowOpacity = interpolate(frame, [2500, 2550], [0, 1], { extrapolateRight: "clamp" });
  const finalTextOpacity = interpolate(frame, [2550, 2600], [0, 1], { extrapolateRight: "clamp" });

  const narrationLines = [
    { text: "The Living Agent integrates 10 cognitive layers for genuine self-awareness.", startFrame: 0, endFrame: 150 },
    { text: "SelfModel enables the agent to know its own strengths and weaknesses.", startFrame: 60, endFrame: 300 },
    { text: "Metacognition provides pre and post response introspection.", startFrame: 300, endFrame: 540 },
    { text: "EmotionalModel detects user emotions and adapts communication tone.", startFrame: 540, endFrame: 780 },
    { text: "CalibratedAutonomy learns when to act independently versus ask for guidance.", startFrame: 780, endFrame: 1020 },
    { text: "PatternMemory remembers successful interaction patterns.", startFrame: 1020, endFrame: 1260 },
    { text: "PersonalNarrative tracks the relationship history with each user.", startFrame: 1260, endFrame: 1500 },
    { text: "AnalyticMemory maintains a knowledge graph of entities and relations.", startFrame: 1500, endFrame: 1740 },
    { text: "EnhancedSelfModel tracks purpose and evolving capabilities.", startFrame: 1740, endFrame: 1980 },
    { text: "PurposeSurvival implements a state machine from thriving to critical.", startFrame: 1980, endFrame: 2220 },
    { text: "StrategicAutonomy enables goal-based strategic decision making.", startFrame: 2220, endFrame: 2500 },
    { text: "Together, these layers create an agent that's genuinely self-aware.", startFrame: 2500, endFrame: 2700 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, display: "flex", flexDirection: "column" }}>
        <FadeInText text="Living Agent — 10 Cognitive Layers" fontSize={56} fontWeight={800} delay={0} duration={60} />

        <div style={{ marginTop: 60, flex: 1, overflowY: "hidden" }}>
          {layers.map((layer, index) => (
            <LayerCard key={index} {...layer} highlight={frame >= 2500} />
          ))}
        </div>

        {frame >= 2500 && (
          <div style={{ opacity: allGlowOpacity }}>
            <div style={{ opacity: finalTextOpacity, textAlign: "center", marginTop: 40, padding: 40, backgroundColor: THEME.bgCard, borderRadius: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: THEME.accent, lineHeight: 1.5 }}>
                Together: an agent that's genuinely self-aware
              </div>
            </div>
          </div>
        )}

        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S08_LivingAgent;
