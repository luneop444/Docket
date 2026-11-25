import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Field } from '../components/StopsEditor';
import { Button, Gap, T } from '../components/ui';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/**
 * Setup step 1: who's using Docket, before the company and the rules (Dan, 24 Nov: the account
 * comes first). Just a first name, so sign-up doesn't get longer (P1: "if it was too difficult to
 * sign up"). It's kept on the phone, like the rest of the driver's data.
 */
export default function Account() {
  const { s, a } = useStore();
  const [name, setName] = useState(s.name ?? '');
  const ready = name.trim().length > 0;
  const next = () => {
    if (!ready) return;
    a.setName(name);
    router.push('/company');
  };
  return (
    <Screen
      step={1}
      header={<OnboardingBar step={1} onBack={() => router.navigate('/welcome')} />}
      footer={<Button label="Continue" disabled={!ready} onPress={next} />}
    >
      <T v="h2">What should Docket call you?</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        Your first name is enough. It stays on this phone.
      </T>
      <Gap h={24} />
      <Field label="First name" value={name} onChangeText={setName} placeholder="First name" autoFocus name onSubmit={next} />
    </Screen>
  );
}
