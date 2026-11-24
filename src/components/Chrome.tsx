/**
 * Screen chrome: safe areas, the Docket top bar, back bar, page header and the
 * scroll + footer scaffold every screen uses.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, usePathname } from 'expo-router';
import { createContext, isValidElement, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TODAY_LABEL } from '../logic/sampleData';
import { headerDate } from '../logic/history';
import { islandStage } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, fontFamily, type } from '../theme/tokens';
import { BandScrollView } from './BandScrollView';
import { LiquidGroup, LiquidPill } from './LiquidGlass';
import { ChevronLeft, PersonIcon } from './Icons';
import { BAR_MS, PUSH_MS, useReduceMotion, useStepMotion } from './stepMotion';
import { Tappable } from './Tappable';
import { T } from './ui';

/** True when the app is drawn inside the desktop phone frame. */
export const FrameContext = createContext(false);
export const useFramed = () => useContext(FrameContext);

export function useIslandStage() {
  const { s } = useStore();
  const path = usePathname();
  return islandStage(s.stop, s.now, s.rules, path === '/summary');
}

/** Space for the status bar (faked in the desktop frame, real safe area on a phone). */
export function useInsets() {
  const framed = useFramed();
  const insets = useSafeAreaInsets();
  if (framed) return { top: 48, footerBottom: 34, tabBottom: 22 };
  return {
    top: Math.max(12, insets.top),
    footerBottom: Math.max(20, insets.bottom),
    tabBottom: insets.bottom,
  };
}

/** How far below the status strip content fades out as it scrolls under it. */
const TOP_FADE = 24;

/** Height of the floating tab pill. */
export const TAB_PILL = 64;

/**
 * Where the floating tab pill sits (12 above the home indicator's area) and how
 * much bottom padding a tab screen needs so its last row can scroll clear of it.
 */
export function useTabSpace() {
  const { tabBottom } = useInsets();
  const pillBottom = Math.max(12, tabBottom - 12);
  return { pillBottom, space: pillBottom + TAB_PILL + 24 };
}

export function TopSafe() {
  return <View style={{ height: useInsets().top }} />;
}

export function Wordmark() {
  return (
    <View style={styles.wordmark}>
      <View style={styles.wordmarkBar} />
      <Text style={styles.wordmarkText}>Docket</Text>
    </View>
  );
}

/** Docket wordmark on the left, optional actions on the right. */
export function TopBar({ trailing, title }: { trailing?: ReactNode; title?: string }) {
  return (
    <>
      <TopSafe />
      <View style={styles.topbar}>
        {title ? <T v="h2">{title}</T> : <Wordmark />}
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </>
  );
}

/** Date + profile button (opens Your rules). `noDate` when the date is already the title. */
export function ProfileTrailing({ noDate }: { noDate?: boolean } = {}) {
  const { s } = useStore();
  return (
    <>
      {noDate ? null : <T v="bodyTiny">{headerDate(s.stop, TODAY_LABEL)}</T>}
      <Tappable accessibilityRole="button" accessibilityLabel="Profile and rules" onPress={() => router.push('/rules')} style={styles.iconBtn}>
        <PersonIcon />
      </Tappable>
    </>
  );
}

/** The onboarding header row: back and step pills, centred in 52. */
const BAR_H = 52;
/** Room under a screen's content, above its footer. */
const PAD_BOTTOM = 28;
/** Content starts 10 under the header row; the 44 pills end (52 − 44) / 2 above its bottom. */
const UNDER_AT = 10 + (BAR_H - 44) / 2;
/** Whether content has scrolled under the onboarding header (its pills turn to glass). */
const HeaderUnder = createContext(false);

/**
 * Back, on detail screens. It stays reachable from anywhere on the page, so it floats and
 * the page scrolls under it: bare at rest, in a glass pill (the nav bar's glass) once
 * something is under it. Same as the onboarding back button.
 */
