import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { gotFromSettlement, sampleScan, type Claim } from '../logic/claims';
import { sameLoad, type SettlementReading } from '../logic/documents';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { cleanAmount } from '../logic/settlement';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, postDoc, shrinkPhoto, type DocFile } from '../state/readDoc';
import { color, fontFamily, glass, protoColor } from '../theme/tokens';
import { BackBar, Screen } from './Chrome';
import { Chip } from './Chip';
import { CameraIcon, CheckIcon, DocIcon } from './Icons';
import { SampleSettlementPage } from './SampleSettlementPage';
import { useReduceMotion } from './stepMotion';
import { Button, Card, Fake, Gap, noFocusRing, press, Row, T } from './ui';

/** One page to read: the file sent, and what to show of it (a PDF has no picture here). */
interface Page {
  file: DocFile;
  preview: string | null;
}

type Step = 'capture' | 'reading' | 'review';

/**
 * Scanning a settlement, in three steps like the BOL's: photograph each page (or pick the
 * PDF or screenshot from the company's app), watch it read, then check what it found before
 * it counts. The driver can fix any number the read got wrong.
 */
export function SettlementScan({
  label,
  claims,
  onCancel,
  onConfirm,
  onType,
}: {
  label: string;
  claims: Claim[];
  onCancel: () => void;
  /** What the settlement paid each claim (0 = not on it); claims it couldn't look for. */
  onConfirm: (got: Record<string, number>, unmatched: string[]) => void;
  /** Give up on scanning: type the detention total instead. */
  onType: () => void;
}) {
  const { a } = useStore();
  const sample = claims[0].sample;
  const [step, setStep] = useState<Step>('capture');
  const [pages, setPages] = useState<Page[]>([]);
  const [done, setDone] = useState(0); // reading steps finished
  const [got, setGot] = useState<Record<string, number>>({});
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const samplePaid = sampleScan(claims, label);

  async function takePhoto() {
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      if (Platform.OS !== 'web') {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
          const lib = await ImagePicker.launchImageLibraryAsync(opts);
          if (lib.canceled) return;
          return add({ file: await shrinkPhoto(lib.assets[0].uri), preview: lib.assets[0].uri });
        }
      }
      const r = await ImagePicker.launchCameraAsync(opts);
      if (r.canceled) return;
      add({ file: await shrinkPhoto(r.assets[0].uri), preview: r.assets[0].uri });
    } catch {
      a.toast('Couldn’t open the camera.');
    }
  }

  async function chooseFile() {
    try {
      const f = await pickFile();
      if (f) add({ file: f, preview: f.mediaType === 'image/jpeg' ? `data:image/jpeg;base64,${f.base64}` : null });
    } catch (e) {
      a.toast(e instanceof DocReadError ? e.message : 'Couldn’t open that file.');
    }
  }

  const add = (p: Page) => setPages((ps) => [...ps, p]);

  async function read() {
    setStep('reading');
    setDone(0);
    if (sample) {
      // The sample has no real page to send: it reads the drawn one back, at a readable pace.
      for (let i = 1; i <= 3; i++) {
        await wait(650);
        setDone(i);
      }
      setGot(samplePaid);
      setUnmatched([]);
      await wait(350);
      setStep('review');
      return;
    }
    try {
      const lines: SettlementReading['loads'] = [];
      let found = false;
      let note = '';
      for (const p of pages) {
        const r = await postDoc<SettlementReading>('read-settlement', p.file, 'settlement');
        found = found || r.found;
        note = note || r.note;
        lines.push(...r.loads);
      }
      setDone(1);
      if (!found) {
        a.toast(note || 'No loads found on that page. Type the detention total instead.');
        setStep('capture');
        return;
      }
      const m = gotFromSettlement(claims, lines, sameLoad);
      setDone(2);
      setGot(m.got);
      setUnmatched(m.unmatched);
      setDone(3);
      setStep('review');
    } catch (e) {
      a.toast(e instanceof DocReadingOff || e instanceof DocReadError ? e.message : 'Couldn’t read the settlement. Try again, or type the total.');
      setStep('capture');
    }
  }

  const n = sample ? 1 : pages.length;
  const pageArt = (highlight = false) =>
    sample ? (
      <SampleSettlementPage label={label} claims={claims} paid={samplePaid} highlight={highlight} />
    ) : pages.length ? (
      <PageView page={pages[pages.length - 1]} />
    ) : null;

  if (step === 'reading') {
    const steps = [`Reading ${n} page${n === 1 ? '' : 's'}`, 'Finding your load numbers', 'Matching detention to your claims'];
    return (
      <Screen header={<BackBar label="Back" onPress={() => setStep('capture')} />}>
        <T v="h2">Reading your settlement</T>
        <Gap h={8} />
        <T v="body" c={color.sub}>Looking for the detention on each load you claimed.</T>
        <Gap h={20} />
        <View style={[styles.frame, styles.portraitSmall]}>
          {pageArt()}
          <ScanLine />
        </View>
        <Gap h={16} />
        <Card>
          {steps.map((t, i) => (
            <View key={t} style={styles.stepRow}>
              <View style={[styles.dot, i < done && styles.dotDone, i === done && styles.dotNow]}>
                {i < done ? <CheckIcon c={color.ink} size={12} /> : null}
              </View>
              <T v="bodySmall" c={i <= done ? color.ink : color.sub}>{t}</T>
            </View>
          ))}
        </Card>
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Review
        label={label}
        claims={claims}
        got={got}
        unmatched={unmatched}
        art={pageArt(true)}
        sample={sample}
        onFix={(id, v) => setGot((g) => ({ ...g, [id]: v }))}
        onAgain={() => {
          setPages([]);
          setStep('capture');
        }}
        onConfirm={() => onConfirm(got, unmatched)}
      />
    );
  }

  // Capture.
  const has = sample || pages.length > 0;
  return (
    <Screen
      header={<BackBar label="Back" onPress={onCancel} />}
      footer={
        has ? (
          <>
            <Button label={sample ? 'Read the sample settlement' : `Read ${n} page${n === 1 ? '' : 's'}`} onPress={read} />
            {sample ? null : <Button label="Add another page" variant="quiet" icon={<CameraIcon />} onPress={takePhoto} />}
          </>
        ) : (
          <>
            <Button label="Take a photo" icon={<CameraIcon c={color.bg} />} onPress={takePhoto} />
            <Button label="Choose a PDF or screenshot" variant="quiet" onPress={chooseFile} />
          </>
        )
      }
    >
      <T v="bodySmall">{label} settlement</T>
      <Gap h={8} />
      <T v="h2">Scan your settlement</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {sample
          ? 'This is a made-up settlement for the sample week. On your own, you photograph each page, or pick the PDF from your company’s app.'
          : 'Photograph each page, flat and in good light, or pick the PDF or screenshot from your company’s app.'}
      </T>
      <Gap h={24} />
      {sample ? (
        <View style={[styles.frame, styles.portrait]}>
          {pageArt()}
          <View style={styles.sampleTag}>
            <Fake label="Sample data" />
          </View>
        </View>
      ) : pages.length ? (
        <>
          <View style={[styles.frame, styles.portrait]}>{pageArt()}</View>
          <Gap h={12} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {pages.map((p, i) => (
              <View key={i} style={styles.thumb}>
                <PageView page={p} />
                <View style={styles.thumbNo}>
                  <Text style={styles.thumbNoText}>{i + 1}</Text>
                </View>
              </View>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Choose a PDF or screenshot" onPress={chooseFile} style={({ pressed }) => [styles.thumb, styles.thumbAdd, pressed && press.give]}>
              <DocIcon />
              <T v="bodyTiny">File</T>
            </Pressable>
          </ScrollView>
          <Gap h={4} />
          <Pressable accessibilityRole="button" onPress={() => setPages((ps) => ps.slice(0, -1))} hitSlop={8} style={({ pressed }) => [styles.left, pressed && press.link]}>
            <T v="bodyTiny" style={styles.under}>Remove the last page</T>
          </Pressable>
        </>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Take a photo of your settlement" onPress={takePhoto} style={({ pressed }) => [styles.frame, styles.portraitSmall, pressed && press.give]}>
          <View style={[StyleSheet.absoluteFill, styles.empty]}>
            <CameraIcon />
            <T v="bodySmall">Tap to take a photo</T>
          </View>
        </Pressable>
      )}
      <Gap h={12} />
      <Card>
        <T v="bodySmall" c={color.ink}>
          The pages are sent once to an AI (Claude) to read the detention lines. They aren’t stored, and your company never sees them.
        </T>
      </Card>
      <Gap h={16} />
      <Button label="Type the detention total instead" variant="text" onPress={onType} />
    </Screen>
  );
}

/** Check what the read found, load by load, and fix anything it got wrong, before it counts. */
function Review({
  label,
  claims,
  got,
  unmatched,
  art,
  sample,
  onFix,
  onAgain,
  onConfirm,
}: {
  label: string;
  claims: Claim[];
  got: Record<string, number>;
  unmatched: string[];
  art: React.ReactNode;
  sample: boolean;
  onFix: (id: string, v: number) => void;
  onAgain: () => void;
  onConfirm: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [amt, setAmt] = useState('');
  const found = claims.filter((c) => !unmatched.includes(c.id));
  const total = found.reduce((t, c) => t + (got[c.id] ?? 0), 0);
  const open = (c: Claim) => {
    setEditing(c.id);
    setAmt(got[c.id] ? got[c.id].toFixed(2) : '');
  };
  const save = (id: string, v: number) => {
    onFix(id, Math.max(0, Math.round(v * 100) / 100));
    setEditing(null);
  };
  return (
    <Screen
      header={<BackBar label="Back" onPress={onAgain} />}
      footer={
        <>
          <Button label="Looks right" onPress={onConfirm} />
          <Button label="Scan again" variant="text" onPress={onAgain} />
        </>
      }
    >
      <T v="bodySmall">{label} settlement</T>
      <Gap h={8} />
      <T v="h2">Check what it found</T>
      <Gap h={8} />
      <T v="body" c={color.sub}>
        {money(total)} of detention for your claims. If a number’s wrong, tap the load to fix it.
      </T>
      <Gap h={20} />
      {art ? (
        <>
          <View style={[styles.frame, styles.portraitSmall]}>{art}</View>
          {sample ? (
            <>
              <Gap h={6} />
              <T v="bodyTiny">Highlighted: the detention lines it read.</T>
            </>
          ) : null}
          <Gap h={16} />
        </>
      ) : null}
      <Card>
        {claims.map((c, i) => {
          const no = loadNo(c.load);
          const miss = unmatched.includes(c.id);
          const v = got[c.id] ?? 0;
          return (
            <View key={c.id}>
              {i ? <View style={styles.rule} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Fix ${c.load.name}`}
                disabled={miss}
                onPress={() => (editing === c.id ? setEditing(null) : open(c))}
                style={({ pressed }) => [styles.loadRow, pressed && press.give]}
              >
                <Row base>
                  <View style={styles.flex}>
                    <T v="bodyStrong">{c.load.name}</T>
                    {no ? <T v="bodyTiny">Load {no}</T> : null}
                    <T v="bodyTiny">Claimed {money(c.left)}</T>
                  </View>
                  {miss ? (
                    <Chip text="No load number" />
                  ) : v > 0 ? (
                    <Chip text={`Detention ${money(v)}`} tone={v >= c.left - 0.005 ? 'lime' : 'plain'} />
                  ) : (
                    <Chip text="Not on it" tone="flag" />
                  )}
                </Row>
              </Pressable>
              {editing === c.id ? (
                <View style={styles.edit}>
                  <T v="bodyTiny">What the settlement shows for this load</T>
                  <View style={styles.amount}>
                    <Text style={styles.amountLabel}>$</Text>
                    <TextInput
                      value={amt}
                      onChangeText={(t) => setAmt(cleanAmount(t))}
                      placeholder="0.00"
                      placeholderTextColor={color.sub}
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      autoFocus
                      style={styles.amountInput}
                      accessibilityLabel={`Detention for ${c.load.name}`}
                      onSubmitEditing={() => save(c.id, parseFloat(amt) || 0)}
                    />
                  </View>
                  <Row style={styles.pair}>
                    <Button label="Not on it" variant="white" small style={styles.flex} onPress={() => save(c.id, 0)} />
                    <Button label="Save" small style={styles.flex} onPress={() => save(c.id, parseFloat(amt) || 0)} />
                  </Row>
                </View>
              ) : null}
              {miss ? <T v="bodyTiny" style={styles.missNote}>It has no load number to look for. It stays open for the next check.</T> : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

/** A page as picked: the photo or screenshot, or a PDF tile. */
function PageView({ page }: { page: Page }) {
  return page.preview ? (
    <Image source={{ uri: page.preview }} style={styles.img} accessibilityLabel="Settlement page" />
  ) : (
    <View style={styles.pdf}>
      <DocIcon />
      <T v="bodyTiny">PDF</T>
    </View>
  );
}

/** The read passing down the page. Still, for reduced motion. */
function ScanLine() {
  const reduce = useReduceMotion();
  const [y] = useState(() => new Animated.Value(0));
  const [h, setH] = useState(0);
  useEffect(() => {
    if (reduce || !h) return;
    const run = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    run.start();
    return () => run.stop();
  }, [reduce, h, y]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: protoColor.scrim, opacity: 0.18 }]} />
      {reduce ? null : (
        <Animated.View style={[styles.beam, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, h - 3)] }) }] }]} />
      )}
    </View>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  flex: { flex: 1 },
  left: { alignSelf: 'flex-start' },
  under: { textDecorationLine: 'underline' },
  frame: { width: '100%', borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', ...glass },
  portrait: { aspectRatio: 3 / 4 },
  portraitSmall: { aspectRatio: 4 / 3 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  pdf: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: color.raise },
  sampleTag: { position: 'absolute', right: 12, bottom: 12 },
  thumbs: { gap: 8 },
  thumb: { width: 54, height: 72, borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.raise },
  thumbAdd: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  thumbNo: { position: 'absolute', left: 4, bottom: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  thumbNoText: { fontFamily: fontFamily.semibold, fontSize: 10, color: color.bg },
  beam: { position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: color.signal },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  dotNow: { borderColor: color.ink },
  dotDone: { backgroundColor: color.signal, borderColor: color.signal },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  loadRow: { paddingVertical: 12 },
  edit: { paddingBottom: 14, gap: 10 },
  pair: { gap: 8 },
  missNote: { paddingBottom: 12 },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: color.bg,
  },
  amountLabel: { fontFamily: fontFamily.regular, fontSize: 17, color: color.sub },
  amountInput: { flex: 1, minWidth: 0, fontFamily: fontFamily.regular, fontSize: 17, color: color.ink, ...noFocusRing },
});
