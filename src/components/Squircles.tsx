/**
 * Native: nothing to do here. Every rounded style sets `borderCurve: 'continuous'`,
 * which is Apple's own continuous-corner curve on iOS (Android draws circular corners).
 * The web build clips to the same curve in Squircles.web.tsx.
 */
export function Squircles() {
  return null;
}
