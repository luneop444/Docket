import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProfileTrailing, Screen, TopBar } from '../../components/Chrome';
import { DemoDrawer } from '../../components/DemoDrawer';
import { Button, Gap, T } from '../../components/ui';
import { isDemoState } from '../../logic/demo';
import { clock, dur, durShort, money, rateShort } from '../../logic/format';
import { placeOf, watchedStop } from '../../logic/state';
import { dockTimeline, stopCalc } from '../../logic/stop';
import { useStore } from '../../state/AppStore';
import { color } from '../../theme/tokens';

/** "Sunday, Nov 15": the title is the day, not the app's name. */
const TITLE = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

/**
 * Home, with no cards: the page is the container. The current stop leads,
 * one big figure answers "what am I owed, or how long until I'm paid", and
 * today's stops follow as plain rows. Saved previous version: branch
 * save/home-v1-black-card.
 */
export default function Today() {
  const { a } = useStore();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const linked = isDemoState(state);

  useEffect(() => {
    if (linked) a.demo(state);
    // Apply a linked state once, when the link opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Screen
      header={<TopBar title={TITLE} trailing={<ProfileTrailing noDate />} />}
      overlay={linked ? null : <DemoDrawer />}
    >
      <Gap h={16} />
      <Current />
      <Gap h={48} />
      <Stops />
    </Screen>
  );
}

/* ---------- the current stop ---------- */

function Current() {
  const { s } = useStore();
  const phase = s.stop.phase;
  if (phase === 'idle') return <NoStop />;
  if (phase === 'arriving') return <Parked />;
  return <AtStop />;
}

function NoStop() {
  return (
    <View>
      <T v="bodyStrong">No stop right now</T>
      <Gap h={4} />
      <T v="bodySmall" c={color.sub}>
        At a shipper or receiver, Docket times from when you pull in. Somewhere new, it asks after 30 min
      </T>
    </View>
  );
}

/** Parked somewhere new; the "Loading here?" question is the sheet over Home. */
function Parked() {
  const { s } = useStore();
  return (
    <View>
      <Head name={placeOf(s.load).name} since={s.stop.arrive ?? s.now} />
      <Gap h={8} />
      <T v="bodySmall" c={color.sub}>
        Parked 30 min. Answer the question to start counting from when you pulled in
      </T>
    </View>
  );
}

function Head({ name, since }: { name: string; since: number }) {
  return (
    <View style={styles.head}>
      <T v="bodyStrong" style={styles.flex}>
        {name}
      </T>
      <T v="bodySmall" c={color.sub} style={styles.tabular}>
        since {clock(since)}
      </T>
    </View>
  );
}

/** At the dock, or just left: one figure, what it means, the bar, and the one fix. */
function AtStop() {
  const { s, a } = useStore();
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);
  const done = st.phase === 'left' || st.phase === 'logged';
  const paid = done || s.now >= c.freeEnd;
  const early = !done && s.now < c.start;
  const rate = rateShort(s.rules.rate);

  const label = paid ? 'Detention owed' : early ? 'Until free time starts' : 'Free time left';
  const figure = paid ? money(c.owed) : early ? dur(c.start - s.now) : dur(c.freeEnd - s.now);
  const line = paid
    ? c.paidMin > 0
      ? `${dur(c.paidMin)} past free time, at ${rate}`
      : 'Done inside free time, so nothing is owed'
    : `Detention starts at ${clock(c.freeEnd)}, ${rate}`;

  const checkIn = st.phase === 'dock' && dockTimeline(st, s.now, s.rules).some((e) => e.canCheckIn);

  return (
    <View>
      <Head name={placeOf(s.load).name} since={st.arrive ?? s.now} />
      <Gap h={24} />
      <T v="bodySmall" c={color.sub}>
        {label}
      </T>
      <Gap h={8} />
      <T v="displayTimer" style={styles.tabular}>
        {figure}
      </T>
      <Gap h={8} />
      <T v="bodySmall" c={color.sub} style={styles.tabular}>
        {line}
      </T>
      <Gap h={24} />
      <FreeBar start={c.start} freeEnd={c.freeEnd} now={done ? (st.leave ?? s.now) : s.now} />
      <Gap h={8} />
      <View style={styles.head}>
        <T v="bodySmall" c={color.sub} style={styles.tabular}>
          {durShort(s.rules.free)} free from {clock(c.start)}
        </T>
        <T v="bodySmall" c={paid ? color.ink : color.sub} style={styles.tabular}>
          {paid ? `Paid from ${clock(c.freeEnd)}` : clock(c.freeEnd)}
        </T>
      </View>
      <Gap h={24} />
      {st.phase === 'left' ? (
        <>
          <Button label="Snap your BOL" onPress={() => router.push('/bol')} />
          <Gap h={16} />
        </>
      ) : null}
      {st.live && st.phase === 'dock' ? (
        <>
          <Button label="I left" onPress={() => a.leave()} />
          <Gap h={16} />
        </>
      ) : null}
      <View style={styles.links}>
        <Link label="Edit arrival time" onPress={a.openFix} />
        {checkIn ? <Link label="I checked in" onPress={a.checkIn} /> : null}
      </View>
    </View>
  );
}

