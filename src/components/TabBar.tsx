import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, type } from '../theme/tokens';
import { useInsets } from './Chrome';
import { TabCompaniesIcon, TabPaycheckIcon, TabTodayIcon } from './Icons';

const TABS = [
  { href: '/today', label: 'Today', Icon: TabTodayIcon },
  { href: '/paycheck', label: 'Paycheck', Icon: TabPaycheckIcon },
  { href: '/companies', label: 'Companies', Icon: TabCompaniesIcon },
] as const;

/** Figma "Tab bar" (Active = Today / Paycheck / Companies). */
export function TabBar() {
  const path = usePathname();
  const { tabBottom } = useInsets();
  return (
    <View style={[styles.bar, { paddingBottom: tabBottom }]}>
      {TABS.map(({ href, label, Icon }) => {
        const on = path === href;
        return (
          <Pressable
            key={href}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => router.navigate(href)}
            style={styles.tab}
          >
            <Icon on={on} />
            <Text style={[type.labelTab, { color: on ? color.ink : color.sub }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 9, paddingBottom: 8 },
});
