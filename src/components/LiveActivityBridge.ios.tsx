/**
 * Mirrors the current stop into Docket's iOS Live Activity (Dynamic Island and
 * lock screen): starts it when a stop's free time begins, updates it when its
 * copy changes, and ends it once the stop is logged or cleared.
 *
 * Expo Go has no widget extension, so everything is guarded: if the native
 * module is missing, this renders nothing and does nothing.
 */
import { useEffect, useRef } from 'react';

import { islandCopy } from '../logic/island';
import { placeOf } from '../logic/state';
import { stopCalc } from '../logic/stop';
import { useStore } from '../state/AppStore';
import type { DocketActivityProps } from '../widgets/DocketActivity';
import { useIslandStage } from './Chrome';

type Instance = {
  update: (p: DocketActivityProps) => Promise<void>;
  end: (policy?: 'default' | 'immediate', p?: DocketActivityProps) => Promise<void>;
};
type Factory = { start: (p: DocketActivityProps, url?: string) => Instance; getInstances: () => Instance[] };

let factory: Factory | null | undefined;
function getFactory(): Factory | null {
  if (factory !== undefined) return factory;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = require('../widgets/DocketActivity').default as Factory;
  } catch {
    factory = null;
  }
  return factory;
}

export function LiveActivityBridge() {
  const { s } = useStore();
  const stage = useIslandStage();
  const current = useRef<Instance | null>(null);
  const last = useRef('');

  const copy = islandCopy(stage, s.stop, s.now, s.rules, placeOf(s.load));
  // Real-clock timer only for a live stop; the demo clock runs a minute a second.
  let until = 0;
  if (copy && s.stop.live && s.stop.dayStart != null && (stage === 1 || stage === 2 || stage === 3)) {
    // A live stop counts minutes from its own day start, so this is exact.
    until = s.stop.dayStart + stopCalc(s.stop, s.now, s.rules).freeEnd * 60000;
  }
  const props: DocketActivityProps | null = copy
    ? {
        compact: copy.compact, compactLime: copy.compactLime, title: copy.title, sub: copy.sub,
        value: copy.value, valueLime: copy.valueLime, line: copy.line, filled: copy.filled,
        lockTitle: copy.lockTitle, lockLine: copy.lockLine, until,
      }
    : null;
  const key = props ? JSON.stringify(props) : '';

  useEffect(() => {
    const f = getFactory();
    if (!f || key === last.current) return;
    last.current = key;
    try {
      if (!current.current) current.current = f.getInstances()[0] ?? null;
      const done = !props || stage === 5;
      if (done) {
        const a = current.current;
        current.current = null;
        if (a) a.end('default', props ?? undefined).catch(() => {});
        // Anything left over from an earlier launch goes too.
        for (const x of f.getInstances()) x.end('immediate').catch(() => {});
        return;
      }
      if (current.current) current.current.update(props).catch(() => {});
      else current.current = f.start(props, 'docket:///today');
    } catch {
      // Live Activities turned off in Settings, or not supported: carry on without.
    }
    // props is derived from key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stage]);

  return null;
}
