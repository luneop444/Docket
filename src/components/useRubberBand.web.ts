import { useEffect, type RefObject } from 'react';
import { MOVE_EVENT } from './contentMove';

/**
 * Rubber banding for a web scroll area, fitted to macOS's NSScrollView: the web build is
 * driven by a desktop mouse wheel or trackpad, and NSScrollView is what that input does
 * natively. Numbers from a model fitted to NSScrollView and AppKit's own functions
 * (gpui-kit #3500), checked against its measurements:
 * - Stretch: about 0.1 of the travel past the end, eased into a 44 pt cap (9 pt for 100 pt).
 *   (A little more than the Mac's 7 pt and 36 pt, by request.)
 * - Release: AppKit's `(x + 0.31·v·t)·e^(−12.5t)`, so a released edge halves in 55 ms.
 * - A throw (a fling or a wheel click into the edge) hits once, in proportion to its speed:
 *   1500 pt/s peaks ≈14 pt, ≈80 ms after impact. Later momentum doesn't throw again.
 * (An earlier version used iOS's finger tuning, 0.55 of the travel with no cap: 88–136 pt
 * stretches that took ~1 s to come back, which read as stuck at the edge.)
 *
 * On a Mac, Safari, Chrome 145+ and Firefox bounce nested scroll areas natively, so this steps
 * aside there. Chrome on Windows doesn't bounce them, so it runs there. A Windows touchpad marks
 * the moment the fingers lift with a wheel event of size 0 (recorded on a real one): the edge
 * lets go on that, and the momentum after it can't grab the edge again. Without that marker,
 * the lift is guessed from shrinking events and a quiet gap.
 *
 * The wheel listener is passive, so it never holds up the browser's own scrolling. At an
 * edge there's nothing left to scroll, so the stretch is only drawn on top (a transform on
 * the content). Safari (macOS, iOS) bounces scroll areas natively and is left to it. Touch
 * screens are left to the platform. A screen that fits and doesn't scroll still stretches, as
 * short screens do on iPhone (23 Nov: Today with no stop sat dead on Windows, bounced on iPhone).
 */
const CAP = 44;
/** Eased so 100 pt past the end stretches 9 pt, and nothing passes CAP. */
const K = 0.1131;
const stretchFor = (travel: number) => CAP * (1 - 1 / (1 + (K * travel) / CAP));
const travelFor = (s: number) => (CAP / K) * (Math.min(s, CAP - 0.01) / (CAP - Math.min(s, CAP - 0.01)));
/** How fast the stretch moves per point of travel, at a given travel. */
const slopeAt = (travel: number) => K / (1 + (K * Math.abs(travel)) / CAP) ** 2;
/** AppKit's release: x(t) = (x0 + A·v0·t)·e^(−R·t). */
const A = 0.31;
const R = 12.5;
/** A throw's peak is A·v/(R·e): this speed peaks right at CAP, and faster throws ease toward it
 * instead of flattening against the cap (a flat top reads as stuck). */
const VMAX = (CAP * R * Math.E) / A;
/** Throws land 1.3x AppKit's size (asked for a little more bounce than the Mac default). */
const THROW = 1.3;
const soften = (v: number) => VMAX * Math.tanh((THROW * v) / VMAX);
/** Speed is read over the last 50 ms of wheel events (as gpui-kit does). */
const WINDOW_MS = 50;
/** The wheel stream is over once no event comes for this long. */
const GAP_MS = 100;
/** With lift markers, a held edge waits for the lift; if none comes in this long, it lets go. */
const SAFETY_MS = 1500;
/** Without lift markers: after a trackpad lifts, its drift arrives as shrinking events; this many
 * decreases is drift. Repeats (3, 3, 2, 2, 1) neither count nor reset. */
const DRIFT_RUN = 3;
/** A fling, not a pull: arriving at the edge faster than this (pt/s). */
const FLING = 800;
/** A new gesture inside momentum: the speed (over the last 50 ms, so uneven event timing evens
 * out) rises this much above its lowest since the lift, with events over NEW_MIN pt. */
const NEW_JUMP = 1.5;
const NEW_MIN = 4;

/** A mouse wheel clicks (whole notches, 120 in the old wheel units); a trackpad streams small moves.
 * Windows touchpads report wheelDeltaY as exactly −deltaY, so a 120 there is still a trackpad. */
function isMouseWheel(e: WheelEvent) {
  if (e.deltaMode !== 0) return true;
  const w = (e as unknown as { wheelDeltaY?: number }).wheelDeltaY;
  return typeof w === 'number' && w !== 0 && w % 120 === 0 && w !== -e.deltaY;
}

/** Only Apple platforms bounce nested scroll areas natively (Safari; Chrome 145+ and Firefox on a
 * Mac). Chrome on Windows doesn't, so it gets this. */
export function bouncesNatively(ua: string) {
  if (!/Macintosh|Mac OS X|iPhone|iPad/.test(ua)) return false;
  if (/Firefox\/|FxiOS/.test(ua)) return true;
  const chrome = /(?:Chrome|Chromium|CriOS)\/(\d+)/.exec(ua);
  if (chrome) return +chrome[1] >= 145;
  return /Safari\//.test(ua);
}

type Scrollable = { getScrollableNode?: () => HTMLElement } | HTMLElement | null;

