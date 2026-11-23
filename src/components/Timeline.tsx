import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useReduceMotion } from './stepMotion';
import { CheckIcon, ClockIcon, DollarIcon, HourglassIcon, PinIcon } from './Icons';
import { color, fontFamily, glass, type } from '../theme/tokens';
import { Tappable } from './Tappable';

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
  /** Share of a free rail already behind you; the rest is drawn as still ahead. */
  fill?: number;
  icon: EventIcon;
  action?: { label: string; onPress: () => void };
}

/**
 * Rails, 3 wide. Behind you they're solid, in the time bar's colours (TimeBar): free time grey
 * (color.free), detention black. Ahead they're dotted, so "been here" never depends on telling
 * two greys apart: the Figma's #B9C2C8 free rail sat next to the light upcoming one and the path
 * to the lit step vanished in free time while it showed in detention (23 Nov).
 */
const SEGMENT_COLOR: Record<'free' | 'paid', string> = {
  free: color.free,
  paid: color.ink,
};
const DOT = 'rgba(28,28,28,0.3)';

/** Still ahead: a column of dots, clipped to the rail's height. */
function Ahead() {
  return (
    <View style={styles.ahead}>
      {/* Held out of the layout, so the dots never set the row's height. */}
      <View style={styles.dots}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );
}

function Rail({ segment, fill }: { segment: EventSegment; fill?: number }) {
  if (segment === 'none') return null;
  if (segment === 'upcoming') return <Ahead />;
  const solid = <View style={[styles.segment, { backgroundColor: SEGMENT_COLOR[segment] }]} />;
  if (fill == null || fill >= 1) return solid;
  return (
    <View style={styles.split}>
      <View style={{ flex: fill, width: 3, backgroundColor: SEGMENT_COLOR[segment] }} />
      <View style={{ flex: 1 - fill, width: 3 }}>
        <Ahead />
      </View>
    </View>
  );
}

/** The node icons, as SF Symbols (mappin, clock, checkmark, hourglass, dollarsign). */
const GLYPH: Record<EventIcon, (p: { c: string; size: number }) => ReactElement | null> = {
  pin: PinIcon,
  clock: ClockIcon,
  check: CheckIcon,
  hourglass: HourglassIcon,
  dollar: DollarIcon,
};

/**
 * A step that has just happened (checked in, free time ended, left) settles into its new state:
 * the node dips to 0.8 and springs back with a little overshoot, the way an iOS control confirms
 * a change. Only on a change of state while the screen is open, never on first show, and not
 * under Reduce Motion.
 */
function usePop(state: EventState) {
  const reduce = useReduceMotion();
  const [s] = useState(() => new Animated.Value(1));
  const was = useRef(state);
  useEffect(() => {
    if (was.current === state) return;
    was.current = state;
    if (reduce) return;
    s.setValue(0.8);
    Animated.spring(s, { toValue: 1, speed: 16, bounciness: 12, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [state, reduce, s]);
  return s;
}

/** Figma "Timeline / Event" (State × Segment): a 30 node with its icon, title, detail, time. */
export function TimelineEventRow({ title, detail, time, state, segment, fill, icon, action }: TimelineEvent) {
  const upcoming = state === 'upcoming';
  const Glyph = GLYPH[icon];
  const glyph = state === 'done' ? color.bg : state === 'current' ? color.ink : color.faint;
  const pop = usePop(state);
  return (
    <View style={styles.ev}>
      <View style={styles.rail}>
        <Animated.View style={[styles.node, styles[state], { transform: [{ scale: pop }] }]}>
          <Glyph c={glyph} size={15} />
        </Animated.View>
        <Rail segment={segment} fill={fill} />
      </View>
      <View style={styles.text}>
        <Text style={[type.bodyStrong, upcoming ? styles.upcoming_ : styles.ink]}>{title}</Text>
        {detail ? <Text style={[type.bodySmall, styles.sub]}>{detail}</Text> : null}
        {action ? (
          <Tappable accessibilityRole="button" onPress={action.onPress} style={[styles.action]}>
            {({ lit }) => <Text style={[type.labelSmall, { color: lit ? color.ink : color.bg }]}>{action.label}</Text>}
          </Tappable>
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

/**
 * Figma "Timeline": the grey card the events sit in. 20 on three sides; each event carries
 * its own 20 below. `footer`: a quiet action about these times (Fix a time), under the last
 * event, lined up with the event text so it reads as belonging to the rows above it.
 */
export function Timeline({ events, footer }: { events: TimelineEvent[]; footer?: ReactNode }) {
  return (
    <View style={styles.card}>
      {events.map((e) => (
        <TimelineEventRow key={e.title} {...e} />
      ))}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 20,
    paddingRight: 20,
    paddingLeft: 20,
  },
  ev: { flexDirection: 'row', gap: 12 },
  // Under the event text (rail 30 + gap 12), 20 from the card's bottom like every event.
  footer: { paddingLeft: 42, paddingBottom: 20, alignItems: 'flex-start' },
  rail: { width: 30, alignItems: 'center' },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: color.ink },
  // Figma: lime with a lime glow (60%, blur 12).
  current: { backgroundColor: color.signal, boxShadow: '0 0 12px rgba(212,245,77,0.6)' },
  // Figma: white, 1 line border, a soft shadow (the ink at 8%, blur 6).
  upcoming: { backgroundColor: color.bg, borderWidth: 1, borderColor: color.line, boxShadow: '0 0 6px rgba(28,28,28,0.08)' },
  segment: { flex: 1, width: 3 },
  split: { flex: 1, alignItems: 'center' },
  // Dots 3 across, 4 apart, starting 4 below whatever is above them.
  ahead: { flex: 1, width: 3, overflow: 'hidden' },
  dots: { position: 'absolute', top: 4, left: 0, gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: DOT },
  // 4 above the title, 20 below the last line, 2 between.
  text: { flex: 1, minWidth: 0, gap: 2, paddingTop: 4, paddingBottom: 20 },
  // Times are data, not titles: Body/Regular, lined up with the title (09 · clarity pass).
  timeWrap: { paddingTop: 4 },
  ink: { color: color.ink },
  sub: { color: color.sub },
  upcoming_: { color: color.sub, fontFamily: fontFamily.regular },
  time: { fontVariant: ['tabular-nums'] },
  // Figma "I checked in": 124 × 44, black capsule (buttons are pills), 15 semibold white.
  action: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: color.ink,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
