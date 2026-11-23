import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { durShort, rateShort } from '../format';
import { loadAppt, watchedStop } from '../state';
import { applyFix, dockTimeline, freshStop, shiftStop, stepFix, type Stop } from '../stop';

const t = (h: number, m: number) => h * 60 + m;
const atDock = (over: Partial<Stop> = {}): Stop => ({ ...freshStop(), phase: 'dock', arrive: t(13, 48), ...over });

describe('dockTimeline (Figma C3 Timeline / Event states)', () => {
  it('during free time: arrived done, check-in current with a button, detention upcoming', () => {
    const ev = dockTimeline(atDock(), t(14, 30), defaultRules);
    expect(ev.map((e) => e.title)).toEqual(['Arrived at gate', 'Appointment time', 'Checked in', 'Free time ends', 'Detention']);
    expect(ev.map((e) => e.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(ev[2].canCheckIn).toBe(true);
    expect(ev[3].time).toBe('4:00 PM');
    expect(ev[4].segment).toBe('none');
  });

  it('after check-in, free time ends is the one lit point', () => {
    const ev = dockTimeline(atDock({ checkin: t(13, 49) }), t(14, 30), defaultRules);
    expect(ev.map((e) => e.state)).toEqual(['done', 'done', 'done', 'current', 'upcoming']);
  });

  it('never lights more than one point', () => {
    for (let now = t(13, 48); now <= t(17, 0); now += 7) {
      for (const checkin of [null, t(13, 49)]) {
        const ev = dockTimeline(atDock({ checkin }), now, defaultRules);
        expect(ev.filter((e) => e.state === 'current')).toHaveLength(1);
      }
    }
  });

  it('before the appointment the clock has not started', () => {
    const ev = dockTimeline(atDock(), t(13, 50), defaultRules);
    expect(ev[1].state).toBe('upcoming');
    expect(ev[3].state).toBe('upcoming');
  });

  it('in detention (Figma C3): events in the order they happened, detention now', () => {
    const ev = dockTimeline(atDock({ checkin: t(13, 49) }), t(16, 21), defaultRules);
    expect(ev.map((e) => e.title)).toEqual(['Arrived at gate', 'Checked in', 'Appointment time', 'Free time ends', 'Detention']);
    expect(ev.map((e) => e.state)).toEqual(['done', 'done', 'done', 'done', 'current']);
    expect(ev[1].time).toBe('1:49 PM');
    expect(ev[3].segment).toBe('paid');
    expect(ev[4].time).toBe('Now');
    expect(ev[4].detail).toBe('21m so far');
  });

  it('a stop past midnight lists the late check-in after free time, with days on every time', () => {
    const rules = { ...defaultRules, start: 'arrival' as const, free: 60, rate: 25 };
    const day = new Date(2026, 10, 16).getTime(); // Mon Nov 16
    const st = atDock({ arrive: t(13, 12), checkin: 24 * 60 + t(5, 56), dayStart: day });
    const ev = dockTimeline(st, 24 * 60 + t(6, 6), rules);
    expect(ev.map((e) => e.title)).toEqual(['Arrived at gate', 'Free time ends', 'Checked in', 'Detention']);
    expect(ev.map((e) => e.time)).toEqual(['Mon 1:12 PM', 'Mon 2:12 PM', 'Tue 5:56 AM', 'Now']);
    expect(ev.map((e) => e.segment)).toEqual(['free', 'paid', 'paid', 'none']);
    expect(ev[1].detail).toBe('1 hour free after arrival');
  });

  it('arrival rules have no appointment event', () => {
    const ev = dockTimeline(atDock(), t(14, 0), { ...defaultRules, start: 'arrival' });
    expect(ev.map((e) => e.title)).not.toContain('Appointment time');
    expect(ev.find((e) => e.title === 'Free time ends')?.time).toBe('3:48 PM');
  });
});

describe('Fix a time', () => {
  it('steps times by a minute and breaks by 15, never past zero', () => {
    const d = { arrive: 100, leave: 300, brk: 0 };
    expect(stepFix(d, 'arrive', -1).arrive).toBe(99);
    expect(stepFix(d, 'brk', 1).brk).toBe(15);
    expect(stepFix(d, 'brk', -1).brk).toBe(0);
  });
  it('keeps leave after arrive', () => {
    expect(stepFix({ arrive: 100, leave: 101, brk: 0 }, 'leave', -1).leave).toBe(101);
    expect(stepFix({ arrive: 100, leave: 101, brk: 0 }, 'arrive', 1).leave).toBe(102);
  });
  it('has no leave time while still at the dock', () => {
    const d = { arrive: 100, leave: null, brk: 0 };
    expect(stepFix(d, 'leave', 1)).toBe(d);
  });
  it('keeps the original GPS times the first time anything changes', () => {
    const st: Stop = { ...atDock(), leave: t(16, 21), phase: 'logged' };
    const fixed = applyFix(st, { arrive: t(13, 50), leave: t(16, 21), brk: 0 });
    expect(fixed.arrive).toBe(t(13, 50));
    expect(fixed.edited).toEqual({ arrive: t(13, 48), leave: t(16, 21) });
    const again = applyFix(fixed, { arrive: t(13, 55), leave: t(16, 21), brk: 0 });
    expect(again.edited).toEqual({ arrive: t(13, 48), leave: t(16, 21) });
  });
  it('fixing the arrival while at the dock keeps leave empty', () => {
    const fixed = applyFix(atDock(), { arrive: t(13, 45), leave: null, brk: 0 });
    expect(fixed.leave).toBeNull();
    expect(fixed.edited?.arrive).toBe(t(13, 48));
  });
});

describe('appointment from the load (Fix a stop)', () => {
  it('moves one stop by 15 minutes and stays within the day', () => {
    const stops = [{ at: 6 * 60 }, { at: 14 * 60 }, { at: 0 }];
    expect(shiftStop(stops, 1, 1)[1].at).toBe(14 * 60 + 15);
    expect(shiftStop(stops, 1, 1)[0]).toBe(stops[0]);
    expect(shiftStop(stops, 2, -1)[2].at).toBe(0);
  });
  it('a later appointment moves free time and detention with it', () => {
    const st = atDock({ appt: t(14, 30) });
    const ev = dockTimeline(st, t(16, 21), defaultRules);
    expect(ev[1].time).toBe('2:30 PM');
    expect(ev.find((e) => e.title === 'Free time ends')?.time).toBe('4:30 PM');
    expect(ev.find((e) => e.title === 'Detention')?.state).toBe('upcoming');
  });
  it('the watched stop is the drop; older saved loads fall back to 2:00 PM', () => {
    const load = { number: '1', source: 'share' as const, recurring: false, stops: [
      { name: 'A', kind: 'Pickup' as const, at: 6 * 60 },
      { name: 'B', kind: 'Drop' as const, at: 13 * 60 },
    ] };
    expect(watchedStop(load)?.name).toBe('B');
    expect(loadAppt(load)).toBe(13 * 60);
    expect(loadAppt({ number: '1', source: 'share', recurring: false })).toBe(14 * 60);
    expect(loadAppt(null)).toBe(14 * 60);
  });
});

describe('short formats', () => {
  it('formats free time and rate like the Figma copy', () => {
    expect(durShort(120)).toBe('2h');
    expect(durShort(90)).toBe('1h 30m');
    expect(rateShort(30)).toBe('$30/hr');
    expect(rateShort(27.5)).toBe('$27.50/hr');
  });
});
