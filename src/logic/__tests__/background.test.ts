import { describe, expect, it } from '@jest/globals';
import {
  fenceAction,
  fenceNotice,
  fenceRegions,
  MAX_FENCES,
  planFence,
  stopReminders,
  type FenceContext,
} from '../background';
import { defaultRules } from '../detention';
import { freshStop, startLiveStop } from '../stop';

const idle: FenceContext = { watched: 'Harbor Foods DC', phase: 'idle', live: false };
const docked: FenceContext = { watched: 'Harbor Foods DC', phase: 'dock', live: true };
const at = (h: number, m: number) => new Date(2026, 10, 14, h, m).getTime();

describe('fenceRegions', () => {
  it('puts the watched stop first and keeps to the iOS limit', () => {
    const coords = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`Place ${i}`, { lat: i, lon: -i }]));
    const r = fenceRegions(coords, 'Place 24');
    expect(r).toHaveLength(MAX_FENCES);
    expect(r[0]).toMatchObject({ identifier: 'Place 24', latitude: 24, longitude: -24 });
  });
  it('is empty with no saved places', () => {
    expect(fenceRegions({}, 'X')).toEqual([]);
  });
});

describe('fenceAction', () => {
  it('pulling into the watched stop starts the clock', () => {
    expect(fenceAction(idle, { type: 'enter', place: 'Harbor Foods DC', at: 0 })).toBe('arrive');
  });
  it('ignores other facilities, no load, and a stop already running', () => {
    expect(fenceAction(idle, { type: 'enter', place: 'Lehigh Grocery DC', at: 0 })).toBeNull();
    expect(fenceAction({ ...idle, watched: null }, { type: 'enter', place: 'Harbor Foods DC', at: 0 })).toBeNull();
    expect(fenceAction(docked, { type: 'enter', place: 'Harbor Foods DC', at: 0 })).toBeNull();
  });
  it('driving out of a live stop asks; a prototype stop is left alone', () => {
    expect(fenceAction(docked, { type: 'exit', place: 'Harbor Foods DC', at: 0 })).toBe('left');
    expect(fenceAction({ ...docked, live: false }, { type: 'exit', place: 'Harbor Foods DC', at: 0 })).toBeNull();
    expect(fenceAction(idle, { type: 'exit', place: 'Harbor Foods DC', at: 0 })).toBeNull();
  });
});

describe('planFence', () => {
  it('pulled in and drove out while closed: start at the real time, then ask', () => {
    const plan = planFence(idle, [
      { type: 'exit', place: 'Harbor Foods DC', at: at(16, 21) },
      { type: 'enter', place: 'Harbor Foods DC', at: at(13, 48) },
    ]);
    expect(plan).toEqual([
      { action: 'arrive', at: at(13, 48) },
      { action: 'left', at: at(16, 21) },
    ]);
  });
  it('stops after asking, and ignores a second entry', () => {
    const plan = planFence(idle, [
      { type: 'enter', place: 'Harbor Foods DC', at: 1 },
      { type: 'enter', place: 'Harbor Foods DC', at: 2 },
      { type: 'exit', place: 'Harbor Foods DC', at: 3 },
      { type: 'enter', place: 'Harbor Foods DC', at: 4 },
    ]);
    expect(plan.map((p) => p.action)).toEqual(['arrive', 'left']);
  });
});

describe('fenceNotice', () => {
  it('says what happened and when', () => {
    expect(fenceNotice('arrive', 'Harbor Foods', at(13, 48))).toEqual({
      title: 'Clock started at Harbor Foods',
      body: 'Docket saw you pull in at 1:48 PM. Open it to check in or undo.',
    });
    expect(fenceNotice('left', 'Harbor Foods', at(16, 21)).title).toBe('Left Harbor Foods?');
  });
});

describe('stopReminders', () => {
  const rules = { ...defaultRules, start: 'arrival' as const, free: 120 };
  it('15 minutes before free time ends, and when detention starts', () => {
    const stop = startLiveStop(at(13, 48), 14 * 60);
    const r = stopReminders(stop, rules, 'Harbor Foods', at(13, 49));
    expect(r.map((x) => [x.id, new Date(x.at).getHours(), new Date(x.at).getMinutes()])).toEqual([
      ['free-soon', 15, 33],
      ['detention', 15, 48],
    ]);
    expect(r[0].body).toContain('3:48 PM');
  });
  it('drops reminders already past', () => {
    const stop = startLiveStop(at(13, 48), 14 * 60);
    expect(stopReminders(stop, rules, 'Harbor Foods', at(15, 40)).map((x) => x.id)).toEqual(['detention']);
  });
  it('nothing for a prototype stop or when not at the dock', () => {
    expect(stopReminders({ ...freshStop(), phase: 'dock', arrive: 600 }, rules, 'X', 0)).toEqual([]);
    expect(stopReminders(freshStop(), rules, 'X', 0)).toEqual([]);
  });
});
