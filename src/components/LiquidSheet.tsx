import type { ReactNode } from 'react';
import { BackdropCtx } from './backdrop';
import { View } from 'react-native';
import { glassDense, radius } from '../theme/tokens';

export { BackdropCtx };

/** Native: the glass sheet without the web lens (the native build will use the system's glass). */
export function LiquidSheet({ children }: { children: ReactNode; tint?: number }) {
  return <View style={{ ...glassDense, borderRadius: radius.sheet, borderCurve: 'continuous', padding: 20 }}>{children}</View>;
}
