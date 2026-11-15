/**
 * What the phone does while Docket is closed: which facilities to fence,
 * what a fence crossing means for the stop, and which reminders to schedule.
 * No UI or native imports, so it runs in the background task and in tests.
 */
import type { Rules } from './detention';
import { clock } from './format';
import type { LatLon } from './geo';
import { stopCalc, type Stop } from './stop';

/** iOS watches at most 20 regions per app. */
export const MAX_FENCES = 20;
/** One radius for in and out: between the foreground watcher's 250 m in and 600 m out. */
export const FENCE_RADIUS_M = 300;

export interface Fence {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
}

/** The watched stop first, then the other saved facilities, up to the iOS limit. */
export function fenceRegions(placeCoords: Record<string, LatLon>, watched: string | null): Fence[] {
  const names = Object.keys(placeCoords).sort((a, b) => (a === watched ? -1 : b === watched ? 1 : 0));
  return names.slice(0, MAX_FENCES).map((name) => ({
    identifier: name,
    latitude: placeCoords[name].lat,
    longitude: placeCoords[name].lon,
    radius: FENCE_RADIUS_M,
  }));
}

/** A fence crossing saved by the background task, applied when Docket opens. */
export interface FenceRecord {
  type: 'enter' | 'exit';
  place: string;
  /** Epoch ms. */
  at: number;
}

/** Only what the task needs to know about the app's saved state. */
export interface FenceContext {
  /** The facility Docket is watching (the load's last drop), or null with no load. */
  watched: string | null;
  phase: Stop['phase'];
  live: boolean;
}

export type FenceAction = 'arrive' | 'left' | null;

/** Pulling into the watched stop starts the clock; driving out of a live stop asks if you left. */
export function fenceAction(ctx: FenceContext, r: FenceRecord): FenceAction {
  if (!ctx.watched || r.place !== ctx.watched) return null;
  if (r.type === 'enter' && ctx.phase === 'idle') return 'arrive';
  if (r.type === 'exit' && ctx.phase === 'dock' && ctx.live) return 'left';
  return null;
}

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return clock(d.getHours() * 60 + d.getMinutes());
};

/** The notification shown when a crossing happens with Docket closed. */
export function fenceNotice(action: Exclude<FenceAction, null>, short: string, at: number): { title: string; body: string } {
  return action === 'arrive'
    ? { title: `Clock started at ${short}`, body: `Docket saw you pull in at ${timeOf(at)}. Open it to check in or undo.` }
    : { title: `Left ${short}?`, body: `Docket saw you drive out at ${timeOf(at)}. Open it to stop the clock.` };
}

export interface Reminder {
  /** Fixed ids, so scheduling again replaces instead of piling up. */
  id: 'free-soon' | 'detention';
  /** Epoch ms. */
  at: number;
  title: string;
  body: string;
}

export const REMINDER_IDS: Reminder['id'][] = ['free-soon', 'detention'];

/** Reminders for a live stop at the dock, from the real clock. Nothing for prototype stops or times already past. */
export function stopReminders(stop: Stop, rules: Rules, short: string, nowMs: number): Reminder[] {
  if (stop.phase !== 'dock' || !stop.live || stop.dayStart == null || stop.arrive == null) return [];
  const freeEnd = stopCalc(stop, stop.arrive, rules).freeEnd;
  const ms = (min: number) => stop.dayStart! + min * 60000;
  const list: Reminder[] = [
    {
      id: 'free-soon',
      at: ms(freeEnd - 15),
      title: `Free time ends in 15 minutes`,
      body: `At ${short}, detention starts at ${clock(freeEnd % 1440)}. Check in if you haven't.`,
    },
    {
      id: 'detention',
      at: ms(freeEnd),
      title: `Detention started at ${short}`,
      body: `You're past free time. Docket is counting what you're owed.`,
    },
  ];
  return list.filter((r) => r.at > nowMs);
}

/** Walk queued crossings in time order, as if each had been seen live (pulled in, then drove out). */
export function planFence(ctx: FenceContext, records: FenceRecord[]): { action: Exclude<FenceAction, null>; at: number }[] {
  const out: { action: Exclude<FenceAction, null>; at: number }[] = [];
  let c = ctx;
  for (const r of [...records].sort((a, b) => a.at - b.at)) {
    const action = fenceAction(c, r);
    if (!action) continue;
    out.push({ action, at: r.at });
    if (action === 'arrive') c = { ...c, phase: 'dock', live: true };
    else break; // After "left?" the driver decides; later crossings wait for that.
  }
  return out;
}
