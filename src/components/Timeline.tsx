import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, elevation, fontFamily, radius, type } from '../theme/tokens';

export type EventState = 'done' | 'current' | 'upcoming';
/** The rail below the event: free time, paid detention, not reached yet, or nothing (last event). */
export type EventSegment = 'free' | 'paid' | 'upcoming' | 'none';
/** Figma "Icon/Timeline/…" */
export type EventIcon = 'pin' | 'clock' | 'check' | 'hourglass' | 'dollar';

export interface TimelineEvent {
  title: string;
  detail?: string;
  time?: string;
  state: EventState;
  segment: EventSegment;
  icon: EventIcon;
  action?: { label: string; onPress: () => void };
}

/** Exported from the Figma Timeline / Event component: white on black (done), black on lime (current), faint on white (upcoming). */
const ICONS: Record<EventIcon, Record<EventState, number>> = {
  pin: {
    done: require('../../assets/icons/timeline/pin-done.svg'),
    current: require('../../assets/icons/timeline/pin-current.svg'),
    upcoming: require('../../assets/icons/timeline/pin-upcoming.svg'),
  },
  clock: {
    done: require('../../assets/icons/timeline/clock-done.svg'),
    current: require('../../assets/icons/timeline/clock-current.svg'),
    upcoming: require('../../assets/icons/timeline/clock-upcoming.svg'),
  },
  check: {
    done: require('../../assets/icons/timeline/check-done.svg'),
    current: require('../../assets/icons/timeline/check-current.svg'),
    upcoming: require('../../assets/icons/timeline/check-upcoming.svg'),
  },
  hourglass: {
    done: require('../../assets/icons/timeline/hourglass-done.svg'),
    current: require('../../assets/icons/timeline/hourglass-current.svg'),
    upcoming: require('../../assets/icons/timeline/hourglass-upcoming.svg'),
  },
  dollar: {
    done: require('../../assets/icons/timeline/dollar-done.svg'),
    current: require('../../assets/icons/timeline/dollar-current.svg'),
    upcoming: require('../../assets/icons/timeline/dollar-upcoming.svg'),
  },
};

const SEGMENT_COLOR: Record<Exclude<EventSegment, 'none'>, string> = {
  free: color.free,
  paid: color.detention,
  upcoming: color.line,
};

/** Figma "Timeline / Event" (State × Segment), node 295:805. */
export function TimelineEventRow({ title, detail, time, state, segment, icon, action }: TimelineEvent) {
  const upcoming = state === 'upcoming';
  return (
    <View style={styles.ev}>
      <View style={styles.rail}>
        <View style={[styles.node, styles[state]]}>
          <Image source={ICONS[icon][state]} style={styles.icon} contentFit="contain" accessible={false} />
        </View>
        {segment === 'none' ? null : <View style={[styles.segment, { backgroundColor: SEGMENT_COLOR[segment] }]} />}
      </View>
      <View style={styles.text}>
        <Text style={upcoming ? styles.titleUpcoming : styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={[type.labelSmall, { color: color.bg }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {time ? (
        <View style={styles.timeWrap}>
          <Text style={upcoming ? styles.timeUpcoming : styles.time}>{time}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The grey card the events sit in. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View style={styles.card}>
      {events.map((e) => (
        <TimelineEventRow key={e.title} {...e} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.raise,
    borderRadius: radius.timeline,
    borderCurve: 'continuous',
    paddingLeft: 12,
    paddingRight: 16,
    paddingTop: 16,
    boxShadow: elevation.card,
  },
  ev: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rail: { width: 30, alignSelf: 'stretch', alignItems: 'center' },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: color.ink },
  current: { backgroundColor: color.signal, boxShadow: elevation.nodeCurrent },
  upcoming: { backgroundColor: color.bg, borderWidth: 1, borderColor: color.line, boxShadow: elevation.nodeUpcoming },
  icon: { width: 16, height: 16 },
  segment: { flex: 1, width: 3 },
  text: { flex: 1, minWidth: 0, gap: 2, paddingTop: 4, paddingBottom: 20 },
  title: { ...type.bodyStrong, color: color.ink },
  titleUpcoming: { ...type.body, color: color.sub },
  detail: { ...type.bodySmall, color: color.sub },
  timeWrap: { paddingTop: 4 },
  time: { ...type.bodyStrong, color: color.ink, fontVariant: ['tabular-nums'] },
  timeUpcoming: { ...type.body, color: color.sub, fontFamily: fontFamily.regular, fontVariant: ['tabular-nums'] },
  action: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    backgroundColor: color.ink,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.98 }] },
});
