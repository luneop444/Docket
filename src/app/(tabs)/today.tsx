import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { ProfileTrailing, Screen, TopBar } from '../../components/Chrome';
import { CheckIcon, ClockIcon, DollarIcon, HourglassIcon, PinIcon } from '../../components/Icons';
import { Timeline, type TimelineEvent } from '../../components/Timeline';
import { Button, Card, Fake, Gap, Hr, Pill, ProtoControls, Row, T, TimeBar } from '../../components/ui';
import { clock, dur, hm, money } from '../../logic/format';
import { APPT, TODAY_STOP, WATCH_LEAD_MIN, WEEK } from '../../logic/sampleData';
import { weekTotals } from '../../logic/settlement';
import { stopCalc } from '../../logic/stop';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

/** v1 07 / 08 / 09 / 13: Today (next stop, at the dock, stop logged) */
export default function Today() {
  const { s } = useStore();
  return (
    <Screen header={<TopBar trailing={<ProfileTrailing />} />} contentStyle={s.stop.phase === 'dock' ? { paddingTop: 6 } : undefined}>
      {s.stop.phase === 'dock' ? <AtTheDock /> : <NotAtDock />}
    </Screen>
  );
}

function NotAtDock() {
  const { s, a } = useStore();
  const st = s.stop;
  const week = weekTotals(WEEK, s.rules, s.marks);
  const c = stopCalc(st, s.now, s.rules);

  const lastWeekPill = s.sent ? (
    <Pill label="Asked fleet manager" />
  ) : week.checked ? (
    week.short > 0 ? <Pill label="Looks short" tone="flag" /> : <Pill label="All paid" />
  ) : (
    <Pill label="Not checked yet" tone="signal" />
  );

  return (
    <>
      {!s.load ? (
        <>
          <T v="bodySmall" style={styles.kicker}>Today</T>
          <Card>
            <T v="h2">No load yet</T>
            <Gap h={8} />
            <T v="bodySmall">
              Add today’s load and Docket watches for its stops. Location stays off until then.
            </T>
            <Gap h={16} />
            <Button label="Add today’s load" small onPress={() => router.push('/add-load')} />
          </Card>
        </>
      ) : st.phase === 'idle' ? (
        <>
          <T v="bodySmall" style={styles.kicker}>Watching for your next stop</T>
          <Card>
            <T v="h2">{TODAY_STOP.name}</T>
            <Gap h={8} />
            <T v="bodySmall">
              Load {s.load.number} · appointment {clock(APPT)} · on from {clock(APPT - WATCH_LEAD_MIN)}
            </T>
            <Hr />
            <Row>
              <T v="bodySmall">Drivers usually wait here</T>
              <T v="bodyStrong">{TODAY_STOP.typicalWait}</T>
            </Row>
            <Gap h={8} />
            <TimeBar free={s.rules.free} detention={Math.max(0, TODAY_STOP.typicalWaitMin - s.rules.free)} height={8} />
            <Gap h={8} />
            <T v="bodyTiny">
              Location is on only near this stop. It turns off after your last stop. <Fake label="Sample data" />
            </T>
          </Card>
        </>
      ) : (
        <>
          <T v="bodySmall" style={styles.kicker}>Today</T>
          <Card onPress={() => router.push(st.phase === 'left' ? '/bol' : '/summary')}>
            <Row>
              <T v="bodyStrong">{TODAY_STOP.name}</T>
              {st.phase === 'left' ? <Pill label="Needs BOL" /> : <Pill label="Logged" tone="signal" />}
            </Row>
            <Gap h={8} />
            <Row base>
              <T v="bodySmall">Waited {dur(c.wait)}</T>
              <T v="numberS">{money(c.owed)} expected</T>
            </Row>
            <Gap h={8} />
            <T v="bodyTiny">Docket will check this load against your next settlement.</T>
          </Card>
          <Gap h={12} />
          <T v="bodySmall" style={{ paddingLeft: 4 }}>
            {st.phase === 'left' ? 'Snap your BOL to finish this stop.' : 'No more stops today. Location is off.'}
          </T>
        </>
      )}
      <Gap h={12} />
      <Card onPress={() => router.navigate('/paycheck')}>
        <T v="bodyTiny">Last week</T>
        <Gap h={8} />
        <Row base>
          <T v="numberL">{money(week.expected)}</T>
          {lastWeekPill}
        </Row>
        <Gap h={8} />
        <T v="bodySmall">
          detention expected from {dur(week.wait)} waiting at {WEEK.length} stops
        </T>
      </Card>
      {!s.load ? null : (
        <ProtoControls note="Prototype controls. These stand in for GPS.">
          {st.phase === 'idle' ? (
            <Button label={`Pull into ${TODAY_STOP.short}`} variant="quiet" small onPress={a.pullIn} />
          ) : (
            <Button label="Start the stop again" variant="quiet" small onPress={a.restartStop} />
          )}
        </ProtoControls>
      )}
    </>
  );
}

