import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Rules } from '../logic/detention';
import {
  COMPANIES,
  SAMPLE_SETTLEMENT,
  SIM_MINUTES_PER_SECOND,
  START_NOW,
  TODAY_STOP,
  WEEK,
  WEEK_LABEL,
} from '../logic/sampleData';
import { claimText, cleanAmount, weekTotals } from '../logic/settlement';
import {
  parseState,
  freshState,
  loadAppt,
  setsStopsOnce,
  STORAGE_KEY,
  type AppState,
  type LocationMode,
} from '../logic/state';
import { applyFix, freshStop, stepFix, stopCalc, type FixDraft } from '../logic/stop';
import { clockBare } from '../logic/format';

export type Sheet =
  | { kind: 'message'; text: string }
  | { kind: 'fix'; draft: FixDraft }
  | null;

/** UI-only state. Not persisted (the BOL photo stays in memory only, like v1). */
interface Ui {
  expanded: boolean;
  lock: boolean;
  sheet: Sheet;
  toast: string | null;
  /** "Started at Harbor Foods 1:48 · Fix · Undo" after an automatic start (Figma E1). */
  undo: string | null;
  photoUri: string | null;
}

const UNDO_SECONDS = 10;

const freshUi = (): Ui => ({ expanded: false, lock: false, sheet: null, toast: null, undo: null, photoUri: null });

function useActions(setS: (fn: (s: AppState) => AppState) => void, setUi: (fn: (u: Ui) => Ui) => void, sRef: { current: AppState }) {
  const timers = useRef<{
    toast?: ReturnType<typeof setTimeout>;
    island?: ReturnType<typeof setTimeout>;
    undo?: ReturnType<typeof setTimeout>;
  }>({});

  return useMemo(() => {
    const toast = (t: string) => {
      setUi((u) => ({ ...u, toast: t }));
      clearTimeout(timers.current.toast);
      timers.current.toast = setTimeout(() => setUi((u) => ({ ...u, toast: null })), 2600);
    };
    const flashIsland = () => {
      setUi((u) => ({ ...u, expanded: true }));
      clearTimeout(timers.current.island);
      timers.current.island = setTimeout(() => setUi((u) => ({ ...u, expanded: false })), 2600);
    };

    return {
      toast,
      flashIsland,
      setExpanded: (expanded: boolean) => setUi((u) => ({ ...u, expanded })),
      setLock: (lock: boolean) => setUi((u) => ({ ...u, lock })),
      setPhoto: (photoUri: string | null) => setUi((u) => ({ ...u, photoUri })),
      closeSheet: () => setUi((u) => ({ ...u, sheet: null })),
      setSheetText: (text: string) =>
        setUi((u) => (u.sheet?.kind === 'message' ? { ...u, sheet: { ...u.sheet, text } } : u)),

      /* onboarding */
      pickCompany: (name: string, custom: boolean) =>
        setS((s) => {
          const c = COMPANIES.find((c) => c.name === name);
          return { ...s, company: name, customCompany: custom, rules: c ? { ...c.rules } : s.rules };
        }),
      setPay: (pay: AppState['pay']) => setS((s) => ({ ...s, pay })),
      setRulesCheck: (rulesCheck: AppState['rulesCheck']) => setS((s) => ({ ...s, rulesCheck })),
      /** Also switches an existing load between one-off and every-run. */
      setLoadStyle: (loadStyle: AppState['loadStyle']) =>
        setS((s) => ({
          ...s,
          loadStyle,
          load: s.load ? { ...s.load, recurring: setsStopsOnce(loadStyle) } : s.load,
        })),
      setRule: <K extends keyof Rules>(k: K, v: Rules[K]) => setS((s) => ({ ...s, rules: { ...s.rules, [k]: v } })),
      finishOnboarding: (location: LocationMode) => setS((s) => ({ ...s, location, onboarded: true })),

      /* loads */
      startWatching: (load: AppState['load']) => setS((s) => ({ ...s, load })),

      /* today's stop */
      /** Prototype control standing in for the geofence seeing you pull in. */
      pullIn: () => {
        const s = sRef.current;
        const arrive = START_NOW + 1;
        const known = s.knownPlaces.includes(TODAY_STOP.name);
        setS((x) => ({
          ...x,
          stop: { ...freshStop(), phase: known ? 'dock' : 'arriving', arrive, appt: loadAppt(s.load) },
          now: arrive,
          islandAlerted: false,
        }));
        if (known) {
          // E1: confirmed here before, so the clock starts with no question. Undo stays up for 10 s.
          setUi((u) => ({ ...u, undo: `Started at ${TODAY_STOP.short} ${clockBare(arrive)}` }));
          clearTimeout(timers.current.undo);
          timers.current.undo = setTimeout(() => setUi((u) => ({ ...u, undo: null })), UNDO_SECONDS * 1000);
          flashIsland();
        }
      },
      /** C2 "Yes, start the clock": remembers the place for next time. */
      confirmArrival: () => {
        setS((s) => ({
          ...s,
          stop: { ...s.stop, phase: 'dock' },
          knownPlaces: s.knownPlaces.includes(TODAY_STOP.name) ? s.knownPlaces : [...s.knownPlaces, TODAY_STOP.name],
        }));
        flashIsland();
      },
      /** C2 "Not a stop" or E1 "Undo": back to watching, nothing logged. */
      cancelArrival: () => {
        setS((s) => ({ ...s, stop: freshStop(), now: START_NOW }));
        setUi((u) => ({ ...u, undo: null, expanded: false }));
        clearTimeout(timers.current.undo);
      },
      dismissUndo: () => {
        setUi((u) => ({ ...u, undo: null }));
        clearTimeout(timers.current.undo);
      },
      checkIn: () => setS((s) => ({ ...s, stop: { ...s.stop, checkin: s.now } })),
      skip: (m: number) => setS((s) => ({ ...s, now: s.now + m })),
      leave: () => {
        setS((s) => ({ ...s, stop: { ...s.stop, leave: Math.round(s.now), phase: 'left' } }));
        setUi((u) => ({ ...u, undo: null }));
        flashIsland();
      },
      logStop: (bol: boolean) => {
        setS((s) => ({ ...s, stop: { ...s.stop, bol, phase: 'logged' } }));
        flashIsland();
      },
      restartStop: () => {
        setS((s) => ({ ...s, stop: freshStop(), now: START_NOW }));
        setUi((u) => ({ ...u, photoUri: null }));
      },
      openFix: () => {
        const st = sRef.current.stop;
        setUi((u) => ({
          ...u,
          undo: null,
          sheet: { kind: 'fix', draft: { arrive: st.arrive ?? 0, leave: st.leave, brk: st.brk || 0 } },
        }));
      },
      fixStep: (k: 'arrive' | 'leave' | 'brk', dir: 1 | -1) =>
        setUi((u) => (u.sheet?.kind === 'fix' ? { ...u, sheet: { kind: 'fix', draft: stepFix(u.sheet.draft, k, dir) } } : u)),
      saveFix: (d: FixDraft) => {
        setS((s) => ({ ...s, stop: applyFix(s.stop, d) }));
        setUi((u) => ({ ...u, sheet: null }));
        toast('Time fixed. The GPS time stays on record.');
      },

      /* paycheck */
      mark: (id: string, m: 'paid' | 'less' | 'none') =>
        setS((s) => ({ ...s, marks: { ...s.marks, [id]: { ...(s.marks[id] ?? {}), m } }, sent: false })),
      setAmt: (id: string, v: string) =>
        setS((s) => ({ ...s, marks: { ...s.marks, [id]: { ...(s.marks[id] ?? { m: 'less' }), amt: cleanAmount(v) } } })),
      scanSample: () => {
        setS((s) => ({ ...s, marks: JSON.parse(JSON.stringify(SAMPLE_SETTLEMENT)), sent: false }));
        toast('Sample settlement read. Check each load.');
      },
      openMessage: () => {
        const s = sRef.current;
        const text = claimText(weekTotals(WEEK, s.rules, s.marks), s.rules, WEEK_LABEL);
        setUi((u) => ({ ...u, sheet: { kind: 'message', text } }));
      },
      markSent: () => {
        setS((s) => ({ ...s, sent: true }));
        setUi((u) => ({ ...u, sheet: null }));
      },
      setAnon: (anon: AppState['anon']) => {
        setS((s) => ({ ...s, anon }));
        toast('Thanks. Added anonymously.');
      },
      setSort: (sort: AppState['sort']) => setS((s) => ({ ...s, sort })),

      resetAll: () => {
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        setS(() => freshState());
        setUi(() => freshUi());
      },
    };
  }, [setS, setUi, sRef]);
}

