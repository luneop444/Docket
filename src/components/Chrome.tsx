/**
 * Screen chrome: safe areas, the Docket top bar, back bar, page header and the
 * scroll + footer scaffold every screen uses.
 */
import { router, usePathname } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
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
import { ChevronLeft, PersonIcon } from './Icons';
import { BAR_MS, PUSH_MS, useReduceMotion, useStepMotion } from './stepMotion';
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

/** Height of the floating tab pill. */
export const TAB_PILL = 62;

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile and rules"
        onPress={() => router.push('/rules')}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedBg]}
      >
        <PersonIcon />
      </Pressable>
    </>
  );
}

export function BackBar({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <>
      <TopSafe />
      <View style={[styles.topbar, styles.backbar]}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.back, pressed && styles.pressedBg]}
        >
          <ChevronLeft />
          <Text style={styles.backText}>{label}</Text>
        </Pressable>
      </View>
    </>
  );
}

export const ONBOARDING_STEPS = 4;

/** v2 header: chevron back on the left, onboarding step dashes on the right (if a step is given). */
export function OnboardingBar({ step, onBack }: { step?: number; onBack: () => void }) {
  return (
    <>
      <TopSafe />
      <View style={[styles.topbar, styles.backbar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedBg]}
        >
          <ChevronLeft />
        </Pressable>
        {step ? <StepDashes step={step} /> : null}
      </View>
    </>
  );
}

/** Centered dashes; only the current step is long and dark (reference: Pinterest pin 737183032797648903). */
const DASH = 18;
const DASH_ON = 34;

function StepDashes({ step }: { step: number }) {
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
      style={styles.dashRow}
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
        <Text style={[type.bodyStrong, styles.pageTitle]}>{title}</Text>
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
  return (
    <View style={styles.screen}>
      {header}
      <Push step={step}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scroll, step ? styles.stepTop : null, tabs ? { paddingBottom: space } : null, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScrollY ? (e) => onScrollY(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={onScrollY ? 32 : undefined}
        >
          {children}
        </ScrollView>
        {overlay}
        {footer ? <View style={[styles.footer, { paddingBottom: footerBottom }]}>{footer}</View> : null}
      </Push>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.bg, overflow: 'hidden' },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  // Onboarding: 16 from the dashes to the title (6 from the bar's own padding + 10).
  stepTop: { paddingTop: 10 },
  footer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: color.bg,
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
  pressedBg: { backgroundColor: color.raise },
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
  pagehead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pageTitle: { fontSize: 19 },
});
