/**
 * Prototype only: put Home in one named state, for demo links (/today?state=paid)
 * and screenshots. The times follow one sample stop: pulled in at 1:12 PM.
 */
import { COMPANIES, SAMPLE_LOAD, START_NOW } from './sampleData';
import { type AppState, loadAppt } from './state';
import { freshStop, stopCalc } from './stop';

export const DEMO_STATES = ['driving', 'asking', 'counting', 'paid', 'left', 'logged'] as const;
export type DemoState = (typeof DEMO_STATES)[number];

export const isDemoState = (v: unknown): v is DemoState => DEMO_STATES.includes(v as DemoState);

/** Docket asks "Loading here?" after this long parked somewhere it doesn't know. */
export const ASK_AFTER_MIN = 30;

/** Pulled in at 1:12 PM. */
export const DEMO_ARRIVE = 13 * 60 + 12;

export function demoState(s: AppState, state: DemoState): AppState {
  const company = s.company ?? COMPANIES[0].name;
  const rules = s.company ? s.rules : { ...(COMPANIES.find((c) => c.name === company)?.rules ?? s.rules) };
  const load = s.load ?? { number: SAMPLE_LOAD.number, source: 'manual' as const, recurring: false, stops: SAMPLE_LOAD.stops };
  const base: AppState = { ...s, onboarded: true, company, rules, load, location: s.location ?? 'always', islandAlerted: true };
  if (state === 'driving') return { ...base, stop: freshStop(), now: START_NOW };

  const arrive = DEMO_ARRIVE;
  const stop = { ...freshStop(), arrive, appt: loadAppt(load) };
  const { start, freeEnd } = stopCalc({ ...stop, phase: 'dock' }, arrive, rules);
  if (state === 'asking') return { ...base, stop: { ...stop, phase: 'arriving' }, now: arrive + ASK_AFTER_MIN };
  // 18 minutes of free time left, or 1:42 in if free time runs longer.
  if (state === 'counting') return { ...base, stop: { ...stop, phase: 'dock' }, now: Math.max(start, Math.min(arrive + 102, freeEnd - 18)) };
  const now = freeEnd + 48;
  if (state === 'paid') return { ...base, stop: { ...stop, phase: 'dock' }, now };
  return { ...base, stop: { ...stop, leave: now, phase: state === 'left' ? 'left' : 'logged' }, now };
}