type Actions = ReturnType<typeof useActions>;
interface Store { s: AppState; ui: Ui; a: Actions }

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [s, setSRaw] = useState<AppState | null>(null);
  const [ui, setUiRaw] = useState<Ui>(freshUi);
  const sRef = useRef<AppState>(freshState());

  // Load once from AsyncStorage (localStorage on web).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(parseState)
      .catch(() => freshState())
      .then((loaded) => {
        sRef.current = loaded;
        setSRaw(loaded);
      });
  }, []);

  const setS = useCallback((fn: (s: AppState) => AppState) => {
    setSRaw((prev) => {
      const next = fn(prev ?? freshState());
      sRef.current = next;
      return next;
    });
  }, []);
  const setUi = useCallback((fn: (u: Ui) => Ui) => setUiRaw(fn), []);
  const a = useActions(setS, setUi, sRef);

  // Persist on every change (best effort, like v1).
  useEffect(() => {
    if (s) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
  }, [s]);

  // Simulated time: while at the dock, 1 real second = 1 simulated minute.
  const atDock = s?.stop.phase === 'dock';
  useEffect(() => {
    if (!atDock) return;
    const id = setInterval(() => setS((x) => ({ ...x, now: x.now + SIM_MINUTES_PER_SECOND })), 1000);
    return () => clearInterval(id);
  }, [atDock, setS]);

  // When free time runs out, the island auto-expands once (Figma stage 2).
  const inDetention = s && atDock ? s.now >= stopCalc(s.stop, s.now, s.rules).freeEnd : false;
  useEffect(() => {
    if (inDetention && s && !s.islandAlerted) {
      setS((x) => ({ ...x, islandAlerted: true }));
      a.flashIsland();
    }
  }, [inDetention, s, setS, a]);

  if (!s) return null;
  return <StoreContext.Provider value={{ s, ui, a }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside AppStoreProvider');
  return v;
}
