import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, fontFamily } from '../theme/tokens';
import { useInsets } from './Chrome';
import { CameraIcon, CloseIcon, DocIcon } from './Icons';
import { ScanViewfinder, type CamState, type Shot, type Viewfinder } from './ScanViewfinder';
import { useReduceMotion } from './stepMotion';

/** Dark glass for controls over the camera (the app's glass, for a dark backdrop). */
const DARK_GLASS = {
  backgroundColor: 'rgba(40,40,42,0.55)',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(255,255,255,0.18)',
  ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' } as object) : null),
};
const WHITE = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.72)';
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
  // The sample's page is found for the pages taken so far; a new shot looks again.
  const [lockedFor, setLockedFor] = useState(-1);
  const locked = sample && lockedFor === pages.length;
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

  // The sample's page is found a beat after the scanner opens, and found again after each shot.
  useEffect(() => {
    if (!sample) return;
    const t = setTimeout(() => {
      setLockedFor(pages.length);
      if (reduce) return;
      snap.setValue(1.06);
      Animated.spring(snap, { toValue: 1, friction: 6, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
    }, 900);
    return () => clearTimeout(t);
  }, [sample, pages.length, reduce, snap]);

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
    ? locked
      ? 'Page found · hold still'
      : 'Looking for the page…'
    : state === 'live'
      ? 'Fit the page inside the corners'
      : state === 'starting'
        ? 'Starting the camera…'
        : 'Camera’s off here. The shutter opens your camera.';
  const last = pages[pages.length - 1];
  const tint = locked ? color.signal : 'rgba(255,255,255,0.92)';

  return (
    <View style={styles.root}>
      {sample ? (
        <View style={styles.desk}>
          <View style={[styles.paper, { left: gx + 6, top: gy + 6, width: gw - 12, height: gh - 12 }]}>{samplePage}</View>
        </View>
      ) : stage !== 'capture' && last?.preview ? (
        <Image source={{ uri: last.preview }} style={styles.still} resizeMode="cover" accessibilityLabel="Your settlement page" />
      ) : stage !== 'capture' ? (
        <View style={styles.desk} />
      ) : (
        <ScanViewfinder ref={cam} onState={setState} />
      )}

      {stage === 'reading' ? <Beam x={gx} y={gy} w={gw} h={gh} /> : null}

      {/* The corners: where the page goes; lime once the page is found. */}
      {stage === 'capture' ? (
      <Animated.View pointerEvents="none" style={[styles.guide, { left: gx, top: gy, width: gw, height: gh, transform: [{ scale: snap }] }]}>
        <Corner at="tl" c={tint} />
        <Corner at="tr" c={tint} />
        <Corner at="bl" c={tint} />
        <Corner at="br" c={tint} />
      </Animated.View>
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
        <View style={[styles.chip, DARK_GLASS, locked && styles.chipLocked]}>
          {locked ? <View style={styles.lockDot} /> : null}
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
          <Pressable accessibilityRole="button" accessibilityLabel="Take the photo" onPress={shoot} style={({ pressed }) => [styles.shutter, pressed && styles.shutterDown]}>
            <View style={styles.shutterIn}>{state === 'off' && !sample ? <CameraIcon c={color.ink} size={24} /> : null}</View>
          </Pressable>
          <View style={[styles.side, styles.sideRight]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pages.length ? `Done, read ${pages.length} page${pages.length === 1 ? '' : 's'}` : 'Done'}
              disabled={!pages.length}
              onPress={onDone}
              style={({ pressed }) => [styles.done, pages.length ? styles.doneOn : [DARK_GLASS, styles.doneOff], pressed && styles.pressed]}
            >
              <Text style={[styles.doneText, !pages.length && styles.doneTextOff]}>Done</Text>
            </Pressable>
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

function Corner({ at, c }: { at: 'tl' | 'tr' | 'bl' | 'br'; c: string }) {
  const L = 30, W = 4, R = 14;
  const s = {
    tl: { top: -2, left: -2, borderTopWidth: W, borderLeftWidth: W, borderTopLeftRadius: R },
    tr: { top: -2, right: -2, borderTopWidth: W, borderRightWidth: W, borderTopRightRadius: R },
    bl: { bottom: -2, left: -2, borderBottomWidth: W, borderLeftWidth: W, borderBottomLeftRadius: R },
    br: { bottom: -2, right: -2, borderBottomWidth: W, borderRightWidth: W, borderBottomRightRadius: R },
  }[at];
  return <View style={[{ position: 'absolute', width: L, height: L, borderColor: c }, s]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0C', overflow: 'hidden' },
  // A dark desk under the sample's page.
  desk: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#2A2A2C' },
  paper: { position: 'absolute', borderRadius: 3, overflow: 'hidden', transform: [{ rotate: '-1.2deg' }], shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 14 } },
  guide: { position: 'absolute' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 10 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titlePill: { flexShrink: 1, height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.semibold, fontSize: 15, color: WHITE },
  filePill: { height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileText: { fontFamily: fontFamily.medium, fontSize: 15, color: WHITE },
  pressed: { opacity: 0.6 },
  chipRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, borderRadius: 17, paddingHorizontal: 14 },
  chipLocked: { backgroundColor: color.signal, borderColor: color.signal },
  chipText: { fontFamily: fontFamily.medium, fontSize: 14, color: WHITE },
  chipTextLocked: { color: color.ink },
  lockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.ink },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  privacy: { fontFamily: fontFamily.regular, fontSize: 12, color: SOFT, textAlign: 'center', paddingHorizontal: 32 },
  controls: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  side: { flex: 1, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  thumbWrap: { width: 52, height: 68 },
  thumb: { width: 52, height: 68, borderRadius: 10, borderCurve: 'continuous', borderWidth: 2, borderColor: WHITE, overflow: 'hidden', backgroundColor: '#FFF' },
  thumbEmpty: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed' },
  thumbImg: { width: '100%', height: '100%', borderRadius: 8 },
  thumbPdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { zIndex: 2, position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: color.signal, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fontFamily.semibold, fontSize: 12, color: color.ink },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  shutterDown: { transform: [{ scale: 0.94 }] },
  shutterIn: { width: 64, height: 64, borderRadius: 32, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  done: { height: 44, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  doneOn: { backgroundColor: WHITE },
  doneOff: { opacity: 0.6 },
  doneText: { fontFamily: fontFamily.semibold, fontSize: 16, color: color.ink },
  doneTextOff: { color: WHITE },
  flash: { backgroundColor: WHITE },
  still: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  circleSpace: { width: 44, height: 44 },
  beam: { height: 3, borderRadius: 2, backgroundColor: color.signal, ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 18px ${color.signal}` } as object) : null) },
  wash: { position: 'absolute', left: 0, right: 0, bottom: 3, height: 44, backgroundColor: color.signal, opacity: 0.16 },
  progressRow: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  progress: { width: '100%', maxWidth: 360, height: 72, borderRadius: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  pct: { fontFamily: fontFamily.medium, fontSize: 19, color: WHITE, minWidth: 44, fontVariant: ['tabular-nums'] },
  progressText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 19, color: WHITE },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE },
  sheetWrap: { position: 'absolute', left: 8, right: 8, bottom: 8 },
});
