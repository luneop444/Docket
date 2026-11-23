import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { SAMPLE_SETTLEMENT, WEEK, WEEK_LABEL } from '../sampleData';
import { claimText, cleanAmount, formatAmount, isFlagged, typeAmount, weekTotals } from '../settlement';

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

describe('typeAmount (the detention total field)', () => {
  it('takes digits and one decimal point without complaint', () => {
    expect(typeAmount('22.65')).toEqual({ value: '22.65', error: null });
    expect(typeAmount('$1,234.50')).toEqual({ value: '1234.50', error: null });
    expect(typeAmount('.5')).toEqual({ value: '0.5', error: null });
    expect(typeAmount('007')).toEqual({ value: '7', error: null });
  });
  it('refuses letters and symbols with a message, keeping the digits', () => {
    expect(typeAmount('22a')).toEqual({ value: '22', error: 'Enter a number, like 22.65' });
    expect(typeAmount('abc').value).toBe('');
    expect(typeAmount('-5').error).toBe('Enter a number, like 22.65');
  });
  it('stops at one point, two cents places and five dollar digits', () => {
    expect(typeAmount('22.6.5')).toEqual({ value: '22.65', error: 'Use one decimal point, like 22.65' });
    expect(typeAmount('22.655')).toEqual({ value: '22.65', error: 'Cents only go two places, like 22.65' });
    expect(typeAmount('123456')).toEqual({ value: '12345', error: 'That’s over $99,999. Check the number' });
  });
});

describe('formatAmount', () => {
  it('fills in the cents when the field is left', () => {
    expect(formatAmount('22')).toBe('22.00');
    expect(formatAmount('22.5')).toBe('22.50');
    expect(formatAmount('0.')).toBe('0.00');
    expect(formatAmount('')).toBe('');
  });
});
