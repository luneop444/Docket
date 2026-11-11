import { describe, expect, it } from '@jest/globals';
import { calc, rulesLine, type Rules } from '../detention';
import { clock, dur, hm, money } from '../format';

const t = (h: number, m: number) => h * 60 + m;
const northbound: Rules = { free: 120, start: 'appt', rate: 30, breaksCount: false };

describe('calc (detention math)', () => {
  it('Harbor Foods today: arrived early, clock waits for the 2:00 appointment', () => {
    // Figma C3/C6: arrived 1:48, appt 2:00, left 4:21 → free time ends 4:00, 21m, $10.50, waited 2h 33m
    const c = calc(t(13, 48), t(14, 0), t(16, 21), 0, northbound);
    expect(c.start).toBe(t(14, 0));
    expect(c.freeEnd).toBe(t(16, 0));
    expect(c.paidMin).toBe(21);
    expect(c.owed).toBe(10.5);
    expect(c.wait).toBe(153);
  });

  it('Keystone: early arrival, 6:30 appointment → 1h 02m, $31.00', () => {
    const c = calc(t(6, 2), t(6, 30), t(9, 32), 0, northbound);
    expect(c.paidMin).toBe(62);
    expect(c.owed).toBe(31);
  });

  it('Lehigh: clock starts on arrival when you arrive at or after the appointment → 3h 45m, $112.50', () => {
    const c = calc(t(13, 15), t(13, 15), t(19, 0), 0, northbound);
    expect(c.paidMin).toBe(225);
    expect(c.owed).toBe(112.5);
  });

  it('arriving late starts the clock at arrival, not the appointment', () => {
    const c = calc(t(14, 30), t(14, 0), t(17, 0), 0, northbound);
    expect(c.start).toBe(t(14, 30));
    expect(c.paidMin).toBe(30);
  });

  it('"arrival" rules ignore the appointment', () => {
    const c = calc(t(13, 48), t(14, 0), t(16, 21), 0, { ...northbound, start: 'arrival' });
    expect(c.freeEnd).toBe(t(15, 48));
    expect(c.paidMin).toBe(33);
    expect(c.owed).toBe(16.5);
  });

  it('nothing is owed inside free time', () => {
    const c = calc(t(10, 5), t(10, 0), t(11, 40), 0, northbound);
    expect(c.paidMin).toBe(0);
    expect(c.owed).toBe(0);
  });

  it('subtracts off-duty breaks when they do not count, never below zero', () => {
    const c = calc(t(13, 48), t(14, 0), t(16, 21), 15, northbound);
    expect(c.minus).toBe(15);
    expect(c.paidMin).toBe(6);
    expect(c.owed).toBe(3);
    const big = calc(t(13, 48), t(14, 0), t(16, 21), 90, northbound);
    expect(big.minus).toBe(21);
    expect(big.paidMin).toBe(0);
  });

  it('keeps breaks when the company counts them', () => {
    const c = calc(t(13, 48), t(14, 0), t(16, 21), 15, { ...northbound, breaksCount: true });
    expect(c.minus).toBe(0);
    expect(c.paidMin).toBe(21);
  });

  it('pays per minute at rate / 60, rounded to cents', () => {
    const c = calc(0, 0, 120 + 7, 0, { ...northbound, rate: 25 });
    expect(c.owed).toBe(2.92); // 7 × 25/60 = 2.9166…
  });
});

describe('formatting', () => {
  it('formats clock times', () => {
    expect(clock(t(13, 48))).toBe('1:48 PM');
    expect(clock(t(0, 5))).toBe('12:05 AM');
    expect(clock(t(12, 0))).toBe('12:00 PM');
  });
  it('formats durations and timers', () => {
    expect(dur(153)).toBe('2h 33m');
    expect(dur(120)).toBe('2h 00m');
    expect(dur(21)).toBe('21m');
    expect(dur(-5)).toBe('0m');
    expect(hm(153)).toBe('2:33');
  });
  it('formats money', () => {
    expect(money(10.5)).toBe('$10.50');
    expect(money(208.5)).toBe('$208.50');
  });
  it('describes the rules (no "2hh" typo from v1)', () => {
    expect(rulesLine(northbound)).toBe('2h 00m free from appointment time, then $30.00 an hour');
  });
});
