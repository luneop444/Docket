import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { gotFromSettlement, sampleScan, type Claim } from '../logic/claims';
import { sameLoad, type SettlementReading } from '../logic/documents';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { cleanAmount } from '../logic/settlement';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, postDoc, shrinkPhoto, type DocFile } from '../state/readDoc';
import { color, fontFamily, glass } from '../theme/tokens';
import { BackBar, Screen } from './Chrome';
import { Chip } from './Chip';
import { DocIcon } from './Icons';
import { SampleSettlementPage } from './SampleSettlementPage';
import { Scanner } from './Scanner';
import { Button, Card, Gap, noFocusRing, press, Row, T } from './ui';

/** One page to read: the file sent, and what to show of it (a PDF has no picture here). */
interface Page {
  /** Null for the sample's drawn page, which has nothing to send. */
  file: DocFile | null;
  preview: string | null;
}

type Step = 'capture' | 'reading' | 'found' | 'review';

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
}: {
  label: string;
  claims: Claim[];
  onCancel: () => void;
  /** What the settlement paid each claim (0 = not on it); claims it couldn't look for. */
  onConfirm: (got: Record<string, number>, unmatched: string[]) => void;
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
      setStep('found');
      return;
    }
    try {
      const lines: SettlementReading['loads'] = [];
      let found = false;
      let note = '';
      for (const p of pages) {
        if (!p.file) continue;
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
      await wait(350);
      setStep('found');
    } catch (e) {
      a.toast(e instanceof DocReadingOff || e instanceof DocReadError ? e.message : 'Couldn’t read the settlement. Try again, or type the total.');
      setStep('capture');
    }
  }

  const shown = usePercent(step === 'reading' ? done : 3);
  const pageArt = (highlight = false) =>
    sample ? (
      <SampleSettlementPage label={label} claims={claims} paid={samplePaid} highlight={highlight} />
    ) : pages.length ? (
      <PageView page={pages[pages.length - 1]} />
    ) : null;

  if (step === 'reading' || step === 'found') {
    return (
      <Scanner
        stage={step}
        title={`${label} settlement`}
        sample={sample}
        samplePage={<SampleSettlementPage label={label} claims={claims} paid={samplePaid} highlight={step === 'found'} />}
        pages={pages}
        progress={{ pct: shown, text: READING[Math.min(done, READING.length - 1)] }}
        sheet={
          <Found
            label={label}
            claims={claims}
            got={got}
            unmatched={unmatched}
            onFix={() => setStep('review')}
            onConfirm={() => onConfirm(got, unmatched)}
          />
        }
        onShot={() => {}}
        onFallback={() => {}}
        onFile={() => {}}
        onDone={() => {}}
        onClose={() => {
          setPages([]);
          setStep('capture');
        }}
      />
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
        onBack={() => setStep('found')}
        onAgain={() => {
          setPages([]);
          setStep('capture');
        }}
        onConfirm={() => onConfirm(got, unmatched)}
      />
    );
  }

  // Capture: the full-screen scanner.
  return (
    <Scanner
      title={`${label} settlement`}
      sample={sample}
      samplePage={<SampleSettlementPage label={label} claims={claims} paid={samplePaid} />}
      pages={pages}
      onShot={(shot) => add(shot === 'sample' ? { file: null, preview: null } : shot)}
      onFallback={takePhoto}
      onFile={sample ? () => a.toast('The sample has no file to pick. Use the shutter.') : chooseFile}
      onDone={read}
      onClose={onCancel}
    />
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
  onBack,
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
  onBack: () => void;
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
      header={<BackBar label="Back" onPress={onBack} />}
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

const READING = ['Reading the page', 'Finding your loads', 'Matching detention', 'Matching detention'];

/**
 * A percent that keeps moving while the read works: it creeps toward the end of the current
 * step and jumps when a step finishes, so it never sits still and never claims 100 early.
 */
function usePercent(done: number) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const cap = done >= 3 ? 100 : Math.round(((done + 1) / 3) * 100) - 4;
    const id = setInterval(() => setPct((p) => (done === 0 && p > cap ? 0 : p >= cap ? p : Math.min(cap, p + Math.max(1, Math.round((cap - p) / 6))))), 60);
    return () => clearInterval(id);
  }, [done]);
  return pct;
}

