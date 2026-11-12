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

/** Minutes before each stop's appointment that Docket starts watching location. */
export const WATCH_LEAD_MIN = 180;

export interface LoadStop {
  name: string;
  kind: 'Pickup' | 'Drop';
  /** Appointment, minutes after midnight. */
  at: number;
}

/** What the faked "AI read" pulls off today's rate con (Figma B2). */
export const SAMPLE_LOAD = {
  number: '48262',
  stops: [
    { name: 'Keystone Cold Storage', kind: 'Pickup', at: 6 * 60 },
    { name: 'Harbor Foods DC', kind: 'Drop', at: 14 * 60 },
  ] as LoadStop[],
};

/** "Been here before?" shortcuts on Add a load (Figma B1). */
export const RECENT_STOPS = ['Harbor Foods DC', 'Lehigh Grocery DC'];

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

/**
 * Real carrier names (public facts). Everything else per company (driver
 * counts, rules, wait stats) is made up to simulate Docket being widely used,
 * and is tagged "Sample data" in the UI.
 * [name, drivers, free min, clock start, $/hr, breaks count, avg wait, % past free, % paid]
 */
const CARRIERS: [string, number, number, 'appt' | 'arrival', number, boolean, string, number, number][] = [
  ['Schneider National', 1840, 120, 'appt', 20, false, '2h 05m', 33, 64],
  ['Werner Enterprises', 1520, 120, 'arrival', 18, true, '2h 22m', 38, 58],
  ['J.B. Hunt Transport', 1710, 120, 'appt', 20, false, '1h 58m', 30, 69],
  ['Swift Transportation', 2260, 120, 'arrival', 15, true, '2h 40m', 44, 47],
  ['Knight Transportation', 1180, 120, 'arrival', 15, true, '2h 31m', 41, 51],
  ['Prime Inc.', 1390, 120, 'appt', 18, false, '2h 12m', 36, 60],
  ['Heartland Express', 610, 120, 'arrival', 15, true, '2h 26m', 39, 55],
  ['Covenant Logistics', 420, 120, 'appt', 18, false, '2h 18m', 37, 57],
  ['Marten Transport', 540, 120, 'appt', 20, false, '1h 55m', 29, 71],
  ['CRST', 760, 120, 'arrival', 15, true, '2h 44m', 45, 46],
  ['Crete Carrier', 480, 120, 'appt', 20, false, '1h 49m', 27, 73],
  ['Roehl Transport', 350, 120, 'appt', 18, false, '2h 03m', 32, 66],
  ['Hirschbach Motor Lines', 330, 120, 'arrival', 18, true, '2h 35m', 42, 52],
  ['Maverick Transportation', 290, 120, 'appt', 20, false, '1h 57m', 31, 68],
  ['Old Dominion Freight Line', 980, 60, 'arrival', 25, true, '1h 20m', 24, 74],
  ['Estes Express Lines', 870, 60, 'arrival', 25, true, '1h 26m', 26, 70],
  ['Saia', 640, 60, 'arrival', 22, true, '1h 31m', 28, 67],
  ['XPO', 910, 60, 'arrival', 22, true, '1h 34m', 29, 63],
  ['ABF Freight', 590, 60, 'arrival', 25, true, '1h 24m', 25, 72],
  ['R+L Carriers', 520, 60, 'arrival', 22, true, '1h 38m', 31, 61],
  ['FedEx Freight', 1260, 60, 'arrival', 25, true, '1h 22m', 23, 75],
  ['TForce Freight', 450, 60, 'arrival', 22, true, '1h 36m', 30, 62],
  ['Southeastern Freight Lines', 310, 60, 'arrival', 22, true, '1h 29m', 27, 68],
  ['Averitt Express', 380, 60, 'arrival', 22, true, '1h 33m', 28, 66],
  ['Pitt Ohio', 260, 60, 'arrival', 25, true, '1h 18m', 22, 76],
  ['Penske Logistics', 690, 90, 'appt', 22, false, '1h 46m', 30, 65],
  ['Ryder', 720, 90, 'appt', 22, false, '1h 51m', 32, 63],
  ['Sysco', 650, 90, 'appt', 20, false, '1h 42m', 29, 59],
  ['US Foods', 470, 90, 'appt', 20, false, '1h 47m', 31, 57],
  ['Giant Eagle', 140, 90, 'appt', 20, false, '1h 39m', 27, 61],
];

