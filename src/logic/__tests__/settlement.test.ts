import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { SAMPLE_SETTLEMENT, WEEK, WEEK_LABEL } from '../sampleData';
import { claimText, cleanAmount, isFlagged, weekTotals } from '../settlement';

describe('weekTotals (paycheck check)', () => {
  it('expects $208.50 across 3 loads for the week of Oct 26', () => {
    const w = weekTotals(WEEK, defaultRules, {});
    expect(w.expected).toBe(208.5);
    expect(w.eligible).toBe(3);
    expect(w.checked).toBe(false);
    expect(w.flagged).toHaveLength(0);
  });

  it('flags Keystone (not there) and Lehigh (paid $25) → 2 loads short by $118.50', () => {
    const w = weekTotals(WEEK, defaultRules, SAMPLE_SETTLEMENT);
    expect(w.checked).toBe(true);
    expect(w.flagged.map((f) => f.l.id)).toEqual(['48227', '48240']);
    expect(w.short).toBe(118.5);
  });

  it('nothing is short when every load is marked paid', () => {
    const marks = { '48213': { m: 'paid' as const }, '48227': { m: 'paid' as const }, '48240': { m: 'paid' as const } };
    const w = weekTotals(WEEK, defaultRules, marks);
    expect(w.checked).toBe(true);
    expect(w.short).toBe(0);
  });

  it('"Less" with the full amount or more is not short', () => {
    expect(isFlagged(112.5, { m: 'less', amt: '112.50' })).toBe(false);
    expect(isFlagged(112.5, { m: 'less', amt: '25' })).toBe(true);
    expect(isFlagged(112.5, { m: 'less' })).toBe(true);
    expect(isFlagged(31, { m: 'none' })).toBe(true);
    expect(isFlagged(31, undefined)).toBe(false);
  });

  it('recalculates when the rules change', () => {
    const w = weekTotals(WEEK, { ...defaultRules, rate: 60 }, {});
    expect(w.expected).toBe(417);
  });
});

describe('claimText (message to the fleet manager)', () => {
  it('matches the Figma D2 draft for the sample settlement', () => {
    const text = claimText(weekTotals(WEEK, defaultRules, SAMPLE_SETTLEMENT), defaultRules, WEEK_LABEL);
    expect(text).toContain('Hi, my settlement for the week of Oct 26 doesn’t show the detention I expected for these loads:');
    expect(text).toContain(
      'Load 48227, Keystone Cold Storage (Tue Oct 27): arrived 6:02 AM, left 9:32 AM. That’s 1h 02m past free time, so $31.00 by our policy. It’s not on my settlement.',
    );
    expect(text).toContain(
      'Load 48240, Lehigh Grocery DC (Wed Oct 28): arrived 1:15 PM, left 7:00 PM. That’s 3h 45m past free time, so $112.50 by our policy. My settlement shows $25.00.',
    );
    expect(text).toContain('I have the location and BOL times if you need them. Can you check these? Thanks.');
  });

  it('uses the singular for one load', () => {
    const text = claimText(weekTotals(WEEK, defaultRules, { '48227': { m: 'none' } }), defaultRules, WEEK_LABEL);
    expect(text).toContain('for this load:');
    expect(text).toContain('Can you check this?');
  });
});

describe('cleanAmount', () => {
  it('keeps digits and the decimal point', () => {
    expect(cleanAmount('$25.00 ')).toBe('25.00');
    expect(cleanAmount('abc')).toBe('');
  });
});
