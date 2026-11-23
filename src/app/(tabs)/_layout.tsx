import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { color } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      // lazy off: every tab is mounted from the start, so the tab bar can picture each ahead of
      // time and its glass is live the moment you switch.
      screenOptions={{ headerShown: false, lazy: false, animation: 'none', sceneStyle: { backgroundColor: color.canvas } }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="paycheck" />
      <Tabs.Screen name="companies" />
    </Tabs>
  );
}
