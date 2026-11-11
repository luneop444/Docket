import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, fontFamily, protoColor, radius, type } from '../theme/tokens';
import { T } from './ui';

export interface TimelineEvent {
  icon: ReactNode;
  title: string;
  detail: string;
  time: string;
  done: boolean;
  /** Lime node once detention is being paid. */
  money?: boolean;
  /** The rail below this event is black (detention) instead of grey (free time). */
  paidLine?: boolean;
  last?: boolean;
  action?: { label: string; onPress: () => void };
}

/** Figma "Timeline / Event" (State × Segment), stacked in a card. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={styles.card}>
      {events.map((e) => (
        <View key={e.title} style={styles.ev}>
          <View style={styles.rail}>
            <View
              style={[
                styles.node,
                !e.done && styles.nodePending,
                e.money && e.done && styles.nodeMoney,
              ]}
            >
              {e.icon}
            </View>
            {e.last ? null : <View style={[styles.line, e.paidLine && styles.lineDetention]} />}
          </View>
          <View style={styles.txt}>
            <T v="bodyStrong">{e.title}</T>
            <T v="bodySmall">{e.detail}</T>
            {e.action ? (
              <Pressable accessibilityRole="button" onPress={e.action.onPress} style={styles.inlineBtn}>
                <Text style={[type.labelSmall, { color: color.bg }]}>{e.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.time, !e.done && styles.timePending]}>{e.time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.raise,
    borderRadius: radius.card,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 2,
    paddingLeft: 8,
    boxShadow: `0 8px 24px ${protoColor.shadow}`,
  },
  ev: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rail: { width: 32, alignSelf: 'stretch', alignItems: 'center', gap: 3, paddingTop: 4 },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePending: { backgroundColor: color.raise2 },
  nodeMoney: { backgroundColor: color.signal, boxShadow: `0 4px 14px ${protoColor.moneyGlow}` },
  line: { flex: 1, width: 3, borderRadius: 2, backgroundColor: color.free, minHeight: 12 },
  lineDetention: { backgroundColor: color.detention },
  txt: { flex: 1, minWidth: 0, paddingTop: 1, paddingBottom: 22 },
  time: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  timePending: { color: color.faint, fontFamily: fontFamily.medium },
  inlineBtn: {
    marginTop: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
});