function AtTheDock() {
  const { s, a } = useStore();
  const st = s.stop;
  const r = s.rules;
  const now = s.now;
  const arrive = st.arrive ?? now;
  const c = stopCalc(st, now, r);
  const inDetention = now >= c.freeEnd;

  const events: TimelineEvent[] = [
    { icon: <PinIcon />, title: 'Arrived at gate', detail: 'Location, entered facility', time: clock(arrive), done: true },
  ];
  if (r.start === 'appt') {
    events.push({ icon: <ClockIcon />, title: 'Appointment time', detail: 'Your company starts the clock here', time: clock(APPT), done: now >= APPT });
  }
  events.push({
    icon: <CheckIcon />,
    title: 'Checked in',
    detail: st.checkin != null ? 'You tapped, location confirms on site' : 'Tap when you check in at the window',
    time: st.checkin != null ? clock(st.checkin) : '',
    done: st.checkin != null,
    action: st.checkin == null ? { label: 'I checked in', onPress: a.checkIn } : undefined,
  });
  events.push({
    icon: <HourglassIcon />,
    title: 'Free time ends',
    detail: `${dur(r.free)} free from ${r.start === 'appt' ? 'appointment time' : 'arrival'}`,
    time: clock(c.freeEnd),
    done: inDetention,
    paidLine: inDetention,
  });
  events.push({
    icon: <DollarIcon c={inDetention ? color.ink : color.faint} />,
    title: 'Detention',
    detail: inDetention ? `${money(r.rate)} an hour` : 'Starts after free time',
    time: inDetention ? dur(c.paidMin) : '',
    done: inDetention,
    money: true,
    last: true,
  });

  const status = inDetention
    ? 'Detention running'
    : now < c.start
      ? `Clock starts at your ${clock(c.start)} ${r.start === 'appt' ? 'appointment' : 'arrival'}`
      : `Free time, ${dur(c.freeEnd - now)} left`;

  return (
    <>
      <Row base>
        <T v="bodyStrong">{TODAY_STOP.name}</T>
        <T v="bodyTiny">Load {TODAY_STOP.load}</T>
      </Row>
      <Gap h={16} />
      <View style={styles.timerRow}>
        <T v="displayTimer" style={styles.tabular}>{hm(now - arrive)}</T>
        <T v="numberS" c={color.sub}>waited</T>
      </View>
      <Gap h={8} />
      <View style={styles.statusRow}>
        <StatusDot live={inDetention} />
        <T v="labelSmall">{status}</T>
      </View>
      <Gap h={16} />
      {inDetention ? (
        <>
          <Card tone="signal">
            <T v="bodyTiny" c={color.onSignal}>Detention so far</T>
            <Gap h={4} />
            <T v="numberL" c={color.onSignal} style={styles.tabular}>{money(c.owed)}</T>
          </Card>
          <Gap h={20} />
        </>
      ) : null}
      <Timeline events={events} />
      <ProtoControls
        note={
          <>
            Prototype controls. These stand in for time passing and GPS. <Fake label="Time runs 60× faster" />
          </>
        }
      >
        <Row style={{ gap: 10 }}>
          <Button label="Skip ahead 30 min" variant="quiet" small style={styles.flex} onPress={() => a.skip(30)} />
          <Button
            label="Leave the facility"
            variant="quiet"
            small
            style={styles.flex}
            onPress={() => {
              a.leave();
              router.push('/bol');
            }}
          />
        </Row>
        <Button label="Show lock screen" variant="quiet" small onPress={() => a.setLock(true)} />
      </ProtoControls>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kicker: { marginTop: 4, marginBottom: 8 },
  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  tabular: { fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.signal },
});

/** Lime dot that pulses while detention is running (v1 `.spin`). */
function StatusDot({ live }: { live: boolean }) {
  const v = useRef(new Animated.Value(1)).current;
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
  return <Animated.View style={[styles.dot, !live && { backgroundColor: color.free }, live && { opacity: v }]} />;
}
