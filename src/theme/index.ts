/**
 * Smart Desk Display — design tokens.
 *
 * Palette sampled from the reference dashboard artwork so the React Native
 * implementation keeps the original visual identity (AMOLED navy, electric
 * blue borders, cyan highlights, yellow accents).
 */

export const colors = {
  // Surfaces
  background: '#000714',
  backgroundDeep: '#00030D',
  card: '#02101F',
  cardElevated: '#041B31',
  cardGlow: '#0A2B4A',

  // Lines
  border: 'rgba(0, 110, 210, 0.55)',
  borderStrong: '#0A64B0',
  borderSoft: 'rgba(0, 110, 210, 0.28)',
  divider: 'rgba(120, 190, 240, 0.22)',

  // Accents
  cyan: '#38E1FF',
  cyanBright: '#6BEAFF',
  cyanDim: '#1499C9',
  blue: '#0A84FF',
  blueDeep: '#0047A0',
  yellow: '#FDDC2C',
  yellowDim: '#C2A412',
  green: '#2BFF5E',
  red: '#FF5A6E',
  orange: '#FFA23A',

  // Weather card (light cyan like the reference)
  weatherBg: '#7FD6FB',
  weatherBgAlt: '#B6E9FD',
  weatherInk: '#03253B',

  // Text
  text: '#EAF8FF',
  textMuted: '#8FB6D4',
  textDim: '#5C86A6',
  textInk: '#04243D',

  // States
  transparent: 'transparent',
  overlay: 'rgba(0, 8, 22, 0.86)',
} as const;

export const radii = {
  card: 14,
  cardLarge: 20,
  inner: 10,
  pill: 999,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

export const layout = {
  /** Width (dp) at which the dashboard switches to the reference two-column grid. */
  wideBreakpoint: 720,
  maxContentWidth: 1440,
  cardGap: 14,
} as const;

export const fonts = {
  digital: 'DSEG7',
  mono: 'monospace',
} as const;

/** Neon glow shadows are expensive; keep them in one place and reused. */
export const glow = {
  cyan: {
    shadowColor: colors.cyan,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  blue: {
    shadowColor: colors.blue,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
} as const;
