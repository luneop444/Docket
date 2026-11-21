import type { CSSProperties } from 'react';

/**
 * Blur everything outside the scan frame (web): a backdrop blur masked by the frame's hole, so
 * the page stays sharp and the cab behind falls out of focus, as a camera's would.
 */
export function FrameBlur({ width, height, hole }: { width: number; height: number; hole: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><path fill-rule='evenodd' fill='white' d='M0 0H${width}V${height}H0Z ${hole}'/></svg>`;
  const mask = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backdropFilter: `blur(${BLUR}px)`,
    WebkitBackdropFilter: `blur(${BLUR}px)`,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  };
  return <div aria-hidden style={style} />;
}

/** How out of focus the outside is, in points. */
const BLUR = 10;
