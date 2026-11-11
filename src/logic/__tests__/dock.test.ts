import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { durShort, rateShort } from '../format';
import { applyFix, dockTimeline, freshStop, stepFix, type Stop } from '../stop';

const t = (h: number, m: number) => h * 60 + m;
const atDock = (over: Partial<Stop> = {}): Stop => ({ ...freshStop(), phase: 'dock', arrive: t(13, 48), ...over });

describe('dockTimeline (Figma C3 Timeline / Event states)', () => {
  it('during free time: arrived done, check-in current with a button, detention upcoming', () => {
    const ev = dockTimeline(atDock(), t(14, 30), defaultRules);
    expect(ev.map((e) => e.title)).toEqual(['Arrived at gate', 'Appointment time', 'Checked in', 'Free time ends', 'Detention']);
    expect(ev.map((e) => e.state)).toEqual(['done', 'done', 'current', 'current', 'upcoming']);
    expect(ev[2].canCheckIn).toBe(true);
    expect(ev[3].time).toBe('4:00 PM');
    expect(ev[4].segment).toBe('none');
  });

  it('before the appointment the clock has not started', () => {
    const ev = dockTimeline(atDock(), t(13, 50), defaultRules);
    expect(ev[1].state).toBe('upcoming');
    expect(ev[3].state).toBe('upcoming');
  });

  it('in detention (Figma C3): free time ends done on a paid segment, detention current at 21m', () => {
    const ev = dockTimeline(atDock({ checkin: t(13, 49) }), t(16, 21), defaultRules);
    expect(ev.map((e) => e.state)).toEqual(['done', 'done', 'done', 'done', 'current']);
    expect(ev[2].time).toBe('1:49 PM');
    expect(ev[3].segment).toBe('paid');
    expect(ev[4].time).toBe('21m');
    expect(ev[4].detail).toBe('$30.00 an hour');
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

describe('short formats', () => {
  it('formats free time and rate like the Figma copy', () => {
    expect(durShort(120)).toBe('2h');
    expect(durShort(90)).toBe('1h 30m');
    expect(rateShort(30)).toBe('$30/hr');
    expect(rateShort(27.5)).toBe('$27.50/hr');
  });
});
