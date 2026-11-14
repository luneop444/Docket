import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { OnboardingBar, Screen } from '../components/Chrome';
import { Button, Fake, Gap, Option, T } from '../components/ui';
import { loadFromRateCon, type RateConReading } from '../logic/documents';
import { RECENT_STOPS } from '../logic/sampleData';
import { setsStopsOnce } from '../logic/state';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, pickScreenshot, postDoc, type DocFile } from '../state/readDoc';
import { color } from '../theme/tokens';

type Source = 'share' | 'email' | 'manual';

/**
 * Figma B1 Add a load: share it the way it came in, no typing addresses.
 * Dedicated-route drivers see the same screen once, to set up their weekly stops.
 */
export default function AddLoad() {
  const { s, a } = useStore();
  const weekly = setsStopsOnce(s.loadStyle);
  const [source, setSource] = useState<Source>('share');
  const [reading, setReading] = useState(false);
  const sample = () => router.push({ pathname: '/check-stops', params: { source: 'share' } });

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
        // No API key on this site (or the local dev server): show the labeled sample load instead.
        a.toast('Reading is off here, so this is a sample load.');
        sample();
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
          <Button label="Use a sample load" variant="text" disabled={reading} onPress={sample} />
        </>
      ) : (
        <>
          <Button label={reading ? 'Reading your rate con…' : 'Choose a screenshot'} disabled={reading} onPress={() => read(pickScreenshot)} />
          <Button label="Choose a PDF" variant="quiet" disabled={reading} onPress={() => read(pickFile)} />
          <Button label="Use a sample load" variant="text" disabled={reading} onPress={sample} />
        </>
      )
    ) : (
      <Button label="Continue" onPress={() => router.push({ pathname: '/check-stops', params: { source } })} />
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
          : 'Share it the way dispatch sent it. Docket reads the stops for you.'}
      </T>
      <Gap h={20} />
      <View style={{ gap: 8 }}>
        <Option
          radio
          label="Share from your dispatch app or a text"
          sub="Tap Share, then Docket. Screenshots work too."
          selected={source === 'share'}
          onPress={() => setSource('share')}
        />
        <Option
          radio
          label="Forward the rate con email"
          sub="Send it to loads@docket.app"
          selected={source === 'email'}
          onPress={() => setSource('email')}
        />
        <Option
          radio
          label="Type it in yourself"
          sub="Facility names and appointment times. Takes a minute."
          selected={source === 'manual'}
          onPress={() => setSource('manual')}
        />
      </View>
      <Gap h={16} />
      {weekly ? null : <T v="bodyTiny">Been here before? Pick a recent stop: {RECENT_STOPS.join(', ')}.</T>}
      <Gap h={20} />
      {source === 'share' ? (
        <T v="bodyTiny">
          <Fake /> The prototype can’t receive a share yet, so choose the screenshot or PDF instead. Claude reads the
          stops off it. The file isn’t saved.
        </T>
      ) : source === 'email' ? (
        <T v="bodyTiny">
          <Fake /> Continue stands in for receiving a forwarded rate con. Docket fills in a sample load.
        </T>
      ) : null}
    </Screen>
  );
}
