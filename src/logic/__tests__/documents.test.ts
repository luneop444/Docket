import { describe, expect, it } from '@jest/globals';
import { calc, defaultRules } from '../detention';
import { loadFromRateCon, marksFromSettlement, NO_TIME, sameLoad } from '../documents';
import type { WeekLoad } from '../sampleData';

describe('loadFromRateCon', () => {
  it('turns HH:MM appointments into stops and remembers which had no time', () => {
    const d = loadFromRateCon({
      found: true,
      number: '48262',
      stops: [
        { name: 'Keystone Cold Storage', kind: 'Pickup', appt: '06:00' },
        { name: 'Harbor Foods DC', kind: 'Drop', appt: null },
      ],
      note: '',
    });
    expect(d.number).toBe('48262');
    expect(d.stops).toEqual([
      { name: 'Keystone Cold Storage', kind: 'Pickup', at: 360 },
      { name: 'Harbor Foods DC', kind: 'Drop', at: NO_TIME },
    ]);
    expect(d.noTime).toEqual([1]);
  });

  it('makes the last stop a drop so there is one to watch', () => {
    const d = loadFromRateCon({ found: true, number: null, stops: [{ name: 'A', kind: 'Pickup', appt: '07:00' }], note: '' });
    expect(d.stops[0].kind).toBe('Drop');
    expect(d.number).toBe('');
  });
});

describe('sameLoad', () => {
  it('ignores punctuation, case and leading zeros', () => {
    expect(sameLoad('#00 48-262', '48262')).toBe(true);
    expect(sameLoad('ld48262', 'LD-48262')).toBe(true);
    expect(sameLoad('48262', '48263')).toBe(false);
    expect(sameLoad('', '')).toBe(false);
  });
});

describe('marksFromSettlement', () => {
  // Each waited past free time under the default rules.
  const load = (id: string, number?: string): WeekLoad => ({
    id, number, name: 'Harbor Foods DC', day: 'Mon', arrive: 7 * 60 + 52, appt: 8 * 60, leave: 12 * 60 + 10, brk: 0,
  });
  const owed = calc(7 * 60 + 52, 8 * 60, 12 * 60 + 10, 0, defaultRules).owed;
  const week = [load('a', '111'), load('b', '222'), load('c', '333'), load('d', '444'), load('e')];

  it('marks paid, paid less, and listed without detention; leaves the rest', () => {
    expect(owed).toBeGreaterThan(20);
    const r = marksFromSettlement(week, defaultRules, {
      found: true,
      note: '',
      loads: [
        { number: '111', detention: owed },
        { number: '0222', detention: 20 },
        { number: '333', detention: null },
        { number: '999', detention: 50 },
      ],
    });
    expect(r.marks).toEqual({ a: { m: 'paid' }, b: { m: 'less', amt: '20.00' }, c: { m: 'none' } });
    expect(r.matched).toBe(3);
    expect(r.missing.map((l) => l.id)).toEqual(['d', 'e']);
  });

  it('adds up two detention lines for one load', () => {
    const r = marksFromSettlement([load('a', '111')], defaultRules, {
      found: true,
      note: '',
      loads: [
        { number: '111', detention: owed / 2 },
        { number: '111', detention: owed / 2 },
      ],
    });
    expect(r.marks.a).toEqual({ m: 'paid' });
  });

  it('skips loads that stayed in free time', () => {
    const quick: WeekLoad = { ...load('q', '555'), leave: 8 * 60 + 30 };
    const r = marksFromSettlement([quick], defaultRules, { found: true, note: '', loads: [{ number: '555', detention: null }] });
    expect(r.marks).toEqual({});
    expect(r.matched).toBe(0);
  });
});
