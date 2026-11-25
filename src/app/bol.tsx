import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { RiseCtx } from '../components/backdrop';
import { BackBar, Screen, useInsets } from '../components/Chrome';
import { Chip } from '../components/Chip';
import type { Shot } from '../components/ScanViewfinder';
import { Scanner } from '../components/Scanner';
import { Button, Card, Gap, Row, T } from '../components/ui';
import { clock, dur } from '../logic/format';
import { placeOf } from '../logic/state';
import { bolFromReading, type BolTimes } from '../logic/stop';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, postDoc, shrinkPhoto, type DocFile } from '../state/readDoc';
import type { BolReading } from '../state/readBol';
import { color, radius } from '../theme/tokens';

/** Within this many minutes, the BOL and location times agree (the summary uses the same line). */
const AGREE_MIN = 15;

type Step = 'start' | 'capture' | 'reading' | 'found';
interface Page {
  file: DocFile;
  preview: string | null;
}

const READING = ['Reading the page', 'Finding the times', 'Checking them', 'Checking them'];

/**
 * Snap the signed BOL, opened from the island when the geofence sees you leave. Optional. Built
 * like the settlement scan (Edward, 25 Nov): a short page with what it checks against and the
 * way out, then the full-screen scanner; the photo reads straight away and the times come up on
 * a sheet over it, next to your location times, before they count. The old page had a big empty
 * photo box that did the same thing as the Take photo button, and a privacy card the scanner
 * already says in one line.
 */
export default function SnapBol() {
  const { s, a } = useStore();
  const [step, setStep] = useState<Step>('start');
  const [page, setPage] = useState<Page | null>(null);
  const [done, setDone] = useState(0);
  const [times, setTimes] = useState<BolTimes | null>(null);
  const shown = usePercent(step === 'reading' ? done : 3);
  const place = placeOf(s.load).short;
  const arrive = s.stop.arrive;
  const leave = s.stop.leave ?? s.now;

  function finish(bol: boolean, t?: BolTimes) {
    a.logStop(bol, t);
    router.replace('/summary');
  }

  async function read(p: Page) {
    setPage(p);
    setStep('reading');
    setDone(0);
    try {
      const r = await postDoc<BolReading>('read-bol', p.file, 'BOL');
      setDone(1);
      if (!r.found || (!r.in && !r.out)) {
        a.toast(r.note || 'No times found on that page. Try again, or skip.');
        setPage(null);
        setStep('capture');
        return;
      }
      setTimes(bolFromReading(s.stop, { in: r.in ?? null, out: r.out ?? null, note: r.note ?? '' }));
      setDone(2);
      await wait(250);
      setDone(3);
      await wait(350);
      setStep('found');
    } catch (e) {
      if (e instanceof DocReadingOff) {
        // No API key on this site. The photo still counts; a prototype stop shows its labeled sample reading.
        if (s.stop.live) a.toast('Photo saved. Reading the times is off on this site.');
        return finish(true);
      }
      a.toast(e instanceof DocReadError ? e.message : 'Couldn’t read the BOL. Try again, or skip.');
      setPage(null);
      setStep('capture');
    }
  }

  async function takePhoto() {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      if (Platform.OS !== 'web') {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
          const lib = await ImagePicker.launchImageLibraryAsync(opts);
          if (lib.canceled) return;
          return read({ file: await shrinkPhoto(lib.assets[0].uri), preview: lib.assets[0].uri });
        }
      }
      const r = await ImagePicker.launchCameraAsync(opts);
      if (r.canceled) return;
      read({ file: await shrinkPhoto(r.assets[0].uri), preview: r.assets[0].uri });
    } catch {
      a.toast('Couldn’t open the camera.');
    }
  }

  async function chooseFile() {
    try {
      const f = await pickFile();
      if (f) read({ file: f, preview: f.mediaType === 'image/jpeg' ? `data:image/jpeg;base64,${f.base64}` : null });
    } catch (e) {
      a.toast(e instanceof DocReadError ? e.message : 'Couldn’t open that file.');
    }
  }

  if (step !== 'start') {
    const pages = page ? [page] : [];
    return (
      <Scanner
        stage={step === 'capture' ? 'capture' : step}
        title="Bill of lading"
        pageLabel="Your bill of lading"
        sample={false}
        samplePage={null}
        pages={pages}
        progress={{ pct: shown, text: READING[Math.min(done, READING.length - 1)] }}
        sheet={
          times ? (
            <Found
              times={times}
              arrive={arrive}
              leave={leave}
              onRetake={() => {
                setPage(null);
                setTimes(null);
                setStep('capture');
              }}
              onConfirm={() => finish(true, times)}
            />
          ) : null
        }
        onShot={(shot: Shot | 'sample') => shot !== 'sample' && read(shot)}
        onFallback={takePhoto}
        onFile={chooseFile}
        onDone={() => page && read(page)}
        onClose={() => {
          setPage(null);
          setTimes(null);
          setStep(step === 'capture' ? 'start' : 'capture');
        }}
      />
    );
  }

  return (
    <Screen header={<BackBar label="Today" onPress={() => router.navigate('/today')} />}>
      <T v="bodySmall">You left {place} at {clock(leave)}</T>
      <Gap h={8} />
      <T v="h2">Scan your bill of lading</T>
      <Gap h={8} />
      <T v="bodySmall">Docket checks the in and out times the facility wrote against your location times.</T>
      <Gap h={16} />
      <Card>
        <Row base style={styles.timeRow}>
          <T v="bodyStrong" style={styles.flex}>Arrived</T>
          <T v="bodyStrong">{arrive != null ? clock(arrive) : 'Not timed'}</T>
        </Row>
        <View style={styles.rule} />
        <Row base style={styles.timeRow}>
          <T v="bodyStrong" style={styles.flex}>Left</T>
          <T v="bodyStrong">{clock(leave)}</T>
        </Row>
      </Card>
      <Gap h={24} />
      <Button label="Scan the BOL" onPress={() => setStep('capture')} />
      <Gap h={8} />
      <T v="bodyTiny" style={styles.center}>Claude reads the times. The photo isn’t kept.</T>
      <Gap h={16} />
      <Button label="Skip, use my location times" variant="quiet" onPress={() => finish(false)} />
    </Screen>
  );
}

