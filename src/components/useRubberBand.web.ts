import { useEffect, type RefObject } from 'react';
import { MOVE_EVENT } from './contentMove';

/**
 * Rubber banding for a web scroll area, fitted to macOS's NSScrollView: the web build is
 * driven by a desktop mouse wheel or trackpad, and NSScrollView is what that input does
 * natively. Numbers from a model fitted to NSScrollView and AppKit's own functions
 * (gpui-kit #3500), checked against its measurements:
 * - Stretch: about 0.075 of the travel past the end, eased into a 36 pt cap (7 pt for 100 pt).
 * - Release: AppKit's `(x + 0.31·v·t)·e^(−12.5t)`, so a released edge halves in 55 ms.
 * - A throw (a fling or a wheel click into the edge) hits once, in proportion to its speed:
 *   1500 pt/s peaks ≈14 pt, ≈80 ms after impact. Later momentum doesn't throw again.
 * (An earlier version used iOS's finger tuning, 0.55 of the travel with no cap: 88–136 pt
 * stretches that took ~1 s to come back, which read as stuck at the edge.)
 *
 * The wheel listener is passive, so it never holds up the browser's own scrolling. At an
 * edge there's nothing left to scroll, so the stretch is only drawn on top (a transform on
 * the content). Safari (macOS, iOS) bounces scroll areas natively and is left to it. Touch
 * screens are left to the platform. Areas that can't scroll don't stretch.
 */
const CAP = 36;
/** Eased so 100 pt past the end stretches 7 pt, and nothing passes CAP. */
const K = 0.0866;
const stretchFor = (travel: number) => CAP * (1 - 1 / (1 + (K * travel) / CAP));
const travelFor = (s: number) => (CAP / K) * (Math.min(s, CAP - 0.01) / (CAP - Math.min(s, CAP - 0.01)));
/** AppKit's release: x(t) = (x0 + A·v0·t)·e^(−R·t). */
const A = 0.31;
const R = 12.5;
/** Speed is read over the last 50 ms of wheel events (as gpui-kit does). */
const WINDOW_MS = 50;
/** A trackpad gesture is over once no event comes for this long. */
const RELEASE_MS = 50;
/** After a trackpad lifts, its drift arrives as shrinking events; this many in a row is drift. */
const DRIFT_RUN = 3;
/** A fling, not a pull: arriving at the edge faster than this (pt/s). */
const FLING = 800;

/** A mouse wheel clicks (whole notches, 120 in the old wheel units); a trackpad streams small moves. */
function isMouseWheel(e: WheelEvent) {
  if (e.deltaMode !== 0) return true;
  const w = (e as unknown as { wheelDeltaY?: number }).wheelDeltaY;
  return typeof w === 'number' && w !== 0 && w % 120 === 0;
}

type Scrollable = { getScrollableNode?: () => HTMLElement } | HTMLElement | null;

