/**
 * Things drawn on top of the current screen: bottom sheets, the toast, and the
 * simulated Dynamic Island + lock screen Live Activity (Figma node 144:223).
 */
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { clock, clockBare, dur, hm, money } from '../logic/format';
import { TODAY_LABEL, TODAY_STOP } from '../logic/sampleData';
import { stopCalc } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, fontFamily, protoColor, radius, type } from '../theme/tokens';
import { useFramed, useInsets, useIslandStage } from './Chrome';
import { TruckIcon } from './Icons';
import { RuleSection, Stepper } from './RuleEditor';
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

function SheetShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
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

function FixSheet({ draft }: { draft: { arrive: number; leave: number; brk: number } }) {
  const { a } = useStore();
  const rows: { k: 'arrive' | 'leave' | 'brk'; label: string; fmt: (v: number) => string }[] = [
    { k: 'arrive', label: 'Arrived', fmt: clock },
    { k: 'leave', label: 'Left', fmt: clock },
    { k: 'brk', label: 'Off-duty break', fmt: dur },
  ];
  return (
    <SheetShell onClose={a.closeSheet}>
      <T v="h2">Fix a time</T>
      <Gap h={8} />
      <T v="bodySmall">Your location record is kept alongside any change, so both show if anyone asks.</T>
      {rows.map(({ k, label, fmt }) => (
        <RuleSection key={k}>
          <T v="bodyStrong">{label}</T>
          <Stepper value={fmt(draft[k])} onMinus={() => a.fixStep(k, -1)} onPlus={() => a.fixStep(k, 1)} />
        </RuleSection>
      ))}
      <Gap h={16} />
      <Button label="Save" onPress={() => a.saveFix(draft)} />
      <Button label="Cancel" variant="text" onPress={a.closeSheet} />
    </SheetShell>
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
  const st = s.stop;
  const c = stopCalc(st, s.now, s.rules);
  const arrive = st.arrive ?? s.now;
  switch (stg) {
    case 1:
      return { stg, val: hm(Math.max(0, c.freeEnd - s.now)), white: true, title: 'Free time',
        line: `${hm(s.now - arrive)} waited · detention at ${clock(c.freeEnd)}`, bars: [1, 0, 0, 0] };
    case 2:
      return { stg, val: money(c.owed), white: false, title: 'Detention starts now',
        line: `Free time is up · ${money(s.rules.rate)}/hr`, bars: [1, 1, 0, 0] };
    case 3:
      return { stg, val: money(c.owed), white: false, title: 'Detention running',
        line: `${hm(s.now - arrive)} waited · ${money(s.rules.rate)}/hr`, bars: [1, 1, 1, 0] };
    case 4:
      return { stg, val: money(c.owed), white: false, title: `Left ${TODAY_STOP.short}`,
        line: `Tap to snap your BOL · left ${clock(st.leave ?? s.now)}`, bars: [1, 1, 1, 1] };
    case 5:
      return { stg, val: money(c.owed), white: true, title: 'Stop logged',
        line: `${dur(c.wait)} waited · ${money(c.owed)} expected`, bars: [1, 1, 1, 1] };
    default:
      return null;
  }
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
              <Text style={[styles.islandVal, content.white && { color: color.bg }]}>{content.val}</Text>
            </Animated.View>
            <Animated.View style={[styles.exp, { opacity: showExp }]}>
              <Row style={{ alignItems: 'center', gap: 0 }}>
                <View style={[styles.lead, styles.leadL]}>
                  <TruckIcon size={22} />
                </View>
                <View style={styles.expText}>
                  <T v="bodyStrong" c={color.bg}>{content.title}</T>
                  <Text numberOfLines={1} style={styles.islandSub}>
                    {TODAY_STOP.name} · Load {TODAY_STOP.load}
                  </Text>
                </View>
                <T v="numberM" c={content.white ? color.bg : color.signal}>{content.val}</T>
              </Row>
              <View style={styles.ibar}>
                {content.bars.map((b, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ibarSeg,
                      { backgroundColor: b ? (i < 3 && stg >= 2 ? color.signal : color.bg) : protoColor.islandOff },
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

function LockScreen() {
  const { s, a } = useStore();
  const c = stopCalc(s.stop, s.now, s.rules);
  const inD = s.now >= c.freeEnd;
  const arrive = s.stop.arrive ?? s.now;
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => a.setLock(false)} accessibilityLabel="Unlock">
      <LinearGradient colors={[protoColor.lockTop, protoColor.lockBottom]} style={styles.lock}>
        <Text style={styles.lockDate}>{TODAY_LABEL}</Text>
        <Text style={styles.lockClock}>{clockBare(s.now)}</Text>
        <View style={styles.lockCard}>
          <Row style={{ justifyContent: 'flex-start', gap: 8 }}>
            <View style={[styles.lead, { width: 24, height: 24 }]}>
              <TruckIcon size={14} />
            </View>
            <T v="labelSmall">Docket · {TODAY_STOP.name}</T>
          </Row>
          <Gap h={12} />
          <Row base>
            <T v="bodyStrong" style={{ fontSize: 19 }}>{inD ? 'Detention so far' : 'Free time left'}</T>
            <T v="numberL" style={{ fontSize: 40 }}>{inD ? money(c.owed) : hm(c.freeEnd - s.now)}</T>
          </Row>
          <Gap h={12} />
          <View style={styles.ibar}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.ibarSeg, { backgroundColor: (inD ? i < 3 : i < 1) ? color.ink : color.raise2 }]}
              />
            ))}
          </View>
          <Gap h={8} />
          <T v="bodyTiny">
            {hm(s.now - arrive)} waited{inD ? ` · started ${clock(c.freeEnd)}` : ''}
          </T>
        </View>
        <Text style={styles.lockHint}>Simulated lock screen · tap to unlock</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Everything that floats over the screens. Render once, inside the phone. */
export function Overlays() {
  const { ui } = useStore();
  return (
    <>
      {ui.lock ? <LockScreen /> : null}
      {ui.sheet?.kind === 'message' ? <MessageSheet text={ui.sheet.text} /> : null}
      {ui.sheet?.kind === 'fix' ? <FixSheet draft={ui.sheet.draft} /> : null}
      {ui.toast ? <Toast key={ui.toast} text={ui.toast} /> : null}
      <Island />
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
