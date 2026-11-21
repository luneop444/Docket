/**
 * The prototype's simulated stop (not kept in the history) as a claim's load, once it's
 * done and owed detention, so a claim sent from it shows up in Claims.
 */
import type { ExtraLoad } from '../logic/claims';
import { dayLabel } from '../logic/history';
import { placeOf, type AppState } from '../logic/state';

export function demoClaimLoad(s: AppState): ExtraLoad | null {
  const st = s.stop;
  if (st.live || (st.phase !== 'left' && st.phase !== 'logged') || st.arrive == null || st.leave == null) return null;
  const place = placeOf(s.load);
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return {
    l: {
      id: `today-${place.load || place.name}`,
      number: place.load || undefined,
      name: place.name,
      day: dayLabel(day.getTime()),
      arrive: st.arrive,
      appt: st.appt ?? st.arrive,
      leave: st.leave,
      brk: st.brk,
    },
    day: day.getTime(),
  };
}
