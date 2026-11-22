import { useContext, type ReactNode } from 'react';
import { GlassInkCtx } from './backdrop';

/**
 * A label's colour inside adapting glass: dark ink while the glass is light, light ink while
 * it's dark (backdrop.ts adapt). Outside adapting glass, `fallback`.
 */
export function GlassInk({ fallback, children }: { fallback: string; children: (ink: string) => ReactNode }) {
  const v = useContext(GlassInkCtx);
  return <>{children(v?.ink ?? fallback)}</>;
}
