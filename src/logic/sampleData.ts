/**
 * Made-up data for the prototype (labelled "Sample data" / "Faked" in the UI).
 * Times are minutes after midnight.
 */
import type { Rules } from './detention';

/** Simulated minutes per real second while you're at the dock (60× speed). */
export const SIM_MINUTES_PER_SECOND = 1;
/** Today's appointment at Harbor Foods DC: 2:00 PM. */
export const APPT = 14 * 60;
/** Simulated clock before pulling in: 1:47 PM. */
export const START_NOW = 13 * 60 + 47;
export const TODAY_LABEL = 'Tue, Nov 3';
export const WEEK_LABEL = 'Week of Oct 26';

export const TODAY_STOP = {
  name: 'Harbor Foods DC',
  short: 'Harbor Foods',
  city: 'Allentown, PA',
  load: '48262',
  typicalWait: '3h 20m',
  typicalWaitMin: 200,
  visits: 41,
};

export interface Company {
  name: string;
  drivers: number;
  reported: number;
  rules: Rules;
  /** Average wait per stop, e.g. "1h 52m". */
  avg: string;
  /** % of stops past free time. */
  past: number;
  /** % of drivers who say detention was paid. */
  paid: number;
}

export const COMPANIES: Company[] = [
  {
    name: 'Northbound Transport', drivers: 204, reported: 52,
    rules: { free: 120, start: 'appt', rate: 30, breaksCount: false },
    avg: '1h 52m', past: 28, paid: 81,
  },
  {
    name: 'Ridgeline Freight', drivers: 318, reported: 77,
    rules: { free: 120, start: 'arrival', rate: 25, breaksCount: true },
    avg: '2h 48m', past: 41, paid: 62,
  },
  {
    name: 'Keel Logistics', drivers: 12, reported: 4,
    rules: { free: 180, start: 'arrival', rate: 20, breaksCount: true },
    avg: '3h 35m', past: 52, paid: 38,
  },
];

export interface WeekLoad {
  id: string;
  name: string;
  day: string;
  arrive: number;
  appt: number;
  leave: number;
  brk: number;
}

/** Last week's loads: the settlement being checked on the Paycheck tab. */
export const WEEK: WeekLoad[] = [
  { id: '48213', name: 'Harbor Foods DC', day: 'Mon Oct 26', arrive: 7 * 60 + 52, appt: 8 * 60, leave: 12 * 60 + 10, brk: 0 },
  { id: '48227', name: 'Keystone Cold Storage', day: 'Tue Oct 27', arrive: 6 * 60 + 2, appt: 6 * 60 + 30, leave: 9 * 60 + 32, brk: 0 },
  { id: '48240', name: 'Lehigh Grocery DC', day: 'Wed Oct 28', arrive: 13 * 60 + 15, appt: 13 * 60 + 15, leave: 19 * 60, brk: 0 },
  { id: '48251', name: 'Valley Paper Co.', day: 'Thu Oct 29', arrive: 10 * 60 + 5, appt: 10 * 60, leave: 11 * 60 + 40, brk: 0 },
];

export type Mark = { m: 'paid' | 'less' | 'none'; amt?: string };
export type Marks = Record<string, Mark>;

/** What "Scan" pretends to read off the settlement. */
export const SAMPLE_SETTLEMENT: Marks = {
  '48213': { m: 'paid' },
  '48227': { m: 'none' },
  '48240': { m: 'less', amt: '25.00' },
};
