import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProfileTrailing, Screen, TopBar } from '../../components/Chrome';
import { DemoDrawer } from '../../components/DemoDrawer';
import { FreeBar } from '../../components/FreeBar';
import { RollText } from '../../components/RollText';
import { Swap } from '../../components/Swap';
import { Timeline } from '../../components/Timeline';
import { Button, Gap, press, T } from '../../components/ui';
import { isDemoState } from '../../logic/demo';
import { heads } from '../../logic/haptics';
import { clock, dur, money, rateShort } from '../../logic/format';
import { placeOf, watchedStop } from '../../logic/state';
import { dockTimeline, stopCalc, stopTime } from '../../logic/stop';
import { useStore } from '../../state/AppStore';
import { currentClaimId } from '../../state/currentClaim';
import { useClaims } from '../../state/useClaims';
import { PaydayCard } from '../../components/PaydayCard';
import { color, type } from '../../theme/tokens';
import { Tappable } from '../../components/Tappable';

/** "Sunday, Nov 15": the title is the day, not the app's name. */
const TITLE = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

/**
 * Home, with no cards: the page is the container. The current stop leads,
 * one big figure answers "what am I owed, or how long until I'm paid", and
 * today's stops follow as plain rows. Saved previous version: branch
 * save/home-v1-black-card.
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
    <Screen
      tabs
      header={
        // At the dock the place leads, so the header is Figma 09's: the wordmark and a small date.
        s.stop.phase === 'dock' ? (
          <TopBar trailing={<ProfileTrailing />} />
        ) : (
          <TopBar title={TITLE} trailing={<ProfileTrailing noDate />} />
        )
      }
      overlay={linked ? null : <DemoDrawer />}
    >
      <Gap h={16} />
      <Current />
      <PaydayCard />
      <Gap h={40} />
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
  if (phase === 'dock') return <AtTheDock />;
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
      <T v="bodySmall" c={color.sub}>
        {`since ${clock(since)}`}
      </T>
    </View>
  );
}

/**
 * Figma 08 "At the dock, free time" and 09 "At the dock, detention running": the place and
 * load, the big figure (the wait in free time, the money owed in detention), one status line, then
 * the timeline of the stop.
 */
function AtTheDock() {
  const { s, a } = useStore();
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);
  const place = placeOf(s.load);
  const inDetention = s.now >= c.freeEnd;
  // Free time running out while you watch is the one moment worth a warning tap.
  const wasDetention = useRef(inDetention);
  useEffect(() => {
    if (inDetention && !wasDetention.current) heads();
    wasDetention.current = inDetention;
  }, [inDetention]);
  const beforeClock = s.now < c.start;
  const fromAppt = s.rules.start === 'appt';
  const waited = s.now - (st.arrive ?? s.now);
  // Times carry the day once a stop runs past midnight.
  const at = stopTime(st, s.now);
  const statusFor = (paid: boolean) =>
    paid
      ? `Waited ${dur(waited)} · ${rateShort(s.rules.rate)} since ${at(c.freeEnd)}`
      : beforeClock
        ? `Clock starts at your ${at(c.start)} ${fromAppt ? 'appointment' : 'arrival'}`
        : `Detention starts at ${at(c.freeEnd)}`;
  const events = dockTimeline(st, s.now, s.rules).map(({ canCheckIn, ...e }) =>
    canCheckIn ? { ...e, action: { label: 'I checked in', onPress: a.checkIn } } : e,
  );

  return (
    <View>
      {/* The place leads (Heading/H2); the date is small in the header. */}
      <View style={styles.head}>
        <T v="h2" style={styles.flex} numberOfLines={1}>
          {place.name}
        </T>
        {place.load ? (
          <T v="bodyTiny" c={color.sub}>
            {`Load ${place.load}`}
          </T>
        ) : null}
      </View>
      <Gap h={16} />
      {/* Label above the figure, as "Detention so far" is above its own, so the figure
          has the full width and hours and minutes never split across lines. */}
      <View
        accessible
        accessibilityRole="timer"
        accessibilityLabel={`${inDetention ? `Detention so far ${money(c.owed)}. ` : ''}Waited ${dur(waited)}. ${statusFor(inDetention)}`}
      >
        {/* The figure answers the question of the moment: in free time how long you've waited
            toward detention, in detention what you're owed, with the wait in the line under it.
            The switch moves (Swap), so it's seen, not just swapped in a frame. */}
        <Swap
          k={inDetention ? 'paid' : 'free'}
          render={(ph) => (
            <View>
              <T v="bodyTiny" c={color.sub}>
                {ph === 'paid' ? 'Detention so far' : 'Waited'}
              </T>
              <Gap h={4} />
              {ph === 'paid' ? (
                <RollText text={money(c.owed)} style={[type.displayTimer, styles.tabular, styles.optical, { color: color.ink }]} />
              ) : (
                <WaitFigure min={waited} />
              )}
              <Gap h={8} />
              <View style={styles.status}>
                <View style={styles.dot} />
                <T v="labelSmall">{statusFor(ph === 'paid')}</T>
              </View>
            </View>
          )}
        />
      </View>
      <Gap h={24} />
      {/* The times can be fixed (arrival, leaving, break), or a wrong stop cancelled from the same
          sheet: the way in sits with them, worded as the way out when Docket got it wrong. */}
      <Timeline events={events} footer={<Link label={FIX_LABEL} onPress={a.openFix} />} />
      <Gap h={16} />
      {st.live ? (
        <>
          <Button label="I left" onPress={() => a.leave()} />
          <Gap h={16} />
        </>
      ) : null}
    </View>
  );
}

