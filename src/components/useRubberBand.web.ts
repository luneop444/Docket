import { useEffect, type RefObject } from 'react';
import { MOVE_EVENT } from './contentMove';

/**
 * iOS rubber banding for a web scroll area. Scroll past the top or bottom and the content
 * follows with growing resistance, then springs back once you stop.
 *
 * Stretch: UIScrollView's curve, b = (1 − 1 / (x·c/d + 1))·d, c = 0.55, d = the area's height
 * (Grant Paul's reading of UIKit). Spring back: Flutter's iOS bouncing physics (mass 0.5,
 * stiffness 100, damping ratio 1.1), slightly over-damped so it never overshoots the edge.
 *
 * A mouse wheel's click is a push: the content stretches and comes straight back, as when a
 * fling hits the end on iOS. A trackpad stretches with the fingers and springs back after.
 * The stretch moves the content without scrolling it, so it announces itself (MOVE_EVENT)
 * for the glass, rather than faking scroll events that every screen's handlers would run on.
 *
 * Wheel and trackpad only. On touch screens the browser bounces natively (Safari) or shows
 * the platform's own overscroll (Android), so it is left alone there. Areas that can't scroll
 * (content fits, scrolling off) don't stretch, as on iOS.
 */
const C = 0.55;
const MASS = 0.5;
const STIFF = 100;
const DAMP = 1.1 * 2 * Math.sqrt(STIFF * MASS);
/**
 * A trackpad keeps sending events while fingers move and through its drift after they lift;
 * the gesture is over once none comes for this long.
 */
const RELEASE_MS = 80;

const band = (x: number, d: number) => (1 - 1 / ((x * C) / d + 1)) * d;
/** The pull that gives a stretch of b: the curve solved for x. */
const unband = (b: number, d: number) => ((d / C) * b) / (d - b);
/** How much the stretch still gives at a pull of x (the curve's slope): 1 at the edge, less further out. */
const give = (x: number, d: number) => 1 / ((x * C) / d + 1) ** 2;

/** The spring's furthest reach for a push of 1 pt/s from rest, so a push can be sized to a stretch. */
const REACH_PER_SPEED = (() => {
  let x = 0, v = 1, far = 0;
  for (let i = 0; i < 2000; i++) {
    v += ((-STIFF * x - DAMP * v) / MASS) / 240;
    x += v / 240;
    far = Math.max(far, x);
  }
  return far;
})();

/**
 * A mouse wheel clicks (whole notches, 120 in the old wheel units); a trackpad sends a stream
 * of small, uneven moves.
 */
function isMouseWheel(e: WheelEvent) {
  if (e.deltaMode !== 0) return true;
  const w = (e as unknown as { wheelDeltaY?: number }).wheelDeltaY;
  return typeof w === 'number' && w !== 0 && w % 120 === 0;
}

type Scrollable = { getScrollableNode?: () => HTMLElement } | HTMLElement | null;

export function useRubberBand(ref: RefObject<Scrollable>) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
    const r = ref.current as Scrollable;
    const node = (r && 'getScrollableNode' in r && r.getScrollableNode ? r.getScrollableNode() : r) as HTMLElement | null;
    if (!node) return;
    // The browser's own overscroll (Safari's trackpad bounce) would double up with this one.
    node.style.setProperty('overscroll-behavior-y', 'none');

    let shown = 0; // the stretch on screen: < 0 past the top, > 0 past the bottom
    let vel = 0; // pt/s, same sign
    let held = false; // a trackpad gesture is moving it directly
    let pull = 0; // that gesture's pull, before the curve
    let raf = 0;
    let last = 0;
    let idle = 0;

    const d = () => node.clientHeight || 1;
    const content = () => node.firstElementChild as HTMLElement | null;
    const paint = () => {
      const c = content();
      if (c) c.style.transform = shown ? `translateY(${-shown}px)` : '';
      document.dispatchEvent(new Event(MOVE_EVENT));
    };

    // The spring, run while nothing holds the stretch.
    const step = (t: number) => {
      const dt = Math.min(0.032, last ? (t - last) / 1000 : 1 / 60);
      last = t;
      const before = shown;
      // In 240 Hz steps, the rate the pushes are sized at (REACH_PER_SPEED), at any frame rate.
      const n = Math.max(1, Math.round(dt * 240));
      for (let i = 0; i < n; i++) {
        vel += ((-STIFF * shown - DAMP * vel) / MASS) * (dt / n);
        shown += vel * (dt / n);
      }
      // Never through the edge into the content: the stretch only ever ends at 0.
      if (before !== 0 && Math.sign(shown) !== Math.sign(before)) shown = 0;
      if (shown === 0 || (Math.abs(shown) < 0.1 && Math.abs(vel) < 2)) {
        shown = 0;
        vel = 0;
        paint();
        raf = 0;
        return;
      }
      paint();
      raf = requestAnimationFrame(step);
    };
    const run = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom on a trackpad
      const style = getComputedStyle(node);
      const max = node.scrollHeight - node.clientHeight;
      if (style.overflowY === 'hidden' || style.overflowY === 'visible' || max <= 0.5) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * d() : e.deltaY;
      if (!dy) return;
      const top = node.scrollTop;
      const stretched = shown !== 0;
      const pastTop = dy < 0 && top <= 0;
      const pastBottom = dy > 0 && top >= max - 0.5;
      if (!stretched && !pastTop && !pastBottom) return;
      e.preventDefault();
      const h = d();

      if (isMouseWheel(e)) {
        // A click: a push into (or back from) the edge, sized so one click alone stretches as
        // far as the curve gives for its distance, less the further it's already stretched.
        held = false;
        const out = !stretched || Math.sign(dy) === Math.sign(shown);
        const room = give(unband(Math.abs(shown), h), h);
        vel += (Math.sign(dy) * band(Math.abs(dy), h) * (out ? room : 1)) / REACH_PER_SPEED;
        run();
        return;
      }

      // A trackpad: the content follows the fingers through the curve.
      if (!held) {
        cancelAnimationFrame(raf);
        raf = 0;
        held = true;
        vel = 0;
        pull = Math.sign(shown) * unband(Math.abs(shown), h);
      }
      const next = pull + dy;
      if (stretched && Math.sign(next) !== Math.sign(pull)) {
        // Back past the edge: the stretch is gone and the rest scrolls the content.
        pull = 0;
        shown = 0;
        held = false;
        paint();
        node.scrollTop += next;
        return;
      }
      pull = next;
      shown = Math.sign(pull) * band(Math.abs(pull), h);
      paint();
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        held = false;
        if (shown !== 0) run();
      }, RELEASE_MS);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.style.removeProperty('overscroll-behavior-y');
      node.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      const c = content();
      if (c) c.style.transform = '';
    };
  }, [ref]);
}
