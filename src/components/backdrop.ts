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
   * Each glass sets its own white from what's behind it: the least that keeps a label in
   * `ink` readable (4.5:1) over the darkest part of its backdrop, between min and max. `tint`
   * is then what it shows before its picture is in. Null keeps one white for all.
   */
  adapt: { ink: string; min: number; max: number } | null;
}
export const NO_TUNE: GlassTune = { bend: 1, bezel: null, split: 1, tint: null, lift: null, rimShade: null, adapt: null };
/**
 * Refraction on the scan pages, times the system's: a little less, since the glass there bends
 * a photo of a printed page and the bent text competes with the pills' and card's own text.
 * Shared by the pills and the result card so they stay one material.
 */
export const SCAN_BEND = 0.35;
/** Colour split (splay) on the scan pages, times the system's. Shared the same way. */
export const SCAN_SPLIT = 0.12;
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
