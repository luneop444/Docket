import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { clock, hm, money, rateShort } from '../logic/format';
import { colorDark, radius, type } from '../theme/tokens';

/**
 * Figma C3 "Live card": the same black card as the Dynamic Island, so the app
 * and the island match. Drawn with the Dark-mode Docket variables.
 */
export function LiveCard({
  waitedMin,
  owed,
  start,
  freeEnd,
  now,
  arrive,
  rate,
  fromAppt,
}: {
  waitedMin: number;
  owed: number;
  start: number;
  freeEnd: number;
  now: number;
  arrive: number;
  rate: number;
  fromAppt: boolean;
}) {
  const inDetention = now >= freeEnd;
  const beforeClock = now < start;

  const status = inDetention ? 'Detention running' : beforeClock ? 'Waiting for your appointment' : 'Free time';
  const below = inDetention
    ? `Free time ended ${clock(freeEnd)}`
    : beforeClock
      ? `Clock starts at your ${clock(start)} ${fromAppt ? 'appointment' : 'arrival'}`
      : `Detention starts at ${clock(freeEnd)}`;

  // Bar: time inside free time (grey) then paid detention (lime). Before
  // detention, the unfilled rest of free time shows as the track.
  const freeSpan = freeEnd - arrive;
  const elapsedFree = Math.min(now, freeEnd) - arrive;
  const paid = Math.max(0, now - freeEnd);

  return (
    <View style={styles.card}>
      <View style={styles.status}>
        <PulseDot live={inDetention} />
        <Text style={[type.labelSmall, { color: inDetention ? colorDark.signalInk : colorDark.ink }]}>{status}</Text>
      </View>
      <View style={{ height: 12 }} />
      <View style={styles.numbers}>
        <View style={{ gap: 4 }}>
          <Text style={[type.bodyTiny, styles.sub]}>Waited</Text>
          <Text style={[type.numberL, styles.ink, styles.tabular]}>{hm(waitedMin)}</Text>
        </View>
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <Text style={[type.bodyTiny, styles.sub]}>{inDetention ? 'Owed so far' : 'Free time left'}</Text>
          <Text style={[type.numberL, styles.tabular, { color: inDetention ? colorDark.signalInk : colorDark.ink }]}>
            {inDetention ? money(owed) : hm(freeEnd - Math.max(now, start))}
          </Text>
        </View>
      </View>
      <View style={{ height: 16 }} />
      <View style={styles.bar}>
        {inDetention ? (
          <>
            <View style={[styles.seg, { flex: freeSpan, backgroundColor: colorDark.free }]} />
            <View style={[styles.seg, { flex: Math.max(paid, 1), backgroundColor: colorDark.detention }]} />
          </>
        ) : (
          <>
            <View style={[styles.seg, { flex: Math.max(elapsedFree, 0.5), backgroundColor: colorDark.free }]} />
            <View style={[styles.seg, { flex: Math.max(freeSpan - elapsedFree, 0), backgroundColor: colorDark.line }]} />
          </>
        )}
      </View>
      <View style={{ height: 10 }} />
      <View style={styles.below}>
        <Text style={[type.bodyTiny, styles.sub]}>{below}</Text>
        <Text style={[type.bodyTiny, styles.sub]}>{rateShort(rate)}</Text>
      </View>
    </View>
  );
}

function PulseDot({ live }: { live: boolean }) {
  const [v] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, v]);
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: live ? colorDark.signal : colorDark.free }, live && { opacity: v }]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorDark.bg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: 20,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  numbers: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  ink: { color: colorDark.ink },
  sub: { color: colorDark.sub },
  tabular: { fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', gap: 2, height: 8 },
  seg: { height: 8, borderRadius: 4 },
  below: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
