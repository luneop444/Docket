import { describe, expect, it } from '@jest/globals';
import { COMPANIES, parseSetup, withSetup } from '../sampleData';

describe('test setup link', () => {
  it('ignores a URL with no company', () => {
    expect(parseSetup('')).toBeNull();
  });

  it('reads a known carrier with the participant’s real rules', () => {
    const s = parseSetup('?company=estes%20express%20lines&free=2&rate=30&start=appt&breaks=0');
    expect(s).toEqual({
      company: 'Estes Express Lines',
      rules: { free: 120, start: 'appt', rate: 30, breaksCount: false },
    });
  });

  it('falls back to defaults for missing or bad values', () => {
    const s = parseSetup('?company=Tiny%20Fleet%20LLC&free=abc');
    expect(s).not.toBe('clear');
    if (s && s !== 'clear') {
      expect(s.company).toBe('Tiny Fleet LLC');
      expect(s.rules.free).toBe(120);
      expect(s.rules.rate).toBe(20);
    }
  });

  it('can be cleared', () => {
    expect(parseSetup('?setup=clear')).toBe('clear');
  });

  it('puts the participant’s company first without duplicating it', () => {
    const rules = { free: 60, start: 'arrival' as const, rate: 30, breaksCount: true };
    const list = withSetup(COMPANIES, { company: 'Saia', rules });
    expect(list[0].name).toBe('Saia');
    expect(list[0].rules).toEqual(rules);
    expect(list.filter((c) => c.name === 'Saia')).toHaveLength(1);
    expect(list).toHaveLength(COMPANIES.length);
  });

  it('adds an unlisted company at the top', () => {
    const rules = { free: 120, start: 'appt' as const, rate: 25, breaksCount: false };
    const list = withSetup(COMPANIES, { company: 'Tiny Fleet LLC', rules });
    expect(list[0].name).toBe('Tiny Fleet LLC');
    expect(list).toHaveLength(COMPANIES.length + 1);
  });
});
