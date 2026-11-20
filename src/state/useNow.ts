import { useState } from 'react';

/** The time the screen opened, for "days old" and which settlement is due. Steady across re-renders. */
export function useNow(): number {
  return useState(() => Date.now())[0];
}
