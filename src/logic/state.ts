/**
 * The persisted app state (what v1 kept in localStorage under "docket-v1").
 */
import { defaultRules, type Rules } from './detention';
import { APPT, START_NOW, TODAY_STOP, type LoadStop, type Marks } from './sampleData';
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
  const name = watchedStop(load)?.name.trim() || TODAY_STOP.name;
  const sample = name === TODAY_STOP.name;
  return {
    name,
    short: sample ? TODAY_STOP.short : shortName(name),
    load: load?.number ?? TODAY_STOP.load,
    typical: sample ? { label: TODAY_STOP.typicalWait, min: TODAY_STOP.typicalWaitMin } : null,
  };
}

/** Dedicated-route drivers set their stops once instead of adding a load each day (Figma A3 note). */
export const setsStopsOnce = (style: LoadStyle | null): boolean => style === 'same';
export type CompanySort = 'wait' | 'paid';
export type AnonAnswer = 'Paid' | 'Partly' | 'Not paid';

export interface AppState {
  onboarded: boolean;
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
  sent: boolean;
  anon: AnonAnswer | null;
  sort: CompanySort;
  islandAlerted: boolean;
  /** Stops logged with the real clock, newest first. */
  history: LoggedStop[];
}

export const STORAGE_KEY = 'docket-v1';

export const freshState = (): AppState => ({
  onboarded: false,
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
  sent: false,
  anon: null,
  sort: 'wait',
  islandAlerted: false,
  history: [],
});

/** Parse stored JSON, falling back to a fresh state if it's missing or broken. */
export function parseState(raw: string | null): AppState {
  try {
    const s = raw ? JSON.parse(raw) : null;
    return s && s.rules ? { ...freshState(), ...s } : freshState();
  } catch {
    return freshState();
  }
}
