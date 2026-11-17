import { StyleSheet, View } from 'react-native';
import { clock, dur } from '../logic/format';
import { color } from '../theme/tokens';
import { T } from './ui';

export interface BarData {
  /** Minutes after midnight. */
  arrive: number;
  start: number;
  freeEnd: number;
  now: number;
}

/** Ticks closer than this share of the bar would overlap, so the earlier one is dropped. */
const TICK_ROOM = 0.16;

/**
 * The stop from arrival to now, so the wait before free time started is
 * visible, not hidden: outlined (it isn't counted), then free time used in
 * grey, free time left as the track, and paid detention in black. Ticks mark
 * the clock times the segments change at. Every colour is a token.
 */
export function FreeBar({ d }: { d: BarData }) {
  const early = Math.max(0, d.start - d.arrive);
  const from = Math.min(d.arrive, d.start);
  const used = Math.max(0, Math.min(d.now, d.freeEnd) - d.start);
  const left = Math.max(0, d.freeEnd - Math.max(d.now, d.start));
  const paid = Math.max(0, d.now - d.freeEnd);
  const span = Math.max(1, Math.max(d.now, d.freeEnd) - from);
  const share = (m: number) => (m - from) / span;
  // A tick's label starts at its time; near the end it stops where it would still fit.
  const pct = (m: number) => `${Math.min(share(m), 1 - TICK_ROOM) * 100}%` as const;

  const ticks: { m: number; label: string }[] = [];
  if (early > 0) ticks.push({ m: d.arrive, label: clock(d.arrive) });
  ticks.push({ m: d.start, label: clock(d.start) }, { m: d.freeEnd, label: clock(d.freeEnd) });
  const shown = ticks.filter((t, i) => i === ticks.length - 1 || share(ticks[i + 1].m) - share(t.m) >= TICK_ROOM);

  // The figure above is read out in full, so the bar is hidden from screen readers.
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <View style={styles.bar}>
        {early > 0 ? <View style={[styles.seg, styles.early, { flex: early }]} /> : null}
        {used > 0 ? <View style={[styles.seg, { flex: used, backgroundColor: color.free }]} /> : null}
        {left > 0 ? <View style={[styles.seg, { flex: left, backgroundColor: color.raise2 }]} /> : null}
        {paid > 0 ? <View style={[styles.seg, { flex: paid, backgroundColor: color.detention }]} /> : null}
      </View>
      <View style={styles.ticks}>
        {shown.map((t) => (
          <View key={t.m} style={[styles.tick, { left: pct(t.m) }]}>
            <T v="bodyTiny" c={color.sub} numberOfLines={1}>
              {t.label}
            </T>
          </View>
        ))}
      </View>
      {early > 0 ? (
        <T v="bodySmall" c={color.sub}>
          {`Waited ${dur(early)} before free time`}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 8, flexDirection: 'row', gap: 2 },
  seg: { height: 8, borderRadius: 4 },
  // Outlined, not filled: time at the stop that free time and pay don't count.
  early: { borderWidth: 1, borderColor: color.free },
  ticks: { height: 16, marginTop: 6, marginBottom: 4 },
  tick: { position: 'absolute', top: 0 },
});
