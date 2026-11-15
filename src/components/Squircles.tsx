/**
 * Native: nothing to do here. Every rounded style sets `borderCurve: 'continuous'`,
 * iOS's own smooth corner, the closest a native view can draw without an SVG mask
 * (Android draws circular corners). The web build clips to the exact Squircle
 * plugin path in Squircles.web.tsx.
 */
export function Squircles() {
  return null;
}
