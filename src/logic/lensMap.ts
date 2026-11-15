/**
 * Displacement map for a glass lens, after Aave's "Building glass for the web"
 * (aave.com/design/building-glass-for-the-web): a small image the size of the
 * lens, read by SVG feDisplacementMap. Red is horizontal bend, green vertical,
 * 128 is no bend. Only a band along the edge bends, and it bends harder the
 * closer it is to the edge, so the content looks refracted through a curved rim.
 * An optional zoom magnifies the whole lens, like a convex glass.
 * The map is symmetric, so only the top-left quadrant is computed and mirrored,
 * with x flipped across the vertical axis and y across the horizontal one.
 */
export function lensMap(
  w: number,
  h: number,
  radius: number,
  depth: number,
  /** Largest shift the filter applies, in px; the map stores shifts as a share of it. */
  scale = depth,
  /** Bend at the very rim, in px. */
  rim = scale,
  /** Magnification across the whole lens: 0.12 makes the middle read 12% larger. */
  zoom = 0,
): Uint8ClampedArray {
  const W = Math.round(w), H = Math.round(h);
  const r = Math.min(radius, W / 2, H / 2);
  const data = new Uint8ClampedArray(W * H * 4);
  const put = (x: number, y: number, dx: number, dy: number) => {
    const i = (y * W + x) * 4;
    data[i] = 128 + dx * 127;
    data[i + 1] = 128 + dy * 127;
    data[i + 2] = 128;
    data[i + 3] = 255;
  };
  const hw = Math.ceil(W / 2), hh = Math.ceil(H / 2);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const px = x + 0.5, py = y + 0.5;
      // Distance in from the rounded-rectangle edge, and the inward normal there.
      let dist: number, nx = 0, ny = 0;
      if (px < r && py < r) {
        const cx = r - px, cy = r - py, len = Math.hypot(cx, cy) || 1;
        dist = r - len;
        nx = cx / len;
        ny = cy / len;
      } else if (px < py) {
        dist = px;
        nx = 1;
      } else {
        dist = py;
        ny = 1;
      }
      // Inside the rim band the bend eases in, strongest at the edge: (1 - d/depth)².
      // Its steepest slope is 2 × rim / depth; kept under 1 (with zoom) the
      // content never folds over itself, which is what smears it into streaks.
      const t = dist <= 0 ? 1 : dist >= depth ? 0 : (1 - dist / depth) ** 2;
      // Shift in px: sample toward the middle (magnifies), plus the rim bend.
      const sx = (W / 2 - px) * zoom + nx * t * rim;
      const sy = (H / 2 - py) * zoom + ny * t * rim;
      const ex = Math.max(-1, Math.min(1, sx / scale));
      const ey = Math.max(-1, Math.min(1, sy / scale));
      put(x, y, ex, ey);
      put(W - 1 - x, y, -ex, ey);
      put(x, H - 1 - y, ex, -ey);
      put(W - 1 - x, H - 1 - y, -ex, -ey);
    }
  }
  return data;
}
