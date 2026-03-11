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
import { CodeBlock } from "../../components/CodeBlock";
import { Badge } from "../../components/Badge";
import { Background } from "../../components/Background";

// ----------------------------------------------------------------
// Scene 9 (Short): Integrate in 3 Steps
// Duration: 28 s = 840 frames @ 30 fps
// ----------------------------------------------------------------

const narrationLines = [
  {
    text: "Integration takes three steps.",
    startFrame: 0,
    endFrame: 80,
  },
  {
    text: "Install the core package and your LLM adapter.",
    startFrame: 80,
    endFrame: 250,
  },
  {
    text: "Initialize PGA with your chosen model.",
    startFrame: 250,
    endFrame: 500,
  },
  {
    text: "Replace your LLM call with genome.chat. One line change.",
    startFrame: 500,
    endFrame: 700,
  },
  {
    text: "Your agent now evolves.",
    startFrame: 700,
    endFrame: 840,
  },
];

const providers = [
  { text: "Claude", color: THEME.purple, delay: 150 },
  { text: "GPT-4", color: THEME.green, delay: 165 },
  { text: "Gemini", color: THEME.accent, delay: 180 },
  { text: "Ollama", color: THEME.orange, delay: 195 },
  { text: "Perplexity", color: THEME.cyan, delay: 210 },
];

const S09_Integration_Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Step transitions ---
  // Step 1: 40-250f (install)
  const step1Opacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const step1Y = interpolate(frame, [40, 70], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Step 2: 250-500f (initialize)
  const step2Opacity = interpolate(frame, [250, 280], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const step2Y = interpolate(frame, [250, 280], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Step 3: 500-700f (replace)
  const step3Opacity = interpolate(frame, [500, 530], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const step3Y = interpolate(frame, [500, 530], [25, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final text: 700-840f
  const finalOpacity = interpolate(frame, [700, 740], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalSpring = spring({
    frame: frame - 700,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const finalScale = interpolate(finalSpring, [0, 1], [0.7, 1]);

  // Fade out steps 1-3 to make room for final text
  const stepsOpacity = interpolate(frame, [680, 710], [1, 0], {
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
        {/* Title */}
        <FadeInText
          text="Integrate in 3 Steps"
          fontSize={52}
          fontWeight={800}
          delay={0}
          duration={40}
        />

        {/* Steps container */}
        {frame < 720 && (
          <div
            style={{
              opacity: stepsOpacity,
              marginTop: 40,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Step 1: Install */}
            {frame >= 40 && (
              <div
                style={{
                  opacity: step1Opacity,
                  transform: `translateY(${step1Y}px)`,
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: THEME.accent,
                    fontFamily: FONTS.heading,
                    marginBottom: 12,
                  }}
                >
                  Step 1: Install
                </div>
                <CodeBlock
                  code="npm install @pga-ai/core @pga-ai/adapters-llm-anthropic"
                  delay={50}
                  fontSize={18}
                />
                {/* Provider badges */}
                {frame >= 150 && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {providers.map((p, i) => (
                      <Badge
                        key={i}
                        text={p.text}
                        delay={p.delay}
                        color={p.color}
                        fontSize={13}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Initialize */}
            {frame >= 250 && (
              <div
                style={{
                  opacity: step2Opacity,
                  transform: `translateY(${step2Y}px)`,
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: THEME.green,
                    fontFamily: FONTS.heading,
                    marginBottom: 12,
                  }}
                >
                  Step 2: Initialize
                </div>
                <CodeBlock
                  code={`import { PGA } from '@pga-ai/core';
import { ClaudeAdapter } from '@pga-ai/adapters-llm-anthropic';

const pga = new PGA({
  llm: new ClaudeAdapter({ apiKey: process.env.API_KEY }),
});
const genome = await pga.createGenome({ name: 'my-agent' });`}
                  delay={260}
                  fontSize={16}
                  lineDelay={4}
                />
              </div>
            )}

            {/* Step 3: Replace */}
            {frame >= 500 && (
              <div
                style={{
                  opacity: step3Opacity,
                  transform: `translateY(${step3Y}px)`,
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: THEME.purple,
                    fontFamily: FONTS.heading,
                    marginBottom: 12,
                  }}
                >
                  Step 3: Replace
                </div>
                <CodeBlock
                  code={`// BEFORE:
const response = await llm.chat(userMessage);

// AFTER (one line change):
const response = await genome.chat(userMessage, { userId });`}
                  delay={510}
                  fontSize={17}
                  lineDelay={5}
                />
              </div>
            )}
          </div>
        )}

        {/* Final call-to-action text */}
        {frame >= 700 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                opacity: finalOpacity,
                transform: `scale(${finalScale})`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: THEME.white,
                  fontFamily: FONTS.heading,
                  lineHeight: 1.3,
                }}
              >
                That's it.
              </div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: THEME.accent,
                  fontFamily: FONTS.heading,
                  marginTop: 16,
                  lineHeight: 1.3,
                }}
              >
                Your agent now evolves.
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

export default S09_Integration_Short;
