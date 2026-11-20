/**
 * Docket design tokens — mirrored from the Figma "Docket" local variables and
 * text styles (Design System section, node 140:2), light mode.
 *
 * This is the ONLY file allowed to contain raw color values. Everything else
 * imports from here.
 */
import type { TextStyle } from 'react-native';

export const color = {
  bg: '#FFFFFF',
  /** Figma color/canvas: the flat cool grey behind every screen, so glass cards lift off it. */
  canvas: '#E9ECF0',
  /** Figma color/glass: white at 62%, the surface of every card and the tab bar. */
  glass: 'rgba(255,255,255,0.62)',
  raise: '#F2F4F6',
  raise2: '#E5E8EC',
  line: '#D7DBE0',
  ink: '#000000',
  sub: '#5C6168',
  /**
   * Non-text only (icons, dividers, inactive bars). 4.26:1 on white, below the
   * 4.5:1 text minimum, so never use it for text or placeholders: use `sub`.
   */
  faint: '#767B82',
  signal: '#D4F54C',
  signalInk: '#000000',
  onSignal: '#000000',
  /**
   * Inactive onboarding progress segment, radio and choice rings, switch off. Not a Figma
   * variable: the reference uses a very light gray, darkened to pass WCAG 1.4.11 (3:1) on the
   * grey canvas: 3.02:1 on canvas, 3.37:1 on glass, 3.58:1 on white.
   */
  track: '#82888F',
  /**
   * Bar segment for time inside free time. Darkened from the Figma #B9C2C8
   * (1.64:1 on raise) to pass WCAG 1.4.11: 3.09:1 on raise, 3.33:1 on white,
   * 6.17:1 against the black detention segment.
   */
  free: '#858C93',
  /** Bar segment for paid detention time. */
  detention: '#000000',
  flag: '#C9311F',
  flagBg: '#FDECEA',
} as const;

export type ColorToken = keyof typeof color;

/**
 * The same Figma "Docket" variables in Dark mode. Only used on surfaces that
 * mirror the Dynamic Island (the black Live card), so app and island match.
 */
export const colorDark = {
  bg: '#000000',
  ink: '#FFFFFF',
  sub: '#9B9B9F',
  line: '#2B2B2B',
  /** Darkened from #4A545B (2.71:1) to 4.16:1 on black, 4.07:1 against lime. */
  free: '#66707A',
  detention: '#D4F54C',
  signal: '#D4F54C',
  signalInk: '#D4F54C',
} as const;

/**
 * Prototype-only colors. Not Figma variables: they come from the v1 Netlify
 * prototype (device frame, "Faked" tags, simulated iOS chrome).
 */
export const protoColor = {
  /** Page behind the phone on desktop. */
  desk: '#E9ECEF',
  bezel: '#111111',
  bezelEdge: '#333333',
  asideInk: '#3A3F45',
  /** Dashed border around "Prototype controls". */
  dashed: '#7A8087',
  /** Yellow "Faked" / "Sample data" tag. */
  fakeBg: '#F6F9D6',
  fakeInk: '#6B5A00',
  scrim: 'rgba(0,0,0,0.32)',
  toast: '#111111',
  /** "Fix" on the black Undo toast (hard-coded in Figma E1). */
  toastAction: '#BFC4CC',
  shadow: 'rgba(26,31,41,0.06)',
  frameShadow: 'rgba(0,0,0,0.25)',
  moneyGlow: 'rgba(212,245,77,0.55)',
  /** Dynamic Island is always black; these are its secondary text and empty bar. */
  island: '#000000',
  islandSub: '#AAAAAA',
  /** Empty island bar segment. Lightened from #3A3A3A (1.85:1) to 3.66:1 on black. */
  islandOff: '#666666',
  /** Darkened from #9AA8BF (2.41:1 under white text) to 4.5:1. */
  lockTop: '#6B7790',
  lockBottom: '#4C5568',
  knobShadow: 'rgba(0,0,0,0.25)',
} as const;

export const radius = {
  card: 24,
  control: 16,
  chip: 14,
  option: 20,
  sheet: 24,
} as const;

/**
 * Figma effect style "Glass", the one glass for every card and the tab bar: a 0.5 black 10%
 * edge outside, a soft lift (0 6 20 at 8%), a bright top rim (white 90%, 1 down) and a light
 * edge all round (white 45%, 1 spread). Spread onto any surface that was `raise`.
 * Figma's liquid-glass refraction is left out: over the flat canvas there is nothing behind a
 * card for it to bend.
 */
export const glassEdge = '0 0 0 0.5px rgba(0,0,0,0.10)';
export const glassLift = '0 6px 20px rgba(0,0,0,0.08)';
export const glassRim = 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(255,255,255,0.45)';
export const glass = {
  backgroundColor: color.glass,
  boxShadow: `${glassEdge}, ${glassLift}, ${glassRim}`,
} as const;
/** A glass card with its own ring (flagged red, selected black): Figma drops the thin edge and keeps the lift. */
export const glassRing = (c: string, w = 1.5) => ({ boxShadow: `${glassLift}, inset 0 0 0 ${w}px ${c}` });

/** Font family names registered with expo-font in the root layout. */
export const fontFamily = {
  regular: 'GoogleSansFlex-Regular',
  medium: 'GoogleSansFlex-Medium',
  semibold: 'GoogleSansFlex-SemiBold',
} as const;

export const fontAssets = {
  [fontFamily.regular]: require('../../assets/fonts/GoogleSansFlex-Regular.ttf'),
  [fontFamily.medium]: require('../../assets/fonts/GoogleSansFlex-Medium.ttf'),
  [fontFamily.semibold]: require('../../assets/fonts/GoogleSansFlex-SemiBold.ttf'),
};

/**
 * Figma stores line height as a multiplier and letter spacing as a percent of
 * font size. React Native wants both in px, so convert here.
 */
function style(
  family: keyof typeof fontFamily,
  size: number,
  lineHeight: number,
  letterSpacingPct: number,
): TextStyle {
  return {
    fontFamily: fontFamily[family],
    fontSize: size,
    lineHeight: Math.round(size * lineHeight * 100) / 100,
    letterSpacing: Math.round(size * letterSpacingPct) / 100,
  };
}

export const type = {
  displayTimer: style('medium', 84, 0.92, -4.5),
  h1: style('medium', 34, 1.05, -2.5),
  h2: style('medium', 24, 1.12, -1.8),
  numberL: style('medium', 48, 1, -3),
  numberM: style('medium', 32, 1, -3),
  numberS: style('medium', 20, 1.1, -2),
  bodyStrong: style('semibold', 17, 1.3, -0.5),
  body: style('regular', 16, 1.4, 0),
  bodySmall: style('regular', 14, 1.4, 0),
  bodyTiny: style('regular', 13, 1.4, 0),
  labelButton: style('semibold', 17, 1.2, 0),
  labelSmall: style('semibold', 15, 1.2, 0),
  labelTab: style('medium', 12, 1.2, 0),
  labelPill: style('medium', 13, 1.2, 0),
  labelControl: style('medium', 15, 1.2, 0),
} as const;

export type TypeToken = keyof typeof type;

/** iPhone frame the Figma screens are drawn at. */
export const device = { width: 393, height: 852 } as const;
