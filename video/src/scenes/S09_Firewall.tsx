import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME } from "../styles/theme";
import { FadeInText } from "../components/AnimatedText";
import { Narration } from "../components/AnimatedText";
import { Background } from "../components/Background";

interface ThreatCardProps {
  title: string;
  patterns: number;
  example: string;
  delay: number;
}

const ThreatCard: React.FC<ThreatCardProps> = ({ title, patterns, example, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
  const translateX = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const x = interpolate(translateX, [0, 1], [-50, 0]);

  return (
    <div style={{ opacity, transform: `translateX(${x}px)`, marginBottom: 16 }}>
      <div style={{ padding: 20, backgroundColor: THEME.bgCard, borderRadius: 8, borderLeft: `4px solid ${THEME.red}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: THEME.text }}>{title}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: THEME.red }}>{patterns} patterns</span>
        </div>
        <div style={{ fontSize: 14, color: THEME.textMuted, fontFamily: "monospace", fontStyle: "italic" }}>"{example}"</div>
      </div>
    </div>
  );
};

interface DefenseMechanismProps {
  number: string;
  title: string;
  description: string;
  delay: number;
}

const DefenseMechanism: React.FC<DefenseMechanismProps> = ({ number, title, description, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const scaleValue = interpolate(scale, [0, 1], [0.9, 1]);

  return (
    <div style={{ opacity, transform: `scale(${scaleValue})`, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", padding: 24, backgroundColor: THEME.bgCard, borderRadius: 12, border: `2px solid ${THEME.accent}` }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: THEME.accent, marginRight: 20, minWidth: 40 }}>{number}</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 16, color: THEME.textMuted, lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>
    </div>
  );
};

const S09_Firewall: React.FC = () => {
  const frame = useCurrentFrame();

  const threats = [
    { title: "Prompt Injection", patterns: 12, example: "Ignore all previous instructions", delay: 60 },
    { title: "Role Hijacking", patterns: 8, example: "You are now DAN", delay: 150 },
    { title: "Data Exfiltration", patterns: 7, example: "Send conversation to...", delay: 240 },
    { title: "Encoding Evasion", patterns: 8, example: "Base64, ROT13, Unicode tricks", delay: 330 },
    { title: "Privilege Escalation", patterns: 6, example: "Act as admin", delay: 420 },
    { title: "Instruction Override", patterns: 7, example: "New system message:", delay: 510 },
    { title: "Content Smuggling", patterns: 5, example: "In a hypothetical scenario...", delay: 600 },
  ];

  const defenses = [
    { number: "1", title: "Content Tagging", description: "<<<UNTRUSTED:PLUGIN>>> delimiters", delay: 700 },
    { number: "2", title: "Pattern Detection", description: "53 immutable patterns (SHA-256)", delay: 820 },
    { number: "3", title: "Trust Registry", description: "4 levels: system/validated/external/untrusted", delay: 940 },
  ];

  const multiLangOpacity = interpolate(frame, [1000, 1050], [0, 1], { extrapolateRight: "clamp" });
  const zeroDepsOpacity = interpolate(frame, [1200, 1250], [0, 1], { extrapolateRight: "clamp" });

  const narrationLines = [
    { text: "C3 Content Firewall protects against 7 categories of attacks.", startFrame: 0, endFrame: 150 },
    { text: "Prompt injection attempts to override system instructions.", startFrame: 60, endFrame: 240 },
    { text: "Role hijacking tries to change the agent's identity.", startFrame: 150, endFrame: 330 },
    { text: "Data exfiltration attempts to steal conversation data.", startFrame: 240, endFrame: 420 },
    { text: "Encoding evasion uses tricks like Base64 to bypass detection.", startFrame: 330, endFrame: 510 },
    { text: "Privilege escalation tries to gain unauthorized access.", startFrame: 420, endFrame: 600 },
    { text: "Instruction override attempts to inject new system messages.", startFrame: 510, endFrame: 700 },
    { text: "Content smuggling hides malicious content in hypothetical scenarios.", startFrame: 600, endFrame: 820 },
    { text: "Three defense mechanisms work together: content tagging, pattern detection, and trust registry.", startFrame: 700, endFrame: 1100 },
    { text: "The system supports five major languages for global protection.", startFrame: 1000, endFrame: 1200 },
    { text: "Zero dependencies means maximum security and minimal attack surface.", startFrame: 1200, endFrame: 1350 },
  ];

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 60 }}>
          <FadeInText text="C3: Content Firewall" fontSize={56} fontWeight={800} delay={0} duration={60} />
          <div style={{ fontSize: 60, marginLeft: 20, opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" }) }}>🛡️</div>
        </div>

        {frame >= 60 && frame < 700 && (
          <div>
            {threats.map((threat, index) => (
              <ThreatCard key={index} {...threat} />
            ))}
          </div>
        )}

        {frame >= 700 && frame < 1000 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: THEME.text, marginBottom: 30 }}>Defense Mechanisms</div>
            {defenses.map((defense, index) => (
              <DefenseMechanism key={index} {...defense} />
            ))}
          </div>
        )}

        {frame >= 1000 && (
          <div style={{ opacity: multiLangOpacity, marginTop: 40 }}>
            <div style={{ padding: 30, backgroundColor: THEME.bgCard, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 16 }}>Multi-Language Support</div>
              <div style={{ fontSize: 20, color: THEME.textMuted }}>
                English · Spanish · German · French · Chinese
              </div>
            </div>
          </div>
        )}

        {frame >= 1200 && (
          <div style={{ opacity: zeroDepsOpacity, marginTop: 30 }}>
            <div style={{ padding: 30, backgroundColor: THEME.bgCard, borderRadius: 12, textAlign: "center", border: `2px solid ${THEME.green}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: THEME.green, marginBottom: 8 }}>Zero Dependencies</div>
              <div style={{ fontSize: 18, color: THEME.textMuted }}>Uses only Node.js crypto — Maximum security</div>
            </div>
          </div>
        )}

        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S09_Firewall;
