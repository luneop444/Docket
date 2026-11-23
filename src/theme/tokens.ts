/**
 * Docket design tokens — mirrored from the Figma "Docket" local variables and
 * text styles (Design System section, node 140:2), light mode.
 *
 * This is the ONLY file allowed to contain raw color values. Everything else
 * imports from here.
 */
import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

export const color = {
  bg: '#FFFFFF',
  /**
   * Figma color/canvas: the flat grey behind every screen, so glass cards lift off it.
   * Half the old cool tint (#E9ECF0, then neutral #E8E8E8): a hint of cool keeps the
   * lime reading warm beside it.
   */
  canvas: '#E8EAEC',
  /** Figma color/glass: white at 62%, the surface of every card and the tab bar. */
  glass: 'rgba(255,255,255,0.62)',
  /** The same half cool tint as the canvas, at their own lightness (were #F2F4F6, #E5E8EC). */
  raise: '#F3F4F5',
  raise2: '#E7E8EA',
  /**
   * Ink: one soft near-black, #1C1C1C (the reference's), instead of pure black. Every grey
   * below is this ink faded, so they share its hue on any surface (canvas, glass, lime),
   * each at the opacity that keeps its old weight on white (was its own blue-grey hex).
   * Contrast on the darkest surface it sits on, canvas, in each note (#E8EAEC).
   */
  ink: '#1C1C1C',
  /** Dividers: 16% (was #D7DBE0, 1.39:1 on white; 1.38:1 now on every surface). */
  line: 'rgba(28,28,28,0.16)',
  /** Secondary text: 70% (was #5C6168). 6.29:1 on white, 5.74:1 on canvas, 5.72:1 on lime. */
  sub: 'rgba(28,28,28,0.70)',
  /**
   * Non-text only (icons, dividers, inactive bars): 58% (was #767B82). 4.23:1 on white,
   * 3.94:1 on canvas, below the 4.5:1 text minimum, so never text or placeholders: `sub`.
   */
  faint: 'rgba(28,28,28,0.58)',
  signal: '#D4F54C',
  signalInk: '#1C1C1C',
  onSignal: '#1C1C1C',
  /**
   * Inactive onboarding progress segment, radio and choice rings, switch off: 53% (was
   * #82888F). Passes WCAG 1.4.11 (3:1) everywhere: 3.42:1 on canvas, 3.54:1 on glass.
   */
  track: 'rgba(28,28,28,0.53)',
  /**
   * Bar segment for time inside free time: 51% (was #858C93). 3.24:1 on canvas, 3.32:1 on
   * raise, 3.41:1 on white (WCAG 1.4.11).
   */
  free: 'rgba(28,28,28,0.51)',
  /** Bar segment for paid detention time. */
  detention: '#1C1C1C',
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

/**
 * Corner radii for boxes: cards, sheets, fields, options. Buttons aren't here: every button is
 * a capsule (radius half its height), the shape iOS 26 gives its controls.
 */
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
/**
 * Depth: the lift and a faint shade on the lower inner rim under the bright top one. Deepened on
 * 20 Nov (0 10 28 at 11%, shade 6%), then eased back halfway on 21 Nov.
 */
export const glassLift = '0 8px 24px rgba(0,0,0,0.095)';
export const glassRim = 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,0.45)';
export const glass = {
  backgroundColor: color.glass,
  boxShadow: `${glassEdge}, ${glassLift}, ${glassRim}`,
} as const;
/**
 * Dense glass: the same glass (edge, lift, rims, the bar's 1px frost) with only the tint raised,
 * for glass over a photo or anything dark and busy. Not frosted: frost isn't in the system. 62% white over the blurred cab photo gives red text about
 * 2.7:1; 82% brings it to about 4.6:1 and the grey text to about 6:1. Figma: effect style
 * "Glass / Dense", variable color/glass-dense.
 */
export const glassDense = {
  backgroundColor: 'rgba(255,255,255,0.82)',
  boxShadow: `${glassEdge}, ${glassLift}, ${glassRim}`,
  ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)' } as object) : null),
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
