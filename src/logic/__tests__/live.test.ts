import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { freshStop, localMidnight, minutesSince, startLiveStop, stopCalc, stopNow } from '../stop';

const at = (h: number, m: number, day = 3) => new Date(2026, 10, day, h, m, 0, 0).getTime();

describe('live stops (real clock)', () => {
  it('starts at the real minute of the day', () => {
    const st = startLiveStop(at(13, 48), 14 * 60);
    expect(st.live).toBe(true);
    expect(st.phase).toBe('dock');
    expect(st.arrive).toBe(13 * 60 + 48);
    expect(st.appt).toBe(14 * 60);
    expect(st.dayStart).toBe(localMidnight(at(13, 48)));
  });

  it('counts real minutes, past midnight too', () => {
    const st = startLiveStop(at(23, 30), 23 * 60);
    expect(stopNow(st, 0, at(23, 45))).toBe(23 * 60 + 45);
    expect(stopNow(st, 0, at(0, 15, 4))).toBe(24 * 60 + 15);
    expect(minutesSince(st.dayStart!, at(0, 15, 4)) - st.arrive!).toBe(45);
  });

  it('reads an early-morning appointment after a late arrival as the next day', () => {
    expect(startLiveStop(at(22, 0), 60).appt).toBe(24 * 60 + 60);
    expect(startLiveStop(at(6, 0), 5 * 60).appt).toBe(5 * 60);
  });

  it('keeps the simulated clock for prototype stops', () => {
    expect(stopNow(freshStop(), 900, at(10, 0))).toBe(900);
  });

  it('owes detention from real time', () => {
    const st = startLiveStop(at(14, 0), 14 * 60);
    const now = stopNow(st, 0, at(16, 30)); // 2h free, 30m paid
    expect(stopCalc(st, now, defaultRules).paidMin).toBe(30);
  });
});
