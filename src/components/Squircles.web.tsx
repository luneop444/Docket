import { getSvgPath } from 'figma-squircle';
import { useEffect } from 'react';

/**
 * Turns every rounded corner in the web build into Apple's continuous corner
 * (a "squircle"): Figma's corner smoothing at 60%, its iOS preset, built from
 * two cubic Béziers per corner by the figma-squircle package.
 *
 * Browsers can't draw this curve natively (CSS `corner-shape: squircle` is a
 * different curve, superellipse(2), and only Chromium has it), so each rounded
 * element is clipped to the exact path for its current size. The smoothed shape
 * sits inside the circular rounded rect of the same radius, so the clip never
 * needs space the element doesn't already paint. Outlines (borders and inset
 * box-shadow rings) are redrawn along the same path so they keep their width
 * through the corners.
 *
 * Skipped: circles (nothing to smooth) and elements with an outer shadow, which
 * a clip would cut off (the prototype's phone bezel, the toggle knob).
 */
const SMOOTHING = 0.6;

const done = new WeakMap<HTMLElement, string>();

function px(v: string) {
  return v.endsWith('px') ? parseFloat(v) : NaN;
}

function ringOf(boxShadow: string) {
  // e.g. "rgb(0, 0, 0) 0px 0px 0px 2px inset"
  if (!boxShadow.includes('inset')) return null;
  const m = boxShadow.match(/^(rgba?\([^)]*\)|#[0-9a-f]+)\s+0px\s+0px\s+0px\s+([\d.]+)px\s+inset$/i);
  return m ? { color: m[1], width: parseFloat(m[2]) } : null;
}

function apply(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const rounded = r.some((v) => v > 0) && r.every((v) => !Number.isNaN(v));
  const circle = w > 0 && w === h && r.every((v) => v >= w / 2 - 0.5);
  const outerShadow = cs.boxShadow !== 'none' && !cs.boxShadow.includes('inset');
  if (!rounded || circle || outerShadow || !w || !h) {
    if (done.has(el)) {
      el.style.clipPath = '';
      el.style.backgroundImage = '';
      done.delete(el);
    }
    return;
  }

  const path = getSvgPath({
    width: w,
    height: h,
    topLeftCornerRadius: r[0],
    topRightCornerRadius: r[1],
    bottomRightCornerRadius: r[2],
    bottomLeftCornerRadius: r[3],
    cornerSmoothing: SMOOTHING,
    preserveSmoothing: true,
  });

  // Outlines: the stroke is centered on the path and the clip removes the outer half.
  const strokes: string[] = [];
  const ring = ringOf(cs.boxShadow);
  if (ring) strokes.push(`<path d='${path}' fill='none' stroke='${ring.color}' stroke-width='${ring.width * 2}'/>`);
  const bw = px(cs.borderTopWidth);
  if (bw > 0 && cs.borderTopStyle === 'solid' && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') {
    strokes.push(`<path d='${path}' fill='none' stroke='${cs.borderTopColor}' stroke-width='${bw * 2}'/>`);
  }

  const key = `${path}|${strokes.join('')}`;
  if (done.get(el) === key) return;
  done.set(el, key);
  el.style.clipPath = `path('${path}')`;
  if (strokes.length) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${strokes.join('')}</svg>`;
    el.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    el.style.backgroundOrigin = 'border-box';
    el.style.backgroundSize = '100% 100%';
    el.style.backgroundRepeat = 'no-repeat';
  } else {
    el.style.backgroundImage = '';
  }
}

export function Squircles() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const resize = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.target as HTMLElement);
    });
    const watched = new WeakSet<Element>();
    const visit = (el: Element) => {
      if (!(el instanceof HTMLElement)) return;
      if (!watched.has(el)) {
        watched.add(el);
        resize.observe(el);
      }
      apply(el);
    };
    const scan = (root: Element) => {
      visit(root);
      root.querySelectorAll('*').forEach(visit);
    };
    scan(document.body);
    // Pressed, focused and selected states change classes; new screens add nodes.
    const mutations = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => n instanceof Element && scan(n));
        else if (m.target instanceof HTMLElement && m.attributeName === 'class') apply(m.target);
      }
    });
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);
  return null;
}
