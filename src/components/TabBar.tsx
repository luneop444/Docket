import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, type } from '../theme/tokens';
import { TAB_PILL, useTabSpace } from './Chrome';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

/**
 * Floating pill tab bar in Liquid Glass. On iOS 26 it is Apple's real glass
 * (expo-glass-effect). Elsewhere it is the same pill as frosted glass: a
 * translucent white with the content blurred behind it on the web, and plain
 * translucent white where blur isn't available.
 */
export function TabBar() {
  const path = usePathname();
  const { pillBottom } = useTabSpace();
  const native = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const Shell = native ? GlassView : View;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: pillBottom }]}>
      <Shell style={[styles.pill, native ? null : FROSTED]} {...(native ? { glassEffectStyle: 'regular' as const, isInteractive: true } : {})}>
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
              <Icon on={on} c={on ? color.signal : color.ink} />
              <Text style={[type.labelTab, { color: on ? color.signal : color.ink }]}>{label}</Text>
            </Pressable>
          );
        })}
      </Shell>
    </View>
  );
}

/** Web and Android stand-in for Liquid Glass: translucent white, the page blurred behind it. */
const FROSTED = {
  backgroundColor: 'rgba(255,255,255,0.72)',
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
  // The selected tab sits on a slightly darker capsule, like the system tab bar.
  tabOn: { backgroundColor: 'rgba(0,0,0,0.08)' },
});
