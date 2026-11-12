/**
 * Stops the driver has logged with the real clock, grouped into pay weeks for
 * the Paycheck tab. Weeks run Monday to Sunday.
 */
import { WEEK, WEEK_LABEL, type WeekLoad } from './sampleData';
import type { Stop } from './stop';

export interface LoggedStop {
  /** Stable id (the epoch ms the stop started). Also the key for settlement marks. */
  id: string;
  place: string;
  /** Load number, "" if none was entered. */
  load: string;
  /** Epoch ms of local midnight on the day the stop started. */
  dayStart: number;
  /** Minutes after `dayStart`. */
  arrive: number;
  appt: number;
  leave: number;
  brk: number;
  bol: boolean;
}

export interface PayWeek {
  key: string;
  label: string;
  loads: WeekLoad[];
  /** The made-up week shown before the driver has logged anything. */
  sample: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon Nov 9" */
export function dayLabel(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Thu, Nov 12" for the header and lock screen: the real date for a live stop, the sample day otherwise. */
export function headerDate(stop: Stop, sampleLabel: string): string {
  if (!stop.live || stop.dayStart == null) return sampleLabel;
  const [d, m, n] = dayLabel(stop.dayStart).split(' ');
  return `${d}, ${m} ${n}`;
}

/** Local midnight on the Monday of the week containing `ms`. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** "Week of Nov 9" */
export function weekLabel(start: number): string {
  const d = new Date(start);
  return `Week of ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** A finished live stop as a history entry, or null if it can't be one. */
export function toLogged(stop: Stop, place: string, load: string): LoggedStop | null {
  if (!stop.live || stop.dayStart == null || stop.arrive == null || stop.leave == null) return null;
  return {
    id: stop.id ?? String(stop.dayStart + stop.arrive * 60000),
    place,
    load,
    dayStart: stop.dayStart,
    arrive: stop.arrive,
    appt: stop.appt ?? stop.arrive,
    leave: stop.leave,
    brk: stop.brk,
    bol: stop.bol,
  };
}

/** Add or replace (same id) an entry, newest first. */
export function upsert(history: LoggedStop[], entry: LoggedStop): LoggedStop[] {
  return [entry, ...history.filter((h) => h.id !== entry.id)].sort(
    (a, b) => b.dayStart + b.arrive * 60000 - (a.dayStart + a.arrive * 60000),
  );
}

export const toWeekLoad = (h: LoggedStop): WeekLoad => ({
  id: h.id,
  number: h.load || undefined,
  name: h.place,
  day: dayLabel(h.dayStart),
  arrive: h.arrive,
  appt: h.appt,
  leave: h.leave,
  brk: h.brk,
});

export const SAMPLE_WEEK: PayWeek = { key: 'sample', label: WEEK_LABEL, loads: WEEK, sample: true };

/** Pay weeks with logged stops, newest first; the sample week if there are none. */
export function payWeeks(history: LoggedStop[]): PayWeek[] {
  const byWeek = new Map<number, LoggedStop[]>();
  for (const h of history) {
    const k = weekStart(h.dayStart + h.arrive * 60000);
    byWeek.set(k, [...(byWeek.get(k) ?? []), h]);
  }
  if (!byWeek.size) return [SAMPLE_WEEK];
  return [...byWeek.entries()]
    .sort(([a], [b]) => b - a)
    .map(([k, hs]) => ({
      key: String(k),
      label: weekLabel(k),
      // Oldest first inside a week, like a settlement.
      loads: [...hs].reverse().map(toWeekLoad),
      sample: false,
    }));
}
