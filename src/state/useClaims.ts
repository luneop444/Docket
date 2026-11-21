import { useMemo } from 'react';
import { claimsOf, sortClaims } from '../logic/claims';
import { useStore } from './AppStore';
import { demoClaimLoad } from './demoClaim';

/** Every claim, open ones needing the driver first. */
export function useClaims() {
  const { s } = useStore();
  return useMemo(() => sortClaims(claimsOf(s.history, s.rules, s.claims, demoClaimLoad(s))), [s]);
}
