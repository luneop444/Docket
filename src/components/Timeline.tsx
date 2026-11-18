import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactElement } from 'react';
import { CheckIcon, ClockIcon, DollarIcon, HourglassIcon, PinIcon } from './Icons';
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

/** The node icons, as SF Symbols (mappin, clock, checkmark, hourglass, dollarsign). */
const GLYPH: Record<EventIcon, (p: { c: string; size: number }) => ReactElement | null> = {
  pin: PinIcon,
  clock: ClockIcon,
  check: CheckIcon,
  hourglass: HourglassIcon,
  dollar: DollarIcon,
};

/** Figma "Timeline / Event" (State × Segment): a 30 node with its icon, title, detail, time. */
export function TimelineEventRow({ title, detail, time, state, segment, icon, action }: TimelineEvent) {
  const upcoming = state === 'upcoming';
  const Glyph = GLYPH[icon];
  const glyph = state === 'done' ? color.bg : state === 'current' ? color.ink : color.faint;
  return (
    <View style={styles.ev}>
      <View style={styles.rail}>
        <View style={[styles.node, styles[state]]}>
          <Glyph c={glyph} size={15} />
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