export function useRubberBand(ref: RefObject<Scrollable>) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
    const ua = navigator.userAgent;
    if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|Android/.test(ua)) return;
    const r = ref.current as Scrollable;
    const node = (r && 'getScrollableNode' in r && r.getScrollableNode ? r.getScrollableNode() : r) as HTMLElement | null;
    if (!node) return;
    node.style.setProperty('overscroll-behavior-y', 'none');
    const content = () => node.firstElementChild as HTMLElement | null;

    let x = 0; // stretch on screen: < 0 past the top (content moves down), > 0 past the bottom
    let anim: { x0: number; v0: number; t0: number } | null = null; // a release or a throw
    let held = false; // a trackpad is pulling at the edge
    let travel = 0; // that pull's travel past the edge
    let thrown = false; // this gesture already threw the edge
    let raf = 0;
    let idle = 0;
    let lastSize = 0;
    let shrinking = 0;
    const recent: [number, number][] = []; // [time, dy] of wheel events, for speed

    const paint = () => {
      const c = content();
      if (c) c.style.transform = x ? `translate3d(0, ${-x}px, 0)` : '';
      document.dispatchEvent(new Event(MOVE_EVENT));
    };
    const capped = (v: number) => Math.max(-CAP, Math.min(CAP, v));

    // The release / throw curve, from where the edge is now.
    const step = () => {
      raf = 0;
      if (!anim) return;
      const t = (performance.now() - anim.t0) / 1000;
      const next = capped((anim.x0 + A * anim.v0 * t) * Math.exp(-R * t));
      // Done once it's back within half a point on its way home (past any throw's peak).
      if (Math.abs(next) < 0.5 && t > 1 / R) {
        x = 0;
        anim = null;
        paint();
        return;
      }
      x = next;
      paint();
      raf = requestAnimationFrame(step);
    };
    /** Start the curve from the stretch now, adding a throw of `v` pt/s. */
    const release = (v = 0) => {
      let v0 = v;
      if (anim) {
        // Carry the motion in progress: the curve's speed now, as a starting speed.
        const t = (performance.now() - anim.t0) / 1000;
        const speed = Math.exp(-R * t) * (A * anim.v0 - R * (anim.x0 + A * anim.v0 * t));
        v0 += (speed + R * x) / A;
      }
      anim = { x0: x, v0, t0: performance.now() };
      if (!raf) raf = requestAnimationFrame(step);
    };
    const speedNow = (now: number) => {
      while (recent.length && now - recent[0][0] > WINDOW_MS) recent.shift();
      return (recent.reduce((a, [, dy]) => a + dy, 0) / WINDOW_MS) * 1000; // pt/s
    };
    const endSoon = () => {
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        // Gesture over: a held edge is let go, and the next gesture may throw again.
        thrown = false;
        shrinking = 0;
        lastSize = 0;
        if (held) {
          held = false;
          release();
        }
      }, RELEASE_MS);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom on a trackpad
      const h = node.clientHeight || 1;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * h : e.deltaY;
      if (!dy) return;
      const now = performance.now();
      recent.push([now, dy]);
      const mouse = isMouseWheel(e);
      const size = Math.abs(dy);
      shrinking = !mouse && size < lastSize * 0.97 ? shrinking + 1 : 0;
      lastSize = size;
      const drift = shrinking >= DRIFT_RUN;

      const max = node.scrollHeight - node.clientHeight;
      const top = node.scrollTop;
      const pastTop = dy < 0 && top <= 0;
      const pastBottom = dy > 0 && top >= max - 0.5;
      const stretched = x !== 0 || held;

      // Back toward the content while stretched: the browser scrolls it, the edge lets go.
      if (stretched && Math.sign(dy) !== Math.sign(x || travel)) {
        held = false;
        release();
        endSoon();
        return;
      }
      if (!stretched && !pastTop && !pastBottom) {
        // Mid-list. A wheel click that runs past the edge throws it now, for what's left over.
        if (mouse && max > 0.5) {
          const over = dy < 0 ? -(top + dy) : top + dy - max;
          if (over > 0) release(Math.sign(dy) * Math.max(Math.abs(speedNow(now)), size / 0.1) * (over / size));
        }
        endSoon();
        return;
      }
      if (!stretched && (max <= 0.5 || getComputedStyle(node).overflowY === 'hidden')) return;

      if (mouse) {
        // A click into the edge: a throw at the click's speed (a notch over ~100 ms, or faster).
        release(Math.sign(dy) * Math.max(Math.abs(speedNow(now)), size / 0.1));
        endSoon();
        return;
      }
      if (drift || (!held && Math.abs(speedNow(now)) > FLING)) {
        // A fling arriving at the edge: one throw per gesture, at its speed. Later drift doesn't throw again.
        if (!thrown) {
          thrown = true;
          held = false;
          release(speedNow(now));
        }
        endSoon();
        return;
      }
      // Fingers pulling at the edge: the edge follows them, eased into the cap.
      if (!held) {
        held = true;
        anim = null;
        cancelAnimationFrame(raf);
        raf = 0;
        travel = Math.sign(x || dy) * travelFor(Math.abs(x));
      }
      travel += dy;
      x = Math.sign(travel) * stretchFor(Math.abs(travel));
      paint();
      endSoon();
    };

    node.addEventListener('wheel', onWheel, { passive: true });
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
