/**
 * Turns what Claude read off a rate con or settlement into app data.
 * The readers only report what's written, so anything missing stays for the driver to fill in.
 */
import { calc, type Rules } from './detention';
import { loadNo, type LoadStop, type Mark, type Marks, type WeekLoad } from './sampleData';
import { parseHHMM } from './stop';

export interface RateConReading {
  found: boolean;
  number: string | null;
  stops: { name: string; kind: 'Pickup' | 'Drop'; appt: string | null }[];
  note: string;
}

export interface SettlementReading {
  found: boolean;
  loads: { number: string; detention: number | null }[];
  note: string;
}

/** Appointment for a stop with no time written: a placeholder the driver changes in Fix a stop. */
export const NO_TIME = 8 * 60;

export interface LoadDraft {
  number: string;
  stops: LoadStop[];
  /** Stops with no appointment on the rate con, by index. */
  noTime: number[];
}

/** A rate con reading as the stops Check your stops starts from. */
export function loadFromRateCon(r: RateConReading): LoadDraft {
  const noTime: number[] = [];
  const stops = r.stops.map((st, i) => {
    const at = parseHHMM(st.appt);
    if (at == null) noTime.push(i);
    return { name: st.name, kind: st.kind, at: at ?? NO_TIME };
  });
  // Docket watches the last drop, so make sure there is one.
  if (stops.length && !stops.some((st) => st.kind === 'Drop')) stops[stops.length - 1].kind = 'Drop';
  return { number: r.number ?? '', stops, noTime };
}

/** "Load #00 48-262" and "48262" are the same load. */
export function sameLoad(a: string, b: string): boolean {
  const n = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
  return !!n(a) && n(a) === n(b);
}

export interface SettlementMarks {
  marks: Marks;
  /** Loads owed detention that were found on the settlement. */
  matched: number;
  /** Loads owed detention that weren't (no load number, or not listed). */
  missing: WeekLoad[];
}

/**
 * Mark each load that's owed detention from the settlement:
 * paid in full, paid less (with the amount), or listed with no detention.
 * Loads the settlement doesn't list are left for the driver to mark.
 */
export function marksFromSettlement(week: WeekLoad[], rules: Rules, r: SettlementReading): SettlementMarks {
  const marks: Marks = {};
  const missing: WeekLoad[] = [];
  let matched = 0;
  for (const l of week) {
    const owed = calc(l.arrive, l.appt, l.leave, l.brk, rules).owed;
    if (owed <= 0) continue;
    const no = loadNo(l);
    const lines = no ? r.loads.filter((x) => sameLoad(x.number, no)) : [];
    if (!lines.length) {
      missing.push(l);
      continue;
    }
    matched++;
    const paid = Math.round(lines.reduce((t, x) => t + (x.detention ?? 0), 0) * 100) / 100;
    const mark: Mark = paid >= owed - 0.005 ? { m: 'paid' } : paid > 0 ? { m: 'less', amt: paid.toFixed(2) } : { m: 'none' };
    marks[l.id] = mark;
  }
  return { marks, matched, missing };
}
