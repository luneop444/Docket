import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProfileTrailing, Screen, TopBar } from '../../components/Chrome';
import { DemoDrawer } from '../../components/DemoDrawer';
import { PulseDot } from '../../components/LiveCard';
import { Timeline, type TimelineEvent } from '../../components/Timeline';
import { Button, Card, Gap, Hr, Pill, Row, T } from '../../components/ui';
import { isDemoState } from '../../logic/demo';
import { clock, dur, hm, money } from '../../logic/format';
import { payWeeks } from '../../logic/history';
import { weekTotals } from '../../logic/settlement';
import { placeOf, watchedStop } from '../../logic/state';
import { dockTimeline, stopCalc } from '../../logic/stop';
import { useStore } from '../../state/AppStore';
import { color, colorDark, radius } from '../../theme/tokens';

/**
 * Home. One status at the top that answers "is it counting, and when do I get
 * paid?", today's stops under it, last week at the bottom. Location does the
 * work; the driver only answers "Loading here?" somewhere new, or fixes a time.
 */
export default function Today() {
  const { s, a } = useStore();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const linked = isDemoState(state);

  useEffect(() => {
    if (linked) a.demo(state);
    // Apply a linked state once, when the link opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Screen header={<TopBar trailing={<ProfileTrailing />} />} overlay={linked ? null : <DemoDrawer />}>
      <Status />
      <Gap h={32} />
      <TodayStops />
      <Gap h={32} />
      <LastWeek />
      {s.stop.live && s.stop.phase === 'dock' ? (
        <>
          <Gap h={24} />
          <Button label="I left" variant="quiet" onPress={() => a.leave()} />
        </>
      ) : null}
    </Screen>
  );
}

/* ---------- the status at the top ---------- */

function Status() {
  const { s } = useStore();
  const phase = s.stop.phase;
  if (phase === 'dock') return <Counting />;
  if (phase === 'left' || phase === 'logged') return <Done />;
  return <Watching />;
}

/** Driving, or parked somewhere new and being asked (the question is the sheet over Home). */
function Watching() {
  const { s } = useStore();
  const asking = s.stop.phase === 'arriving';
  return (
    <View style={styles.top}>
      <Pill label={asking ? 'Parked 30 min' : 'Watching'} />
      <Gap h={16} />
      <T v="h1">{asking ? `At ${placeOf(s.load).short}?` : 'No stop right now'}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {asking
          ? `You’ve been parked here since ${clock(s.stop.arrive ?? s.now)}.`
          : 'At a shipper or receiver, Docket times from when you pull in. Somewhere new, it asks after 30 min.'}
      </T>
    </View>
  );
}

/** At the dock: the live wait. Same black card as the Dynamic Island and lock screen. */
function Counting() {
  const { s, a } = useStore();
  const st = s.stop;
  const arrive = st.arrive ?? s.now;
  const c = stopCalc(st, s.now, s.rules);
  const paid = s.now >= c.freeEnd;
  const early = s.now < c.start;

  const line = paid
    ? `Paid since ${clock(c.freeEnd)}`
    : early
      ? `Free time starts at your ${clock(c.start)} appointment`
      : `Paid detention starts in ${dur(c.freeEnd - s.now)}, at ${clock(c.freeEnd)}`;

  return (
    <View style={styles.live}>
      <View style={styles.liveStatus}>
        <PulseDot live={paid} />
        <T v="labelSmall" c={paid ? colorDark.signal : colorDark.ink}>
          {paid ? 'Paid detention' : early ? 'Waiting for your appointment' : 'Free time'}
        </T>
      </View>
      <Gap h={16} />
      <T v="body" c={colorDark.sub}>
        At {placeOf(s.load).name} since {clock(arrive)}
      </T>
      <Gap h={8} />
      <View style={styles.liveNumbers}>
        <T v="displayTimer" c={colorDark.ink} style={styles.tabular} accessibilityLabel={`Waited ${dur(s.now - arrive)}`}>
          {hm(s.now - arrive)}
        </T>
        {paid ? (
          <T v="numberM" c={colorDark.signal} style={styles.tabular}>
            {money(c.owed)}
          </T>
        ) : null}
      </View>
      <Gap h={12} />
      <T v="body" c={colorDark.ink}>
        {line}
      </T>
      <Gap h={16} />
      <WaitBar arrive={arrive} freeEnd={c.freeEnd} now={s.now} />
      <Gap h={16} />
      <Pressable accessibilityRole="button" onPress={a.openFix} hitSlop={12} style={styles.fix}>
        <T v="bodySmall" c={colorDark.sub}>
          Arrival time wrong? <T v="bodySmall" c={colorDark.ink}>Fix it</T>
        </T>
      </Pressable>
    </View>
  );
}

/**
 * The signature: grey is free time, lime is paid detention. Before free time
 * ends, the unfilled rest of it is the dark track.
 */
function WaitBar({ arrive, freeEnd, now }: { arrive: number; freeEnd: number; now: number }) {
  const span = Math.max(1, freeEnd - arrive);
  const used = Math.min(now, freeEnd) - arrive;
  const paid = Math.max(0, now - freeEnd);
  return (
    <View style={styles.bar}>
      {used > 0 ? <View style={{ flex: used, backgroundColor: colorDark.free }} /> : null}
      {now < freeEnd ? <View style={{ flex: span - used }} /> : null}
      {paid > 0 ? <View style={{ flex: paid, backgroundColor: colorDark.detention }} /> : null}
    </View>
  );
}

/** Just left, or logged: what the stop is worth. */
function Done() {
  const { s } = useStore();
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);
  const needsBol = st.phase === 'left';
  const place = placeOf(s.load);
  return (
    <View style={styles.top}>
      <Pill label={needsBol ? 'Stop logged' : 'Ready for your settlement'} tone={needsBol ? 'quiet' : 'signal'} />
      <Gap h={16} />
      <T v="body" c={color.sub}>
        {place.name} · {clock(st.arrive ?? s.now)} to {clock(st.leave ?? s.now)}
      </T>
      <Gap h={8} />
      <T v="displayTimer" style={styles.tabular}>
        {money(c.owed)}
      </T>
      <Gap h={12} />
      <T v="body">
        {c.paidMin > 0 ? `Owed for ${dur(c.paidMin)} past free time` : 'Done inside free time, so nothing is owed'}
      </T>
      <Gap h={24} />
      {needsBol ? (
        <Button label="Snap your BOL" onPress={() => router.push('/bol')} />
      ) : (
        <Button label="See this stop" variant="quiet" onPress={() => router.push('/summary')} />
      )}
    </View>
  );
}

