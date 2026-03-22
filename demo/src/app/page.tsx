"use client";

import "./globals.css";
import { useState } from "react";

// ── Scene chapters with timestamps ──────────────────────────────────────────
const chapters = [
  { id: "S01", time: "0:00", seconds: 0, title: "Hook", desc: "What if your AI agent could evolve?" },
  { id: "S02", time: "0:25", seconds: 25, title: "Core Pitch", desc: "Drop-in upgrade for any agent" },
  { id: "S03", time: "0:55", seconds: 55, title: "The Problem", desc: "4 critical pain points" },
  { id: "S04", time: "1:20", seconds: 80, title: "5 Chromosomes", desc: "C0-C4 layered architecture" },
  { id: "S05", time: "2:20", seconds: 140, title: "Evolution Cycle", desc: "Transcription → Selection" },
  { id: "S06", time: "3:35", seconds: 215, title: "6D Fitness", desc: "Multi-objective optimization" },
  { id: "S07", time: "4:25", seconds: 265, title: "Drift Detection", desc: "Proactive auto-healing" },
  { id: "S08", time: "5:20", seconds: 320, title: "Living Agent", desc: "10 cognitive layers" },
  { id: "S09", time: "6:50", seconds: 410, title: "Content Firewall", desc: "C3: 53 security patterns" },
  { id: "S10", time: "7:35", seconds: 455, title: "Gene Bank", desc: "npm for AI behaviors" },
  { id: "S11", time: "8:35", seconds: 515, title: "Integration", desc: "3 steps, 3 lines of code" },
  { id: "S12", time: "9:20", seconds: 560, title: "Configuration", desc: "Minimal to full Living Agent" },
  { id: "S13", time: "10:10", seconds: 610, title: "Proof of Value", desc: "+16% quality improvement" },
  { id: "S14", time: "11:20", seconds: 680, title: "Examples", desc: "Express, Discord, LangChain" },
  { id: "S15", time: "12:20", seconds: 740, title: "Multi-Model", desc: "5 LLM providers + BYOM" },
  { id: "S16", time: "13:00", seconds: 780, title: "Three Pillars", desc: "Self-Model, Purpose, Autonomy" },
  { id: "S17", time: "14:00", seconds: 840, title: "Benchmarks", desc: "+25% satisfaction, -45% interventions" },
  { id: "S18", time: "14:50", seconds: 890, title: "Licensing", desc: "MIT + BSL + Proprietary" },
  { id: "S19", time: "15:30", seconds: 930, title: "Get Started", desc: "Docs, GitHub, Discord, Install" },
  { id: "S20", time: "16:15", seconds: 975, title: "Closing", desc: "Your agent, but alive" },
];

// ── CTA Links ───────────────────────────────────────────────────────────────
const ctas = [
  {
    label: "Documentation",
    href: "https://gsepcore.com/docs",
    icon: "📖",
    color: "#3b82f6",
  },
  {
    label: "GitHub",
    href: "https://github.com/gsepcore/pga-platform",
    icon: "⭐",
    color: "#8b949e",
  },
  {
    label: "Discord",
    href: "https://discord.gg/7rtUa6aU",
    icon: "💬",
    color: "#5865F2",
  },
  {
    label: "npm install @gsep/core",
    href: "https://www.npmjs.com/package/@gsep/core",
    icon: "⚡",
    color: "#22c55e",
  },
];

const YOUTUBE_VIDEO_ID: string | null = "cTPJqrL2IyE";

// Self-hosted video fallback URL (e.g., Cloudflare R2, Bunny CDN)
// Example: "https://cdn.gsepcore.com/gsep-demo.mp4"
const SELF_HOSTED_VIDEO_URL: string | null = null;

