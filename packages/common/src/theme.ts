export const palette = {
  security: {
    background: '#050b18',
    backdrop: '#0b1527',
    accent: '#2eb7ff',
    accentSecondary: '#89c9ff',
    textPrimary: '#f1f6ff',
    textSecondary: '#a6bed6',
    faint: '#132543',
  },
  ai: {
    background: '#070319',
    backdrop: '#110b2e',
    accent: '#8c5cff',
    accentSecondary: '#5ec8ff',
    textPrimary: '#f5f2ff',
    textSecondary: '#b8b3e6',
    faint: '#1f1a3f',
  },
  wellness: {
    background: '#fff8f1',
    backdrop: '#ffe6d6',
    accent: '#ff7a7a',
    accentSecondary: '#ffb347',
    textPrimary: '#3d1f35',
    textSecondary: '#7a4f62',
    faint: '#f5cdc2',
  },
  finance: {
    background: '#041611',
    backdrop: '#0b2a1f',
    accent: '#32d296',
    accentSecondary: '#18a980',
    textPrimary: '#e4fbf1',
    textSecondary: '#8ad1b3',
    faint: '#134736',
  },
  education: {
    background: '#101225',
    backdrop: '#1a2140',
    accent: '#4d8dff',
    accentSecondary: '#7fb2ff',
    textPrimary: '#f2f5ff',
    textSecondary: '#a6b2d8',
    faint: '#262f52',
  },
} as const;

export const gradients = {
  security: ['#021123', '#05254b', '#0b3866'],
  ai: ['#080424', '#201458', '#362a83'],
  wellness: ['#fff4ea', '#ffd7c2', '#ff9f7a'],
  finance: ['#03120d', '#0e3728', '#1f5f44'],
  education: ['#0c1020', '#1b2a4a', '#2e4c7d'],
  neutral: ['#0f172a', '#1f2937'],
} as const;

export type PaletteKey = keyof typeof palette;
export type GradientKey = keyof typeof gradients;

