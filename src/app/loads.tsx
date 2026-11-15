import { router } from 'expo-router';
import { View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Gap, Option, T } from '../components/ui';
import type { LoadStyle } from '../logic/state';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

const STYLES: [LoadStyle, string, string][] = [
  ['same', 'Same stops every week', 'Set your stops up once'],
  ['different', 'Different loads every day', 'Add each load when dispatch sends it'],
  ['mix', 'A mix of both', 'Save regular stops, add the rest'],
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
      <Gap h={8} />
      <T v="body" c={color.sub}>
        So Docket knows your stops and appointment times before you arrive
      </T>
      <Gap h={24} />
      <View style={{ gap: 8 }}>
        {STYLES.map(([k, label, sub]) => (
          <Option key={k} radio label={label} sub={sub} selected={s.loadStyle === k} onPress={() => a.setLoadStyle(k)} />
        ))}
      </View>
    </Screen>
  );
}
