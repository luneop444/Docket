import { router } from 'expo-router';
import { View } from 'react-native';
import { BackBar, Screen } from '../components/Chrome';
import { Button, Gap, Option, T } from '../components/ui';
import type { PayType } from '../logic/state';
import { useStore } from '../state/AppStore';

const TYPES: [PayType, string][] = [
  ['mile', 'By the mile'],
  ['hour', 'By the hour'],
  ['load', 'By the load or a percentage'],
];

/** v1 03 Pay type */
export default function PayTypeScreen() {
  const { s, a } = useStore();
  return (
    <Screen
      header={<BackBar onPress={() => router.navigate('/company')} />}
      footer={
        <Button
          label="Continue"
          disabled={!s.pay}
          onPress={() => router.push(s.customCompany ? '/edit-rules' : '/company-rules')}
        />
      }
    >
      <T v="h2">How are you paid?</T>
      <Gap h={8} />
      <T v="bodySmall">Detention matters most when you’re paid by the mile, because your pay stops when the truck does.</T>
      <Gap h={20} />
      <View style={{ gap: 8 }}>
        {TYPES.map(([k, label]) => (
          <Option
            key={k}
            radio
            label={label}
            selected={s.pay === k}
            sub={k === 'hour' && s.pay === 'hour' ? 'Hourly drivers are usually paid for waiting already. Docket still logs it.' : undefined}
            onPress={() => a.setPay(k)}
          />
        ))}
      </View>
    </Screen>
  );
}
