import { useEffect, useRef } from 'react';

/**
 * Hold to repeat, as an iOS stepper does: one step on tap; held past 400 ms it keeps
 * stepping every 120 ms until you let go. Spread the result onto a Pressable.
 */
export function useRepeat(step: () => void) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef(step);
  useEffect(() => {
    latest.current = step;
  }, [step]);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    onPress: () => latest.current(),
    onLongPress: () => {
      stop();
      timer.current = setInterval(() => latest.current(), 120);
    },
    onPressOut: stop,
    delayLongPress: 400,
  };
}
