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
// Scene 8 (Short): C3 Content Firewall
// Duration: 22 s = 660 frames @ 30 fps
// ----------------------------------------------------------------

interface CompactThreatCardProps {
  title: string;
  patterns: number;
  delay: number;
}

const CompactThreatCard: React.FC<CompactThreatCardProps> = ({
  title,
  patterns,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const springVal = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  const translateX = interpolate(springVal, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: THEME.bgCard,
          borderRadius: 8,
          borderLeft: `4px solid ${THEME.red}`,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: THEME.text,
            fontFamily: FONTS.body,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.red,
            fontFamily: FONTS.mono,
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {patterns} patterns
        </span>
      </div>
    </div>
  );
};

interface CompactDefenseProps {
  number: string;
  title: string;
  delay: number;
}

const CompactDefense: React.FC<CompactDefenseProps> = ({
  number,
  title,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [delay, delay + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scaleSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 110 },
  });

  const scale = interpolate(scaleSpring, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: THEME.bgCard,
        borderRadius: 10,
        border: `2px solid ${THEME.accent}`,
        marginRight: 16,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: THEME.accent,
          marginRight: 12,
          fontFamily: FONTS.heading,
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: THEME.text,
          fontFamily: FONTS.body,
        }}
      >
        {title}
      </div>
    </div>
  );
};

const threats = [
  { title: "Prompt Injection", patterns: 12, delay: 40 },
  { title: "Role Hijacking", patterns: 8, delay: 85 },
  { title: "Data Exfiltration", patterns: 7, delay: 130 },
  { title: "Encoding Evasion", patterns: 8, delay: 175 },
  { title: "Privilege Escalation", patterns: 6, delay: 220 },
  { title: "Instruction Override", patterns: 7, delay: 265 },
  { title: "Content Smuggling", patterns: 5, delay: 310 },
];

const defenses = [
  { number: "1", title: "Content Tagging", delay: 380 },
  { number: "2", title: "Pattern Detection", delay: 420 },
  { number: "3", title: "Trust Registry", delay: 460 },
];

const narrationLines = [
  {
    text: "The C3 content firewall defends against seven attack categories.",
    startFrame: 0,
    endFrame: 180,
  },
  {
    text: "Prompt injection, role hijacking, data exfiltration, and more.",
    startFrame: 180,
    endFrame: 380,
  },
  {
    text: "Three defense mechanisms: content tagging, pattern detection, trust registry.",
    startFrame: 380,
    endFrame: 520,
  },
  {
    text: "Five languages supported. Zero external dependencies.",
    startFrame: 520,
    endFrame: 660,
  },
];

const S08_Firewall_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Multi-language text at 520f
  const langOpacity = interpolate(frame, [520, 555], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const langSpring = spring({
    frame: frame - 520,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const langTranslateY = interpolate(langSpring, [0, 1], [20, 0]);

  // Zero deps text at 590f
  const zeroDepsOpacity = interpolate(frame, [590, 625], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zeroDepsSpring = spring({
    frame: frame - 590,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const zeroDepsScale = interpolate(zeroDepsSpring, [0, 1], [0.9, 1]);

  // Total pattern count badge
  const totalPatterns = threats.reduce((sum, t) => sum + t.patterns, 0);
  const totalBadgeOpacity = interpolate(frame, [340, 370], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: "55px 70px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 30,
          }}
        >
          <FadeInText
            text="C3: Content Firewall"
            fontSize={50}
            fontWeight={800}
            delay={0}
            duration={40}
          />
          <div
            style={{
              fontSize: 50,
              marginLeft: 16,
              opacity: interpolate(frame, [20, 40], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {"\u{1F6E1}\uFE0F"}
          </div>
        </div>

        {/* Threat cards - compact list */}
        <div style={{ marginBottom: 20 }}>
          {threats.map((threat, i) => (
            <CompactThreatCard key={i} {...threat} />
          ))}

          {/* Total patterns badge */}
          {frame >= 340 && (
            <div
              style={{
                opacity: totalBadgeOpacity,
                textAlign: "right",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: THEME.red,
                  fontFamily: FONTS.mono,
                  padding: "6px 14px",
                  backgroundColor: `${THEME.red}15`,
                  borderRadius: 8,
                  border: `1px solid ${THEME.red}30`,
                }}
              >
                {totalPatterns} total detection patterns
              </span>
            </div>
          )}
        </div>

        {/* Defense mechanisms row */}
        {frame >= 380 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: THEME.text,
                fontFamily: FONTS.heading,
                marginBottom: 14,
                opacity: interpolate(frame, [380, 400], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Defense Mechanisms
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {defenses.map((defense, i) => (
                <CompactDefense key={i} {...defense} />
              ))}
            </div>
          </div>
        )}

        {/* Multi-language support */}
        {frame >= 520 && (
          <div
            style={{
              opacity: langOpacity,
              transform: `translateY(${langTranslateY}px)`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                padding: "14px 24px",
                backgroundColor: THEME.bgCard,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: THEME.text,
                  fontFamily: FONTS.body,
                }}
              >
                Multi-Language:{" "}
              </span>
              <span
                style={{
                  fontSize: 18,
                  color: THEME.textMuted,
                  fontFamily: FONTS.body,
                }}
              >
                English{" \u00B7 "}Spanish{" \u00B7 "}German{" \u00B7 "}French
                {" \u00B7 "}Chinese
              </span>
            </div>
          </div>
        )}

        {/* Zero Dependencies */}
        {frame >= 590 && (
          <div
            style={{
              opacity: zeroDepsOpacity,
              transform: `scale(${zeroDepsScale})`,
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: THEME.bgCard,
                borderRadius: 12,
                textAlign: "center",
                border: `2px solid ${THEME.green}`,
                boxShadow: `0 0 20px ${THEME.green}25`,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: THEME.green,
                  fontFamily: FONTS.heading,
                }}
              >
                Zero Dependencies {"\u2014"} Maximum Security
              </div>
            </div>
          </div>
        )}

        {/* Narration subtitles */}
        <Narration lines={narrationLines} />
      </AbsoluteFill>
    </Background>
  );
};

export default S08_Firewall_Short;
