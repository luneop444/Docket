import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { CalendarPlusIcon, RepeatIcon, ShuffleIcon } from '../components/Icons';
import { Button, ChoiceTile, Gap, T, type IconFn } from '../components/ui';
import type { LoadStyle } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/** Figma L-A Loads · icon tiles (Onboarding v3): each choice gets an icon, not a sketch to decode. */
const STYLES: { k: LoadStyle; label: string; sub: string; icon: IconFn }[] = [
  { k: 'same', label: 'Same stops every week', sub: 'Set your stops up once', icon: (c) => <RepeatIcon c={c} /> },
  { k: 'different', label: 'Different loads every day', sub: 'Add each load when dispatch sends it', icon: (c) => <ShuffleIcon c={c} /> },
  { k: 'mix', label: 'A mix of both', sub: 'Save regular stops, add the rest', icon: (c) => <CalendarPlusIcon c={c} /> },
];

/** Figma A3 How your loads come in, redrawn as Onboarding v3 icon tiles. */
export default function HowLoadsComeIn() {
  const { s, a } = useStore();
  return (
    <Screen
      step={3}
      header={
        <OnboardingBar
          step={3}
          onBack={() => router.navigate(s.rulesCheck === 'different' || s.customCompany ? '/edit-rules' : '/company-rules')}
        />
      }
      footer={<Button label="Continue" disabled={!s.loadStyle} onPress={() => router.push('/location')} />}
    >
      <T v="h2">How do your loads come in?</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        So Docket knows your stops before you arrive
      </T>
      <Gap h={24} />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="How your loads come in">
        {STYLES.map((o) => (
          <ChoiceTile
            key={o.k}
            icon={o.icon}
            label={o.label}
            sub={o.sub}
            selected={s.loadStyle === o.k}
            onPress={() => a.setLoadStyle(o.k)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
