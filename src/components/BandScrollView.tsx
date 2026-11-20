import { useRef, type RefObject } from 'react';
import { ScrollView, type ScrollViewInstance, type ScrollViewProps } from 'react-native';
import { useRubberBand } from './useRubberBand';

/**
 * Every scrolling area in the app: a ScrollView that rubber-bands at its ends on the web too
 * (useRubberBand.web.ts), as it does natively on iPhone.
 */
export function BandScrollView({ scrollRef, ...props }: ScrollViewProps & { scrollRef?: RefObject<ScrollViewInstance | null> }) {
  const own = useRef<ScrollViewInstance>(null);
  const ref = scrollRef ?? own;
  useRubberBand(ref as RefObject<never>);
  return <ScrollView ref={ref} {...props} />;
}
