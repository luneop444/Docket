import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform } from 'react-native';

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

/**
 * Last known Reduce Motion setting, read once at startup, so components that
 * mount later (sheets, toasts) know it on their first frame instead of
 * animating once while the async check is still running.
 */
let reduceCached = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((r) => {
    reduceCached = r;
  })
  .catch(() => {});

/** People who turn on Reduce Motion get the end state with no movement. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(reduceCached);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        reduceCached = r;
        if (alive) setReduce(r);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => {
      reduceCached = r;
      setReduce(r);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Let the next layout change glide (rows re-sorting, a field opening) instead of jumping.
 * Phone builds only: the web has no LayoutAnimation, so it changes in place there.
 * Skipped with Reduce Motion.
 */
export function glideNext(reduce: boolean) {
  if (reduce || Platform.OS === 'web') return;
  LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
}
