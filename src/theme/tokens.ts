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
  raise: '#F2F4F6',
  raise2: '#E5E8EC',
  line: '#D7DBE0',
  ink: '#000000',
  sub: '#5C6168',
  /** Non-text only (icons, dividers, inactive bars). */
  faint: '#767B82',
  signal: '#D4F54C',
  signalInk: '#000000',
  onSignal: '#000000',
  /** Bar segment for time inside free time. */
  free: '#B9C2C8',
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
  free: '#4A545B',
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
  dashed: '#8A9097',
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
  islandOff: '#3A3A3A',
  lockTop: '#9AA8BF',
  lockBottom: '#4C5568',
  knobShadow: 'rgba(0,0,0,0.25)',
} as const;

export const radius = {
  card: 28,
  control: 16,
  chip: 14,
  option: 20,
  sheet: 24,
} as const;

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