const BASE_COMPANIES: Company[] = CARRIERS.map(([name, drivers, free, start, rate, breaksCount, avg, past, paid]) => ({
  name,
  drivers,
  reported: Math.round(drivers * 0.24),
  rules: { free, start, rate, breaksCount },
  avg,
  past,
  paid,
}));

/**
 * Researcher setup for a user test (Wizard of Oz). Open the prototype with
 *   ?company=Estes%20Express%20Lines&free=60&rate=25&start=arrival&breaks=1
 * and that company appears first with the participant's real rules.
 * It is remembered on this browser until ?setup=clear.
 */
export interface TestSetup {
  company: string;
  rules: Rules;
}

const SETUP_KEY = 'docket-test-setup';

export function parseSetup(search: string): TestSetup | 'clear' | null {
  const q = new URLSearchParams(search);
  if (q.get('setup') === 'clear') return 'clear';
  const company = q.get('company')?.trim();
  if (!company) return null;
  const num = (k: string, d: number) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const known = BASE_COMPANIES.find((c) => c.name.toLowerCase() === company.toLowerCase());
  const base = known?.rules ?? { free: 120, start: 'appt' as const, rate: 20, breaksCount: false };
  const start = q.get('start') === 'arrival' ? 'arrival' : q.get('start') === 'appt' ? 'appt' : base.start;
  const breaks = q.get('breaks');
  return {
    company: known?.name ?? company,
    rules: {
      free: Math.round(num('free', base.free / 60) * 60),
      start,
      rate: num('rate', base.rate),
      breaksCount: breaks == null ? base.breaksCount : breaks === '1' || breaks === 'true',
    },
  };
}

export function withSetup(list: Company[], setup: TestSetup | null): Company[] {
  if (!setup) return list;
  const known = list.find((c) => c.name === setup.company);
  const mine: Company = known
    ? { ...known, rules: setup.rules }
    : { name: setup.company, drivers: 96, reported: 23, rules: setup.rules, avg: '1h 54m', past: 31, paid: 62 };
  return [mine, ...list.filter((c) => c.name !== setup.company)];
}

function loadSetup(): TestSetup | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const parsed = parseSetup(window.location.search);
    if (parsed === 'clear') {
      window.localStorage?.removeItem(SETUP_KEY);
      return null;
    }
    if (parsed) {
      window.localStorage?.setItem(SETUP_KEY, JSON.stringify(parsed));
      return parsed;
    }
    const saved = window.localStorage?.getItem(SETUP_KEY);
    return saved ? (JSON.parse(saved) as TestSetup) : null;
  } catch {
    return null;
  }
}

export const TEST_SETUP: TestSetup | null = loadSetup();

/** Every company on "Docket", the test participant's first when set up. */
export const COMPANIES: Company[] = withSetup(BASE_COMPANIES, TEST_SETUP);

/** Shown before the driver types: their company (if set up), then the most used. */
export const SUGGESTED: Company[] = TEST_SETUP
  ? COMPANIES.slice(0, 3)
  : [...COMPANIES].sort((a, b) => b.drivers - a.drivers).slice(0, 3);

export interface WeekLoad {
  /** Key for settlement marks. For the sample week it's also the load number. */
  id: string;
  /** Load number when it differs from `id` (logged stops). */
  number?: string;
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

/** The load number to show for a week's load, or "" if the driver didn't enter one. */
export const loadNo = (l: WeekLoad): string => l.number ?? (/^\d{1,8}$/.test(l.id) ? l.id : '');

export type Mark = { m: 'paid' | 'less' | 'none'; amt?: string };
export type Marks = Record<string, Mark>;

/** What "Scan" pretends to read off the settlement. */
export const SAMPLE_SETTLEMENT: Marks = {
  '48213': { m: 'paid' },
  '48227': { m: 'none' },
  '48240': { m: 'less', amt: '25.00' },
};
