export const THEME = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgCode: '#0f172a',
  text: '#e6edf3',
  textMuted: '#8b949e',
  accent: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  lime: '#84cc16',
  white: '#ffffff',
} as const;

export const FONTS = {
  heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  mono: '"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
} as const;

export const FPS = 30;

// Scene durations in seconds
export const SCENE_DURATIONS = {
  S01_Hook: 25,
  S02_CorePitch: 30,
  S03_Problem: 25,
  S04_Chromosomes: 60,
  S05_EvolutionCycle: 75,
  S06_Fitness: 50,
  S07_DriftDetection: 55,
  S08_LivingAgent: 90,
  S09_Firewall: 45,
  S10_GeneBank: 60,
  S11_Integration: 45,
  S12_Config: 50,
  S13_ProofOfValue: 70,
  S14_Examples: 60,
  S15_MultiModel: 40,
  S16_ThreePillars: 60,
  S17_Benchmarks: 50,
  S18_Licensing: 40,
  S19_GetStarted: 45,
  S20_Closing: 30,
} as const;

// Convert to frames
export const SCENE_FRAMES = Object.fromEntries(
  Object.entries(SCENE_DURATIONS).map(([k, v]) => [k, v * FPS])
) as Record<keyof typeof SCENE_DURATIONS, number>;

export const TOTAL_FRAMES = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) * FPS;
