import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, fontFamily, type } from '../theme/tokens';

export type EventState = 'done' | 'current' | 'upcoming';
/** The rail below the event: free time, paid detention, not reached yet, or nothing (last event). */
export type EventSegment = 'free' | 'paid' | 'upcoming' | 'none';

export interface TimelineEvent {
  title: string;
  detail?: string;
  time?: string;
  state: EventState;
  segment: EventSegment;
  action?: { label: string; onPress: () => void };
}

const SEGMENT_COLOR: Record<Exclude<EventSegment, 'none'>, string> = {
  free: color.free,
  paid: color.detention,
  upcoming: color.line,
};

/** Figma "Timeline / Event" (State × Segment). */
export function TimelineEventRow({ title, detail, time, state, segment, action }: TimelineEvent) {
  const upcoming = state === 'upcoming';
  return (
    <View style={styles.ev}>
      <View style={styles.rail}>
        <View style={[styles.node, styles[state]]} />
        {segment === 'none' ? null : <View style={[styles.segment, { backgroundColor: SEGMENT_COLOR[segment] }]} />}
      </View>
      <View style={styles.text}>
        <Text style={[type.bodyStrong, upcoming ? styles.upcomingTitle : styles.ink]}>{title}</Text>
        {detail ? <Text style={[type.bodySmall, styles.sub]}>{detail}</Text> : null}
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.action}>
            <Text style={[type.labelSmall, { color: color.bg }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {time ? (
        <Text style={[type.bodyStrong, styles.time, upcoming ? styles.upcomingTime : styles.ink]}>{time}</Text>
      ) : null}
    </View>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View>
      {events.map((e) => (
        <TimelineEventRow key={e.title} {...e} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ev: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rail: { width: 28, alignSelf: 'stretch', alignItems: 'center', gap: 4, paddingTop: 4 },
  node: { width: 14, height: 14, borderRadius: 7 },
  done: { backgroundColor: color.ink },
  current: { backgroundColor: color.signal, borderWidth: 1.5, borderColor: color.ink },
  upcoming: { borderWidth: 1.5, borderColor: color.faint },
  segment: { flex: 1, width: 6, borderRadius: 3, minHeight: 12 },
  text: { flex: 1, minWidth: 0, gap: 2, paddingTop: 1, paddingBottom: 22 },
  ink: { color: color.ink },
  sub: { color: color.sub },
  upcomingTitle: { color: color.sub, fontFamily: fontFamily.regular },
  time: { fontVariant: ['tabular-nums'] },
  upcomingTime: { color: color.sub, fontFamily: fontFamily.regular },
  action: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
});
