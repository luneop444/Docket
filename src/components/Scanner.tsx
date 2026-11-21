import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { squircleExtent } from '../logic/squircle';
import { color, colorDark, radius, type as typo } from '../theme/tokens';
import { useInsets } from './Chrome';
import { CameraIcon, CheckIcon, CloseIcon, DocIcon } from './Icons';
import { Button } from './ui';
import { ScanViewfinder, type CamState, type Shot, type Viewfinder } from './ScanViewfinder';
import { SamplePhoto } from './SamplePhoto';
import { useReduceMotion } from './stepMotion';

/** Dark glass for controls over the camera (the app's glass, for a dark backdrop). */
const DARK_GLASS = {
  backgroundColor: 'rgba(40,40,42,0.55)',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(255,255,255,0.18)',
  ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' } as object) : null),
};
const WHITE = colorDark.ink;
/** How long the sample holds still before it takes the photo itself. */
const AUTO_MS = 1100;
/** A US letter page, the shape of a settlement. */
const PAGE = 11 / 8.5;

/**
 * A full-screen scanner, after the camera scanners in Edward's references: the camera fills
 * the screen; corners show where the page goes; glass controls float over it; a big white
 * shutter at the bottom with the pages so far beside it. The sample shows a made-up statement
 * on a desk, and the corners lock onto it. With a real camera there's no page detection
 * here, so the corners stay guides and the chip says to fit the page in them.
 */
