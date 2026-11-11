import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { APPT } from '../sampleData';
import { parseState, freshState } from '../state';
import { freshStop, islandStage, sampleBolTimes, stopCalc, type Stop } from '../stop';

const atDock = (arrive: number): Stop => ({ ...freshStop(), phase: 'dock', arrive });

describe('stopCalc', () => {
  it('uses now as the leave time while still at the dock', () => {
    const c = stopCalc(atDock(13 * 60 + 48), 16 * 60 + 21, defaultRules);
    expect(c.owed).toBe(10.5);
    expect(c.wait).toBe(153);
  });
  it('uses the logged leave time once left', () => {
    const st: Stop = { ...atDock(13 * 60 + 48), phase: 'logged', leave: 16 * 60 + 21 };
    expect(stopCalc(st, 23 * 60, defaultRules).owed).toBe(10.5);
  });
});

describe('islandStage (Dynamic Island stages 1–5)', () => {
  const arrive = 13 * 60 + 48;
  const freeEnd = APPT + defaultRules.free;
  it('free time → detention starts → detention running', () => {
    expect(islandStage(atDock(arrive), arrive + 1, defaultRules, false)).toBe(1);
    expect(islandStage(atDock(arrive), freeEnd, defaultRules, false)).toBe(2);
    expect(islandStage(atDock(arrive), freeEnd + 5, defaultRules, false)).toBe(3);
  });
  it('left facility, then stop logged only while the summary is open', () => {
    expect(islandStage({ ...atDock(arrive), phase: 'left' }, 0, defaultRules, false)).toBe(4);
    expect(islandStage({ ...atDock(arrive), phase: 'logged' }, 0, defaultRules, true)).toBe(5);
    expect(islandStage({ ...atDock(arrive), phase: 'logged' }, 0, defaultRules, false)).toBe(0);
    expect(islandStage(freshStop(), 0, defaultRules, false)).toBe(0);
  });
});

describe('sampleBolTimes', () => {
  it('reads times two minutes inside the location times, only with a BOL', () => {
    const st: Stop = { ...atDock(100), leave: 300, phase: 'logged', bol: true };
    expect(sampleBolTimes(st)).toEqual({ in: 102, out: 298 });
    expect(sampleBolTimes({ ...st, bol: false })).toBeNull();
  });
});

describe('parseState', () => {
  it('falls back to a fresh state for missing or broken data', () => {
    expect(parseState(null)).toEqual(freshState());
    expect(parseState('{not json')).toEqual(freshState());
    expect(parseState('{"foo":1}')).toEqual(freshState());
  });
  it('fills in fields added since the data was saved', () => {
    const s = parseState(JSON.stringify({ rules: defaultRules, company: 'Keel Logistics' }));
    expect(s.company).toBe('Keel Logistics');
    expect(s.sort).toBe('wait');
  });
});
