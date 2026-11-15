import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Onboarding step motion, measured from the reference video (Pinterest pin
 * 737183032797648903, frames 4.66s–5.10s):
 * - the progress segment hands over in ~220ms: the old one shrinks and fades
 *   while the next grows and darkens, both at once, ease-in-out;
 * - the screen content pushes sideways in ~350ms with an ease-out landing,
 *   while the header stays put.
 *
 * Each onboarding screen mounts its own header, so the step it came from is
 * kept here between screens.
 */
export const BAR_MS = 220;
export const PUSH_MS = 350;

let lastStep: number | null = null;

export interface StepMotion {
  /** Step shown before this screen, or null on first arrival. */
  from: number | null;
  to: number;
  /** 1 = forward (content comes from the right), -1 = back. */
  dir: 1 | -1;
}

/** Read once per screen mount; every caller in the same render sees the same `from`. */
export function useStepMotion(step: number): StepMotion {
  const [motion] = useState<StepMotion>(() => {
    const from = lastStep;
    return { from, to: step, dir: from != null && step < from ? -1 : 1 };
  });
  useEffect(() => {
    lastStep = step;
  }, [step]);
  return motion;
}

/** Leaving onboarding resets it, so coming back later starts fresh. */
export function resetStepMotion() {
  lastStep = null;
}

/** People who turn on Reduce Motion get the end state with no movement. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduce(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
