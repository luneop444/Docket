import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { KeyboardIcon, ShareIcon } from '../components/Icons';
import { Button, ChoiceTile, Gap, T } from '../components/ui';
import { loadFromRateCon, type RateConReading } from '../logic/documents';
import { setsStopsOnce } from '../logic/state';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, pickScreenshot, postDoc, type DocFile } from '../state/readDoc';
import { color } from '../theme/tokens';

type Source = 'share' | 'manual';

/**
 * Figma B1 Add a load: the rate con as it came in (a screenshot or PDF, read by Claude), or typed
 * in. Only what really works: no sample load, and no forwarding address that isn't there yet
 * (Dan, 24 Nov). Dedicated-route drivers see the same screen once, to set up their weekly stops.
 */
export default function AddLoad() {
  const { s, a } = useStore();
  const weekly = setsStopsOnce(s.loadStyle);
  const [source, setSource] = useState<Source>('share');
  const [reading, setReading] = useState(false);
  const typeIt = () => router.push({ pathname: '/check-stops', params: { source: 'manual' } });

  /** Claude reads the stops off the rate con; Check your stops opens with them. */
  async function read(pick: () => Promise<DocFile | null>) {
    let file: DocFile | null;
    try {
      file = await pick();
    } catch (e) {
      a.toast(e instanceof DocReadError ? e.message : 'Couldn’t open that file.');
      return;
    }
    if (!file) return;
    setReading(true);
    try {
      const r = await postDoc<RateConReading>('read-ratecon', file, 'rate con');
      if (!r.found) {
        a.toast(r.note || 'No stops found. Try another page, or type it in.');
        return;
      }
      router.push({ pathname: '/check-stops', params: { source: 'share', read: JSON.stringify(loadFromRateCon(r)) } });
    } catch (e) {
      if (e instanceof DocReadingOff) {
        // No API key on this site (or the local dev server): typing it in still works.
        a.toast('Reading rate cons is off here. Type the load in instead.');
        typeIt();
      } else {
        a.toast(e instanceof DocReadError ? e.message : 'Couldn’t read the rate con. Try again.');
      }
    } finally {
      setReading(false);
    }
  }

  const footer =
    source === 'share' ? (
      Platform.OS === 'web' ? (
        <>
          <Button label={reading ? 'Reading your rate con…' : 'Choose a screenshot or PDF'} disabled={reading} onPress={() => read(pickFile)} />
        </>
      ) : (
        <>
          <Button label={reading ? 'Reading your rate con…' : 'Choose a screenshot'} disabled={reading} onPress={() => read(pickScreenshot)} />
          <Button label="Choose a PDF" variant="quiet" disabled={reading} onPress={() => read(pickFile)} />
        </>
      )
    ) : (
      <Button label="Continue" onPress={typeIt} />
    );

  return (
    <Screen
      header={<OnboardingBar onBack={() => (router.canGoBack() ? router.back() : router.navigate('/today'))} />}
      footer={footer}
    >
      <T v="h2">{weekly ? 'Set up your weekly stops' : 'Add today’s load'}</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {weekly
          ? 'Share one rate con from your route. Docket keeps the stops and watches them on every run, so you won’t add loads again.'
          : 'Use the rate con dispatch sent. Docket reads the stops for you.'}
      </T>
      <Gap h={24} />
      <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="How to add the load">
        <ChoiceTile
          icon={(c) => <ShareIcon c={c} />}
          label="A screenshot or PDF of the rate con"
          sub="From your dispatch app, a text or an email. Claude reads the stops; the file isn’t kept."
          selected={source === 'share'}
          onPress={() => setSource('share')}
        />
        <ChoiceTile
          icon={(c) => <KeyboardIcon c={c} />}
          label="Type it in yourself"
          sub="Facility names and appointment times"
          selected={source === 'manual'}
          onPress={() => setSource('manual')}
        />
      </View>
    </Screen>
  );
}