/**
 * What the read found, on a light sheet over the page: the answer first (how much short, or
 * all paid), then each load as read, so the driver can hold it against the paper. Nothing
 * counts until "Looks right".
 */
function Found({
  label,
  claims,
  got,
  unmatched,
  onFix,
  onConfirm,
}: {
  label: string;
  claims: Claim[];
  got: Record<string, number>;
  unmatched: string[];
  onFix: () => void;
  onConfirm: () => void;
}) {
  const found = claims.filter((c) => !unmatched.includes(c.id));
  const paid = found.reduce((t, c) => t + Math.min(got[c.id] ?? 0, c.left), 0);
  const short = Math.round(found.reduce((t, c) => t + Math.max(0, c.left - (got[c.id] ?? 0)), 0) * 100) / 100;
  const shortOn = found.filter((c) => (got[c.id] ?? 0) < c.left - 0.005);
  const which = shortOn.length === 1 ? (loadNo(shortOn[0].load) ? `load ${loadNo(shortOn[0].load)}` : shortOn[0].load.name) : `${shortOn.length} loads`;
  return (
    <View style={styles.sheet}>
      <T v="bodyStrong">{label} settlement</T>
      <T v="bodyTiny">Detention read from the page</T>
      <Gap h={14} />
      <View style={styles.hero}>
        {short > 0 ? (
          <>
            <T v="numberL">{money(short)}</T>
            <T v="bodySmall" c={color.flag} style={styles.heroNote}>short on {which}</T>
          </>
        ) : (
          <>
            <T v="numberL">{money(paid)}</T>
            <T v="bodySmall" style={styles.heroNote}>all paid</T>
          </>
        )}
      </View>
      <Gap h={14} />
      <ScrollView style={styles.sheetRows} bounces={false}>
        {claims.map((c, i) => {
          const miss = unmatched.includes(c.id);
          const v = got[c.id] ?? 0;
          const no = loadNo(c.load);
          return (
            <View key={c.id}>
              {i ? <View style={styles.rule} /> : null}
              <Row base style={styles.foundRow}>
                <View style={styles.flex}>
                  <T v="bodyStrong" numberOfLines={1}>{c.load.name}</T>
                  <T v="bodyTiny">{no ? `Load ${no} · ` : ''}claimed {money(c.left)}</T>
                </View>
                {miss ? (
                  <Chip text="No load number" />
                ) : v >= c.left - 0.005 ? (
                  <Chip text={money(v)} tone="lime" />
                ) : v > 0 ? (
                  <Chip text={`${money(v)} of ${money(c.left)}`} tone="flag" />
                ) : (
                  <Chip text="Not on it" tone="flag" />
                )}
              </Row>
            </View>
          );
        })}
      </ScrollView>
      <Gap h={16} />
      <Row style={styles.pair}>
        <Button label="Fix a row" variant="white" style={styles.flex} onPress={onFix} />
        <Button label="Looks right" style={styles.flex} onPress={onConfirm} />
      </Row>
    </View>
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const styles = StyleSheet.create({
  flex: { flex: 1 },
  frame: { width: '100%', borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', ...glass },
  portrait: { aspectRatio: 3 / 4 },
  portraitSmall: { aspectRatio: 4 / 3 },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  pdf: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: color.raise },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  loadRow: { paddingVertical: 12 },
  edit: { paddingBottom: 14, gap: 10 },
  pair: { gap: 8 },
  missNote: { paddingBottom: 12 },
  sheet: {
    borderRadius: 36,
    borderCurve: 'continuous',
    padding: 22,
    paddingBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 -8px 40px rgba(0,0,0,0.28), inset 0 0 0 0.5px rgba(255,255,255,0.6)' } as object)
      : null),
  },
  hero: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  heroNote: { flexShrink: 1 },
  sheetRows: { maxHeight: 210, flexGrow: 0 },
  foundRow: { paddingVertical: 10 },
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
