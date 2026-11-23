/**
 * Today's stop: its phases, the numbers for it, and the Dynamic Island stage.
 */
import { calc, type Rules } from './detention';
import { clock, dur } from './format';
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
  /** Times read off the BOL photo (minutes, on the same scale as `arrive`), and what the reader said. */
  bolTimes?: BolTimes;
}

export interface BolTimes {
  in: number | null;
  out: number | null;
  note: string;
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

/** "14:05" → 845, or null. */
export function parseHHMM(s: string | null | undefined): number | null {
  const m = s?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** A time of day placed on the same day as `near` (or the day after/before), whichever is closest. */
export function alignToStop(m: number, near: number): number {
  return [m - 1440, m, m + 1440].reduce((best, x) => (Math.abs(x - near) < Math.abs(best - near) ? x : best));
}

/** Turn the reader's "HH:MM" answer into stop times. */
export function bolFromReading(stop: Stop, r: { in: string | null; out: string | null; note: string }): BolTimes {
  const i = parseHHMM(r.in);
  const o = parseHHMM(r.out);
  return {
    in: i == null ? null : alignToStop(i, stop.arrive ?? i),
    out: o == null ? null : alignToStop(o, stop.leave ?? stop.arrive ?? o),
    note: r.note,
  };
}

/** BOL times to show: what was read, or the sample result for a prototype stop with a photo. */
export function bolTimesOf(stop: Stop): { in: number | null; out: number | null; sample: boolean } | null {
  if (stop.bolTimes) return { in: stop.bolTimes.in, out: stop.bolTimes.out, sample: false };
  const s = stop.live ? null : sampleBolTimes(stop);
  return s ? { ...s, sample: true } : null;
}

/** Largest gap in minutes between location and BOL times, or null if there's nothing to compare. */
export function bolGap(stop: Stop): number | null {
  const b = bolTimesOf(stop);
  if (!b) return null;
  const gaps = [
    b.in != null && stop.arrive != null ? Math.abs(b.in - stop.arrive) : null,
    b.out != null && stop.leave != null ? Math.abs(b.out - stop.leave) : null,
  ].filter((g): g is number => g != null);
  return gaps.length ? Math.max(...gaps) : null;
}

export interface DockEvent {
  title: string;
  detail: string;
  time?: string;
  state: 'done' | 'current' | 'upcoming';
  segment: 'free' | 'paid' | 'upcoming' | 'none';
  /**
   * How much of a free rail is behind you, 0 to 1, when the present sits on it (free time
   * running toward the next timed step); the rest is still ahead. Absent means all of it.
   */
  fill?: number;
  /** Figma "Icon/Timeline/…" for the node. */
  icon: 'pin' | 'clock' | 'check' | 'hourglass' | 'dollar';
  /** The "I checked in" button. */
  canCheckIn?: boolean;
}

type EventState = DockEvent['state'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * How a time on this stop is written. A stop that runs past midnight puts the day on every
 * time ("Mon 1:12 PM", "Tue 5:56 AM"), so an early-morning check-in can't read as before
 * the arrival. A live stop dates from its own day; the demo clock counts "now" as today.
 */
export function stopTime(stop: Stop, now: number): (m: number) => string {
  const arrive = stop.arrive ?? now;
  if (Math.floor(now / 1440) === Math.floor(arrive / 1440)) return clock;
  const base = stop.dayStart ?? localMidnight(Date.now()) - Math.floor(now / 1440) * 86400000;
  return (m) => `${WEEKDAYS[new Date(base + m * 60000).getDay()]} ${clock(m)}`;
}

/** 60 → "1 hour", 120 → "2 hours", 90 → "1h 30m" */
function freeWords(m: number): string {
  if (m > 0 && m % 60 === 0) return `${m / 60} hour${m === 60 ? '' : 's'}`;
  return dur(m);
}

/** Events for the At the dock timeline (Figma C3), in display order. */
export function dockTimeline(stop: Stop, now: number, rules: Rules): DockEvent[] {
  const arrive = stop.arrive ?? now;
  const c = stopCalc(stop, now, rules);
  const inDetention = now >= c.freeEnd;
  const fromAppt = rules.start === 'appt';
  const at = stopTime(stop, now);
  // `when` is the minute it happened; only done events have one, and they're listed in that order.
  const events: (Omit<DockEvent, 'segment'> & { when?: number; due?: number })[] = [
    { title: 'Arrived at gate', detail: 'From your location', time: at(arrive), state: 'done', icon: 'pin', when: arrive },
  ];
  if (fromAppt) {
    const reached = now >= apptOf(stop);
    events.push({
      title: 'Appointment time',
      detail: 'Your company starts the clock here',
      time: at(apptOf(stop)),
      state: reached ? 'done' : 'upcoming',
      icon: 'clock',
      when: reached ? apptOf(stop) : undefined,
      due: apptOf(stop),
    });
  }
  const checked = stop.checkin != null;
  events.push({
    title: 'Checked in',
    detail: checked ? 'You tapped at the dock' : 'Tap when you check in at the window',
    time: checked ? at(stop.checkin as number) : undefined,
    state: checked ? 'done' : 'current',
    icon: 'check',
    canCheckIn: !checked,
    when: checked ? (stop.checkin as number) : undefined,
  });
  events.push({
    title: 'Free time ends',
    detail: `${freeWords(rules.free)} free after ${fromAppt ? 'appointment' : 'arrival'}`,
    time: at(c.freeEnd),
    state: inDetention ? 'done' : 'upcoming',
    icon: 'hourglass',
    when: inDetention ? c.freeEnd : undefined,
    due: c.freeEnd,
  });
  // The rate is on the status line above; this row says how long, and that it's now.
  const detention: Omit<DockEvent, 'segment'> & { when?: number; due?: number } = {
    title: 'Detention',
    detail: inDetention ? `${dur(c.paidMin)} so far` : 'Starts after free time',
    time: inDetention ? 'Now' : undefined,
    state: inDetention ? 'current' : 'upcoming',
    icon: 'dollar',
  };
  // What happened, in the order it happened; then what hasn't, in the order it will.
  const done = events.filter((e) => e.state === 'done').sort((a, b) => (a.when as number) - (b.when as number));
  const rest = events.filter((e) => e.state !== 'done');
  const list = [...done, ...rest, detention];
  // Only one point is lit: detention once it runs, then check-in until it's tapped (Figma 08),
  // then the next step not done yet.
  const lit = inDetention
    ? list.length - 1
    : !checked
      ? list.findIndex((e) => e.canCheckIn)
      : list.findIndex((e) => e.state !== 'done');
  // The rail under each point says two things. Solid is time behind you, dotted is still ahead,
  // so the path up to the lit point reads the same in every stage. A solid rail's colour is the
  // time bar's: grey for free time, black once detention runs (Figma 08 and 09). Where free time
  // is running toward the next timed step, that rail is solid as far as now and dotted after.
  const since = Math.max(...done.map((e) => e.when as number));
  const behind = (when: number | undefined, title: string): DockEvent['segment'] =>
    (when as number) >= c.freeEnd ? 'paid' : now >= c.start || title !== 'Arrived at gate' ? 'free' : 'upcoming';
  let running = false;
  return list.map(({ when, due, ...e }, i): DockEvent => {
    const state: EventState = e.state === 'done' ? 'done' : i === lit ? 'current' : 'upcoming';
    const next = list[i + 1];
    if (!next) return { ...e, state, segment: 'none' };
    // The present is on this rail: free time counting toward the next timed step.
    if (!running && i <= lit && next.due != null && now < next.due && now >= c.start && now >= since) {
      running = true;
      const fill = Math.min(1, Math.max(0, (now - since) / (next.due - since)));
      return { ...e, state, segment: 'free', fill };
    }
    // Everything above the lit point is behind you, a step you never tapped included.
    if (i < lit) return { ...e, state, segment: behind(when ?? (inDetention ? c.freeEnd : now), e.title) };
    return { ...e, state, segment: 'upcoming' };
  });
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
