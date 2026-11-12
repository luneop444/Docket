import { describe, expect, it } from '@jest/globals';
import { alignToStop, bolFromReading, bolGap, bolTimesOf, freshStop, parseHHMM, startLiveStop, type Stop } from '../stop';

const live = (arrive: number, leave: number): Stop => ({
  ...startLiveStop(new Date(2026, 10, 12, 0, 0).getTime() + arrive * 60000, arrive),
  leave,
  phase: 'logged',
  bol: true,
});

describe('parseHHMM', () => {
  it('reads 24-hour times', () => {
    expect(parseHHMM('14:05')).toBe(845);
    expect(parseHHMM('7:30')).toBe(450);
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM(null)).toBeNull();
    expect(parseHHMM('2pm')).toBeNull();
  });
});

describe('alignToStop', () => {
  it('puts a time on the stop’s day, or across midnight when closer', () => {
    expect(alignToStop(845, 840)).toBe(845);
    expect(alignToStop(30, 1430)).toBe(1470); // 12:30 AM after a 11:50 PM arrival
    expect(alignToStop(1430, 20)).toBe(-10);
  });
});

describe('BOL reading', () => {
  it('turns the reader’s answer into stop times', () => {
    const st = live(13 * 60 + 48, 17 * 60 + 10);
    const b = bolFromReading(st, { in: '13:52', out: '17:05', note: 'Read both times.' });
    expect(b).toEqual({ in: 832, out: 1025, note: 'Read both times.' });
    expect(bolGap({ ...st, bolTimes: b })).toBe(5);
  });

  it('keeps what it could read', () => {
    const st = live(600, 800);
    const b = bolFromReading(st, { in: null, out: '13:30', note: 'Only the out time is legible.' });
    expect(b.in).toBeNull();
    expect(bolGap({ ...st, bolTimes: b })).toBe(10);
  });

  it('uses the sample reading only for prototype stops', () => {
    const proto: Stop = { ...freshStop(), arrive: 828, leave: 990, bol: true, phase: 'logged' };
    expect(bolTimesOf(proto)).toEqual({ in: 830, out: 988, sample: true });
    expect(bolTimesOf(live(828, 990))).toBeNull(); // real stop, photo not read
  });
});
