import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ProfileTrailing, Screen, TopBar } from '../../components/Chrome';
import { LiveCard } from '../../components/LiveCard';
import { Timeline, type TimelineEvent } from '../../components/Timeline';
import { Button, Card, Fake, Gap, Hr, Pill, ProtoControls, Row, T, TimeBar } from '../../components/ui';
import { clock, dur, money } from '../../logic/format';
import { WATCH_LEAD_MIN, WEEK } from '../../logic/sampleData';
import { weekTotals } from '../../logic/settlement';
import { loadAppt, placeOf, setsStopsOnce } from '../../logic/state';
import { dockTimeline, stopCalc } from '../../logic/stop';
import { useStore } from '../../state/AppStore';

/** Figma C1 / C3 / C5 (+ E1): Today — watching, at the dock, stop logged */
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
  const weekly = setsStopsOnce(s.loadStyle);
  const place = placeOf(s.load);

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
          {weekly ? (
            <Card>
              <T v="h2">Set up your weekly stops</T>
              <Gap h={8} />
              <T v="bodySmall">
                You run the same stops every week. Set them up once and Docket watches them on every run. Location
                stays off until then.
              </T>
              <Gap h={16} />
              <Button label="Set up weekly stops" small onPress={() => router.push('/add-load')} />
            </Card>
          ) : (
            <Card>
              <T v="h2">No load yet</T>
              <Gap h={8} />
              <T v="bodySmall">
                Add today’s load and Docket watches for its stops. Location stays off until then.
              </T>
              <Gap h={16} />
              <Button label="Add today’s load" small onPress={() => router.push('/add-load')} />
            </Card>
          )}
        </>
      ) : st.phase === 'idle' || st.phase === 'arriving' ? (
        <>
          <T v="bodySmall" style={styles.kicker}>Watching for your next stop</T>
          <Card>
            <T v="h2">{place.name}</T>
            <Gap h={8} />
            <T v="bodySmall">
              {s.load.recurring ? 'Weekly route' : s.load.number ? `Load ${s.load.number}` : 'Today’s load'} · appointment {clock(loadAppt(s.load))} · on from{' '}
              {clock(loadAppt(s.load) - WATCH_LEAD_MIN)}
            </T>
            {place.typical ? (
              <>
                <Hr />
                <Row>
                  <T v="bodySmall">Drivers usually wait here</T>
                  <T v="bodyStrong">{place.typical.label}</T>
                </Row>
                <Gap h={8} />
                <TimeBar free={s.rules.free} detention={Math.max(0, place.typical.min - s.rules.free)} height={8} />
                <Gap h={8} />
                <T v="bodyTiny">
                  Location is on only near this stop. It turns off after your last stop. <Fake label="Sample data" />
                </T>
              </>
            ) : null}
            <Gap h={16} />
            <Button label="I’m here, start the clock" small onPress={a.arriveNow} />
            <Gap h={8} />
            <T v="bodyTiny">Tap when you pull in. Docket times the stop with your phone’s clock.</T>
          </Card>
        </>
      ) : (
        <>
          <T v="bodySmall" style={styles.kicker}>Today</T>
          <Card onPress={() => router.push(st.phase === 'left' ? '/bol' : '/summary')}>
            <Row>
              <T v="bodyStrong">{place.name}</T>
              {st.phase === 'left' ? <Pill label="Needs BOL" /> : <Pill label="Logged" tone="signal" />}
            </Row>
            <Gap h={10} />
            <TimeBar free={Math.max(0, c.wait - c.paidMin)} detention={c.paidMin} />
            <Gap h={10} />
            <Row base>
              <T v="bodySmall">Waited {dur(c.wait)}</T>
              <T v="numberS">{money(c.owed)} expected</T>
            </Row>
            <Gap h={8} />
            <T v="bodyTiny">Docket will check this load against your next settlement.</T>
          </Card>
          <Gap h={12} />
          <T v="bodySmall" style={{ paddingLeft: 4 }}>
            {st.phase === 'left'
              ? 'Snap your BOL to finish this stop.'
              : s.load?.recurring
                ? 'No more stops today. Location is off until your next run.'
                : 'No more stops today. Location is off.'}
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
          {st.phase === 'idle' || st.phase === 'arriving' ? (
            <>
              <Button label={`Pull into ${place.short}`} variant="quiet" small onPress={a.pullIn} />
              <Button
                label="Pull in with phone locked"
                variant="quiet"
                small
                onPress={() => {
                  a.pullIn();
                  a.setLock(true);
                }}
              />
            </>
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
  const arrive = st.arrive ?? s.now;
  const c = stopCalc(st, s.now, s.rules);
  const place = placeOf(s.load);
  const events: TimelineEvent[] = dockTimeline(st, s.now, s.rules).map(({ canCheckIn, ...e }) => ({
    ...e,
    action: canCheckIn ? { label: 'I checked in', onPress: a.checkIn } : undefined,
  }));

  return (
    <>
      <Row base>
        <T v="bodyStrong">{place.name}</T>
        {place.load ? <T v="bodyTiny">Load {place.load}</T> : null}
      </Row>
      <Gap h={16} />
      <LiveCard
        waitedMin={s.now - arrive}
        owed={c.owed}
        start={c.start}
        freeEnd={c.freeEnd}
        now={s.now}
        arrive={arrive}
        rate={s.rules.rate}
        fromAppt={s.rules.start === 'appt'}
      />
      <Gap h={20} />
      <Timeline events={events} />
      {st.live ? (
        <>
          <Gap h={20} />
          <Button
            label="I left"
            onPress={() => {
              a.leave();
              router.push('/bol');
            }}
          />
          <Gap h={8} />
          <T v="bodyTiny" style={styles.center}>
            Timed with your phone’s clock since {clock(arrive)}. Keeps counting if you close the app.
          </T>
          <ProtoControls note="Prototype controls">
            <Button label="Show lock screen" variant="quiet" small onPress={() => a.setLock(true)} />
            {st.checkin == null ? (
              <Button label="Say “Hey Siri, I checked in”" variant="quiet" small onPress={a.siriCheckIn} />
            ) : null}
          </ProtoControls>
        </>
      ) : (
        <ProtoControls
          note={
            <>
              Prototype controls. These stand in for time passing and GPS. <Fake label="Time runs 60× faster" />
            </>
          }
        >
          <Row style={{ gap: 8 }}>
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
          {st.checkin == null ? (
            <Button label="Say “Hey Siri, I checked in”" variant="quiet" small onPress={a.siriCheckIn} />
          ) : null}
        </ProtoControls>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kicker: { marginTop: 4, marginBottom: 8 },
  center: { textAlign: 'center' },
});
