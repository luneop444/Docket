import { router } from 'expo-router';
import { OnboardingBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { Button, Gap, T } from '../components/ui';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

/** v1 05 Edit rules (onboarding step 2 when the rules don't match) */
export default function EditRules() {
  const { s } = useStore();
  return (
    <Screen
      step={2}
      header={
        <OnboardingBar step={2} onBack={() => router.navigate(s.customCompany ? '/company' : '/company-rules')} />
      }
      footer={<Button label="Save rules" onPress={() => router.push('/loads')} />}
    >
      <T v="h2">{s.company ? `${s.company}’s detention rules` : 'Your detention rules'}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {s.customCompany
          ? 'Enter the rules from your onboarding paperwork or driver handbook. You can change them later.'
          : 'Set them to match your paperwork. Rules can differ by fleet or division.'}
      </T>
      <Gap h={24} />
      <RuleEditor />
    </Screen>
  );
}
