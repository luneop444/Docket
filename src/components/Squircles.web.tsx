import { useEffect } from 'react';

import { squirclePath, SQUIRCLE_C10, SQUIRCLE_C5 } from '../logic/squircle';

/**
 * Turns every rounded corner in the web build into the squircle from Scott
 * Dodge's Squircle plugin for Figma (github.com/scotato/figma-squircle, MIT,
 * src/squircle.ts), using its exact path:
 *
 *   each corner is one cubic Bézier from (0, r2) via (0, r1) and (r1, 0) to
 *   (r2, 0), joined by straight edges;
 *   r2 = 0.332 × the shorter side (its default curvature, c = 5),
 *   r1 = r2 × 0.1765.
 *
 * Like resizing the plugin's shape, r2 follows each element's shorter side, so
 * the corners scale with the element and the straight edges stretch.
 * Pills (corners already half the height) use the plugin's c = 10 (r2 = 0.5 ×
 * the shorter side) so they stay pills with the same curve. Circles are left
 * as circles.
 *
 * Browsers can't draw this natively, so each rounded element is clipped to the
 * path for its current size and its own border-radius is set to 0 underneath
 * (the clip, not the radius, now makes the shape). Borders and inset
 * box-shadow rings are redrawn along the path so they keep their width.
 * Elements with an outer shadow are skipped, since a clip would cut it off.
 */
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

function release(el: HTMLElement) {
  if (!done.has(el)) return;
  el.style.clipPath = '';
  el.style.backgroundImage = '';
  el.style.borderRadius = '';
  done.delete(el);
}

function apply(el: HTMLElement) {
  // Read the element's own radius, not the 0 this script sets underneath the clip.
  const ours = done.has(el);
  if (ours) el.style.borderRadius = '';
  const cs = getComputedStyle(el);
  const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const short = Math.min(w, h);
  const rounded = r.some((v) => v > 0) && r.every((v) => !Number.isNaN(v));
  const circle = w > 0 && w === h && r.every((v) => v >= w / 2 - 0.5);
  const outerShadow = cs.boxShadow !== 'none' && !cs.boxShadow.includes('inset');
  if (!rounded || circle || outerShadow || !w || !h) {
    release(el);
    return;
  }

  const pill = r.filter((v) => v > 0).every((v) => v >= short / 2 - 0.5);
  const size = short * (pill ? SQUIRCLE_C10 : SQUIRCLE_C5);
  const r2 = r.map((v) => (v > 0 ? size : 0)) as [number, number, number, number];
  const path = squirclePath(w, h, r2);

  // Outlines: the stroke is centered on the path and the clip removes the outer half.
  const strokes: string[] = [];
  const ring = ringOf(cs.boxShadow);
  if (ring) strokes.push(`<path d='${path}' fill='none' stroke='${ring.color}' stroke-width='${ring.width * 2}'/>`);
  const bw = px(cs.borderTopWidth);
  if (bw > 0 && cs.borderTopStyle !== 'none' && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') {
    const dash = cs.borderTopStyle === 'dashed' ? ` stroke-dasharray='${bw * 3} ${bw * 3}'` : '';
    strokes.push(`<path d='${path}' fill='none' stroke='${cs.borderTopColor}' stroke-width='${bw * 2}'${dash}/>`);
  }

  el.style.borderRadius = '0px';
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