/* ---------- today's stops ---------- */

function TodayStops() {
  const { s } = useStore();
  const stops = s.load?.stops ?? [];
  const current = watchedStop(s.load);
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);

  if (!stops.length) {
    return (
      <>
        <T v="h2">Today</T>
        <Gap h={16} />
        <Card onPress={() => router.push('/add-load')}>
          <T v="bodyStrong">Add today’s load</T>
          <Gap h={4} />
          <T v="body" c={color.sub}>
            Optional. With your appointment times, Docket knows your stops before you get there.
          </T>
        </Card>
      </>
    );
  }

  const statusOf = (name: string, at: number, isCurrent: boolean): string => {
    if (!isCurrent) return 'Done';
    if (st.phase === 'dock') return `Here ${hm(s.now - (st.arrive ?? s.now))}`;
    if (st.phase === 'left' || st.phase === 'logged') return `Waited ${dur(c.wait)}`;
    if (st.phase === 'arriving') return 'Parked';
    return `Appt ${clock(at)}`;
  };

  return (
    <>
      <Row base>
        <T v="h2">Today</T>
        {s.load?.number ? <T v="bodySmall">Load {s.load.number}</T> : null}
      </Row>
      <Gap h={16} />
      <Card>
        {stops.map((stop, i) => {
          const isCurrent = stop === current;
          const ahead = isCurrent && (st.phase === 'idle' || st.phase === 'arriving');
          return (
            <Fragment key={`${stop.name}-${i}`}>
              {i > 0 ? <Hr style={{ marginVertical: 16 }} /> : null}
              <Row base>
                <View style={styles.flex}>
                  <T v="bodyStrong" c={ahead || isCurrent ? color.ink : color.sub}>
                    {stop.name}
                  </T>
                  <Gap h={4} />
                  <T v="bodySmall">
                    {stop.kind} · appointment {clock(stop.at)}
                  </T>
                </View>
                <T v={isCurrent ? 'bodyStrong' : 'body'} c={isCurrent ? color.ink : color.sub} style={styles.tabular}>
                  {statusOf(stop.name, stop.at, isCurrent)}
                </T>
              </Row>
            </Fragment>
          );
        })}
        {st.phase === 'dock' ? <DockEvents /> : null}
      </Card>
    </>
  );
}

/** Check-in and the times that matter at this stop, under the current stop. */
function DockEvents() {
  const { s, a } = useStore();
  const events: TimelineEvent[] = dockTimeline(s.stop, s.now, s.rules).map(({ canCheckIn, ...e }) => ({
    ...e,
    action: canCheckIn ? { label: 'I checked in', onPress: a.checkIn } : undefined,
  }));
  return (
    <>
      <Gap h={20} />
      <Timeline events={events} />
    </>
  );
}

/* ---------- last week ---------- */

function LastWeek() {
  const { s } = useStore();
  const payWeek = payWeeks(s.history)[0];
  const week = weekTotals(payWeek.loads, s.rules, s.marks);
  const pill = s.sent ? (
    <Pill label="Asked fleet manager" />
  ) : week.checked ? (
    week.short > 0 ? <Pill label="Looks short" tone="flag" /> : <Pill label="All paid" />
  ) : (
    <Pill label="Not checked yet" tone="signal" />
  );
  return (
    <Card onPress={() => router.navigate('/paycheck')}>
      <Row base>
        <T v="bodyStrong">{payWeek.sample ? 'Last week' : payWeek.label}</T>
        {pill}
      </Row>
      <Gap h={12} />
      <T v="numberM" style={styles.tabular}>
        {money(week.expected)}
      </T>
      <Gap h={4} />
      <T v="body" c={color.sub}>
        Detention expected from {dur(week.wait)} waiting at {payWeek.loads.length} stop
        {payWeek.loads.length === 1 ? '' : 's'}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingTop: 8 },
  tabular: { fontVariant: ['tabular-nums'] },
  live: {
    backgroundColor: colorDark.bg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: 24,
    marginTop: 8,
  },
  liveStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveNumbers: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  bar: {
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: colorDark.line,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fix: { alignSelf: 'flex-start' },
});
