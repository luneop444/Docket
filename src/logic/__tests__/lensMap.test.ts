import { describe, expect, it } from '@jest/globals';

import { lensMap } from '../lensMap';

const at = (d: Uint8ClampedArray, w: number, x: number, y: number) => [d[(y * w + x) * 4] - 128, d[(y * w + x) * 4 + 1] - 128];

describe('lensMap', () => {
  const w = 120, h = 56, map = lensMap(w, h, 28, 12);

  it('does not bend the middle', () => {
    expect(at(map, w, 60, 28)).toEqual([0, 0]);
  });

  it('bends the rim inward, mirrored on each side', () => {
    const [lx] = at(map, w, 30, 1);
    expect(at(map, w, 30, 0)[1]).toBeGreaterThan(0); // top edge pulls down
    expect(at(map, w, 30, h - 1)[1]).toBeLessThan(0); // bottom edge pulls up
    expect(at(map, w, 0, 28)[0]).toBeGreaterThan(0); // left edge pulls right
    expect(at(map, w, w - 1, 28)[0]).toBeLessThan(0); // right edge pulls left
    expect(lx).toBe(0);
  });

  it('magnifies with zoom: points sample toward the middle', () => {
    const z = lensMap(w, h, 28, 12, 40, 10, 0.12);
    expect(at(z, w, 60, 28)).toEqual([0, 0]);
    expect(at(z, w, 40, 28)[0]).toBeGreaterThan(0);
    expect(at(z, w, 80, 28)[0]).toBeLessThan(0);
  });

  it('bends more at the edge than further in', () => {
    expect(at(map, w, 60, 0)[1]).toBeGreaterThan(at(map, w, 60, 8)[1]);
  });
});
