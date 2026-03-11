import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from "remotion";
import { THEME, FONTS } from "../styles/theme";
import { FadeInText, Typewriter, SpringText, Narration } from "../components";
import { CodeBlock } from "../components/CodeBlock";
import { Background } from "../components/Background";

const narrationLines = [
  { text: "GSEP works everywhere your agent lives.", startFrame: 0, endFrame: 120 },
  { text: "Express API? One line replacement.", startFrame: 120, endFrame: 300 },
  { text: "Pass the user message and ID. Evolution happens automatically.", startFrame: 300, endFrame: 550 },
  { text: "Discord bot? Same pattern.", startFrame: 550, endFrame: 700 },
  { text: "Intercept the message, call genome chat, reply.", startFrame: 700, endFrame: 950 },
  { text: "LangChain? Replace your LLM call inside any chain.", startFrame: 950, endFrame: 1200 },
  { text: "GSEP is middleware. It sits between your agent and the LLM.", startFrame: 1200, endFrame: 1500 },
  { text: "Zero refactoring. Maximum evolution.", startFrame: 1500, endFrame: 1800 },
];

export default function S14_Examples() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  const expressOpacity = interpolate(frame, [60, 120], [0, 1], { extrapolateRight: "clamp" });
  const discordOpacity = interpolate(frame, [500, 560], [0, 1], { extrapolateRight: "clamp" });
  const langchainOpacity = interpolate(frame, [900, 960], [0, 1], { extrapolateRight: "clamp" });

  const diagramOpacity = interpolate(frame, [1300, 1360], [0, 1], { extrapolateRight: "clamp" });
  const diagramScale = spring({
    frame: frame - 1300,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <Background>
      <Narration lines={narrationLines} />
      <AbsoluteFill style={{ padding: 80, justifyContent: "flex-start" }}>
        <div style={{ opacity: titleOpacity }}>
          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: 64,
            color: THEME.white,
            fontWeight: 700,
            marginBottom: 60,
          }}>
            Works Everywhere
          </h1>
        </div>

        {frame >= 60 && (
          <div style={{ opacity: expressOpacity, marginBottom: 40 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 28,
              color: THEME.accent,
              fontWeight: 600,
              marginBottom: 15,
            }}>
              Express API
            </h2>
            <CodeBlock
              code={`app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  const response = await genome.chat(message, {
    userId, taskType: 'support',
  });
  res.json({ reply: response });
});`}
              delay={10}
              lineDelay={8}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 500 && (
          <div style={{ opacity: discordOpacity, marginBottom: 40 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 28,
              color: THEME.green,
              fontWeight: 600,
              marginBottom: 15,
            }}>
              Discord Bot
            </h2>
            <CodeBlock
              code={`bot.on('message', async (msg) => {
  const response = await genome.chat(msg.content, {
    userId: msg.author.id, taskType: 'general',
  });
  msg.reply(response);
});`}
              delay={10}
              lineDelay={8}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 900 && (
          <div style={{ opacity: langchainOpacity, marginBottom: 40 }}>
            <h2 style={{
              fontFamily: FONTS.heading,
              fontSize: 28,
              color: THEME.purple,
              fontWeight: 600,
              marginBottom: 15,
            }}>
              LangChain
            </h2>
            <CodeBlock
              code={`// Replace your LLM call inside any chain
const response = await genome.chat(question, {
  userId, taskType: 'reasoning',
});`}
              delay={10}
              lineDelay={8}
              fontSize={18}
            />
          </div>
        )}

        {frame >= 1300 && (
          <div style={{
            opacity: diagramOpacity,
            transform: `scale(${diagramScale})`,
            textAlign: "center",
            marginTop: 40,
          }}>
            <h1 style={{
              fontFamily: FONTS.heading,
              fontSize: 40,
              color: THEME.white,
              fontWeight: 700,
              marginBottom: 30,
            }}>
              GSEP is middleware. It intercepts between your agent and the LLM.
            </h1>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
              marginTop: 40,
            }}>
              <div style={{
                padding: "20px 40px",
                backgroundColor: THEME.bgCard,
                borderRadius: 8,
                border: `2px solid ${THEME.accent}`,
                fontSize: 28,
                color: THEME.white,
                fontFamily: FONTS.heading,
                fontWeight: 600,
              }}>
                Agent
              </div>
              <div style={{ fontSize: 40, color: THEME.textMuted }}>→</div>
              <div style={{
                padding: "20px 40px",
                backgroundColor: THEME.bgCard,
                borderRadius: 8,
                border: `2px solid ${THEME.green}`,
                fontSize: 28,
                color: THEME.green,
                fontFamily: FONTS.heading,
                fontWeight: 600,
              }}>
                GSEP
              </div>
              <div style={{ fontSize: 40, color: THEME.textMuted }}>→</div>
              <div style={{
                padding: "20px 40px",
                backgroundColor: THEME.bgCard,
                borderRadius: 8,
                border: `2px solid ${THEME.purple}`,
                fontSize: 28,
                color: THEME.white,
                fontFamily: FONTS.heading,
                fontWeight: 600,
              }}>
                LLM
              </div>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </Background>
  );
}
