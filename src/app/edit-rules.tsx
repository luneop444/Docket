import { router } from 'expo-router';
import { BackBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { Button, Gap, T } from '../components/ui';
import { useStore } from '../state/AppStore';

/** v1 05 Edit rules */
export default function EditRules() {
  const { s } = useStore();
  return (
    <Screen
      header={<BackBar onPress={() => router.navigate(s.customCompany ? '/paytype' : '/company-rules')} />}
      footer={<Button label="Save rules" onPress={() => router.push('/location')} />}
    >
      <T v="h2">{s.company}’s detention rules</T>
      <Gap h={8} />
      <T v="bodySmall">
        {s.customCompany
          ? 'Enter the rules from your onboarding paperwork or driver handbook. You can change them later.'
          : 'Set them to match your paperwork. Rules can differ by fleet or division.'}
      </T>
      <Gap h={8} />
      <RuleEditor />
    </Screen>
  );
}
