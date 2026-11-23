import type { AppState } from '../logic/state';
import { demoClaimLoad } from './demoClaim';

/** The claim id of the stop on Today: its history entry for a live stop, or the simulated one's. */
export function currentClaimId(s: AppState): string | null {
  const st = s.stop;
  if (st.live) {
    if (st.dayStart == null || st.arrive == null) return null;
    return st.id ?? String(st.dayStart + st.arrive * 60000);
  }
  return demoClaimLoad(s)?.l.id ?? null;
}
