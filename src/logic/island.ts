/**
 * What the Dynamic Island and lock screen Live Activity say at each stage
 * (Figma "Live Activity · Dynamic Island", node 144:223).
 */
import type { Rules } from './detention';
import { clock, clockBare, dur, hm, money, rateShort } from './format';
import type { IslandStage, Stop } from './stop';
import { stopCalc } from './stop';

export interface IslandCopy {
  /** Right side of the compact island, e.g. "1:58", "$10.50", "Out 4:21", "✓ $10.50". */
  compact: string;
  /** Lime (money accruing) or white. */
  compactLime: boolean;
  title: string;
  /** Second line under the title in the expanded island. */
  sub: string;
  value: string;
  valueLime: boolean;
  /** Bottom line of the expanded island. */
  line: string;
  /** Which of the 4 progress segments are filled. */
  filled: number;
  lockTitle: string;
  lockLine: string;
}

export function islandCopy(
  stage: IslandStage,
  stop: Stop,
  now: number,
  rules: Rules,
  place: { name: string; short: string; load: string },
): IslandCopy | null {
  if (stage === 0) return null;
  const c = stopCalc(stop, now, rules);
  const arrive = stop.arrive ?? now;
  const waited = hm((stop.leave ?? now) - arrive);
  const owed = money(c.owed);
  const sub = `${place.name} · Load ${place.load}`;
  switch (stage) {
    case 1: {
      const left = hm(Math.max(0, c.freeEnd - Math.max(now, c.start)));
      return {
        compact: left, compactLime: false, title: 'Free time', sub, value: left, valueLime: false,
        line: `Detention starts at ${clock(c.freeEnd)}`, filled: 1,
        lockTitle: 'Free time left',
        lockLine: `Detention starts at ${clock(c.freeEnd)} · ${rateShort(rules.rate)} after`,
      };
    }
    case 2:
      return {
        compact: owed, compactLime: true, title: 'Detention started', sub, value: owed, valueLime: true,
        line: `Logging every minute at ${rateShort(rules.rate)}`, filled: 2,
        lockTitle: 'Detention started', lockLine: 'Every minute now counts toward your pay',
      };
    case 3:
      return {
        compact: owed, compactLime: true, title: 'Detention running', sub, value: owed, valueLime: true,
        line: `${waited} waited · ${rateShort(rules.rate)}`, filled: 3,
        lockTitle: 'Detention so far', lockLine: `${waited} waited · started ${clock(c.freeEnd)}`,
      };
    case 4:
      return {
        compact: `Out ${clockBare(stop.leave ?? now)}`, compactLime: false,
        title: `You left ${place.short}`, sub: `${waited} waited · Load ${place.load}`, value: owed, valueLime: true,
        line: 'Tap to snap your signed BOL', filled: 4,
        lockTitle: 'Snap your BOL', lockLine: `Left ${clock(stop.leave ?? now)} · tap to add photo`,
      };
    case 5:
      return {
        compact: `✓ ${owed}`, compactLime: true, title: 'Stop logged', sub, value: owed, valueLime: true,
        line: 'Docket will check it against your settlement', filled: 4,
        lockTitle: 'Stop logged', lockLine: `Expected detention · checked on payday · ${dur(c.wait)} waited`,
      };
  }
}
