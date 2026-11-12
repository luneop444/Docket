/**
 * Today's stop: its phases, the numbers for it, and the Dynamic Island stage.
 */
import { calc, type Rules } from './detention';
import { clock, dur, money } from './format';
import { APPT } from './sampleData';

/**
 * idle → (pull in) → arriving (first visit: "Start the clock?") → dock → left → logged.
 * At a known place, pulling in goes straight to dock (with Undo).
 */
export type StopPhase = 'idle' | 'arriving' | 'dock' | 'left' | 'logged';

export interface Stop {
  phase: StopPhase;
  arrive: number | null;
  checkin: number | null;
  leave: number | null;
  /** Off-duty break minutes. */
  brk: number;
  /** Original location times, kept when the driver fixes a time. */
  edited: { arrive: number; leave: number } | null;
  /** Whether a BOL photo was used. */
  bol: boolean;
  /** Appointment at this stop (minutes after midnight), from the load. Missing in data saved before loads had stops. */
  appt?: number;
  /**
   * Timed with the phone's real clock ("I'm here"), not the prototype's fast
   * clock. Times are then minutes after local midnight of `dayStart`.
   */
  live?: boolean;
  /** Epoch ms of local midnight on the day a live stop started. */
  dayStart?: number;
  /** Live stops: id of its history entry (the epoch ms it started). */
  id?: string;
}

/** Epoch ms of local midnight on the day of `ms`. */
export function localMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minutes after `dayStart` (can pass 24 * 60 when a stop runs past midnight). */
export const minutesSince = (dayStart: number, ms: number): number => (ms - dayStart) / 60000;

/** The current time for a stop: real minutes for a live stop, otherwise the simulated clock. */
export const stopNow = (stop: Stop, simNow: number, ms: number): number =>
  stop.live && stop.dayStart != null ? minutesSince(stop.dayStart, ms) : simNow;

/**
 * Start a live stop at real time `ms`. An appointment that reads more than 12
 * hours before arrival is taken to be after midnight.
 */
export function startLiveStop(ms: number, appt: number): Stop {
  const dayStart = localMidnight(ms);
  const arrive = Math.floor(minutesSince(dayStart, ms));
  return {
    ...freshStop(),
    phase: 'dock',
    live: true,
    id: String(ms),
    dayStart,
    arrive,
    appt: appt + 12 * 60 < arrive ? appt + 24 * 60 : appt,
  };
}

export const apptOf = (stop: Stop): number => stop.appt ?? APPT;

export const freshStop = (): Stop => ({
  phase: 'idle', arrive: null, checkin: null, leave: null, brk: 0, edited: null, bol: false,
});

/** Numbers for today's stop. While at the dock, "leave" is now. */
export function stopCalc(stop: Stop, now: number, rules: Rules) {
  const arrive = stop.arrive ?? now;
  const leave = stop.leave ?? now;
  return calc(arrive, apptOf(stop), leave, stop.brk, rules);
}

/**
 * Dynamic Island / Live Activity stage (Figma "Live Activity · Dynamic Island"):
 * 0 none, 1 free time, 2 detention starts, 3 detention running,
 * 4 left facility, 5 stop logged (only while the summary is open).
 */
export type IslandStage = 0 | 1 | 2 | 3 | 4 | 5;

export function islandStage(stop: Stop, now: number, rules: Rules, onSummary: boolean): IslandStage {
  if (stop.phase === 'dock') {
    const c = stopCalc(stop, now, rules);
    return now >= c.freeEnd ? (now - c.freeEnd < 1.5 ? 2 : 3) : 1;
  }
  if (stop.phase === 'left') return 4;
  if (stop.phase === 'logged' && onSummary) return 5;
  return 0;
}

/** Fake "AI read" of the BOL: facility times a couple of minutes inside the location times. */
export function sampleBolTimes(stop: Stop): { in: number; out: number } | null {
  if (!stop.bol || stop.arrive == null || stop.leave == null) return null;
  return { in: stop.arrive + 2, out: stop.leave - 2 };
}

