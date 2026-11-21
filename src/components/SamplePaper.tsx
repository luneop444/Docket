import type { ReactNode } from 'react';
import type { Statement } from './SamplePaper.web';
import { View } from 'react-native';

export type { Statement };
/** Native: the drawn page, turned (the native build will photograph real paper). */
export function SamplePaper({ page, x, y, w, h }: { page?: ReactNode; statement: Statement; x: number; y: number; w: number; h: number }) {
  return <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: [{ rotate: '-2.2deg' }] }}>{page}</View>;
}
