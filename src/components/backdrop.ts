import { createContext, type RefObject } from 'react';

/**
 * What glass on a screen bends when it isn't over a scrolling page: the photo behind the
 * scanner. Liquid glass (the pills and the result sheet) takes its picture from this element.
 */
export const BackdropCtx = createContext<RefObject<HTMLElement | null> | null>(null);

/**
 * A screen's own tuning of the liquid glass, on top of the system's (glassLook.ts). The default
 * changes nothing; the scanner asks for more (see Scanner.tsx).
 */
export interface GlassTune {
  /** Times the system's refraction. */
  bend: number;
  /** The bending rim, as a share of the glass's height (the system's is BEZEL). Null keeps it. */
  bezel: number | null;
  /** Times the system's colour split. */
  split: number;
  /** The white, 0 to 1. Null keeps the system's. */
  tint: number | null;
  /** The lift under the glass (a CSS shadow). Null keeps the system's. */
  lift: string | null;
  /** The shade on the lower inner rim, 0 to 1. Null keeps the system's. */
  rimShade: number | null;
  /**
   * Each glass sets its own tint from what's behind it, the way Liquid Glass does: light over
   * a light backdrop, dark over a dark one, each glass on its own. Per appearance: its label
   * ink, and the least and most tint. The glass takes whichever appearance keeps its label at
   * 4.5:1 with the least tint (the clearest glass), switching only when the other is clearly
   * clearer, so it doesn't flicker. With only one appearance given, it keeps that one. `tint`
   * is what it shows before it has measured.
   */
  adapt: { light?: GlassLook; dark?: GlassLook } | null;
  /** The frost (blur of what's behind), in points. Null keeps the system's. */
  frost: number | null;
}
export interface GlassLook {
  ink: string;
  min: number;
  max: number;
}
export const NO_TUNE: GlassTune = { bend: 1, bezel: null, split: 1, tint: null, lift: null, rimShade: null, adapt: null, frost: null };
/**
 * The scan pages' glass, against the system's: all the same. They were turned down (bend 0.85,
 * splay 0.6, frost 0.5pt, depth 0.8) while the scanner's glass was bending a wrong picture of
 * the scene; with that fixed, the cuts only made this glass look unlike the rest of the app.
 * Kept as dials, shared by the pills and the result card so they stay one material.
 */
export const SCAN_BEND = 1;
export const SCAN_SPLIT = 1;
export const SCAN_FROST = 1;
export const SCAN_DEPTH = 1;
/**
 * Sent on document when what's behind the glass has moved and come to rest (the scanner's hand
 * settling, the scene dropping for the card): glass over a backdrop takes a new picture of it,
 * so it bends what's there now, not where things were mid-motion.
 */
export const REPICTURE_EVENT = 'docket:glass-repicture';
export const repicture = () => {
  if (typeof document !== 'undefined') document.dispatchEvent(new Event(REPICTURE_EVENT));
};
/**
 * How far the scene behind the glass has moved from rest right now (the scanner's hand, the
 * drop for the card), in points. Glass pictures the scene once, at rest, and slides that
 * picture by this each frame, so it moves with the scene instead of freezing or re-picturing.
 */
export const sceneShift = { x: 0, y: 0 };
export const GlassTuneCtx = createContext<GlassTune>(NO_TUNE);

/**
 * For glass that rises into place: the glass says when it can draw (its picture is taken), so
 * the rise starts then and the glass is there the whole way up, not popping in at the end.
 */
export const RiseCtx = createContext<(() => void) | null>(null);

/**
 * Which appearance the glass around a label has taken, and so the label's colour. Labels in
 * adapting glass read it (GlassInk) and flip with it.
 */
export const GlassInkCtx = createContext<{ look: 'light' | 'dark'; ink: string } | null>(null);
