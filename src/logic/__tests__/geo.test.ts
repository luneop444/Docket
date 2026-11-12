import { describe, expect, it } from '@jest/globals';
import { distanceM, fenceEvent } from '../geo';

const dock = { lat: 40.6023, lon: -75.4714 };
// ~1 m of latitude is 1/111_320 degrees.
const north = (m: number) => ({ lat: dock.lat + m / 111320, lon: dock.lon });

describe('distanceM', () => {
  it('measures metres', () => {
    expect(distanceM(dock, dock)).toBe(0);
    expect(distanceM(dock, north(1000))).toBeCloseTo(1000, -1);
  });
});

describe('fenceEvent', () => {
  it('notices pulling in only when close', () => {
    expect(fenceEvent(dock, north(100), 20, false)).toBe('arrived');
    expect(fenceEvent(dock, north(400), 20, false)).toBeNull();
  });

  it('notices leaving only when well away, so yard jitter is ignored', () => {
    expect(fenceEvent(dock, north(400), 20, true)).toBeNull();
    expect(fenceEvent(dock, north(800), 20, true)).toBe('left');
  });

  it('ignores poor readings', () => {
    expect(fenceEvent(dock, north(50), 500, false)).toBeNull();
    expect(fenceEvent(dock, north(5000), 500, true)).toBeNull();
    expect(fenceEvent(dock, north(50), null, false)).toBe('arrived');
  });
});
