import { describe, expect, it } from '@jest/globals';

import { squirclePath, SQUIRCLE_C5 } from '../squircle';

describe('squircle path (Squircle plugin for Figma)', () => {
  it('matches the plugin at its default 100 × 100 squircle', () => {
    // Plugin: r2 = 0.332 × 100 = 33.2, r1 = 33.2 × 0.1765 = 5.8598
    const r2 = 100 * SQUIRCLE_C5;
    const d = squirclePath(100, 100, [r2, r2, r2, r2]);
    expect(d.startsWith('M 0 33.2 C 0 5.8598 5.8598 0 33.2 0 L 66.8 0')).toBe(true);
  });

  it('stretches the straight edges, not the corners', () => {
    const d = squirclePath(353, 56, [18.592, 18.592, 18.592, 18.592]);
    expect(d).toContain('L 334.408 0');
    expect(d).toContain('L 353 37.408');
  });

  it('keeps a corner square when its r2 is 0', () => {
    const d = squirclePath(200, 100, [24, 24, 0, 0]);
    expect(d).toContain('L 200 100');
    expect(d).toContain('L 0 100');
  });
});