/** The times read, on a light sheet over the photo, each next to your location time. */
function Found({
  times,
  arrive,
  leave,
  onRetake,
  onConfirm,
}: {
  times: BolTimes;
  arrive: number | null | undefined;
  leave: number;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  const ready = useContext(RiseCtx) ?? undefined;
  const { footerBottom } = useInsets();
  const { height } = useWindowDimensions();
  const gaps = [
    times.in != null && arrive != null ? Math.abs(times.in - arrive) : null,
    times.out != null ? Math.abs(times.out - leave) : null,
  ].filter((g): g is number => g != null);
  const off = gaps.length ? Math.max(...gaps) : null;
  const rows: { label: string; bol: number | null; mine: number | null | undefined }[] = [
    { label: 'In', bol: times.in, mine: arrive },
    { label: 'Out', bol: times.out, mine: leave },
  ];
  return (
    // Solid white like the settlement's result sheet: it's numbers to check, not chrome.
    <View style={[styles.sheet, { paddingBottom: footerBottom + 8, maxHeight: height * 0.78 }]} onLayout={() => ready?.()}>
      <T v="bodyStrong">Bill of lading</T>
      <T v="bodyTiny">Times read from the page</T>
      <Gap h={16} />
      {off == null ? null : off <= AGREE_MIN ? (
        <Chip text="Matches your times" tone="lime" />
      ) : (
        <Chip text={`Off by ${dur(off)}`} tone="flag" />
      )}
      <Gap h={8} />
      {rows.map((r, i) => (
        <View key={r.label}>
          {i ? <View style={styles.rule} /> : null}
          <Row base style={styles.timeRow}>
            <View style={styles.flex}>
              <T v="bodyStrong">{r.label}</T>
              <T v="bodyTiny">{r.mine != null ? `Your location: ${clock(r.mine)}` : 'No location time'}</T>
            </View>
            {r.bol != null ? <T v="bodyStrong">{clock(r.bol)}</T> : <Chip text="Not on it" />}
          </Row>
        </View>
      ))}
      <Gap h={16} />
      <Row style={styles.pair}>
        <Button label="Retake" variant="quiet" style={styles.flex} onPress={onRetake} />
        <Button label="Use these times" style={styles.flex} onPress={onConfirm} />
      </Row>
    </View>
  );
}

/** A percent that keeps moving while it reads, and lands on 100 when it's done. */
function usePercent(done: number) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const cap = done >= 3 ? 100 : Math.round(((done + 1) / 3) * 100) - 4;
    const id = setInterval(() => setPct((p) => (done === 0 && p > cap ? 0 : p >= cap ? p : Math.min(cap, p + Math.max(1, Math.round((cap - p) / 6))))), 60);
    return () => clearInterval(id);
  }, [done]);
  return pct;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  timeRow: { paddingVertical: 12 },
  pair: { gap: 8 },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    paddingTop: 24,
    paddingHorizontal: 20,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.095)',
  },
});
