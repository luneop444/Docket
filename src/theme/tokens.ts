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
