import { router } from 'expo-router';
import { useState } from 'react';
import { OnboardingBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { resetStepMotion } from '../components/stepMotion';
import { Button, Gap, T } from '../components/ui';
import type { Rules } from '../logic/detention';
import { useStore } from '../state/AppStore';
import { color } from '../theme/tokens';

const ALL: (keyof Rules)[] = ['free', 'start', 'rate', 'breaksCount'];

/**
 * Setup step 3, the last: the company's detention rules, entered by the driver. Nothing is filled
 * in: a preset would be a guess dressed up as their company's rule, and every figure Docket shows
 * comes from these. Done here, the driver lands on Today; location and how loads come in are
 * asked when they first matter.
 */
export default function EditRules() {
  const { s, a } = useStore();
  // Rules given already (coming back to this step) count as set.
  const [unset, setUnset] = useState<Set<keyof Rules>>(() => new Set(s.rulesConfirmed ? [] : ALL));
  const ready = unset.size === 0;
  const named = s.company && !s.customCompany ? s.company : null;
  function done() {
    a.confirmRules();
    resetStepMotion();
    router.replace('/today');
  }
  return (
    <Screen
      step={3}
      header={<OnboardingBar step={3} onBack={() => router.navigate('/company')} />}
      footer={
        <>
          <Button label="Save rules" disabled={!ready} onPress={done} />
          {ready ? null : (
            <T v="bodyTiny" c={color.sub} style={{ textAlign: 'center' }}>
              {`Answer all four to continue (${ALL.length - unset.size} of ${ALL.length})`}
            </T>
          )}
        </>
      }
    >
      <T v="h2">{named ? `${named}’s detention rules` : 'Your detention rules'}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        From your onboarding paperwork or driver handbook. Dispatch can tell you if you’re not sure. You can change them later.
      </T>
      <Gap h={24} />
      <RuleEditor
        unset={unset}
        onSet={(k) =>
          setUnset((u) => {
            const n = new Set(u);
            n.delete(k);
            return n;
          })
        }
      />
    </Screen>
  );
}
