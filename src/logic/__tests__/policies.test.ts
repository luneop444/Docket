import { describe, expect, it } from '@jest/globals';
import { CARRIER_NAMES } from '../sampleData';
import { POLICIES, paysBy2h, recommended, sortPolicies, staleYear } from '../policies';

describe('published policies', () => {
  it('covers every carrier in the picker, once', () => {
    const names = POLICIES.map((p) => p.company);
    expect(new Set(names).size).toBe(names.length);
    for (const n of CARRIER_NAMES) expect(names).toContain(n);
  });

  it('gives a source for every claim beyond "nothing published"', () => {
    for (const p of POLICIES) {
      if (p.kind !== 'none') expect(p.sources.length).toBeGreaterThan(0);
      for (const s of p.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it('says plainly when nothing is published', () => {
    for (const p of POLICIES) expect(/Nothing (published )?on/.test(p.line) || p.kind !== 'none').toBe(true);
  });

  it('puts recommended first and filters to paid within 2h', () => {
    const best = sortPolicies(POLICIES, 'best');
    const firstNot = best.findIndex((p) => !recommended(p));
    expect(best.slice(firstNot).some(recommended)).toBe(false);
    expect(sortPolicies(POLICIES, 'by2h').every(paysBy2h)).toBe(true);
    const rated = sortPolicies(POLICIES, 'rate').filter((p) => p.rate !== undefined).map((p) => p.rate!);
    expect(rated).toEqual([...rated].sort((a, b) => b - a));
  });

  it('flags an old policy', () => {
    expect(staleYear(POLICIES.find((p) => p.company === 'Marten Transport')!)).toBe(2014);
    expect(staleYear(POLICIES.find((p) => p.company === 'Schneider National')!)).toBeNull();
  });
});
