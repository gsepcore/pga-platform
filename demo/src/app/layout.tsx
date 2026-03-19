import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GSEP Demo — Genomic Self-Evolving Prompts",
  description:
    "Watch how GSEP transforms static AI agents into living, learning systems. 5-chromosome architecture, 6D fitness, drift detection, and 10 cognitive layers.",
  keywords: [
    "GSEP",
    "AI agent",
    "self-evolving prompts",
    "genomic prompts",
    "LLM evolution",
    "prompt engineering",
  ],
  authors: [{ name: "Luis Alfredo Velasquez Duran" }],
  openGraph: {
    title: "GSEP Demo — Your Agent, But Alive",
    description:
      "Drop-in upgrade that makes any AI agent evolve its own intelligence. No retraining. No fine-tuning. Just 3 lines of code.",
    url: "https://demo.gsepcore.com",
    siteName: "GSEP — Genomic Self-Evolving Prompts",
    type: "video.other",
    images: [
      {
        url: "https://demo.gsepcore.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "GSEP — Your Agent, But Alive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GSEP Demo — Your Agent, But Alive",
    description:
      "Drop-in upgrade that makes any AI agent evolve. Watch the full demo.",
    images: ["https://demo.gsepcore.com/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
