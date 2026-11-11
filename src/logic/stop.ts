/**
 * Today's stop: its phases, the numbers for it, and the Dynamic Island stage.
 */
import { calc, type Rules } from './detention';
import { APPT } from './sampleData';

export type StopPhase = 'idle' | 'dock' | 'left' | 'logged';

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
}

export const freshStop = (): Stop => ({
  phase: 'idle', arrive: null, checkin: null, leave: null, brk: 0, edited: null, bol: false,
});

/** Numbers for today's stop. While at the dock, "leave" is now. */
export function stopCalc(stop: Stop, now: number, rules: Rules) {
  const arrive = stop.arrive ?? now;
  const leave = stop.leave ?? now;
  return calc(arrive, APPT, leave, stop.brk, rules);
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
