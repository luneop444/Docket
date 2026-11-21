import { describe, expect, it } from '@jest/globals';
import { checkEvents, claimsOf, gotFromSettlement, settlementDue, stageOf, totalEvents, type ClaimEvent } from '../claims';
import { defaultRules } from '../detention';

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

describe('the sample claims', () => {
  const cs = claimsOf([], rules, {});
  it('are the sample week’s loads owed detention, already sent from the dock', () => {
    expect(cs.map((c) => [c.load.name, c.owed])).toEqual([
      ['Harbor Foods DC', 41.4],
      ['Keystone Cold Storage', 27],
      ['Lehigh Grocery DC', 67.5],
    ]);
    expect(cs.every((c) => c.stage === 'waiting')).toBe(true);
  });
  it('are due on the Oct 30 settlement, then Nov 6 for whatever carries over', () => {
    const due = settlementDue(cs, Date.now())!;
    expect(due.label).toBe('Oct 30');
    const evs = checkEvents(due.claims, 'Oct 30', at, { '48213': 41.4, '48240': 25 });
    const logs = Object.fromEntries(cs.map((c) => [c.id, [...c.events, evs[c.id]]]));
    const after = claimsOf([], rules, logs);
    expect(after.filter((c) => c.stage !== 'paid').map((c) => [c.load.name, c.left])).toEqual([
      ['Keystone Cold Storage', 27],
      ['Lehigh Grocery DC', 42.5],
    ]);
    const next = settlementDue(after, Date.now())!;
    expect(next.label).toBe('Nov 6');
    expect(next.claims).toHaveLength(2);
  });
});

describe('checking by the detention total', () => {
  const cs = claimsOf([], rules, {});
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
    const cs = claimsOf([], rules, {});
    const same = (a: string, b: string) => a.replace(/\D/g, '') === b.replace(/\D/g, '');
    const r = gotFromSettlement(cs, [{ number: '#48213', detention: 20 }, { number: '48213', detention: 21.4 }, { number: '48240', detention: null }], same);
    expect(r.got).toEqual({ '48213': 41.4, '48227': 0, '48240': 0 });
    expect(r.unmatched).toEqual([]);
  });
});
