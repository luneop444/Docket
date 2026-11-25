/**
 * The detention calculation: the one piece of logic every screen depends on.
 * Pure functions, no UI imports.
 */
import { dur, money } from './format';

export type ClockStart = 'appt' | 'arrival';

export interface Rules {
  /** Free time in minutes before detention pay starts. */
  free: number;
  /** Whether the free-time clock starts at the appointment or at arrival. */
  start: ClockStart;
  /** Detention pay in dollars per hour after free time. */
  rate: number;
  /** If false, off-duty break minutes are subtracted from detention. */
  breaksCount: boolean;
}

export interface DetentionResult {
  /** When the free-time clock started (minutes after midnight). */
  start: number;
  /** When free time ends and detention begins. */
  freeEnd: number;
  /** Paid detention minutes, after any break subtraction. */
  paidMin: number;
  /** Break minutes subtracted from detention. */
  minus: number;
  /** Dollars owed, rounded to cents. */
  owed: number;
  /** Total time at the facility, arrival to leave. */
  wait: number;
}

/**
 * - Clock starts at arrival, or for "appointment" rules at the later of arrival
 *   and appointment (arrive early: clock waits for the appointment; arrive late:
 *   clock starts when you arrive).
 * - Detention = time past (clock start + free time), minus breaks if the
 *   company doesn't count them. Paid per minute at rate / 60.
 */
export function calc(
  arrive: number,
  appt: number,
  leave: number,
  brk: number,
  r: Rules,
): DetentionResult {
  const start = r.start === 'appt' ? Math.max(arrive, appt) : arrive;
  const freeEnd = start + r.free;
  const raw = Math.max(0, leave - freeEnd);
  const minus = r.breaksCount ? 0 : Math.min(raw, brk || 0);
  const paidMin = Math.max(0, raw - minus);
  return {
    start,
    freeEnd,
    paidMin,
    minus,
    owed: Math.round((paidMin / 60) * r.rate * 100) / 100,
    wait: leave - arrive,
  };
}

/** "2h 00m free from appointment time, then $30.00 an hour" */
export function rulesLine(r: Rules): string {
  return `${dur(r.free)} free from ${
    r.start === 'appt' ? 'appointment time' : 'arrival'
  }, then ${money(r.rate)} an hour`;
}

/**
 * The same rules in the short form the company list uses ("$20/hr after 1h"), so your company
 * reads like the others on the Companies tab: $55/hr after 1h, from arrival.
 */
export function rulesShort(r: Rules): string {
  const h = Math.floor(r.free / 60);
  const m = r.free % 60;
  const free = h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
  const rate = Number.isInteger(r.rate) ? `$${r.rate}` : `$${r.rate.toFixed(2)}`;
  return `${rate}/hr after ${free}, from ${r.start === 'appt' ? 'appointment' : 'arrival'}`;
}

export const defaultRules: Rules = { free: 120, start: 'appt', rate: 30, breaksCount: false };
