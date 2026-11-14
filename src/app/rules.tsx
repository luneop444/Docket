import { router } from 'expo-router';
import { BackBar, Screen } from '../components/Chrome';
import { RuleEditor } from '../components/RuleEditor';
import { Button, Card, Gap, Seg, T } from '../components/ui';
import { setsStopsOnce, type LoadStyle, type LocationMode } from '../logic/state';
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
      <T v="bodyStrong">Noticing your stops</T>
      <Gap h={10} />
      <Seg<LocationMode>
        options={[
          { key: 'always', label: 'Use location' },
          { key: 'manual', label: 'By hand' },
        ]}
        value={s.location}
        onChange={a.setLocation}
      />
      <Gap h={8} />
      <T v="bodyTiny">
        {s.location === 'always'
          ? `Docket starts the clock at stops you’ve been to and asks when you leave, while the app is open. ${
              Object.keys(s.placeCoords).length
            } place${Object.keys(s.placeCoords).length === 1 ? '' : 's'} saved on this phone.`
          : 'You tap “I’m here” and “I left”. Location stays off.'}
      </T>
      <Gap h={24} />
      <Card onPress={() => router.push('/history')}>
        <T v="bodyStrong">Your stops</T>
        <Gap h={4} />
        <T v="bodySmall">
          {s.history.length
            ? `${s.history.length} stop${s.history.length === 1 ? '' : 's'} logged. See them, copy them as text, or download a CSV.`
            : 'Stops you time with “I’m here” are kept here, ready to copy or export.'}
        </T>
      </Card>
      <Gap h={24} />
      <Card>
        <T v="bodyStrong">About this prototype</T>
        <Gap h={8} />
        <T v="bodySmall">
          Prototype v2 for AIxD Project 3. Real: your rules and the detention math, loads you type in, stops timed
          with your phone’s clock and location, the paycheck check, reading your BOL photo and the message to your fleet
          manager. Simulated: background location, the prototype controls, rate con and settlement reading, and company
          data.
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