export interface DockEvent {
  title: string;
  detail: string;
  time?: string;
  state: 'done' | 'current' | 'upcoming';
  segment: 'free' | 'paid' | 'upcoming' | 'none';
  /** The "I checked in" button. */
  canCheckIn?: boolean;
}

/** Events for the At the dock timeline (Figma C3), in display order. */
export function dockTimeline(stop: Stop, now: number, rules: Rules): DockEvent[] {
  const arrive = stop.arrive ?? now;
  const c = stopCalc(stop, now, rules);
  const inDetention = now >= c.freeEnd;
  const fromAppt = rules.start === 'appt';
  const events: DockEvent[] = [
    { title: 'Arrived at gate', detail: 'Location, entered facility', time: clock(arrive), state: 'done', segment: 'free' },
  ];
  if (fromAppt) {
    const reached = now >= apptOf(stop);
    events.push({
      title: 'Appointment time',
      detail: 'Your company starts the clock here',
      time: clock(apptOf(stop)),
      state: reached ? 'done' : 'upcoming',
      segment: reached ? 'free' : 'upcoming',
    });
  }
  const checked = stop.checkin != null;
  events.push({
    title: 'Checked in',
    detail: checked ? 'You tapped, location confirms on site' : 'Tap when you check in at the window',
    time: checked ? clock(stop.checkin as number) : undefined,
    state: checked ? 'done' : 'current',
    segment: checked ? 'free' : 'upcoming',
    canCheckIn: !checked,
  });
  events.push({
    title: 'Free time ends',
    detail: `${dur(rules.free)} free from ${fromAppt ? 'appointment time' : 'arrival'}`,
    time: clock(c.freeEnd),
    state: inDetention ? 'done' : now >= c.start ? 'current' : 'upcoming',
    segment: inDetention ? 'paid' : 'upcoming',
  });
  events.push({
    title: 'Detention',
    detail: inDetention ? `${money(rules.rate)} an hour` : 'Starts after free time',
    time: inDetention ? dur(c.paidMin) : undefined,
    state: inDetention ? 'current' : 'upcoming',
    segment: 'none',
  });
  return events;
}

/** Times being edited in the Fix a time sheet. `leave` is null while still at the dock. */
export interface FixDraft {
  arrive: number;
  leave: number | null;
  brk: number;
}

/** One tap on − or + in Fix a time: a minute for times, 15 minutes for breaks. Leave stays after arrive. */
export function stepFix(d: FixDraft, k: 'arrive' | 'leave' | 'brk', dir: 1 | -1): FixDraft {
  const next = { ...d };
  if (k === 'leave') {
    if (next.leave == null) return d;
    next.leave = Math.max(0, next.leave + dir);
  } else {
    next[k] = Math.max(0, next[k] + dir * (k === 'brk' ? 15 : 1));
  }
  if (next.leave != null && next.leave <= next.arrive) next.leave = next.arrive + 1;
  return next;
}

/** Apply a fix, keeping the original location times the first time anything changes. */
export function applyFix(st: Stop, d: FixDraft): Stop {
  const changed = d.arrive !== st.arrive || (d.leave ?? st.leave) !== st.leave;
  const edited =
    !st.edited && changed && st.arrive != null
      ? { arrive: st.arrive, leave: st.leave ?? d.leave ?? st.arrive }
      : st.edited;
  return { ...st, arrive: d.arrive, leave: d.leave ?? st.leave, brk: d.brk, edited };
}

/** Fix a stop: move one stop's appointment by 15 minutes, staying within the day. */
export function shiftStop<T extends { at: number }>(stops: T[], i: number, dir: 1 | -1): T[] {
  return stops.map((st, j) => (j === i ? { ...st, at: Math.min(24 * 60 - 15, Math.max(0, st.at + dir * 15)) } : st));
}
