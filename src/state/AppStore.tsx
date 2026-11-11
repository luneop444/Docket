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
  WEEK,
  WEEK_LABEL,
} from '../logic/sampleData';
import { claimText, cleanAmount, weekTotals } from '../logic/settlement';
import { parseState, freshState, STORAGE_KEY, type AppState, type LocationMode } from '../logic/state';
import { freshStop, stopCalc } from '../logic/stop';

export type Sheet =
  | { kind: 'message'; text: string }
  | { kind: 'fix'; draft: { arrive: number; leave: number; brk: number } }
  | null;

/** UI-only state. Not persisted (the BOL photo stays in memory only, like v1). */
interface Ui {
  expanded: boolean;
  lock: boolean;
  sheet: Sheet;
  toast: string | null;
  photoUri: string | null;
}

const freshUi = (): Ui => ({ expanded: false, lock: false, sheet: null, toast: null, photoUri: null });

function useActions(setS: (fn: (s: AppState) => AppState) => void, setUi: (fn: (u: Ui) => Ui) => void, sRef: { current: AppState }) {
  const timers = useRef<{ toast?: ReturnType<typeof setTimeout>; island?: ReturnType<typeof setTimeout> }>({});

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
      setRule: <K extends keyof Rules>(k: K, v: Rules[K]) => setS((s) => ({ ...s, rules: { ...s.rules, [k]: v } })),
      finishOnboarding: (location: LocationMode) => setS((s) => ({ ...s, location, onboarded: true })),

      /* today's stop */
      pullIn: () => {
        setS((s) => ({
          ...s,
          stop: { ...freshStop(), phase: 'dock', arrive: START_NOW + 1 },
          now: START_NOW + 1,
          islandAlerted: false,
        }));
        flashIsland();
      },
      checkIn: () => setS((s) => ({ ...s, stop: { ...s.stop, checkin: s.now } })),
      skip: (m: number) => setS((s) => ({ ...s, now: s.now + m })),
      leave: () => {
        setS((s) => ({ ...s, stop: { ...s.stop, leave: Math.round(s.now), phase: 'left' } }));
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
          sheet: { kind: 'fix', draft: { arrive: st.arrive ?? 0, leave: st.leave ?? 0, brk: st.brk || 0 } },
        }));
      },
      fixStep: (k: 'arrive' | 'leave' | 'brk', dir: 1 | -1) =>
        setUi((u) => {
          if (u.sheet?.kind !== 'fix') return u;
          const d = { ...u.sheet.draft };
          d[k] = Math.max(0, d[k] + dir * (k === 'brk' ? 15 : 1));
          if (d.leave <= d.arrive) d.leave = d.arrive + 1;
          return { ...u, sheet: { kind: 'fix', draft: d } };
        }),
      saveFix: (d: { arrive: number; leave: number; brk: number }) => {
        setS((s) => {
          const st = s.stop;
          const changed = d.arrive !== st.arrive || d.leave !== st.leave;
          const edited =
            !st.edited && changed && st.arrive != null && st.leave != null
              ? { arrive: st.arrive, leave: st.leave }
              : st.edited;
          return { ...s, stop: { ...st, arrive: d.arrive, leave: d.leave, brk: d.brk, edited } };
        });
        setUi((u) => ({ ...u, sheet: null }));
        toast('Time fixed. Original location record kept.');
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
