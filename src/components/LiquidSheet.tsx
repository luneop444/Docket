import { createContext, type ReactNode, type RefObject } from 'react';
import { View } from 'react-native';
import { glassDense, radius } from '../theme/tokens';

export const BackdropCtx = createContext<RefObject<unknown> | null>(null);

/** Native: the glass sheet without the web lens (the native build will use the system's glass). */
export function LiquidSheet({ children }: { children: ReactNode; tint?: number }) {
  return <View style={{ ...glassDense, borderRadius: radius.sheet, borderCurve: 'continuous', padding: 20 }}>{children}</View>;
}