export function Scanner({
  title,
  sample,
  samplePage,
  pages,
  onShot,
  onFallback,
  onFile,
  onDone,
  onClose,
  stage = 'capture',
  progress,
  sheet,
}: {
  /** Capture: the camera. Reading: the page stays up while it's read. Found: a sheet over it. */
  stage?: 'capture' | 'reading' | 'found';
  /** While reading: how far along, and what it's doing. */
  progress?: { pct: number; text: string };
  /** When found: the light sheet that rises over the page. */
  sheet?: ReactNode;
  title: string;
  sample: boolean;
  /** The made-up page, drawn, for the sample. */
  samplePage: ReactNode;
  pages: { preview: string | null }[];
  onShot: (s: Shot | 'sample') => void;
  /** No live camera: open the system camera instead. */
  onFallback: () => void;
  onFile: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const { top, footerBottom } = useInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const cam = useRef<Viewfinder>(null);
  const [state, setState] = useState<CamState>('starting');
  // The sample's page is found once; it stays found after the photo.
  const [found, setFound] = useState(false);
  const locked = sample && found;
  // Auto-capture: once the page is found and still, a ring fills round the shutter, then it shoots.
  const [hold, setHold] = useState(0);
  const [flash] = useState(() => new Animated.Value(0));
  const [snap] = useState(() => new Animated.Value(1));

  // The guide: a letter page, as big as fits between the top controls and the shutter.
  const topH = top + 8 + 44 + 12 + 34;
  const bottomH = footerBottom + 24 + 84 + 30;
  const room = Math.max(200, height - topH - bottomH - 24);
  const gw = Math.min(width - 72, room / PAGE);
  const gh = gw * PAGE;
  const gx = (width - gw) / 2;
  const gy = topH + 12 + (room - gh) / 2;

  // The sample's page is found a beat after the scanner opens.
  useEffect(() => {
    if (!sample || stage !== 'capture') return;
    const t = setTimeout(() => {
      setFound(true);
      if (reduce) return;
      snap.setValue(0.94);
      Animated.spring(snap, { toValue: 1, friction: 6, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
    }, 900);
    return () => clearTimeout(t);
  }, [sample, stage, reduce, snap]);

  // Then it holds for a second and takes the photo by itself, once. Tapping the shutter first still works.
  const auto = locked && stage === 'capture' && pages.length === 0;
  useEffect(() => {
    if (!auto) return;
    const start = Date.now();
    const id = setInterval(() => {
      const f = Math.min(1, (Date.now() - start) / AUTO_MS);
      setHold(f);
      if (f >= 1) {
        clearInterval(id);
        shoot();
      }
    }, 30);
    return () => {
      clearInterval(id);
      setHold(0);
    };
    // shoot only reads values that can't change while the sample holds still.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  async function shoot() {
    if (!reduce) {
      flash.setValue(0.85);
      Animated.timing(flash, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
    }
    if (sample) return onShot('sample');
    if (state !== 'live') return onFallback();
    const s = await cam.current?.capture();
    if (s) onShot(s);
  }

  const chip = sample
    ? pages.length
      ? 'Got it. Tap Done to read it.'
      : locked
        ? 'Page found · hold still'
        : 'Looking for the page…'
    : state === 'live'
      ? 'Fit the page inside the corners'
      : state === 'starting'
        ? 'Starting the camera…'
        : 'Camera’s off here. The shutter opens your camera.';
  const last = pages[pages.length - 1];

  return (
    <View style={styles.root}>
      {sample ? (
        <SamplePhoto page={samplePage} x={gx + 10} y={gy + 10} w={gw - 20} h={gh - 20} found={locked && stage === 'capture'} />
      ) : stage !== 'capture' && last?.preview ? (
        <Image source={{ uri: last.preview }} style={styles.still} resizeMode="cover" accessibilityLabel="Your settlement page" />
      ) : stage !== 'capture' ? (
        <View style={styles.desk} />
      ) : (
        <ScanViewfinder ref={cam} onState={setState} />
      )}

      {stage === 'reading' ? <Beam x={gx} y={gy} w={gw} h={gh} /> : null}

      {/* Aiming: squircle brackets show where the page's corners go. Found: they hand off to a
          sharp outline on the page's real corners, because paper has square corners and never
          lies flat to the lens. */}
      {stage === 'capture' && !locked ? (
        <View pointerEvents="none" style={[styles.guide, { left: gx, top: gy, width: gw, height: gh }]}>
          <Bracket at="tl" />
          <Bracket at="tr" />
          <Bracket at="bl" />
          <Bracket at="br" />
        </View>
      ) : null}


      {/* Top: close, what's being scanned, a file instead. */}
      <View style={[styles.top, { paddingTop: top + 8 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Close the scanner" onPress={onClose} style={({ pressed }) => [styles.circle, DARK_GLASS, pressed && styles.pressed]}>
          <CloseIcon c={WHITE} size={16} />
        </Pressable>
        <View style={[styles.titlePill, DARK_GLASS]}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        {stage === 'capture' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a PDF or screenshot instead" onPress={onFile} style={({ pressed }) => [styles.filePill, DARK_GLASS, pressed && styles.pressed]}>
            <DocIcon c={WHITE} size={16} />
            <Text style={styles.fileText}>File</Text>
          </Pressable>
        ) : (
          <View style={styles.circleSpace} />
        )}
      </View>
      {stage !== 'capture' ? null : <>
      <View style={[styles.chipRow, { top: top + 8 + 44 + 12 }]} pointerEvents="none">
        <View style={[styles.chip, locked ? styles.chipLocked : DARK_GLASS]}>
          {locked ? <CheckIcon c={color.ink} size={12} /> : null}
          <Text style={[styles.chipText, locked && styles.chipTextLocked]}>{chip}</Text>
        </View>
      </View>

      {/* Bottom: pages so far, the shutter, done. */}
      <View style={[styles.bottom, { paddingBottom: footerBottom + 12 }]} pointerEvents="box-none">
        <Text style={styles.privacy}>Sent once to Claude to read. Not stored, and your company never sees it.</Text>
        <View style={styles.controls}>
          <View style={styles.side}>
            {pages.length ? (
              <View style={styles.thumbWrap} accessibilityLabel={`${pages.length} page${pages.length === 1 ? '' : 's'} so far`}>
                <View style={styles.thumb}>
                  {last?.preview ? (
                    <Image source={{ uri: last.preview }} style={styles.thumbImg} />
                  ) : sample ? (
                    // The drawn page, shrunk whole to fit the thumbnail.
                    <View style={{ position: 'absolute', left: (48 - (gw - 12)) / 2, top: (64 - (gh - 12)) / 2, width: gw - 12, height: gh - 12, transform: [{ scale: 48 / (gw - 12) }] }}>{samplePage}</View>
                  ) : (
                    <View style={styles.thumbPdf}><DocIcon c={color.ink} size={18} /></View>
                  )}
                </View>
                <View style={styles.count}>
                  <Text style={styles.countText}>{pages.length}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]} />
            )}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={auto ? 'Taking the photo. Tap to take it now' : 'Take the photo'} onPress={shoot} style={({ pressed }) => [styles.shutter, pressed && styles.shutterDown]}>
            <View style={styles.shutterIn}>{state === 'off' && !sample ? <CameraIcon c={color.ink} size={24} /> : null}</View>
            {hold > 0 ? (
              <Svg width={80} height={80} style={styles.ring} pointerEvents="none">
                <Circle cx={40} cy={40} r={38} stroke={color.signal} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 38}`} strokeDashoffset={2 * Math.PI * 38 * (1 - hold)} transform="rotate(-90 40 40)" />
              </Svg>
            ) : null}
          </Pressable>
          <View style={[styles.side, styles.sideRight]}>
            <Button label="Done" variant="white" small disabled={!pages.length} onPress={onDone} style={styles.done} />
          </View>
        </View>
      </View>

      </>}

      {stage === 'reading' && progress ? (
        <View style={[styles.progressRow, { bottom: footerBottom + 40 }]} pointerEvents="none">
          <View style={[styles.progress, DARK_GLASS]} accessibilityRole="progressbar" accessibilityLabel={`${progress.text}, ${progress.pct}%`}>
            <Text style={styles.pct}>{progress.pct}%</Text>
            <Text style={styles.progressText} numberOfLines={1}>{progress.text}</Text>
            <Dots />
          </View>
        </View>
      ) : null}

      {stage === 'found' && sheet ? <Rise>{sheet}</Rise> : null}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
    </View>
  );
}

/** The read passing down the page: a lime line with a soft wash trailing it. */
function Beam({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const run = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(t, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    run.start();
    return () => run.stop();
  }, [reduce, t]);
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [h * 0.08, h * 0.92] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - 6, width: w + 12, top: y, transform: [{ translateY: reduce ? h / 2 : ty }] }}>
      <View style={styles.wash} />
      <View style={styles.beam} />
    </Animated.View>
  );
}

/** Three dots that breathe, like the reference's "scanning" pill. */
function Dots() {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const run = Animated.loop(Animated.timing(t, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    run.start();
    return () => run.stop();
  }, [reduce, t]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { opacity: reduce ? 1 - i * 0.3 : t.interpolate({ inputRange: [0, 1, 2, 3], outputRange: i === 0 ? [1, 0.3, 0.55, 1] : i === 1 ? [0.55, 1, 0.3, 0.55] : [0.3, 0.55, 1, 0.3] }) }]}
        />
      ))}
    </View>
  );
}

/** The found sheet rising over the page. */
function Rise({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) return;
    Animated.spring(t, { toValue: 1, friction: 9, tension: 70, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduce, t]);
  return (
    <Animated.View style={[styles.sheetWrap, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * One corner guide: two straight arms joined by the app's squircle (the Squircle plugin's
 * curve at the chip radius), not a circular arc.
 */
function Bracket({ at }: { at: 'tl' | 'tr' | 'bl' | 'br' }) {
  const L = 34, W = 4, o = W / 2;
  const r = squircleExtent(radius.chip, 100, 100);
  const k = r * 0.1765;
  const d = `M ${o} ${L} L ${o} ${o + r} C ${o} ${o + k} ${o + k} ${o} ${o + r} ${o} L ${L} ${o}`;
  const flip = { tl: '', tr: `translate(${L + o} 0) scale(-1 1)`, bl: `translate(0 ${L + o}) scale(1 -1)`, br: `translate(${L + o} ${L + o}) scale(-1 -1)` }[at];
  const pos = { tl: { top: -o, left: -o }, tr: { top: -o, right: -o }, bl: { bottom: -o, left: -o }, br: { bottom: -o, right: -o } }[at];
  return (
    <Svg width={L + o} height={L + o} style={[styles.bracket, pos]}>
      <Path d={d} transform={flip} stroke={WHITE} strokeOpacity={0.92} strokeWidth={W} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0C', overflow: 'hidden' },
  // Dark, behind a photo that's still loading.
  desk: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#2A2A2C' },
  guide: { position: 'absolute' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 10 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titlePill: { flexShrink: 1, height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  title: { ...typo.labelControl, color: WHITE },
  filePill: { height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileText: { ...typo.labelControl, color: WHITE },
  pressed: { opacity: 0.6 },
  chipRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, borderRadius: 17, paddingHorizontal: 14 },
  chipLocked: { backgroundColor: color.signal },
  chipText: { ...typo.labelSmall, color: WHITE },
  chipTextLocked: { color: color.ink },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  privacy: { ...typo.bodyTiny, color: colorDark.sub, textAlign: 'center', paddingHorizontal: 32 },
  controls: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  side: { flex: 1, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  thumbWrap: { width: 52, height: 68 },
  thumb: { width: 52, height: 68, borderRadius: 12, borderCurve: 'continuous', borderWidth: 2, borderColor: WHITE, overflow: 'hidden', backgroundColor: '#FFF' },
  thumbEmpty: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed' },
  thumbImg: { width: '100%', height: '100%', borderRadius: 8 },
  thumbPdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { zIndex: 2, position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: color.signal, alignItems: 'center', justifyContent: 'center' },
  countText: { ...typo.labelPill, color: color.ink },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  shutterDown: { transform: [{ scale: 0.94 }] },
  shutterIn: { width: 64, height: 64, borderRadius: 32, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  flash: { backgroundColor: WHITE },
  done: { width: 96 },
  ring: { position: 'absolute', top: -4, left: -4 },
  bracket: { position: 'absolute' },
  still: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  circleSpace: { width: 44, height: 44 },
  beam: { height: 3, borderRadius: 2, backgroundColor: color.signal, ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 18px ${color.signal}` } as object) : null) },
  wash: { position: 'absolute', left: 0, right: 0, bottom: 3, height: 44, backgroundColor: color.signal, opacity: 0.16 },
  progressRow: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  progress: { width: '100%', maxWidth: 360, height: 72, borderRadius: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  pct: { ...typo.numberS, color: WHITE, minWidth: 48, fontVariant: ['tabular-nums'] },
  progressText: { ...typo.labelButton, flex: 1, color: WHITE },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE },
  sheetWrap: { position: 'absolute', left: 8, right: 8, bottom: 8 },
});
