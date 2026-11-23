import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { color } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: color.canvas } }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="paycheck" />
      <Tabs.Screen name="companies" />
    </Tabs>
  );
}
