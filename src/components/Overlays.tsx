/**
 * Things drawn on top of the current screen: bottom sheets, the toast, and the
 * simulated Dynamic Island + lock screen Live Activity (Figma node 144:223).
 */
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clock, clockBare, dur, durShort, rateShort } from '../logic/format';
import { TODAY_LABEL, TODAY_STOP } from '../logic/sampleData';
import { islandCopy } from '../logic/island';
import { apptOf, stopCalc, type FixDraft } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, fontFamily, protoColor, radius, type } from '../theme/tokens';
import { useFramed, useInsets, useIslandStage } from './Chrome';
import { MinusIcon, PlusIcon, TruckIcon } from './Icons';
import { Button, Gap, Row, T } from './ui';

/* =========================================================
   Sheets
   ========================================================= */

function useEnter(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [v, duration]);
  return v;
}

export function SheetShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const { footerBottom } = useInsets();
  const fade = useEnter(180);
  const up = useEnter(220);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: footerBottom },
          {
            opacity: up.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <View style={styles.grab} />
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function MessageSheet({ text }: { text: string }) {
  const { a } = useStore();

  async function send(how: 'sms' | 'share' | 'copy') {
    try {
      if (how === 'sms') {
        // Opens the phone's own Messages app with the claim filled in.
        await Linking.openURL('sms:?&body=' + encodeURIComponent(text));
      } else if (how === 'share' && (Platform.OS !== 'web' || typeof navigator.share === 'function')) {
        const r = await Share.share({ message: text });
        if (r.action === Share.dismissedAction) return;
      } else {
        await Clipboard.setStringAsync(text);
        a.toast('Copied. Paste it into your driver messaging app.');
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    a.markSent();
  }

  return (
    <SheetShell onClose={a.closeSheet}>
      <T v="h2">Message your fleet manager</T>
      <Gap h={8} />
      <T v="bodySmall">
        Edit anything before you send. It opens your own messaging app, so it goes out from you, not from Docket.
      </T>
      <Gap h={12} />
      <TextInput
        multiline
        value={text}
        onChangeText={a.setSheetText}
        style={styles.textarea}
        textAlignVertical="top"
        accessibilityLabel="Message"
      />
      <Gap h={12} />
      <Button label="Send as text" onPress={() => send('sms')} />
      <Gap h={8} />
      <Row style={{ gap: 6 }}>
        <Button label="Share…" variant="quiet" small style={styles.flex} onPress={() => send('share')} />
        <Button label="Copy" variant="quiet" small style={styles.flex} onPress={() => send('copy')} />
      </Row>
    </SheetShell>
  );
}

/** Figma C6 Fix a time: reachable from every auto-logged time and every Undo toast. */
function FixSheet({ draft }: { draft: FixDraft }) {
  const { a } = useStore();
  const rows: { k: 'arrive' | 'leave' | 'brk'; label: string; value: string }[] = [
    { k: 'arrive', label: 'Arrived', value: clock(draft.arrive) },
    ...(draft.leave != null ? [{ k: 'leave' as const, label: 'Left', value: clock(draft.leave) }] : []),
    { k: 'brk', label: 'Off-duty break', value: dur(draft.brk) },
  ];
  return (
    <SheetShell onClose={a.closeSheet}>
      <T v="h2">Fix a time</T>
      <Gap h={6} />
      <T v="bodySmall">Tap any time to fix it. The GPS time stays on record next to your change.</T>
      <Gap h={16} />
      <View style={styles.times}>
        {rows.map(({ k, label, value }, i) => (
          <View key={k} style={[styles.timeRow, i < rows.length - 1 && styles.timeRowLine]}>
            <T v="body" c={color.sub}>{label}</T>
            <View style={styles.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${label} earlier`} onPress={() => a.fixStep(k, -1)} style={styles.step}>
                <MinusIcon size={24} />
              </Pressable>
              <T v="bodyStrong" style={styles.stepValue}>{value}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`${label} later`} onPress={() => a.fixStep(k, 1)} style={styles.step}>
                <PlusIcon size={24} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <Gap h={20} />
      <Button label="Done" onPress={() => a.saveFix(draft)} />
    </SheetShell>
  );
}

/** Figma C2 Arrival check: first visit only. Once confirmed, the place starts on its own (E1). */
function ArrivalSheet() {
  const { s, a } = useStore();
  const arrive = s.stop.arrive ?? s.now;
  const r = s.rules;
  return (
    <SheetShell onClose={() => {}}>
      <T v="h2">You’re at {TODAY_STOP.name}</T>
      <Gap h={6} />
      <T v="bodySmall">Pulled in at {clock(arrive)}. Start the clock?</T>
      <Gap h={14} />
      <View style={styles.details}>
        <T v="body">
          Arrived {clock(arrive)}
          {r.start === 'appt' ? ` · appointment ${clock(apptOf(s.stop))}` : ''} · {durShort(r.free)} free time, then{' '}
          {rateShort(r.rate)}.
        </T>
      </View>
      <Gap h={16} />
      <Button label="Yes, start the clock" onPress={a.confirmArrival} />
      <Button label="Not a stop" variant="text" onPress={a.cancelArrival} />
    </SheetShell>
  );
}

/** Figma E1 Undo toast: after an automatic start at a known place. */
function UndoToast({ text }: { text: string }) {
  const { a } = useStore();
  const up = useEnter(200);
  return (
    <Animated.View
      style={[
        styles.undo,
        {
          opacity: up.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <Text style={[type.bodyStrong, styles.undoText]}>{text}</Text>
      <Pressable accessibilityRole="button" onPress={a.openFix} hitSlop={10}>
        <Text style={[type.labelSmall, { color: protoColor.toastAction }]}>Fix</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={a.cancelArrival} hitSlop={10}>
        <Text style={[type.labelSmall, { color: color.signal }]}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

function Toast({ text }: { text: string }) {
  const up = useEnter(200);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: up.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <Text style={[type.bodySmall, { fontSize: 15, color: color.bg }]}>{text}</Text>
    </Animated.View>
  );
}

/* =========================================================
   Dynamic Island / Live Activity (simulated)
   ========================================================= */

function useIslandContent() {
  const { s } = useStore();
  const stg = useIslandStage();
  const copy = islandCopy(stg, s.stop, s.now, s.rules, {
    name: TODAY_STOP.name,
    short: TODAY_STOP.short,
    load: s.load?.number ?? TODAY_STOP.load,
  });
  return copy ? { ...copy, stg } : null;
}

const ISLAND = {
  idle: { w: 126, h: 37, r: 19 },
  live: { w: 250, h: 37, r: 19 },
  expanded: { w: 369, h: 150, r: 44 },
};

function Island() {
  const { ui, a } = useStore();
  const framed = useFramed();
  const insets = useSafeAreaInsets();
  const content = useIslandContent();
  const stg = content?.stg ?? 0;
  const mode = !content ? 'idle' : ui.expanded ? 'expanded' : 'live';

  const w = useRef(new Animated.Value(ISLAND.idle.w)).current;
  const h = useRef(new Animated.Value(ISLAND.idle.h)).current;
  const r = useRef(new Animated.Value(ISLAND.idle.r)).current;
  const showExp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = ISLAND[mode];
    const cfg = { duration: 350, easing: Easing.bezier(0.2, 0.9, 0.25, 1.1), useNativeDriver: false };
    Animated.parallel([
      Animated.timing(w, { toValue: t.w, ...cfg }),
      Animated.timing(h, { toValue: t.h, ...cfg }),
      Animated.timing(r, { toValue: t.r, ...cfg }),
      Animated.timing(showExp, { toValue: mode === 'expanded' ? 1 : 0, duration: 200, delay: mode === 'expanded' ? 120 : 0, useNativeDriver: false }),
    ]).start();
  }, [mode, w, h, r, showExp]);

  // On a real phone the hardware island is already there: hide ours when idle.
  if (!framed && mode === 'idle') return null;

  function onPress() {
    if (!stg) return;
    if (!ui.expanded) return a.setExpanded(true);
    a.setExpanded(false);
    if (stg === 4) router.push('/bol');
    else if (stg <= 3) router.navigate('/today');
  }

  const top = framed ? 11 : Math.max(8, insets.top) + 4;
  const width = !framed && mode === 'expanded' ? '94%' : w;

  return (
    <Animated.View style={[styles.island, { top, width, height: h, borderRadius: r }]}>
      <Pressable style={styles.islandPress} onPress={onPress} accessibilityLabel="Live Activity">
        {content ? (
          <>
            <Animated.View
              style={[styles.compact, { opacity: showExp.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
            >
              <View style={styles.lead}>
                <TruckIcon />
              </View>
              <Text style={[styles.islandVal, !content.compactLime && { color: color.bg }]}>{content.compact}</Text>
            </Animated.View>
            <Animated.View style={[styles.exp, { opacity: showExp }]}>
              <Row style={{ alignItems: 'center', gap: 0 }}>
                <View style={[styles.lead, styles.leadL]}>
                  <TruckIcon size={22} />
                </View>
                <View style={styles.expText}>
                  <T v="bodyStrong" c={color.bg}>{content.title}</T>
                  <Text numberOfLines={1} style={styles.islandSub}>
                    {content.sub}
                  </Text>
                </View>
                <T v="numberM" c={content.valueLime ? color.signal : color.bg}>{content.value}</T>
              </Row>
              <View style={styles.ibar}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.ibarSeg,
                      { backgroundColor: i < content.filled ? (stg === 1 ? color.bg : color.signal) : protoColor.islandOff },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.islandSub, { marginTop: 10 }]}>{content.line}</Text>
            </Animated.View>
          </>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Figma E2 / E3: interactive Live Activity, answered without unlocking (iOS 17+). */
function LockActivity({
  title,
  line,
  value,
  buttons,
  top,
}: {
  title: string;
  line: string;
  value?: string;
  buttons: { label: string; onPress: () => void; primary?: boolean }[];
  /** Pinned to the top (E4 banner) instead of above the bottom of the lock screen. */
  top?: boolean;
}) {
  return (
    <View style={[styles.lockCard, styles.lockActivity, top && styles.lockActivityTop]}>
      <Text style={[type.labelSmall, { color: color.sub }]}>Docket · {TODAY_STOP.name}</Text>
      <View style={styles.lockActivityRow}>
        <View style={{ gap: 2 }}>
          <T v="bodyStrong">{title}</T>
          <T v="bodyTiny">{line}</T>
        </View>
        {value ? <T v="numberM" style={{ fontVariant: ['tabular-nums'] }}>{value}</T> : null}
      </View>
      <View style={styles.lockButtons}>
        {buttons.map((b) => (
          <Pressable
            key={b.label}
            accessibilityRole="button"
            onPress={b.onPress}
            style={[styles.lockButton, { backgroundColor: b.primary ? color.signal : color.raise2 }]}
          >
            <Text style={[type.labelSmall, { color: b.primary ? color.signalInk : color.ink }]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LockScreen() {
  const { s, a } = useStore();
  const content = useIslandContent();
  const st = s.stop;
  const arrive = st.arrive ?? s.now;
  const appt = apptOf(st);

  // E2: first visit, pulled in with the phone locked.
  const arrival =
    st.phase === 'arriving' ? (
      <LockActivity
        title="Loading here?"
        line={`Pulled in ${clock(arrive)}${s.rules.start === 'appt' ? ` · appointment ${clock(appt)}` : ''}`}
        buttons={[
          { label: 'Yes, start', primary: true, onPress: a.confirmArrival },
          {
            label: 'Not a stop',
            onPress: () => {
              a.cancelArrival();
              a.setLock(false);
            },
          },
        ]}
      />
    ) : null;

  // E3: free time running and not checked in yet.
  const checkIn =
    st.phase === 'dock' && content?.stg === 1 && st.checkin == null ? (
      <LockActivity
        title="Free time left"
        line={content.line}
        value={content.compact}
        buttons={[{ label: 'I checked in', primary: true, onPress: a.checkIn }]}
      />
    ) : null;

  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.lockRoot]}
      onPress={() => a.setLock(false)}
      accessibilityLabel="Unlock"
    >
      <LinearGradient colors={[protoColor.lockTop, protoColor.lockBottom]} style={styles.lock}>
        <Text style={styles.lockDate}>{TODAY_LABEL}</Text>
        <Text style={styles.lockClock}>{clockBare(s.now)}</Text>
        {arrival ?? checkIn ?? (content ? (
          <View style={styles.lockCard}>
            <Row style={{ justifyContent: 'flex-start', gap: 8 }}>
              <View style={[styles.lead, { width: 24, height: 24 }]}>
                <TruckIcon size={14} />
              </View>
              <T v="labelSmall">Docket · {TODAY_STOP.name}</T>
            </Row>
            <Gap h={12} />
            <Row base>
              <T v="bodyStrong" style={{ fontSize: 19 }}>{content.lockTitle}</T>
              <T v="numberL" style={{ fontSize: 40 }}>{content.stg === 1 ? content.compact : content.value}</T>
            </Row>
            <Gap h={12} />
            <View style={styles.ibar}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.ibarSeg, { backgroundColor: i < content.filled ? color.ink : color.raise2 }]} />
              ))}
            </View>
            <Gap h={8} />
            <T v="bodyTiny">{content.lockLine}</T>
          </View>
        ) : null)}
        <Text style={styles.lockHint}>Simulated lock screen · tap to unlock</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Figma E4: "Hey Siri, I checked in" with the phone on a dash mount. */
function SiriScreen() {
  const { s, a } = useStore();
  const c = stopCalc(s.stop, s.now, s.rules);
  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.lockRoot]} onPress={a.closeSiri} accessibilityLabel="Close">
      <LinearGradient colors={[protoColor.lockTop, protoColor.lockBottom]} style={styles.lock}>
        <Text style={styles.lockDate}>{TODAY_LABEL}</Text>
        <Text style={styles.lockClock}>{clockBare(s.now)}</Text>
        <LockActivity
          top
          title={`Checked in · ${clock(s.stop.checkin ?? s.now)}`}
          line={`${TODAY_STOP.name} · free time ends ${clock(c.freeEnd)}`}
          buttons={[{ label: 'Undo', onPress: a.undoCheckIn }]}
        />
        <Text style={[type.h2, styles.siriQuote]}>“Hey Siri, I checked in”</Text>
        <Text style={styles.lockHint}>Simulated Siri · tap to close</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Everything that floats over the screens. Render once, inside the phone. */
export function Overlays() {
  const { s, ui } = useStore();
  const path = usePathname();
  return (
    <>
      {/* Answered on the lock screen first; unlocking without answering leaves it here, unconfirmed. */}
      {s.stop.phase === 'arriving' && path === '/today' && !ui.lock ? <ArrivalSheet /> : null}
      {ui.sheet?.kind === 'message' ? <MessageSheet text={ui.sheet.text} /> : null}
      {ui.sheet?.kind === 'fix' ? <FixSheet draft={ui.sheet.draft} /> : null}
      {ui.undo && !ui.sheet && !ui.lock ? <UndoToast key={ui.undo} text={ui.undo} /> : null}
      {ui.toast ? <Toast key={ui.toast} text={ui.toast} /> : null}
      <Island />
      {/* The lock screen covers the whole app, island included (like v1). */}
      {ui.lock ? <LockScreen /> : null}
      {ui.siri ? <SiriScreen /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: protoColor.scrim, zIndex: 40, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: color.line, alignSelf: 'center', marginBottom: 14 },
  textarea: {
    ...type.bodySmall,
    fontSize: 15,
    lineHeight: 22,
    color: color.ink,
    minHeight: 260,
    borderRadius: 18,
    backgroundColor: color.raise,
    padding: 14,
  },
  times: { backgroundColor: color.raise, borderRadius: radius.control, borderCurve: 'continuous', paddingHorizontal: 18, paddingVertical: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 6 },
  timeRowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 80, textAlign: 'center', fontVariant: ['tabular-nums'] },
  details: { backgroundColor: color.raise, borderRadius: radius.control, borderCurve: 'continuous', padding: 14 },
  undo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: protoColor.island,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 60,
  },
  undoText: { flex: 1, minWidth: 0, color: color.bg },
  lockRoot: { zIndex: 55 },
  lockActivity: { gap: 12 },
  lockActivityTop: { position: 'absolute', top: 60, left: 16, right: 16, width: 'auto', marginTop: 0, marginBottom: 0 },
  siriQuote: { color: color.bg, marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' },
  lockActivityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockButtons: { flexDirection: 'row', gap: 8 },
  lockButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderCurve: 'continuous' },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 96,
    backgroundColor: protoColor.toast,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 60,
  },
  island: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 50,
    backgroundColor: protoColor.island,
    overflow: 'hidden',
  },
  islandPress: { flex: 1 },
  compact: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingRight: 14,
  },
  lead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadL: { width: 44, height: 44, borderRadius: 22 },
  islandVal: {
    fontFamily: fontFamily.medium,
    fontSize: 17,
    color: color.signal,
    fontVariant: ['tabular-nums'],
  },
  exp: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16 },
  expText: { flex: 1, minWidth: 0, marginLeft: 12 },
  islandSub: { fontFamily: fontFamily.regular, fontSize: 13, color: protoColor.islandSub },
  ibar: { flexDirection: 'row', gap: 4, marginTop: 'auto' },
  ibarSeg: { flex: 1, height: 4, borderRadius: 2 },
  lock: { flex: 1, alignItems: 'center', paddingTop: 70, paddingHorizontal: 16, zIndex: 55 },
  lockDate: { fontFamily: fontFamily.semibold, fontSize: 21, color: color.bg },
  lockClock: {
    fontFamily: fontFamily.semibold,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -2,
    color: color.bg,
    fontVariant: ['tabular-nums'],
  },
  lockCard: {
    marginTop: 'auto',
    marginBottom: 120,
    width: '100%',
    backgroundColor: color.bg,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  lockHint: { position: 'absolute', bottom: 40, fontFamily: fontFamily.regular, fontSize: 14, color: color.bg, opacity: 0.8 },
});
