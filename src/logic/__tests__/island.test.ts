import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { islandCopy } from '../island';
import { freshStop, type Stop } from '../stop';

const t = (h: number, m: number) => h * 60 + m;
const place = { name: 'Harbor Foods DC', short: 'Harbor Foods', load: '48262' };
const stop = (over: Partial<Stop>): Stop => ({ ...freshStop(), phase: 'dock', arrive: t(13, 48), ...over });

describe('islandCopy (Figma Live Activity stages)', () => {
  it('stage 0 shows nothing', () => {
    expect(islandCopy(0, freshStop(), 0, defaultRules, place)).toBeNull();
  });
  it('1 · Free time: white countdown, detention starts at 4:00 PM', () => {
    const c = islandCopy(1, stop({}), t(14, 2), defaultRules, place)!;
    expect(c.compact).toBe('1:58');
    expect(c.compactLime).toBe(false);
    expect(c.line).toBe('Detention starts at 4:00 PM');
    expect(c.lockLine).toBe('Detention starts at 4:00 PM · $30/hr after');
  });
  it('2 · Detention starts: $0.00 in lime, logging every minute', () => {
    const c = islandCopy(2, stop({}), t(16, 0), defaultRules, place)!;
    expect(c.compact).toBe('$0.00');
    expect(c.compactLime).toBe(true);
    expect(c.line).toBe('Logging every minute at $30/hr');
  });
  it('3 · Detention running: $10.50 after 2:33 waited', () => {
    const c = islandCopy(3, stop({}), t(16, 21), defaultRules, place)!;
    expect(c.value).toBe('$10.50');
    expect(c.line).toBe('2:33 waited · $30/hr');
    expect(c.lockLine).toBe('2:33 waited · started 4:00 PM');
  });
  it('4 · Left facility: "Out 4:21", tap to snap the BOL', () => {
    const c = islandCopy(4, stop({ phase: 'left', leave: t(16, 21) }), t(16, 21), defaultRules, place)!;
    expect(c.compact).toBe('Out 4:21');
    expect(c.title).toBe('You left Harbor Foods');
    expect(c.sub).toBe('2:33 waited · Load 48262');
  });
  it('5 · Stop logged: "✓ $10.50"', () => {
    const c = islandCopy(5, stop({ phase: 'logged', leave: t(16, 21) }), t(16, 24), defaultRules, place)!;
    expect(c.compact).toBe('✓ $10.50');
    expect(c.line).toBe('Docket will check it against your settlement');
  });
});
