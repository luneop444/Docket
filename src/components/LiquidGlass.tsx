import type { ReactNode } from 'react';
import { View } from 'react-native';
import { glass } from '../theme/tokens';

/**
 * Off the web the pills are plain glass views (62% white, edge, lift, rims). On iPhone
 * the lens would come from the system's own Liquid Glass, not this web renderer.
 */
export function LiquidGroup({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center' }} pointerEvents="box-none">{children}</View>;
}

export function LiquidPill({ w, h, on = true, children }: { w: number; h: number; on?: boolean; children: ReactNode }) {
  return (
    <View style={[on ? glass : null, { width: w, height: h, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
      {children}
    </View>
  );
}