export function useRubberBand(ref: RefObject<Scrollable>) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
    if (bouncesNatively(navigator.userAgent)) return;
    const r = ref.current as Scrollable;
    const node = (r && 'getScrollableNode' in r && r.getScrollableNode ? r.getScrollableNode() : r) as HTMLElement | null;
    if (!node) return;
    node.style.setProperty('overscroll-behavior-y', 'none');
    const content = () => node.firstElementChild as HTMLElement | null;

    let x = 0; // stretch on screen: < 0 past the top (content moves down), > 0 past the bottom
    let anim: { x0: number; v0: number; t0: number } | null = null; // a release or a throw
    let held = false; // fingers are pulling at the edge
    let travel = 0; // that pull's travel past the edge
    let thrown = false; // this gesture has let the edge go: its later events don't stretch it
    // Windows touchpads mark the lift with a wheel event of size 0; after it, the rest is momentum.
    let markers = /Windows/.test(navigator.userAgent);
    let momentum = false;
    let liftAt = 0;
    let raf = 0;
    let paintRaf = 0;
    let idle = 0;
    let safety = 0;
    let lastSize = 0;
    let slowest = Infinity; // momentum's lowest speed since the lift
    let shrinking = 0;
    const recent: [number, number][] = []; // [time, dy] of wheel events, for speed

    const paint = () => {
      const c = content();
      if (c) c.style.transform = x ? `translate3d(0, ${-x}px, 0)` : '';
      document.dispatchEvent(new Event(MOVE_EVENT));
    };
    // Wheel events come at up to ~165 Hz; draw once per frame.
    const paintSoon = () => {
      if (!paintRaf) paintRaf = requestAnimationFrame(() => ((paintRaf = 0), paint()));
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
      cancelAnimationFrame(paintRaf);
      paintRaf = 0;
      if (!raf) raf = requestAnimationFrame(step);
    };
    const letGo = (v = 0) => {
      held = false;
      clearTimeout(safety);
      release(v);
    };
    const speedNow = (now: number) => {
      while (recent.length && now - recent[0][0] > WINDOW_MS) recent.shift();
      return (recent.reduce((a, [, dy]) => a + dy, 0) / WINDOW_MS) * 1000; // pt/s
    };
    const endSoon = () => {
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        // The stream went quiet: the next events are a new gesture.
        thrown = false;
        momentum = false;
        shrinking = 0;
        lastSize = 0;
        slowest = Infinity;
        // Without lift markers, quiet is the only sign the fingers lifted.
        if (held && !markers) letGo();
      }, GAP_MS);
      if (held && markers) {
        // Fingers held still send nothing for a while (up to ~0.6 s measured); wait for the lift.
        clearTimeout(safety);
        safety = window.setTimeout(() => {
          if (!held) return;
          markers = false; // no lift marker came: don't count on them
          letGo();
        }, SAFETY_MS);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom on a trackpad
      const now = performance.now();
      const mouse = isMouseWheel(e);
      if (!mouse && e.deltaY === 0 && e.deltaX === 0) {
        // The fingers lifted. Let a held edge go now, carrying the fingers' last speed.
        markers = true;
        momentum = true;
        liftAt = now;
        slowest = Infinity;
        if (held) {
          thrown = true;
          letGo(soften(speedNow(now) * slopeAt(travel)));
        }
        endSoon();
        return;
      }
      const h = node.clientHeight || 1;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * h : e.deltaY;
      if (!dy) return;
      recent.push([now, dy]);
      const size = Math.abs(dy);
      if (!mouse) {
        // Fingers back on the pad during momentum: the speed climbs again, or the direction turns.
        const turned = recent.length > 1 && Math.sign(recent[recent.length - 2][1]) !== Math.sign(dy);
        if (momentum && now - liftAt > WINDOW_MS + 10) {
          const speed = Math.abs(speedNow(now));
          if (turned || (speed > slowest * NEW_JUMP && size > NEW_MIN)) {
            momentum = false;
            thrown = false;
          } else slowest = Math.min(slowest, speed);
        } else if (momentum && turned) {
          momentum = false;
          thrown = false;
        }
        shrinking = size < lastSize ? shrinking + 1 : size > lastSize ? 0 : shrinking;
      } else shrinking = 0;
      lastSize = size;

      const max = node.scrollHeight - node.clientHeight;
      const top = node.scrollTop;
      const pastTop = dy < 0 && top <= 0;
      const pastBottom = dy > 0 && top >= max - 0.5;
      const stretched = x !== 0 || held;

      // Back toward the content while stretched: the browser scrolls it, the edge lets go.
      if (stretched && Math.sign(dy) !== Math.sign(x || travel)) {
        letGo();
        endSoon();
        return;
      }
      if (!stretched && !pastTop && !pastBottom) {
        // Mid-list. A wheel click that runs past the edge throws it now, for what's left over.
        if (mouse && max > 0.5) {
          const over = dy < 0 ? -(top + dy) : top + dy - max;
          if (over > 0) release(soften(Math.sign(dy) * Math.max(Math.abs(speedNow(now)), size / 0.1) * (over / size)));
        }
        endSoon();
        return;
      }

      if (mouse) {
        // A click into the edge: a throw at the click's speed (a notch over ~100 ms, or faster).
        release(soften(Math.sign(dy) * Math.max(Math.abs(speedNow(now)), size / 0.1)));
        endSoon();
        return;
      }
      const coasting = momentum || (!markers && (shrinking >= DRIFT_RUN || (!held && Math.abs(speedNow(now)) > FLING)));
      if (coasting || thrown) {
        // Momentum reaching the edge throws it once, at its speed; the rest of it never re-stretches
        // the edge or stops the spring.
        if (!thrown) {
          thrown = true;
          letGo(soften(speedNow(now)));
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
      paintSoon();
      endSoon();
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      node.style.removeProperty('overscroll-behavior-y');
      node.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(paintRaf);
      clearTimeout(idle);
      clearTimeout(safety);
      const c = content();
      if (c) c.style.transform = '';
    };
  }, [ref]);
}
