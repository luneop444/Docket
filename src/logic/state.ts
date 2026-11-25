/**
 * The persisted app state (what v1 kept in localStorage under "docket-v1").
 */
import { defaultRules, type Rules } from './detention';
import { APPT, START_NOW, type LoadStop, type Marks } from './sampleData';
import type { ClaimLogs } from './claims';
import type { LatLon } from './geo';
import type { LoggedStop } from './history';
import { freshStop, type Stop } from './stop';

export type PayType = 'mile' | 'hour' | 'load';
export type LocationMode = 'always' | 'manual';
/** A3: how loads come in. Dedicated routes set their stops once. */
export type LoadStyle = 'same' | 'different' | 'mix';
/** A2: how the driver answered "do these rules match your paperwork?" */
export type RulesCheck = 'matches' | 'different' | 'unsure';
/** Today's load once the driver has checked its stops. */
export interface ActiveLoad {
  number: string;
  /** How it came in (Figma B1), or typed in by the driver. */
  source: 'share' | 'email' | 'manual';
  /**
   * Dedicated route ("Same stops every week"): the stops were set up once and
   * Docket watches them on every run without the driver adding a load.
   */
  recurring: boolean;
  /** Stops as checked (and maybe fixed) by the driver. Missing in data saved before Fix a stop existed. */
  stops?: LoadStop[];
}

/** The stop Docket watches today: the load's drop. */
export function watchedStop(load: ActiveLoad | null): LoadStop | undefined {
  return load?.stops?.find((st) => st.kind === 'Drop') ?? load?.stops?.[load.stops.length - 1];
}

/** Appointment at the watched stop (2:00 PM for older saved data). */
export const loadAppt = (load: ActiveLoad | null): number => watchedStop(load)?.at ?? APPT;

/** The facility Docket is watching today, for headings, the island and the lock screen. */
export interface Place {
  name: string;
  short: string;
  /** Load number ("" if the driver didn't enter one). */
  load: string;
  /** What other drivers report waiting here. Only the sample facility has this for now. */
  typical: { label: string; min: number } | null;
}

/** "Harbor Foods DC" → "Harbor Foods". Drops a trailing DC / warehouse word for tight spots. */
export const shortName = (name: string): string =>
  name.replace(/\s+(DC|D\.C\.|Distribution Center|Warehouse|Whse)$/i, '').trim() || name;

export function placeOf(load: ActiveLoad | null): Place {
  // No made-up facility to fall back on: without a load, the stop is just "Your stop".
  const name = watchedStop(load)?.name.trim() || 'Your stop';
  return { name, short: shortName(name), load: load?.number ?? '', typical: null };
}

/** Dedicated-route drivers set their stops once instead of adding a load each day (Figma A3 note). */
export const setsStopsOnce = (style: LoadStyle | null): boolean => style === 'same';
export type CompanySort = 'wait' | 'paid';
export type AnonAnswer = 'Paid' | 'Partly' | 'Not paid';

export interface AppState {
  onboarded: boolean;
  /** What Docket calls the driver: the first setup step (Dan, 24 Nov: account first). */
  name: string | null;
  /**
   * The driver set every detention rule themselves. Until then nothing is worked out from them:
   * a pay figure from rules nobody entered would be a guess (P1 reached Claims without setup, 24 Nov).
   */
  rulesConfirmed: boolean;
  company: string | null;
  customCompany: boolean;
  pay: PayType | null;
  rules: Rules;
  rulesCheck: RulesCheck | null;
  loadStyle: LoadStyle | null;
  location: LocationMode | null;
  /** Null until the driver adds today's load. Location is only watched while there is one. */
  load: ActiveLoad | null;
  /** Facilities the driver has confirmed before. Pulling in there starts the clock with no question (Figma E1). */
  knownPlaces: string[];
  /** Simulated clock, minutes after midnight. */
  now: number;
  stop: Stop;
  marks: Marks;
  /** Pay weeks (PayWeek.key) whose claim went to the fleet manager. */
  sent: Record<string, true>;
  /** The anonymous "was it paid" answer, per pay week. */
  anon: Record<string, AnonAnswer>;
  sort: CompanySort;
  islandAlerted: boolean;
  /** Stops logged with the real clock, newest first. */
  history: LoggedStop[];
  /** Where each facility is, saved the first time the driver taps "I'm here" there. */
  placeCoords: Record<string, LatLon>;
  /** Each claim's steps (sent, settlements checked, asked, payroll, paid), by load id. */
  claims: ClaimLogs;
}

export const STORAGE_KEY = 'docket-v1';

export const freshState = (): AppState => ({
  onboarded: false,
  name: null,
  rulesConfirmed: false,
  company: null,
  customCompany: false,
  pay: null,
  rules: { ...defaultRules },
  rulesCheck: null,
  loadStyle: null,
  location: null,
  load: null,
  knownPlaces: [],
  now: START_NOW,
  stop: freshStop(),
  marks: {},
  sent: {},
  anon: {},
  sort: 'wait',
  islandAlerted: false,
  history: [],
  placeCoords: {},
  claims: {},
});

/**
 * Where setup picks up, or null once it's done. Setup can't be skipped: every screen outside it
 * sends the driver here until the name, the company and the rules are all in.
 */
export type SetupRoute = '/welcome' | '/account' | '/company' | '/edit-rules';
export function setupStep(s: AppState): SetupRoute | null {
  if (!s.name?.trim()) return '/account';
  if (!s.company) return '/company';
  if (!s.rulesConfirmed) return '/edit-rules';
  return null;
}

/** The setup screens a driver may be on, given how far they've got (no jumping ahead). */
export function setupAllows(s: AppState, path: string): boolean {
  const order: SetupRoute[] = ['/welcome', '/account', '/company', '/edit-rules'];
  const at = setupStep(s);
  const i = order.indexOf(path as SetupRoute);
  return i >= 0 && (at == null || i <= order.indexOf(at));
}

/** Parse stored JSON, falling back to a fresh state if it's missing or broken. */
export function parseState(raw: string | null): AppState {
  try {
    const s = raw ? JSON.parse(raw) : null;
    if (!s || !s.rules) return freshState();
    // Saved before these were kept per week (a single true/false and one answer): start clean.
    const perWeek = (v: unknown) => (v && typeof v === 'object' ? v : {});
    return { ...freshState(), ...s, sent: perWeek(s.sent), anon: perWeek(s.anon), claims: perWeek(s.claims) as ClaimLogs };
  } catch {
    return freshState();
  }
}