export function BackBar({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const { top } = useInsets();
  const under = useContext(HeaderUnder);
  // The pill hugs the label: measured once it's laid out (a fair guess until then).
  const [w, setW] = useState(Math.round(40 + label.length * 9.5));
  return (
    <View style={{ height: top + BAR_H }} pointerEvents="box-none">
      <View style={{ height: top }} pointerEvents="none" />
      <View style={styles.glassRow} pointerEvents="box-none">
        <LiquidGroup>
          <LiquidPill w={w} h={44} on={under}>
            <Tappable
              accessibilityRole="button"
              onPress={onPress}
              onLayout={(e) => setW(Math.ceil(e.nativeEvent.layout.width))}
              style={styles.back}
            >
              <ChevronLeft />
              <Text style={styles.backText}>{label}</Text>
            </Tappable>
          </LiquidPill>
        </LiquidGroup>
      </View>
    </View>
  );
}

export const ONBOARDING_STEPS = 4;

/** v2 header: chevron back on the left, onboarding step dashes on the right (if a step is given). */
/**
 * Onboarding header: back and the step dashes. It floats and the screen scrolls under it;
 * only while something is under it do they sit in glass (a circle and a capsule, the nav
 * bar's liquid glass, LiquidGlass.web.tsx). At rest over the empty top they're bare.
 */
export function OnboardingBar({ step, onBack }: { step?: number; onBack: () => void }) {
  const { top } = useInsets();
  const under = useContext(HeaderUnder);
  return (
    <View style={{ height: top + BAR_H }} pointerEvents="box-none">
      <View style={{ height: top }} pointerEvents="none" />
      <View style={styles.glassRow} pointerEvents="box-none">
        <LiquidGroup>
          <LiquidPill w={44} h={44} on={under}>
            <Tappable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.iconBtn}>
              <ChevronLeft />
            </Tappable>
          </LiquidPill>
        </LiquidGroup>
        {step ? (
          <View style={styles.centerAbs} pointerEvents="box-none">
            <LiquidGroup>
              <LiquidPill w={DASHES_W + 32} h={44} on={under}>
                <StepDashes step={step} inline />
              </LiquidPill>
            </LiquidGroup>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Centered dashes; only the current step is long and dark (reference: Pinterest pin 737183032797648903). */
// Figma Onboarding v3 (E1 Progress): 40 for this step, 27 for the rest, 4 apart, #D7DBE0.
const DASH = 27;
const DASH_ON = 40;
/** The four dashes end to end: one long, three short, 4 apart. */
const DASHES_W = DASH_ON + DASH * (ONBOARDING_STEPS - 1) + 4 * (ONBOARDING_STEPS - 1);

function StepDashes({ step, inline }: { step: number; inline?: boolean }) {
  const { from } = useStepMotion(step);
  const reduce = useReduceMotion();
  const animate = from != null && from !== step;
  const [t] = useState(() => new Animated.Value(animate && !reduce ? 0 : 1));

  useEffect(() => {
    if (!animate) return;
    if (reduce) {
      t.setValue(1);
      return;
    }
    const run = Animated.timing(t, {
      toValue: 1,
      duration: BAR_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [animate, reduce, t]);

  return (
    <View
      pointerEvents="none"
      style={inline ? styles.dashInline : styles.dashRow}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
    >
      {Array.from({ length: ONBOARDING_STEPS }, (_, i) => {
        const n = i + 1;
        const growing = n === step;
        const shrinking = animate && n === from;
        if (!growing && !shrinking)
          return <View key={n} style={[styles.dash, { width: DASH, backgroundColor: color.track }]} />;
        const range = growing ? [DASH, DASH_ON] : [DASH_ON, DASH];
        const tint = growing ? [color.track, color.ink] : [color.ink, color.track];
        return (
          <Animated.View
            key={n}
            style={[
              styles.dash,
              {
                width: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: range,
                }),
                backgroundColor: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: tint,
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Title row for Paycheck and Companies. */
export function PageHead({ title, right }: { title: string; right?: string }) {
  return (
    <>
      <TopSafe />
      <View style={styles.pagehead}>
        {/* The screen's name is its heading, so a screen reader can find it (WCAG 2.4.6, 1.3.1). */}
        <Text accessibilityRole="header" style={[type.bodyStrong, styles.pageTitle]}>
          {title}
        </Text>
        {right ? <T v="bodyTiny">{right}</T> : null}
      </View>
    </>
  );
}

/**
 * Slides onboarding content in under a still header: from the right going
 * forward, from the left going back. The previous screen is already gone
 * (the stack doesn't animate), so only the incoming half of the push shows.
 */
function Push({ step, children }: { step?: number; children: ReactNode }) {
  if (!step) return <View style={styles.flex}>{children}</View>;
  return <PushIn step={step}>{children}</PushIn>;
}

function PushIn({ step, children }: { step: number; children: ReactNode }) {
  const { dir } = useStepMotion(step);
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const distance = Math.min(width, 430) * dir;
  const [x] = useState(() => new Animated.Value(reduce ? 0 : distance));
  useEffect(() => {
    if (reduce) {
      x.setValue(0);
      return;
    }
    const run = Animated.timing(x, {
      toValue: 0,
      duration: PUSH_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [reduce, x]);
  return <Animated.View style={[styles.flex, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

/** Header + scrolling content + optional pinned footer. */
export function Screen({
  header,
  footer,
  children,
  contentStyle,
  scrollRef,
  onScrollY,
  overlay,
  step,
  tabs,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** For screens that jump to a spot in their content (the A–Z company index). */
  scrollRef?: RefObject<ScrollViewInstance | null>;
  onScrollY?: (y: number) => void;
  /** Pinned over the scrolling area, e.g. an index strip. */
  overlay?: ReactNode;
  /** Onboarding step: the content (not the header) pushes in from the side. */
  step?: number;
  /** A tab screen: leave room under the content for the floating tab pill. */
  tabs?: boolean;
}) {
  const { footerBottom } = useInsets();
  const { space } = useTabSpace();
  const focused = useIsFocused();
  const { top } = useInsets();
  // Headers with a control (back) float over the content, which scrolls under their glass.
  // Title headers (a tab's title and date) are labels the tab bar already says: they scroll
  // away with the page (Apple's large titles do too).
  const over = isValidElement(header) && (header.type === OnboardingBar || header.type === BackBar);
  const inline = !over;
  // Scroll only when the content needs it: the room left under it (PAD_BOTTOM, or the tab
  // pill's space) is not a reason to scroll when everything above it already fits.
  // On a tab screen that room is where the tab pill floats, over the content: anything that
  // reaches into it is hidden behind the pill, so it has to be able to scroll up past it.
  const padBottom = tabs ? 0 : PAD_BOTTOM;
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const needsScroll = !viewH || !contentH || contentH - padBottom > viewH + 0.5;
  // Something is under the floating header once the first item scrolls up past its pills.
  const [under, setUnder] = useState(false);
  const onScroll = (y: number) => {
    if (over) setUnder(y > UNDER_AT);
    onScrollY?.(y);
  };
  return (
    <View style={styles.screen}>
      <Push step={step}>
        <BandScrollView
          scrollRef={scrollRef}
          // Marks the screen that's showing, so glass over it pictures this page (glassLook.ts).
          {...({ dataSet: { glassScreen: focused ? 'on' : 'off' } } as object)}
          style={styles.flex}
          contentContainerStyle={[styles.scroll, step ? styles.stepTop : null, over ? { paddingTop: top + (step ? BAR_H + 10 : BAR_H) } : null, tabs ? { paddingBottom: space } : null, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={needsScroll}
          onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentH(h)}
          onScroll={onScrollY || over ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={onScrollY || over ? 16 : undefined}
        >
          {inline ? <View style={styles.inlineHead}>{header}</View> : null}
          {children}
        </BandScrollView>
        {overlay}
        {footer ? <View style={[styles.footer, { paddingBottom: footerBottom }]}>{footer}</View> : null}
      </Push>
      {/* Content passing under the status bar fades out instead of running into it: hidden through
          the whole status strip (time, island, battery), then a soft fade below it. The solid part
          used to end at 0.6 of top + 14, above the island's bottom, so content showed beside the
          clock (23 Nov). */}
      <LinearGradient
        pointerEvents="none"
        colors={[color.canvas, color.canvas, `${color.canvas}00`]}
        locations={[0, top / (top + TOP_FADE), 1]}
        style={[styles.topFade, { height: top + TOP_FADE }]}
      />
      {over ? (
        <HeaderUnder.Provider value={under && needsScroll}>
          <View style={styles.headOver} pointerEvents="box-none">{header}</View>
        </HeaderUnder.Provider>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.canvas, overflow: 'hidden' },
  scroll: { paddingHorizontal: 20, paddingBottom: PAD_BOTTOM },
  // Onboarding: 16 from the dashes to the title (6 from the bar's own padding + 10).
  stepTop: { paddingTop: 10 },
  footer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: color.canvas,
  },
  // Centered on the whole bar, not on the space beside the back button.
  dashRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dash: { height: 3, borderRadius: 2, borderCurve: 'continuous' },
  dashInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headOver: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
  // A title header inside the scroll: it brings its own 20 side padding.
  inlineHead: { marginHorizontal: -20 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 },
  glassRow: { height: BAR_H, flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  centerAbs: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 6,
    minHeight: 52,
  },
  backbar: { paddingLeft: 6 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmarkBar: {
    width: 10,
    height: 22,
    borderRadius: 2, borderCurve: 'continuous',
    backgroundColor: color.signal,
  },
  wordmarkText: {
    fontFamily: fontFamily.semibold,
    fontSize: 19,
    letterSpacing: -0.1,
    color: color.ink,
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22, borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 44,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 22, borderCurve: 'continuous',
  },
  backText: { fontFamily: fontFamily.medium, fontSize: 17, color: color.ink },
  // Same row as the Today top bar, so the title sits where the wordmark does on every tab.
  pagehead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
    minHeight: 52,
  },
  pageTitle: { fontSize: 19 },
});
