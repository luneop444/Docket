import { router } from 'expo-router';
import { BackBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { Button, Card, Gap, Seg, T } from '../components/ui';
import { setsStopsOnce, type LoadStyle } from '../logic/state';
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
      <T v="bodyStrong">How your loads come in</T>
      <Gap h={10} />
      <Seg<LoadStyle>
        options={[
          { key: 'same', label: 'Same stops' },
          { key: 'different', label: 'Different' },
          { key: 'mix', label: 'Mix' },
        ]}
        value={s.loadStyle}
        onChange={a.setLoadStyle}
      />
      <Gap h={8} />
      <T v="bodyTiny">
        {setsStopsOnce(s.loadStyle)
          ? 'Docket watches your weekly stops on every run. You don’t add loads.'
          : s.loadStyle === 'mix'
            ? 'Add loads when dispatch sends them, or save one as your weekly route.'
            : 'You add each load when dispatch sends it.'}
      </T>
      {setsStopsOnce(s.loadStyle) || (s.loadStyle === 'mix' && s.load?.recurring) ? (
        <>
          <Gap h={12} />
          <Button
            label={s.load ? 'Change weekly stops' : 'Set up weekly stops'}
            variant="quiet"
            small
            onPress={() => router.push('/add-load')}
          />
        </>
      ) : null}
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
