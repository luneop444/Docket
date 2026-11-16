import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, colorDark, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

/** What the icons' cut-outs sit on: black at 88% over the white page. */
const UNDER = '#1F1F1F';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

/**
 * Floating pill tab bar in dark Liquid Glass, the selected icon in Docket's lime.
 * On iOS 26 it is Apple's real glass (expo-glass-effect) in its dark scheme.
 * Elsewhere it is the same pill in translucent black.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const native = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const Shell = native ? GlassView : View;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: pillBottom }]}>
      <Shell style={[styles.pill, native ? null : FROSTED]} {...(native ? { glassEffectStyle: 'regular' as const, colorScheme: 'dark' as const, isInteractive: true } : {})}>
        {TABS.map(({ href, label, Icon }) => {
          const on = path === href;
          return (
            <Pressable
              key={href}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => router.navigate(href)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Icon on={on} c={on ? color.signal : colorDark.sub} cut={UNDER} />
              <Text style={[type.labelTab, { color: on ? colorDark.ink : colorDark.sub }]}>{label}</Text>
            </Pressable>
          );
        })}
      </Shell>
    </View>
  );
}

/** Android stand-in for dark Liquid Glass: black at 88%, as on the web. */
const FROSTED = {
  backgroundColor: 'rgba(0,0,0,0.88)',
  // Web only; native platforms ignore these keys.
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
} as unknown as ViewStyle;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  pill: {
    height: TAB_PILL,
    borderRadius: TAB_PILL / 2,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  tab: {
    flex: 1,
    height: TAB_PILL - 8,
    borderRadius: (TAB_PILL - 8) / 2,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // The selected tab sits on a slightly lighter capsule, like the system tab bar in dark mode.
  tabOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
});
