import { describe, expect, it } from '@jest/globals';

import { ASK_AFTER_MIN, DEMO_ARRIVE, DEMO_STATES, demoState } from '../demo';
import { freshState } from '../state';
import { stopCalc } from '../stop';

describe('demoState', () => {
  const s = freshState();

  it('every state is onboarded with a load', () => {
    for (const k of DEMO_STATES) {
      const d = demoState(s, k);
      expect(d.onboarded).toBe(true);
      expect(d.load?.stops?.length).toBeGreaterThan(0);
    }
  });

  it('asks after 30 min, counting from pulling in', () => {
    const d = demoState(s, 'asking');
    expect(d.stop.phase).toBe('arriving');
    expect(d.stop.arrive).toBe(DEMO_ARRIVE);
    expect(d.now - DEMO_ARRIVE).toBe(ASK_AFTER_MIN);
  });

  it('counting is inside free time, paid is past it', () => {
    const c = demoState(s, 'counting');
    expect(c.now).toBeLessThan(stopCalc(c.stop, c.now, c.rules).freeEnd);
    const p = demoState(s, 'paid');
    expect(stopCalc(p.stop, p.now, p.rules).owed).toBeGreaterThan(0);
  });

  it('left and logged have a leave time', () => {
    expect(demoState(s, 'left').stop).toMatchObject({ phase: 'left', leave: expect.any(Number) });
    expect(demoState(s, 'logged').stop.phase).toBe('logged');
  });
});
