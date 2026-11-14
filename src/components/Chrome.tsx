/**
 * Screen chrome: safe areas, the Docket top bar, back bar, page header and the
 * scroll + footer scaffold every screen uses.
 */
import { router, usePathname } from 'expo-router';
import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TODAY_LABEL } from '../logic/sampleData';
import { headerDate } from '../logic/history';
import { islandStage } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { color, fontFamily, type } from '../theme/tokens';
import { ChevronLeft, PersonIcon } from './Icons';
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
  const live = useIslandStage() > 0;
  if (framed) return { top: 48, footerBottom: 34, tabBottom: 22 };
  // On a phone our simulated island floats below the real one, so leave room for it.
  return {
    top: Math.max(12, insets.top) + (live ? 48 : 0),
    footerBottom: Math.max(20, insets.bottom),
    tabBottom: insets.bottom,
  };
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
export function TopBar({ trailing }: { trailing?: ReactNode }) {
  return (
    <>
      <TopSafe />
      <View style={styles.topbar}>
        <Wordmark />
        <View style={styles.trailing}>{trailing}</View>
      </View>
    </>
  );
}

/** Date + profile button (opens Your rules). */
export function ProfileTrailing() {
  const { s } = useStore();
  return (
    <>
      <T v="bodyTiny">{headerDate(s.stop, TODAY_LABEL)}</T>
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
        {step ? (
          <View
            style={styles.progress}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`}
          >
            {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
              <View key={i} style={[styles.dash, { backgroundColor: i < step ? color.ink : color.faint }]} />
            ))}
          </View>
        ) : null}
      </View>
      {step ? (
        // The count sits on the left, in line with the title, so the bar row isn't right-heavy.
        <T v="bodyTiny" c={color.sub} style={styles.stepLabel} importantForAccessibility="no" accessibilityElementsHidden>
          Step {step} of {ONBOARDING_STEPS}
        </T>
      ) : null}
    </>
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

/** Header + scrolling content + optional pinned footer. */
export function Screen({
  header,
  footer,
  children,
  contentStyle,
  scrollRef,
  onScrollY,
  overlay,
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
}) {
  const { footerBottom } = useInsets();
  return (
    <View style={styles.screen}>
      {header}
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scroll, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScrollY ? (e) => onScrollY(e.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={onScrollY ? 32 : undefined}
        >
          {children}
        </ScrollView>
        {overlay}
      </View>
      {footer ? <View style={[styles.footer, { paddingBottom: footerBottom }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  footer: { paddingTop: 24, paddingHorizontal: 20, gap: 8, backgroundColor: color.bg },
  // Full width between the back button and the edge; empty segments use faint (4.3:1 on white, WCAG non-text 3:1).
  progress: { flex: 1, flexDirection: 'row', gap: 4, paddingLeft: 8, paddingRight: 12 },
  stepLabel: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 2 },
  dash: { flex: 1, height: 4, borderRadius: 2 },
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
  wordmarkBar: { width: 10, height: 22, borderRadius: 2, backgroundColor: color.signal },
  wordmarkText: { fontFamily: fontFamily.semibold, fontSize: 19, letterSpacing: -0.1, color: color.ink },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressedBg: { backgroundColor: color.raise },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 44,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 22,
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
