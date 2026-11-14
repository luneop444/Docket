import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Gap, Option, T } from '../components/ui';
import type { LoadStyle } from '../logic/state';
import { useStore } from '../state/AppStore';

const STYLES: [LoadStyle, string][] = [
  ['same', 'Same stops every week'],
  ['different', 'Different loads every day'],
  ['mix', 'A mix of both'],
];

/** Figma A3 How your loads come in (new in v2) */
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
      <Gap h={20} />
      <View style={{ gap: 8 }}>
        {STYLES.map(([k, label]) => (
          <Option key={k} radio label={label} selected={s.loadStyle === k} onPress={() => a.setLoadStyle(k)} />
        ))}
      </View>
    </Screen>
  );
}
