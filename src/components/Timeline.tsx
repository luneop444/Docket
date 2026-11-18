import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, fontFamily, type } from '../theme/tokens';

export type EventState = 'done' | 'current' | 'upcoming';
/** The rail below the event: free time, paid detention, not reached yet, or nothing (last event). */
export type EventSegment = 'free' | 'paid' | 'upcoming' | 'none';
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

/** Figma "Timeline / Event" rails: 3 wide. Free is the Figma's #B9C2C8 (no token has it). */
const SEGMENT_COLOR: Record<Exclude<EventSegment, 'none'>, string> = {
  free: '#B9C2C8',
  paid: color.ink,
  upcoming: color.line,
};

/** Figma "Icon/Timeline/*": 16 box, 1.47 stroke, exported from the components. */
const GLYPH: Record<EventIcon, string> = {
  pin: 'M8 14S3.333 9.867 3.333 6.333a4.667 4.667 0 0 1 9.334 0C12.667 9.867 8 14 8 14ZM8 8a1.667 1.667 0 1 0 0-3.333A1.667 1.667 0 0 0 8 8Z',
  clock: 'M8 5v3l2 1.333M13.667 8A5.667 5.667 0 1 1 2.333 8a5.667 5.667 0 0 1 11.334 0Z',
  check: 'M3.333 8.333l3 3L12.667 5',
  hourglass:
    'M4.667 2h6.666M4.667 14h6.666M5.333 2v1.333C5.333 5.333 8 6.333 8 8m0 0c0-1.667 2.667-2.667 2.667-4.667V2M8 8c0 1.667-2.667 2.667-2.667 4.667V14M8 8c0 1.667 2.667 2.667 2.667 4.667V14',
  dollar:
    'M8 2v12m3-9c-.4-1-1.467-1.667-3-1.667-1.733 0-3 .867-3 2.2 0 3.067 6.333 1.6 6.333 4.8 0 1.4-1.333 2.334-3.2 2.334-1.6 0-2.8-.734-3.266-1.867',
};

/** Figma "Timeline / Event" (State × Segment): a 30 node with its icon, title, detail, time. */
export function TimelineEventRow({ title, detail, time, state, segment, icon, action }: TimelineEvent) {
  const upcoming = state === 'upcoming';
  const glyph = state === 'done' ? color.bg : state === 'current' ? color.ink : color.faint;
  return (
    <View style={styles.ev}>
      <View style={styles.rail}>
        <View style={[styles.node, styles[state]]}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d={GLYPH[icon]} stroke={glyph} strokeWidth={1.4667} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        {segment === 'none' ? null : <View style={[styles.segment, { backgroundColor: SEGMENT_COLOR[segment] }]} />}
      </View>
      <View style={styles.text}>
        <Text style={[type.bodyStrong, upcoming ? styles.upcoming_ : styles.ink]}>{title}</Text>
        {detail ? <Text style={[type.bodySmall, styles.sub]}>{detail}</Text> : null}
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={[type.labelSmall, { color: color.bg }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {time ? (
        <View style={styles.timeWrap}>
          <Text style={[type.body, styles.time, upcoming ? styles.sub : styles.ink]}>{time}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Figma "Timeline": the grey card the events sit in. 20 on three sides; each event carries its own 20 below. */
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
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 20,
    paddingRight: 20,
    paddingLeft: 20,
  },
  ev: { flexDirection: 'row', gap: 12 },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: color.ink },
  // Figma: lime with a lime glow (60%, blur 12).
  current: { backgroundColor: color.signal, boxShadow: '0 0 12px rgba(212,245,77,0.6)' },
  // Figma: white, 1 line border, a soft shadow (#1A1F29 at 8%, blur 6).
  upcoming: { backgroundColor: color.bg, borderWidth: 1, borderColor: color.line, boxShadow: '0 0 6px rgba(26,31,41,0.08)' },
  segment: { flex: 1, width: 3 },
  // 4 above the title, 20 below the last line, 2 between.
  text: { flex: 1, minWidth: 0, gap: 2, paddingTop: 4, paddingBottom: 20 },
  // Times are data, not titles: Body/Regular, lined up with the title (09 · clarity pass).
  timeWrap: { paddingTop: 4 },
  ink: { color: color.ink },
  sub: { color: color.sub },
  upcoming_: { color: color.sub, fontFamily: fontFamily.regular },
  time: { fontVariant: ['tabular-nums'] },
  // Figma "I checked in": 124 × 44, black squircle, 15 semibold white.
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
  pressed: { opacity: 0.85 },
});
