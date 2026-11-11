import { router } from 'expo-router';
import { BackBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { Button, Card, Gap, T } from '../components/ui';
import { useStore } from '../state/AppStore';

/** v1 19 Your rules (from the profile button) */
export default function YourRules() {
  const { s, a } = useStore();
  return (
    <Screen
      header={
        <BackBar
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
        />
      }
    >
      <T v="h2">Your rules</T>
      <Gap h={8} />
      <T v="bodySmall">
        {s.company || 'your company'}. You entered these rules. Changing a rule recalculates your paycheck check and
        today’s stop.
      </T>
      <RuleEditor />
      <Gap h={24} />
      <Card>
        <T v="bodyStrong">About this prototype</T>
        <Gap h={8} />
        <T v="bodySmall">
          Prototype v2 for AIxD Project 3. Location, time passing, rate con, BOL and settlement reading, and company
          data are simulated. Your rules, the detention math, the camera and the message to your fleet manager are real.
        </T>
        <Gap h={12} />
        <Button
          label="Reset prototype"
          variant="white"
          small
          onPress={() => {
            a.resetAll();
            router.replace('/welcome');
          }}
        />
      </Card>
    </Screen>
  );
}
