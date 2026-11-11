/**
 * The persisted app state (what v1 kept in localStorage under "docket-v1").
 */
import { defaultRules, type Rules } from './detention';
import { START_NOW, type Marks } from './sampleData';
import { freshStop, type Stop } from './stop';

export type PayType = 'mile' | 'hour' | 'load';
export type LocationMode = 'always' | 'manual';
export type CompanySort = 'wait' | 'paid';
export type AnonAnswer = 'Paid' | 'Partly' | 'Not paid';

export interface AppState {
  onboarded: boolean;
  company: string | null;
  customCompany: boolean;
  pay: PayType | null;
  rules: Rules;
  location: LocationMode | null;
  /** Simulated clock, minutes after midnight. */
  now: number;
  stop: Stop;
  marks: Marks;
  sent: boolean;
  anon: AnonAnswer | null;
  sort: CompanySort;
  islandAlerted: boolean;
}

export const STORAGE_KEY = 'docket-v1';

export const freshState = (): AppState => ({
  onboarded: false,
  company: null,
  customCompany: false,
  pay: null,
  rules: { ...defaultRules },
  location: null,
  now: START_NOW,
  stop: freshStop(),
  marks: {},
  sent: false,
  anon: null,
  sort: 'wait',
  islandAlerted: false,
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
