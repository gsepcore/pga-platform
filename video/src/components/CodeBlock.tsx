import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { FONTS, THEME } from "../styles/theme";

interface CodeBlockProps {
  code: string;
  delay?: number;
  lineDelay?: number; // frames between each line appearing
  fontSize?: number;
  style?: React.CSSProperties;
}

// Simple syntax highlighting
function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  const rules: [RegExp, string][] = [
    [/^(\/\/.*)/, THEME.textMuted],                          // comments
    [/^(import|from|export|const|let|var|async|await|function|return|new|if|else|for|type|interface)\b/, '#c678dd'], // keywords
    [/^('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/, THEME.green], // strings
    [/^(\d+\.?\d*)/, THEME.orange],                           // numbers
    [/^(true|false|null|undefined|void)/, THEME.orange],      // literals
    [/^(\{|\}|\(|\)|\[|\]|;|,|=>|:|\.|=|\?)/, THEME.textMuted], // punctuation
    [/^([A-Z]\w*)/, THEME.cyan],                              // class names
    [/^(\w+)(?=\()/, THEME.accent],                           // function calls
  ];

  while (remaining.length > 0) {
    // Leading whitespace
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push(<span key={key++}>{wsMatch[1]}</span>);
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }

    let matched = false;
    for (const [regex, color] of rules) {
      const m = remaining.match(regex);
      if (m) {
        tokens.push(
          <span key={key++} style={{ color }}>
            {m[1]}
          </span>
        );
        remaining = remaining.slice(m[1].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push(
        <span key={key++} style={{ color: THEME.text }}>
          {remaining[0]}
        </span>
      );
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  delay = 0,
  lineDelay = 3,
  fontSize = 16,
  style,
}) => {
  const frame = useCurrentFrame();
  const lines = code.split("\n");

  const containerOpacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: containerOpacity,
        background: THEME.bgCode,
        borderRadius: 12,
        padding: "24px 28px",
        border: `1px solid rgba(59, 130, 246, 0.2)`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {/* Window dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
      </div>

      <pre
        style={{
          margin: 0,
          fontFamily: FONTS.mono,
          fontSize,
          lineHeight: 1.7,
          overflow: "hidden",
        }}
      >
        {lines.map((line, i) => {
          const lineFrame = delay + i * lineDelay;
          const lineOpacity = interpolate(
            frame - lineFrame,
            [0, 8],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                opacity: lineOpacity,
                transform: `translateX(${interpolate(
                  frame - lineFrame,
                  [0, 8],
                  [-10, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )}px)`,
              }}
            >
              <span style={{ color: THEME.textMuted, marginRight: 16, userSelect: "none", fontSize: fontSize - 2 }}>
                {String(i + 1).padStart(2, " ")}
              </span>
              {highlightLine(line)}
            </div>
          );
        })}
      </pre>
    </div>
  );
};
