import { describe, expect, it } from '@jest/globals';
import { CARRIER_NAMES } from '../sampleData';
import { POLICIES, recommended, searchPolicies, splitPolicies, staleYear } from '../policies';

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

  it('moves the matches to the top and keeps everyone', () => {
    for (const by of ['rate', 'guaranteed'] as const) {
      const { top, rest } = splitPolicies(POLICIES, by);
      expect(top.length + rest.length).toBe(POLICIES.length);
    }
    expect(splitPolicies(POLICIES, 'guaranteed').top.every(recommended)).toBe(true);
    const rated = splitPolicies(POLICIES, 'rate').top.map((p) => p.rate!);
    expect(rated).toEqual([...rated].sort((a, b) => b - a));
  });

  it('finds a company by name, loosely', () => {
    expect(searchPolicies(POLICIES, 'jb hunt').map((p) => p.company)).toEqual(['J.B. Hunt Transport']);
    expect(searchPolicies(POLICIES, '  ')).toHaveLength(POLICIES.length);
  });

  it('flags an old policy', () => {
    expect(staleYear(POLICIES.find((p) => p.company === 'Marten Transport')!)).toBe(2014);
    expect(staleYear(POLICIES.find((p) => p.company === 'Schneider National')!)).toBeNull();
  });
});
