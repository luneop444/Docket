import * as ImagePicker from 'expo-image-picker';
import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, type GestureResponderEvent, Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { gotFromSettlement, sampleScan, type Claim } from '../logic/claims';
import { sameLoad, type SettlementReading } from '../logic/documents';
import { money } from '../logic/format';
import { loadNo } from '../logic/sampleData';
import { AmountField } from './AmountField';
import { useStore } from '../state/AppStore';
import { DocReadError, DocReadingOff, pickFile, postDoc, shrinkPhoto, type DocFile } from '../state/readDoc';
import { color, glass, radius } from '../theme/tokens';
import { RiseCtx } from './backdrop';
import { useReduceMotion } from './stepMotion';
import { BackBar, Screen, useInsets } from './Chrome';
import { Chip } from './Chip';
import { DocIcon } from './Icons';
import { SampleSettlementPage } from './SampleSettlementPage';
import { Scanner } from './Scanner';
import { Button, Card, Gap, Row, T } from './ui';
import { Tappable } from './Tappable';

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
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`Fix ${c.load.name}`}
                disabled={miss}
                onPress={() => (editing === c.id ? setEditing(null) : open(c))}
                style={[styles.loadRow]}
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
              </Tappable>
              {editing === c.id ? (
                <View style={styles.edit}>
                  <T v="bodyTiny">What the settlement shows for this load</T>
                  <AmountField
                    value={amt}
                    onChange={setAmt}
                    label={`Detention for ${c.load.name}`}
                    autoFocus
                    onSubmit={() => save(c.id, parseFloat(amt) || 0)}
                  />
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


/**
 * Pull the result sheet down to look at the statement behind it, and back up. It settles at one
 * of two places: open, or down to a peek of its title and amount. It follows the finger, and on
 * release goes the way it was flicked, or to the nearer place if it wasn't. Tapping the grabber
 * does the same. Under Reduce Motion it moves straight to the place.
 */
function usePullDown() {
  const reduce = useReduceMotion();
  const [y] = useState(() => new Animated.Value(0));
  const [down, setDown] = useState(false);
  // Sizes, where it sits, and the drag in progress: read and written only in handlers.
  const room = useRef({ h: 0, peek: 0, at: 0 });
  const drag = useRef({ y0: 0, y: 0, t: 0, v: 0 });
  const travel = () => Math.max(0, room.current.h - room.current.peek);
  const go = (toDown: boolean) => {
    const to = toDown ? travel() : 0;
    room.current.at = to;
    setDown(toDown);
    if (reduce) y.setValue(to);
    else Animated.spring(y, { toValue: to, friction: 12, tension: 90, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const handlers = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      const py = e.nativeEvent.pageY;
      drag.current = { y0: py, y: py, t: e.nativeEvent.timestamp, v: 0 };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const { pageY, timestamp } = e.nativeEvent;
      const d = drag.current;
      const dt = Math.max(1, timestamp - d.t);
      d.v = (pageY - d.y) / dt;
      d.y = pageY;
      d.t = timestamp;
      const t = travel();
      let v = room.current.at + (pageY - d.y0);
      // Past either end it gives a little, like a rubber band, instead of stopping dead.
      if (v < 0) v = v / 4;
      if (v > t) v = t + (v - t) / 4;
      y.setValue(v);
    },
    onResponderRelease: () => {
      const d = drag.current;
      const moved = d.y - d.y0;
      if (Math.abs(moved) < 4) return;
      const v = room.current.at + moved;
      go(Math.abs(d.v) > 0.3 ? d.v > 0 : v > travel() / 2);
    },
    onResponderTerminate: () => go(room.current.at > 0),
  };
  return {
    y,
    down,
    handlers,
    toggle: () => go(!down),
    setHeight: (h: number) => {
      room.current.h = h;
    },
    setPeek: (p: number) => {
      room.current.peek = p;
    },
  };
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
  // Nothing to wait for (no glass to draw): it rises as soon as it's laid out.
  const ready = useContext(RiseCtx) ?? undefined;
  const { footerBottom } = useInsets();
  const { height } = useWindowDimensions();
  const pull = usePullDown();
  return (
    // Solid white, like the app's other sheets, not glass: this is the read's result, numbers
    // to check, so it's content (Apple HIG, Materials: no Liquid Glass in the content layer).
    // As glass, the statement's own lines showed through behind the rows being read.
    <Animated.View
      style={[styles.sheet, { paddingBottom: footerBottom + 8, maxHeight: height * 0.78, transform: [{ translateY: pull.y }] }]}
      onLayout={(e) => {
        pull.setHeight(e.nativeEvent.layout.height);
        ready?.();
      }}
    >
      {/* The top of the sheet is its handle: drag it down to see the whole statement. */}
      <View {...pull.handlers} style={styles.handle} onLayout={(e) => pull.setPeek(e.nativeEvent.layout.y + e.nativeEvent.layout.height + footerBottom + 8)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pull.down ? 'Show the result' : 'Show the whole statement'}
          onPress={pull.toggle}
          hitSlop={12}
          style={styles.grabberHit}
        >
          <View style={styles.grabber} />
        </Pressable>
        <T v="bodyStrong">{label} settlement</T>
        <T v="bodyTiny">Detention read from the page</T>
        <Gap h={16} />
      <View style={styles.hero}>
        {short > 0 ? (
          <>
            <T v="numberL">{money(short)}</T>
            <Chip text={`Short on ${which}`} tone="flag" />
          </>
        ) : (
          <>
            <T v="numberL">{money(paid)}</T>
            <Chip text="All paid" tone="lime" />
          </>
        )}
      </View>
      </View>
      <Gap h={16} />
      <ScrollView style={styles.sheetRows} bounces={false} showsVerticalScrollIndicator={false}>
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
                  <T v="bodyTiny" numberOfLines={1}>{no ? `Load ${no} · ` : ''}claimed {money(c.left)}</T>
                </View>
                {miss ? (
                  <Chip text="No load number" />
                ) : v >= c.left - 0.005 ? (
                  <Chip text={money(v)} tone="lime" />
                ) : v > 0 ? (
                  // The claim is already on the left; the chip only says what came.
                  <Chip text={`${money(v)} paid`} tone="flag" />
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
        <Button label="Fix a row" variant="quiet" style={styles.flex} onPress={onFix} />
        <Button label="Looks right" style={styles.flex} onPress={onConfirm} />
      </Row>
    </Animated.View>
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
  hero: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  // The handle: dragging it mustn't select its text instead (a mouse on the laptop).
  handle: { userSelect: 'none' } as object,
  // iOS's sheet grabber: 36 × 5, centred, 8 from the top edge.
  grabberHit: { alignSelf: 'center', paddingVertical: 8, marginTop: -16, marginBottom: 8 },
  grabber: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(28,28,28,0.2)' },
  // The rows take the room they need; only a long list (past 78% of the screen) scrolls.
  sheetRows: { flexGrow: 0, flexShrink: 1 },
  // A bottom sheet: full width, on the bottom edge, rounded only on top (the phone's corners
  // finish the bottom), its shadow cast upward onto the page.
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    paddingTop: 24,
    paddingHorizontal: 20,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.095)',
  },
  foundRow: { paddingVertical: 12 },
});