export default function DemoPage() {
  const [activeChapter, setActiveChapter] = useState<string>("S01");
  const [showAllChapters, setShowAllChapters] = useState(false);

  const visibleChapters = showAllChapters ? chapters : chapters.slice(0, 8);

  const handleChapterClick = (chapter: (typeof chapters)[0]) => {
    setActiveChapter(chapter.id);

    // If YouTube: seek via postMessage
    if (YOUTUBE_VIDEO_ID) {
      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [chapter.seconds, true],
          }),
          "*"
        );
      }
    }

    // If self-hosted: seek the video element
    if (SELF_HOSTED_VIDEO_URL) {
      const video = document.querySelector("video") as HTMLVideoElement;
      if (video) {
        video.currentTime = chapter.seconds;
        video.play();
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 0",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://gsepcore.com" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧬</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>
              GSEP
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 14, marginLeft: 4 }}>
              Demo
            </span>
          </a>
          <nav style={{ display: "flex", gap: 24, fontSize: 14 }}>
            <a href="https://gsepcore.com/docs">Docs</a>
            <a href="https://github.com/gsepcore/pga-platform">GitHub</a>
            <a
              href="https://gsepcore.com"
              style={{
                background: "var(--accent)",
                color: "white",
                padding: "8px 16px",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        style={{
          textAlign: "center",
          padding: "48px 24px 32px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 20,
          }}
        >
          <span style={{ color: "var(--green)" }}>●</span>
          v0.8.0 &middot; Patented &middot; MIT Licensed
        </div>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 16,
            background: "linear-gradient(135deg, #e6edf3 0%, #3b82f6 50%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Your Agent, But Alive
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--text-muted)",
            maxWidth: 600,
            margin: "0 auto 8px",
          }}
        >
          See how GSEP transforms static AI agents into self-evolving systems.
          <br />
          16 minutes. 20 scenes. Everything you need to know.
        </p>
      </section>

      {/* ── Video Player ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "56.25%",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "#000",
          }}
        >
          {YOUTUBE_VIDEO_ID ? (
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&rel=0&modestbranding=1&color=white`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="GSEP Demo Video"
            />
          ) : SELF_HOSTED_VIDEO_URL ? (
            <video
              controls
              preload="metadata"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <source src={SELF_HOSTED_VIDEO_URL} type="video/mp4" />
            </video>
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
              }}
            >
              <span style={{ fontSize: 64, opacity: 0.3 }}>🎬</span>
              <p style={{ color: "var(--text-muted)", fontSize: 16, textAlign: "center", padding: "0 20px" }}>
                Video coming soon.
                <br />
                <span style={{ fontSize: 13, opacity: 0.7 }}>
                  Set <code>YOUTUBE_VIDEO_ID</code> or{" "}
                  <code>SELF_HOSTED_VIDEO_URL</code> in page.tsx
                </span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Chapters ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 48px" }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--accent)" }}>▶</span> Chapters
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {visibleChapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => handleChapterClick(ch)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                background:
                  activeChapter === ch.id ? "var(--bg-hover)" : "var(--bg-card)",
                border: `1px solid ${activeChapter === ch.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text)",
                transition: "all 0.15s ease",
                width: "100%",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 12,
                  color: "var(--accent)",
                  background: "rgba(59,130,246,0.1)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {ch.time}
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: 1.3,
                  }}
                >
                  {ch.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {ch.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        {!showAllChapters && (
          <button
            onClick={() => setShowAllChapters(true)}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 14,
              width: "100%",
            }}
          >
            Show all 20 chapters ↓
          </button>
        )}
      </section>

      {/* ── Key Features ────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "0 24px 48px",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--purple)" }}>🧬</span> What You'll Learn
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              icon: "🔒",
              title: "5-Chromosome Architecture",
              desc: "C0 immutable DNA, C1 operative, C2 epigenome, C3 firewall, C4 behavioral immune system",
              color: "var(--purple)",
            },
            {
              icon: "🔄",
              title: "Evolution Cycle",
              desc: "Transcription → Variation → Simulation → Selection",
              color: "var(--accent)",
            },
            {
              icon: "📊",
              title: "6D Fitness System",
              desc: "Quality, success, tokens, latency, cost, interventions",
              color: "var(--cyan)",
            },
            {
              icon: "🛡️",
              title: "Content Firewall",
              desc: "53 patterns, 7 threat categories, zero dependencies",
              color: "var(--emerald)",
            },
            {
              icon: "🧠",
              title: "10 Cognitive Layers",
              desc: "From self-model to strategic autonomy",
              color: "var(--orange)",
            },
            {
              icon: "📈",
              title: "Proven Results",
              desc: "+25% satisfaction, -45% interventions",
              color: "var(--green)",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "20px 18px",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTAs ────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "0 24px 48px",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--green)" }}>⚡</span> Get Started
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {ctas.map((cta) => (
            <a
              key={cta.label}
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                fontWeight: 500,
                fontSize: 14,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = cta.color;
                e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg-card)";
              }}
            >
              <span style={{ fontSize: 22 }}>{cta.icon}</span>
              <span>{cta.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Install Command ─────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "0 24px 64px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "20px 24px",
            fontFamily: "'Fira Code', monospace",
            fontSize: 15,
            color: "var(--green)",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>$</span> npm install @gsep/core
        </div>
        <p
          style={{
            marginTop: 16,
            fontSize: 15,
            color: "var(--text-muted)",
          }}
        >
          Your agent, but alive. It starts now.
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "0 24px",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          <p>
            GSEP — Genomic Self-Evolving Prompts &middot; Patented &middot;{" "}
            <a href="https://gsepcore.com">gsepcore.com</a>
          </p>
          <p style={{ marginTop: 6, opacity: 0.6 }}>
            Created by Luis Alfredo Velasquez Duran &middot; Made in Germany
          </p>
        </div>
      </footer>
    </div>
  );
}
