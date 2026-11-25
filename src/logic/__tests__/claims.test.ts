import { describe, expect, it } from '@jest/globals';
import { checkEvents, claimsOf, gotFromSettlement, settlementDue, stageOf, totalEvents, type ClaimEvent } from '../claims';
import { defaultRules } from '../detention';
import type { LoggedStop } from '../history';

const rules = { ...defaultRules, free: 120, rate: 18, start: 'arrival' as const };
const at = 1;

describe('stageOf', () => {
  it('moves from unsent to waiting once the claim is sent', () => {
    expect(stageOf([], 41.4).stage).toBe('unsent');
    expect(stageOf([{ k: 'sent', at }], 41.4).stage).toBe('waiting');
  });
  it('is paid once settlements add up to what is owed, even over two', () => {
    const ev: ClaimEvent[] = [{ k: 'sent', at }, { k: 'check', at, label: 'Oct 30', got: 40 }];
    expect(stageOf(ev, 67.5)).toMatchObject({ stage: 'short', paid: 40, missed: 1 });
    expect(stageOf([...ev, { k: 'check', at, label: 'Nov 6', got: 27.5 }], 67.5).stage).toBe('paid');
  });
  it('after asking, waits for the next settlement, then flags it if still short', () => {
    const ev: ClaimEvent[] = [{ k: 'sent', at }, { k: 'check', at, label: 'Oct 30', got: 0 }, { k: 'asked', at }];
    expect(stageOf(ev, 27).stage).toBe('asked');
    const again: ClaimEvent[] = [...ev, { k: 'check', at, label: 'Nov 6', got: 0 }];
    expect(stageOf(again, 27)).toMatchObject({ stage: 'askedShort', missed: 2 });
    expect(stageOf([...again, { k: 'payroll', at }], 27).stage).toBe('payroll');
  });
  it('a whole-settlement shortfall pays nothing toward the claim', () => {
    expect(stageOf([{ k: 'check', at, label: 'Oct 30', got: 0, whole: true }], 27)).toMatchObject({ stage: 'short', paid: 0 });
  });
  it('marking it paid closes it', () => {
    expect(stageOf([{ k: 'check', at, label: 'Oct 30', got: 0 }, { k: 'paid', at }], 27).stage).toBe('paid');
  });
});

/** Three logged stops, a week ago: owed $41.40, $27.00 and $67.50 at $18/hr after 2h from arrival. */
const DAY = new Date(2026, 9, 26).getTime();
const stop = (id: string, place: string, load: string, paidMin: number, d = 0): LoggedStop => ({
  id,
  place,
  load,
  dayStart: DAY + d * 864e5,
  arrive: 13 * 60,
  appt: 13 * 60,
  leave: 13 * 60 + 120 + paidMin,
  brk: 0,
  bol: false,
});
const HISTORY = [
  stop('a', 'Harbor Foods DC', '48213', 138),
  stop('b', 'Keystone Cold Storage', '48227', 90, 1),
  stop('c', 'Lehigh Grocery DC', '48240', 225, 2),
];
const NOW = DAY + 9 * 864e5;

describe('claims from logged stops', () => {
  it('there are none before the driver logs a stop (no made-up week)', () => {
    expect(claimsOf([], rules, {})).toEqual([]);
    expect(settlementDue([], NOW)).toBeNull();
  });
  const cs = claimsOf(HISTORY, rules, {});
  it('are the stops owed detention, not yet sent', () => {
    expect(cs.map((c) => [c.load.name, c.owed])).toEqual([
      ['Harbor Foods DC', 41.4],
      ['Keystone Cold Storage', 27],
      ['Lehigh Grocery DC', 67.5],
    ]);
    expect(cs.every((c) => c.stage === 'unsent')).toBe(true);
  });
  it('are due on a settlement, and whatever is short carries over', () => {
    const due = settlementDue(cs, NOW)!;
    expect(due.claims).toHaveLength(3);
    const evs = checkEvents(due.claims, due.label, NOW, { a: 41.4, c: 25 });
    const logs = Object.fromEntries(cs.map((c) => [c.id, [...c.events, evs[c.id]]]));
    const after = claimsOf(HISTORY, rules, logs);
    expect(after.filter((c) => c.stage !== 'paid').map((c) => [c.load.name, c.left])).toEqual([
      ['Keystone Cold Storage', 27],
      ['Lehigh Grocery DC', 42.5],
    ]);
  });
});

describe('checking by the detention total', () => {
  const cs = claimsOf(HISTORY, rules, {});
  it('enough for every claim: all paid', () => {
    const evs = totalEvents(cs, 'Oct 30', at, 135.9);
    expect(Object.values(evs).every((e) => e.k === 'check' && !e.whole && e.got > 0)).toBe(true);
  });
  it('one load: the total is that load’s, so a short total is a partial payment', () => {
    const evs = totalEvents(cs.slice(0, 1), 'Oct 30', at, 10);
    expect(evs[cs[0].id]).toEqual({ k: 'check', at, label: 'Oct 30', got: 10 });
  });
  it('short: it can’t say which loads, so none count as paid', () => {
    const evs = totalEvents(cs, 'Oct 30', at, 80);
    expect(Object.values(evs).every((e) => e.k === 'check' && e.whole && e.got === 0)).toBe(true);
  });
});

describe('matching a read settlement', () => {
  it('adds up each load’s detention lines by load number, and 0 when it’s not on it', () => {
    const cs = claimsOf(HISTORY, rules, {});
    const same = (a: string, b: string) => a.replace(/\D/g, '') === b.replace(/\D/g, '');
    const r = gotFromSettlement(cs, [{ number: '#48213', detention: 20 }, { number: '48213', detention: 21.4 }, { number: '48240', detention: null }], same);
    expect(r.got).toEqual({ a: 41.4, b: 0, c: 0 });
    expect(r.unmatched).toEqual([]);
  });
});