/** Grey is free time used, black is paid detention. Free time not used yet is the track. */
function FreeBar({ start, freeEnd, now }: { start: number; freeEnd: number; now: number }) {
  const free = Math.max(1, freeEnd - start);
  const used = Math.max(0, Math.min(now, freeEnd) - start);
  const paid = Math.max(0, now - freeEnd);
  return (
    <View style={styles.bar}>
      {used > 0 ? <View style={{ flex: used, backgroundColor: color.free }} /> : null}
      {now < freeEnd ? <View style={{ flex: free - used }} /> : null}
      {paid > 0 ? <View style={{ flex: paid, backgroundColor: color.detention }} /> : null}
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12}>
      <T v="labelSmall">{label}</T>
    </Pressable>
  );
}

/* ---------- today's stops ---------- */

function Stops() {
  const { s } = useStore();
  const stops = s.load?.stops ?? [];
  const current = watchedStop(s.load);
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);

  if (!stops.length) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push('/add-load')}>
        <T v="bodyStrong">Add today’s load</T>
        <Gap h={4} />
        <T v="bodySmall" c={color.sub}>
          Optional. With appointment times, Docket knows your stops before you arrive
        </T>
      </Pressable>
    );
  }

  const at = st.phase !== 'idle';
  const rowOf = (isCurrent: boolean, at0: number, kind: string) => {
    if (!isCurrent) return { sub: `${kind}, appointment ${clock(at0)}`, right: '' };
    if (st.phase === 'dock') return { sub: `${kind}, waiting ${dur(s.now - (st.arrive ?? s.now))}`, right: money(c.owed) };
    if (st.phase === 'left' || st.phase === 'logged') return { sub: `${kind}, waited ${dur(c.wait)}`, right: money(c.owed) };
    if (st.phase === 'arriving') return { sub: `${kind}, parked`, right: '' };
    return { sub: `${kind}, appointment ${clock(at0)}`, right: 'Next' };
  };

  return (
    <View>
      <T v="bodyStrong">Today’s stops</T>
      <Gap h={4} />
      {stops.map((stop, i) => {
        const isCurrent = stop === current;
        const r = rowOf(isCurrent, stop.at, stop.kind);
        const quiet = !isCurrent && at;
        return (
          <Fragment key={`${stop.name}-${i}`}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <View style={styles.flex}>
                <T v="body" c={quiet ? color.sub : color.ink}>
                  {stop.name}
                </T>
                <T v="bodySmall" c={color.sub}>
                  {r.sub}
                </T>
              </View>
              {r.right ? (
                <T v="body" style={styles.tabular}>
                  {r.right}
                </T>
              ) : null}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.raise2, flexDirection: 'row', overflow: 'hidden' },
  links: { flexDirection: 'row', gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.raise2 },
});