/**
 * "16h 54m" on one line: digits at Display/Timer, the units at Number/M, so the digits are
 * what's read and the units only label them (Figma 09 · clarity pass).
 */
function WaitFigure({ min }: { min: number }) {
  const m = Math.max(0, Math.floor(min));
  const h = Math.floor(m / 60);
  const mm = h ? String(m % 60).padStart(2, '0') : String(m);
  const digits = [type.displayTimer, styles.tabular, { color: color.ink }];
  // A row of rolling digits and their units, sat on one baseline: the clock rolls as it counts.
  return (
    <View style={[styles.figureRow, styles.optical]} accessible accessibilityLabel={dur(m)}>
      {h ? (
        <>
          <RollText text={String(h)} style={digits} />
          <Text style={styles.unit}>h </Text>
        </>
      ) : null}
      <RollText text={mm} style={digits} />
      <Text style={styles.unit}>m</Text>
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
  const id = currentClaimId(s);
  const claim = useClaims().find((x) => x.id === id);
  const toClaim = () => router.push(`/claim-sheet?id=${encodeURIComponent(id ?? '')}`);

  // One spoken summary for the figure (from main's v2 accessibility pass), so VoiceOver
  // reads "Detention owed. $43.67. 2h 11m past free time, at $20/hr" in one go.
  const spoken = [label, figure, line].filter(Boolean).join('. ');

  return (
    <View>
      <Head name={placeOf(s.load).name} since={st.arrive ?? s.now} />
      <Gap h={12} />
      <View accessible accessibilityRole="timer" accessibilityLabel={spoken}>
        <T v="bodySmall" c={color.sub}>
          {label}
        </T>
        <Gap h={8} />
        <View style={styles.optical}>
          <RollText text={figure} style={[type.displayTimer, styles.tabular, { color: color.ink }]} />
        </View>
        <Gap h={8} />
        <T v="bodySmall" c={color.sub} style={styles.tabular}>
          {line}
        </T>
      </View>
      <Gap h={24} />
      <FreeBar d={{ arrive: st.arrive ?? s.now, start: c.start, freeEnd: c.freeEnd, now: done ? (st.leave ?? s.now) : s.now }} />
      <Gap h={24} />
      {st.phase === 'left' ? (
        <>
          <Button label="Snap your BOL" onPress={() => router.push('/bol')} />
          <Gap h={16} />
        </>
      ) : null}
      {/* Done and owed detention: the claim goes to dispatch now, with the proof. */}
      {st.phase === 'logged' && claim ? (
        claim.stage === 'unsent' ? (
          <>
            <Button label="Send claim to dispatch" onPress={toClaim} />
            <Gap h={8} />
            <T v="bodyTiny">Many companies set a 24 to 48 hour deadline for detention claims.</T>
            <Gap h={16} />
          </>
        ) : (
          <>
            <Tappable accessibilityRole="button" onPress={() => router.push(`/claim?id=${encodeURIComponent(claim.id)}`)} give={1} style={press.hit}>
              <T v="labelSmall">Claim sent · see it in Claims</T>
            </Tappable>
            <Gap h={16} />
          </>
        )
      ) : null}
      {st.live && st.phase === 'dock' ? (
        <>
          <Button label="I left" onPress={() => a.leave()} />
          <Gap h={16} />
        </>
      ) : null}
      <View style={styles.links}>
        <Link label={FIX_LABEL} onPress={a.openFix} />
        {checkIn ? <Link label="I checked in" onPress={a.checkIn} /> : null}
      </View>
    </View>
  );
}

/**
 * The way out if Docket gets a stop wrong (testing feedback: "give users a way out"). It opens
 * Fix a time, which also cancels a stop that isn't real. No pause: the clock records the real
 * wait, which is what a claim is checked against, and an off-duty break is already a time to fix.
 */
const FIX_LABEL = 'Something wrong? Fix it';

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tappable accessibilityRole="button" onPress={onPress} hitSlop={12} give={1} style={press.hit}>
      <T v="bodySmall" c={color.sub} style={styles.link}>
        {label}
      </T>
    </Tappable>
  );
}

