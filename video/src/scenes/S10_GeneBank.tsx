import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME } from "../styles/theme";
import { FadeInText } from "../components/AnimatedText";
import { Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";

interface GeneCardProps {
  title: string;
  fitness: number;
  delay: number;
}

const GeneCard: React.FC<GeneCardProps> = ({ title, fitness, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
  const translateY = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const y = interpolate(translateY, [0, 1], [30, 0]);
  const fitnessColor = fitness >= 0.9 ? THEME.green : fitness >= 0.85 ? THEME.accent : THEME.cyan;

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, marginBottom: 16 }}>
      <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${fitnessColor}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: THEME.text }}>{title}</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: fitnessColor }}>{fitness.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

interface AdoptionStepProps {
  number: string;
  label: string;
  delay: number;
}

const AdoptionStep: React.FC<AdoptionStepProps> = ({ number, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const scaleValue = interpolate(scale, [0, 1], [0.95, 1]);

  return (
    <div style={{ opacity, transform: `scale(${scaleValue})`, flex: 1, textAlign: "center" }}>
      <div style={{ padding: 30, backgroundColor: THEME.bgCard, borderRadius: 12, border: `2px solid ${THEME.green}` }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: THEME.green, marginBottom: 12 }}>{number}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: THEME.text }}>{label}</div>
      </div>
    </div>
  );
};

const S10_GeneBank: React.FC = () => {
  const frame = useCurrentFrame();

  const localGenes = [
    { title: "Tool Usage: API Calls", fitness: 0.92, delay: 100 },
    { title: "Reasoning: Step-by-Step", fitness: 0.88, delay: 200 },
    { title: "Communication: Technical Writing", fitness: 0.85, delay: 300 },
  ];

  const marketplaceOpacity = interpolate(frame, [600, 650], [0, 1], { extrapolateRight: "clamp" });
  const geneTypesOpacity = interpolate(frame, [750, 800], [0, 1], { extrapolateRight: "clamp" });
  const commissionOpacity = interpolate(frame, [900, 950], [0, 1], { extrapolateRight: "clamp" });
  const adoptionOpacity = interpolate(frame, [1200, 1250], [0, 1], { extrapolateRight: "clamp" });
  const qualityOpacity = interpolate(frame, [1600, 1650], [0, 1], { extrapolateRight: "clamp" });

  const adoptionSteps = [
    { number: "1", label: "Compatibility Check ✓", delay: 1250 },
    { number: "2", label: "Sandbox Test ✓", delay: 1350 },
    { number: "3", label: "Safe Integration ✓", delay: 1450 },
  ];

  const narrationLines = [
    { text: "Gene Bank stores locally proven genes with high fitness scores.", startFrame: 0, endFrame: 200 },
    { text: "Each gene has been validated through real-world performance.", startFrame: 60, endFrame: 600 },
    { text: "The GSEP Marketplace is like npm for AI behaviors.", startFrame: 600, endFrame: 900 },
    { text: "Seven gene types are available: tool usage, reasoning, communication, error recovery, context management, workflows, and domain expertise.", startFrame: 750, endFrame: 1200 },
    { text: "Commission structure scales with subscription tier, from 20% to zero.", startFrame: 900, endFrame: 1200 },
    { text: "Adoption follows a three-step safety process: compatibility check, sandbox test, and safe integration.", startFrame: 1200, endFrame: 1600 },
    { text: "Quality tiers ensure only proven genes are available, from experimental to certified elite.", startFrame: 1600, endFrame: 1800 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, display: "flex", flexDirection: "column" }}>
        <FadeInText text="Gene Bank + Marketplace" fontSize={56} fontWeight={800} delay={0} duration={60} />

        <div style={{ display: "flex", gap: 60, marginTop: 60, flex: 1 }}>
          {/* Left: Gene Bank */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: THEME.text, marginBottom: 30 }}>Gene Bank (Local)</div>
            {localGenes.map((gene, index) => (
              <GeneCard key={index} {...gene} />
            ))}
          </div>

          {/* Right: Marketplace */}
          {frame >= 600 && (
            <div style={{ opacity: marketplaceOpacity, flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: THEME.text, marginBottom: 30 }}>GSEP Marketplace</div>
              <div style={{ marginBottom: 30, padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: THEME.accent }}>npm for AI behaviors</div>
              </div>

              {frame >= 750 && (
                <div style={{ opacity: geneTypesOpacity, padding: 24, backgroundColor: THEME.bgCard, borderRadius: 8, marginBottom: 30 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: THEME.text, marginBottom: 16 }}>7 Gene Types</div>
                  <div style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 2 }}>
                    <div>• Tool Usage</div>
                    <div>• Reasoning</div>
                    <div>• Communication</div>
                    <div>• Error Recovery</div>
                    <div>• Context Management</div>
                    <div>• Multi-Step Workflow</div>
                    <div>• Domain Expertise</div>
                  </div>
                </div>
              )}

              {frame >= 900 && (
                <div style={{ opacity: commissionOpacity, padding: 24, backgroundColor: THEME.bgCard, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: THEME.text, marginBottom: 16 }}>Commission Structure</div>
                  <div style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 2 }}>
                    <div>Community: 20%</div>
                    <div>Pro: 10%</div>
                    <div>Team: 5%</div>
                    <div>Enterprise: <span style={{ color: THEME.green, fontWeight: 700 }}>0%</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {frame >= 1200 && (
          <div style={{ opacity: adoptionOpacity, marginTop: 40 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: THEME.text, marginBottom: 30, textAlign: "center" }}>Adoption Flow</div>
            <div style={{ display: "flex", gap: 20 }}>
              {adoptionSteps.map((step, index) => (
                <AdoptionStep key={index} {...step} />
              ))}
            </div>
          </div>
        )}

        {frame >= 1600 && (
          <div style={{ opacity: qualityOpacity, marginTop: 40 }}>
            <div style={{ padding: 30, backgroundColor: THEME.bgCard, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 16 }}>Quality Tiers</div>
              <div style={{ fontSize: 18, color: THEME.textMuted, lineHeight: 2 }}>
                <span style={{ color: THEME.green, fontWeight: 700 }}>Certified Elite (≥0.90)</span> ·
                <span style={{ color: THEME.accent, fontWeight: 600 }}> Verified (≥0.80)</span> ·
                <span style={{ color: THEME.cyan, fontWeight: 600 }}> Community (≥0.70)</span> ·
                <span style={{ color: THEME.amber, fontWeight: 600 }}> Experimental (≥0.60)</span>
              </div>
            </div>
          </div>
        )}

        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S10_GeneBank;