/* ---------- today's stops ---------- */

function Stops() {
  const { s } = useStore();
  const stops = s.load?.stops ?? [];
  const current = watchedStop(s.load);
  const st = s.stop;

  if (!stops.length) {
    return (
      <Tappable accessibilityRole="button" onPress={() => router.push('/add-load')} give={1} style={press.section}>
        <T v="bodyStrong">Add today’s load</T>
        <Gap h={4} />
        <T v="bodySmall" c={color.sub}>
          Optional. With appointment times, Docket knows your stops before you arrive
        </T>
      </Tappable>
    );
  }

  const at = st.phase !== 'idle';
  const currentIndex = current ? stops.indexOf(current) : -1;
  // The current stop is the hero above, so its row only marks where it is, not repeat it.
  const rowOf = (i: number, at0: number, kind: string) => {
    if (i === currentIndex) {
      if (st.phase === 'left' || st.phase === 'logged') return { sub: `${kind}, left ${clock(st.leave ?? s.now)}`, right: '' };
      if (at) return { sub: kind, right: 'Now' };
      return { sub: `${kind}, appointment ${clock(at0)}`, right: 'Next' };
    }
    if (at && currentIndex >= 0 && i < currentIndex) return { sub: `${kind}, done`, right: '' };
    return { sub: `${kind}, appointment ${clock(at0)}`, right: '' };
  };

  return (
    <View>
      <T v="bodyStrong">Today’s stops</T>
      <Gap h={4} />
      {stops.map((stop, i) => {
        const r = rowOf(i, stop.at, stop.kind);
        const quiet = at && currentIndex >= 0 && i < currentIndex;
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
  figureRow: { flexDirection: 'row', alignItems: 'baseline' },
  // At 84px the first glyph's built-in left space shows: pull it back to the text edge.
  optical: { marginLeft: -5 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.raise2, flexDirection: 'row', overflow: 'hidden' },
  links: { flexDirection: 'row', gap: 24 },
  // Secondary actions: quieter than the figure and the section title, underlined so they read as tappable.
  link: { textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.raise2 },
  // Number/M: the h and m after the digits.
  unit: { ...type.numberM, color: color.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3.5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.signal },
});
