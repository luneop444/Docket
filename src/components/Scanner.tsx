import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { squircleExtent, squirclePath } from '../logic/squircle';
import { color, colorDark, protoColor, radius, type as typo } from '../theme/tokens';
import { useInsets, useTabSpace } from './Chrome';
import { CameraIcon, CheckIcon, CloseIcon, DocIcon } from './Icons';
import { ScanViewfinder, type CamState, type Shot, type Viewfinder } from './ScanViewfinder';
import { BackdropCtx, GlassTuneCtx, NO_TUNE, repicture, RiseCtx, SCAN_BEND, SCAN_SPLIT, sceneShift } from './backdrop';
import { MOVE_EVENT } from './contentMove';
import { LiquidGroup, LiquidPill } from './LiquidGlass';
import { map, quad } from './paperGeometry';
import { SamplePhoto } from './SamplePhoto';
import { useReduceMotion } from './stepMotion';

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
  // The scanner's own size, not the window's: on a laptop the app sits in a phone frame, and
  // the page, frame and scrim have to be laid out in that, not across the browser window.
  const win = useWindowDimensions();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const { width, height } = box ?? win;
  const reduce = useReduceMotion();
  const cam = useRef<Viewfinder>(null);
  // What the result sheet's glass bends: the photo, not the controls over it.
  const backdrop = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<CamState>('starting');
  // The sample's page is found once; it stays found after the photo.
  const [found, setFound] = useState(false);
  const locked = sample && found;
  // The scrim's hole: 0 is the frame, 1 is the found page. Eased over the outline's settle.
  const [holeT, setHoleT] = useState(0);
  const holeTo = locked ? 1 : 0;
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const from = holeT;
    const start = performance.now();
    const step = () => {
      const f = Math.min(1, (performance.now() - start) / 320);
      const e = 1 - Math.pow(1 - f, 3);
      setHoleT(from + (holeTo - from) * e);
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Runs on the target changing; holeT is where it starts from, not a reason to rerun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeTo, reduce]);

  // Auto-capture: once the page is found and still, a ring fills round the shutter, then it shoots.
  const [hold, setHold] = useState(0);
  const [flash] = useState(() => new Animated.Value(0));
  const [snap] = useState(() => new Animated.Value(1));

  // The guide: a letter page, as big as fits between the chip and the privacy line, 16 clear
  // of each, and no closer than 36 to the sides (the 20 edge plus room for the brackets).
  // The bottom block is measured, since its line can wrap to one or two lines.
  const [bottomH, setBottomH] = useState(footerBottom + SHUTTER + L.gap + 40);
  const chipTop = top + L.bar + L.gap;
  const topH = chipTop + L.chip + L.gapL;
  const room = Math.max(200, height - topH - bottomH - L.gapL);
  const gw = Math.min(width - (L.edge + 16) * 2, room / PAGE);
  const gh = gw * PAGE;
  const gx = (width - gw) / 2;
  const gy = topH + (room - gh) / 2;

  // The sample, held like a real phone: the page comes into the frame off-centre and turned,
  // drifts in with a hand's small overshoots, and goes still. Then it's found.
  const [hand] = useState(() => new Animated.Value(reduce || !sample ? 1 : 0));
  // The hand starts once the paper is drawn, so its whole way in is seen.
  const [paperReady, setPaperReady] = useState(false);
  // Each time the paper draws, the glass re-pictures the scene (it may have pictured it before).
  const [onPaper] = useState(() => () => {
    setPaperReady(true);
    repicture();
  });
  useEffect(() => {
    if (!sample || reduce || !paperReady) return;
    Animated.timing(hand, { toValue: 1, duration: HAND_MS, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [sample, reduce, hand, paperReady]);

  // How far the scene drops for the result card: just enough that about 150 points of the
  // page run under the card's top edge, so its glass has the page's lines to bend there. None
  // when the card already covers that much (a tall card), and never past the read lines' room.
  const [cardH, setCardH] = useState(0);
  const { pillBottom } = useTabSpace();
  const dropBy = cardH ? Math.max(0, Math.min(DROP_MAX, height - pillBottom - cardH + 150 - (gy + gh))) : 0;
  const [drop] = useState(() => new Animated.Value(0));
  const dropping = stage === 'found';
  useEffect(() => {
    const to = dropping ? dropBy : 0;
    if (reduce) drop.setValue(to);
    else Animated.timing(drop, { toValue: to, duration: 480, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [dropping, dropBy, reduce, drop]);

  // The glass follows the scene: where the hand and the drop have it now, every frame.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const at = (out: number[], v: number) => {
      const n = HAND.at.length - 1, f = Math.max(0, Math.min(1, v)) * n, i = Math.min(n - 1, Math.floor(f));
      return out[i] + (out[i + 1] - out[i]) * (f - i);
    };
    let h = (hand as unknown as { _value: number })._value ?? 1;
    let d = 0;
    const push = () => {
      sceneShift.x = at(HAND.x, h);
      sceneShift.y = at(HAND.y, h) + d;
      document.dispatchEvent(new Event(MOVE_EVENT));
    };
    const a = hand.addListener(({ value }) => ((h = value), push()));
    const b = drop.addListener(({ value }) => ((d = value), push()));
    push();
    return () => {
      hand.removeListener(a);
      drop.removeListener(b);
      sceneShift.x = sceneShift.y = 0;
    };
  }, [hand, drop]);

  // The sample's page is found once the hand has settled.
  useEffect(() => {
    if (!sample || stage !== 'capture' || !paperReady) return;
    const t = setTimeout(() => {
      setFound(true);
      if (reduce) return;
      snap.setValue(0.94);
      Animated.spring(snap, { toValue: 1, friction: 6, tension: 140, useNativeDriver: Platform.OS !== 'web' }).start();
    }, reduce ? 900 : HAND_MS + 150);
    return () => clearTimeout(t);
  }, [sample, stage, reduce, snap, paperReady]);

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
    <BackdropCtx.Provider value={backdrop}>
    <GlassTuneCtx.Provider value={PILL_TUNE}>
    <View style={styles.root} onLayout={(e) => {
      const { width: w, height: h } = e.nativeEvent.layout;
      if (!box || Math.abs(box.width - w) > 0.5 || Math.abs(box.height - h) > 0.5) setBox({ width: w, height: h });
    }}>
      <View ref={backdrop as never} style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Once it's reading, the scene settles a little lower so the page runs under where the
          result card will rise: the card's glass then has the page's lines to bend at its
          edge, instead of blank seat. */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: drop }] }]}>
      {sample ? (
          <Animated.View style={[StyleSheet.absoluteFill, handheld(hand)]}>
            <SamplePhoto page={samplePage} x={gx + 10} y={gy + 10} w={gw - 20} h={gh - 20} found={locked && stage === 'capture'} onReady={onPaper} />
          </Animated.View>
        ) : stage !== 'capture' && last?.preview ? (
          <Image source={{ uri: last.preview }} style={styles.still} resizeMode="cover" accessibilityLabel="Your settlement page" />
        ) : stage !== 'capture' ? (
          <View style={styles.desk} />
        ) : (
          <ScanViewfinder ref={cam} onState={setState} />
        )}
        {/* Everything outside the frame sits under the app's scrim (the one behind sheets), so
            the page is the brightest thing. The hole is the frame's squircle, at the chip
            radius like the brackets; once the page is found it tightens with the outline onto
            the page itself (square corners, the page's turn). Inside the photo layer, so the
            glass bends it too. */}
        {/* Taller than the screen by DROP_MAX above, so the scrim still covers the top once the scene drops. */}
        <Svg width={width} height={height + DROP_MAX} style={[styles.scrimSvg, { top: -DROP_MAX }]} pointerEvents="none">
          <Path fillRule="evenodd" fill={protoColor.scrim} d={`M0 0H${width}V${height + DROP_MAX}H0Z ${holePath(gx, gy + DROP_MAX, gw, gh, reduce ? holeTo : holeT, sample ? quad(gx + 10, gy + 10 + DROP_MAX, gw - 20, gh - 20) : undefined)}`} />
        </Svg>
      </Animated.View>
      </View>

      {stage === 'reading' ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: drop }] }]}>
          <Beam x={gx} y={gy} w={gw} h={gh} paper={sample ? { x: gx + 10, y: gy + 10, w: gw - 20, h: gh - 20 } : undefined} />
        </Animated.View>
      ) : null}

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
      {/* The title sits on the screen's centre line whatever is either side of it. */}
      <View style={[styles.titleRow, { top, height: L.bar }]} pointerEvents="box-none">
        <GlassPill h={44} minW={80} pad={L.gapL}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </GlassPill>
      </View>
      <View style={[styles.top, { top, height: L.bar }]} pointerEvents="box-none">
        <GlassPill h={44} minW={44}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close the scanner" onPress={onClose} style={({ pressed }) => [styles.circle, pressed && styles.pressed]}>
            <CloseIcon c={color.ink} size={16} />
          </Pressable>
        </GlassPill>
        {stage === 'capture' ? (
          <GlassPill h={44} minW={44}>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose a PDF or screenshot instead" onPress={onFile} style={({ pressed }) => [styles.filePill, pressed && styles.pressed]}>
              <DocIcon c={color.ink} size={16} />
              <Text style={styles.fileText}>File</Text>
            </Pressable>
          </GlassPill>
        ) : (
          <View style={styles.circleSpace} />
        )}
      </View>
      {stage !== 'capture' ? null : <>
      <View style={[styles.chipRow, { top: chipTop }]} pointerEvents="none">
        {locked ? (
          <View style={[styles.chip, styles.chipLocked]}>
            <CheckIcon c={color.ink} size={12} />
            <Text style={[styles.chipText, styles.chipTextLocked]}>{chip}</Text>
          </View>
        ) : (
          <GlassPill h={L.chip} minW={60} pad={L.gap}>
            <Text style={styles.chipText}>{chip}</Text>
          </GlassPill>
        )}
      </View>

      {/* Bottom: pages so far, the shutter, done. */}
      <View style={[styles.bottom, { paddingBottom: footerBottom }]} pointerEvents="box-none" onLayout={(e) => setBottomH(Math.round(e.nativeEvent.layout.height))}>
        <Text style={styles.privacy}>Sent once to Claude to read. Not stored, and your company never sees it.</Text>
        <View style={styles.controls}>
          {/* After the iPhone's own camera (iOS 26): the shutter is a white disc on a liquid
              glass circle, the last shot sits in a circle to its left, and the other action is
              glass to its right. Only what this page uses: no modes, no flip (pages are shot
              with the back camera). */}
          <View style={styles.side}>
            {pages.length ? (
              <View style={styles.thumbWrap} accessibilityLabel={`${pages.length} page${pages.length === 1 ? '' : 's'} so far`}>
                <View style={styles.thumb}>
                  {last?.preview ? (
                    <Image source={{ uri: last.preview }} style={styles.thumbImg} />
                  ) : sample ? (
                    // The drawn page, a little wider than the circle, top edge showing: how the
                    // camera's round thumbnail crops a photo of a page.
                    <View style={{ position: 'absolute', left: (THUMB - (gw - 12)) / 2, top: ((gh - 12) * (THUMB * 1.15) / (gw - 12) - (gh - 12)) / 2 + 8, width: gw - 12, height: gh - 12, transform: [{ scale: (THUMB * 1.15) / (gw - 12) }] }}>{samplePage}</View>
                  ) : (
                    <View style={styles.thumbPdf}><DocIcon c={color.ink} size={20} /></View>
                  )}
                </View>
                <View style={styles.count}>
                  <Text style={styles.countText}>{pages.length}</Text>
                </View>
              </View>
            ) : (
              <GlassPill h={THUMB} minW={THUMB} fixed>
                <View />
              </GlassPill>
            )}
          </View>
          <GlassPill h={SHUTTER} minW={SHUTTER} fixed>
            <Pressable accessibilityRole="button" accessibilityLabel={auto ? 'Taking the photo. Tap to take it now' : 'Take the photo'} onPress={shoot} style={styles.shutter}>
              {({ pressed }) => <View style={[styles.shutterIn, pressed && styles.shutterDown]}>{state === 'off' && !sample ? <CameraIcon c={color.ink} size={24} /> : null}</View>}
            </Pressable>
            {/* Auto-capture fills the glass ring itself, lime, round from the top. */}
            {hold > 0 ? (
              <Svg width={SHUTTER} height={SHUTTER} style={styles.ring} pointerEvents="none">
                <Circle cx={SHUTTER / 2} cy={SHUTTER / 2} r={RING_R} stroke={color.signal} strokeWidth={RING_W} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * RING_R}`} strokeDashoffset={2 * Math.PI * RING_R * (1 - hold)} transform={`rotate(-90 ${SHUTTER / 2} ${SHUTTER / 2})`} />
              </Svg>
            ) : null}
          </GlassPill>
          <View style={[styles.side, styles.sideRight]}>
            {/* As tall as the circles beside it (60), so the row stays balanced, and wide enough
                to be a true capsule: a flat middle as wide as the label, the rounded ends either
                side of it. Sized to the label alone, "Done" made it nearly round, all rim, so the
                glass bent everything behind the label. */}
            <GlassPill h={THUMB} minW={DONE_W} fixed>
              <Pressable accessibilityRole="button" accessibilityLabel={pages.length ? `Done, read ${pages.length} page${pages.length === 1 ? '' : 's'}` : 'Done'} accessibilityState={{ disabled: !pages.length }} disabled={!pages.length} onPress={onDone} style={({ pressed }) => [styles.doneHit, pressed && styles.pressed]}>
                <Text style={[styles.doneText, !pages.length && styles.doneOff]}>Done</Text>
              </Pressable>
            </GlassPill>
          </View>
        </View>
      </View>

      </>}

      {stage === 'reading' && progress ? (
        <View style={[styles.progressRow, { bottom: footerBottom + (SHUTTER - 72) / 2 }]} pointerEvents="none">
          <GlassPill h={72} minW={width - L.edge * 2} fixed>
            <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`${progress.text}, ${progress.pct}%`}>
              <Text style={styles.pct}>{progress.pct}%</Text>
              <Text style={styles.progressText} numberOfLines={1}>{progress.text}</Text>
              <Dots />
            </View>
          </GlassPill>
        </View>
      ) : null}

      {stage === 'found' && sheet ? <Rise onHeight={setCardH}>{sheet}</Rise> : null}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
    </View>
    </GlassTuneCtx.Provider>
    </BackdropCtx.Provider>
  );
}

/**
 * A control in the app's liquid glass (the nav bar's, LiquidGlass.web.tsx), bending the photo
 * behind the scanner. It hugs its content: measured once laid out.
 */
function GlassPill({ h, minW, pad = 0, fixed, children }: { h: number; minW: number; pad?: number; fixed?: boolean; children: ReactNode }) {
  const [w, setW] = useState(minW);
  return (
    <LiquidGroup>
      <LiquidPill w={w} h={h}>
        <View
          onLayout={fixed ? undefined : (e) => setW(Math.max(minW, Math.ceil(e.nativeEvent.layout.width)))}
          style={[{ height: h, paddingHorizontal: pad, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, fixed && { width: w }]}
        >
          {children}
        </View>
      </LiquidPill>
    </LiquidGroup>
  );
}

/**
 * The read passing down the page. It's light on the paper, not a bar over the screen:
 * - it lies on the page: across the page's own width at its keystone and turn, bending over
 *   the folds, and clipped to the paper, so it never spills onto the seat;
 * - it's built like light: a near-white core, a lime falloff either side, and a short wash
 *   trailing behind it that fades out, so you see where it has been;
 * - it reads one way, top to bottom, eased in and out, fading in at the top edge and out at
 *   the bottom, then a breath before the next pass. A bar bouncing back and forth looks like
 *   a loading spinner; a pass that starts over looks like reading.
 * Without a sample page it does the same over the frame.
 */
// The sample reads in 2.3s; one pass covers it, so you never see a pass cut off halfway.
const PASS_MS = 1900;
const REST_MS = 300;
const TRAIL = 0.16; // of the page height
function Beam({ x, y, w, h, paper }: { x: number; y: number; w: number; h: number; paper?: { x: number; y: number; w: number; h: number } }) {
  const reduce = useReduceMotion();
  const [v, setV] = useState(reduce ? 0.5 : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const p = ((Date.now() - t0) % (PASS_MS + REST_MS)) / PASS_MS;
      setV(p >= 1 ? -1 : p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  if (v < 0) return null;

  const at = (u: number, vv: number): [number, number] =>
    paper ? map(u, vv, paper.x, paper.y, paper.w, paper.h) : [x + 10 + u * (w - 20), y + 10 + vv * (h - 20)];
  const N = 24;
  const line = (vv: number) => {
    const c = Math.min(1, Math.max(0, vv));
    return Array.from({ length: N + 1 }, (_, i) => at(i / N, c));
  };
  const d = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
  const outline = d([...line(0), ...line(1).reverse()]) + 'Z';
  // Fade in over the first tenth of the pass and out over the last.
  const edge = Math.min(1, v / 0.1, (1 - v) / 0.1);
  // The trail: thin bands behind the line, each fainter the further back it is.
  const bands = 10;
  const trail = Array.from({ length: bands }, (_, i) => {
    const a = v - (TRAIL * i) / bands, b = v - (TRAIL * (i + 1)) / bands;
    if (a <= 0) return null;
    const f = 1 - i / bands;
    return <Path key={i} d={d([...line(b), ...line(a).reverse()]) + 'Z'} fill={color.signal} opacity={0.24 * f * f * edge} />;
  });
  const core = d(line(v));
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <ClipPath id="beamPaper">
          <Path d={outline} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#beamPaper)">
        {trail}
        <Path d={core} stroke={color.signal} strokeWidth={18} strokeOpacity={0.12 * edge} fill="none" strokeLinejoin="round" />
        <Path d={core} stroke={color.signal} strokeWidth={7} strokeOpacity={0.32 * edge} fill="none" strokeLinejoin="round" />
        <Path d={core} stroke={color.signal} strokeWidth={2.5} strokeOpacity={0.9 * edge} fill="none" strokeLinejoin="round" />
        <Path d={core} stroke="#F6FFD9" strokeWidth={1} strokeOpacity={edge} fill="none" strokeLinejoin="round" />
      </G>
    </Svg>
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

/**
 * The found sheet rising over the page, like a sheet: up from below the screen, no fade. It
 * waits for its glass to be ready (RiseCtx), so the glass rides up with it; if the glass can't
 * draw, it goes anyway after a moment with the flat stand-in.
 */
function Rise({ children, onHeight }: { children: ReactNode; onHeight: (h: number) => void }) {
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  // Floats where the tab bar floats: 20 in from the sides, at its distance from the bottom.
  const { pillBottom } = useTabSpace();
  const [t] = useState(() => new Animated.Value(reduce ? 1 : 0));
  const [go, setGo] = useState(false);
  const [ready] = useState(() => () => setGo(true));
  useEffect(() => {
    const id = setTimeout(() => setGo(true), 1500);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (reduce || !go) return;
    Animated.spring(t, { toValue: 1, friction: 10, tension: 60, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduce, go, t]);
  return (
    <RiseCtx.Provider value={ready}>
      <Animated.View onLayout={(e) => onHeight(e.nativeEvent.layout.height)} style={[styles.sheetWrap, { right: L.edge, bottom: pillBottom }, { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}>
        {children}
      </Animated.View>
    </RiseCtx.Provider>
  );
}

/**
 * One corner guide: two straight arms joined by the app's squircle (the Squircle plugin's
 * curve at the chip radius), not a circular arc.
 */
/** The camera's bottom row (iOS 26 sizes): the shutter's glass circle and the side circles. */
const SHUTTER = 80;
/** Done: the circles' height plus a flat middle about the label's width ("Done" is ~38pt). */
const DONE_W = 100;
/**
 * Measured off the iPhone's own shutter (iOS 26, at 3x): an 80pt glass circle and a 68pt white
 * disc, the 6pt between them all glass. The iPhone's dark gap there is only its black preview
 * showing through; drawn over this glass it reads as a stroke on the disc, so it's left out.
 * Pressing shrinks the disc, not the ring.
 */
const DISC = 68;
const RING_W = (SHUTTER - DISC) / 2;
const RING_R = SHUTTER / 2 - RING_W / 2;
/**
 * The scanner's spacing, from the app's own: the 20 screen edge (every screen's side padding,
 * and the tab bar's inset), the 52 header bar with its 44 pills centred in it, and the 12 and
 * 16 gaps the rest of the app steps in.
 */
const L = { edge: 20, bar: 52, chip: 36, gap: 12, gapL: 16 };
/** The most the scene drops for the result card (see dropBy). */
const DROP_MAX = 160;
const THUMB = 60;

/** How long the hand takes to bring the sample page into the frame. */
const HAND_MS = 1800;
/**
 * The pills' white. The system's 0.62 is set for glass over the app's light pages; over a dark
 * camera scene it makes pale grey slabs with nothing showing through. So here each pill finds
 * its own: the least white that keeps its dark label at 4.5:1 over the darkest part of what's
 * behind it (LiquidGlass adapt). Over the seat that's about a third; over the dark footwell
 * about a half. It never goes past the system's 0.62, and never under 0.3, so the glass still
 * reads as a body over something bright. 0.5 is what it shows before it has measured.
 * Everything else about the glass stays the system's. The result card isn't a pill and keeps
 * the system's white: it carries numbers over a printed page.
 */
const PILL_TUNE = { ...NO_TUNE, bend: SCAN_BEND, split: SCAN_SPLIT, tint: 0.5, adapt: { ink: color.ink, min: 0.3, max: 0.62 } };

/**
 * A hand's path into the frame, as the camera sees it, worked out once as motion rather than
 * keyframes. Three things a held phone does at once:
 *
 * - it's brought in: a damped spring from low, right, turned and a touch close, settling with
 *   one soft overshoot, the way an arm stops;
 * - it sways: slow drift, a breath or two a second, that dies away as the driver steadies it;
 * - it trembles: the hand's fine physiological tremor (8 to 12 a second), tiny, fading last.
 *
 * Sampled at 60 a second and played back on one linear clock, so it's smooth and the same
 * every time, and it ends exactly at rest.
 */
const HAND = (() => {
  const T = HAND_MS / 1000;
  const n = Math.round(T * 60);
  const w = 6, z = 0.64; // the arm's spring: about half a second in, one soft overshoot
  const wd = w * Math.sqrt(1 - z * z);
  const spring = (from: number, t: number) => from * Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  const S = (f: number, p: number, t: number) => Math.sin(2 * Math.PI * f * t + p);
  const at: number[] = [], x: number[] = [], y: number[] = [], r: number[] = [], k: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T, f = i / n;
    const sway = Math.pow(1 - f, 1.6);
    const shake = Math.pow(1 - f, 2.4);
    const tremor = (a: number, p: number) => shake * a * (0.6 * S(9.2, p, t) + 0.4 * S(11.7, p * 2.3, t));
    at.push(f);
    x.push(i === n ? 0 : spring(42, t) + sway * (2.4 * S(1.3, 0.4, t) + 1.2 * S(2.2, 1.7, t)) + tremor(0.45, 0.9));
    y.push(i === n ? 0 : spring(88, t) + sway * (1.8 * S(1.1, 2.1, t) + 1.4 * S(1.9, 0.3, t)) + tremor(0.4, 2.2));
    // The wrist turns with the drift, a little behind it.
    r.push(i === n ? 0 : spring(5.5, t) + sway * (0.45 * S(1.2, 1.1, t) + 0.25 * S(2.0, 2.6, t)) + tremor(0.06, 0.2));
    // Distance: brought down from a touch close, breathing slightly as it steadies.
    k.push(i === n ? 1 : 1 + spring(0.1, t) + sway * 0.006 * S(0.9, 0.5, t));
  }
  return { at, x, y, r, k };
})();

function handheld(t: Animated.Value) {
  const i = (out: number[]) => t.interpolate({ inputRange: HAND.at, outputRange: out });
  return {
    transform: [
      { translateX: i(HAND.x) },
      { translateY: i(HAND.y) },
      { rotate: t.interpolate({ inputRange: HAND.at, outputRange: HAND.r.map((d) => `${d.toFixed(3)}deg`) }) },
      { scale: i(HAND.k) },
    ],
  };
}

/**
 * The scrim's hole. At t = 0 it's the frame (x, y, w, h) with rounded corners at the chip
 * radius; at t = 1 it's the found page's own outline, its four corners where SamplePhoto
 * draws them (paperGeometry), square. In between, the corners travel and the rounding goes.
 * `page` is the page's box in the same coordinates (the frame's, 10 in).
 */
function holePath(x: number, y: number, w: number, h: number, t: number, page?: [number, number][]) {
  if (!page || t <= 0) {
    const r = squircleExtent(radius.chip, w, h);
    return squirclePath(w, h, [r, r, r, r]).replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, px, py) => `${(+px + x).toFixed(2)} ${(+py + y).toFixed(2)}`);
  }
  const frame: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const P = frame.map(([fx, fy], i) => [fx + (page[i][0] - fx) * t, fy + (page[i][1] - fy) * t] as [number, number]);
  const r = radius.chip * 1.4 * (1 - t);
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const A = P[(i + 3) % 4], C = P[i], B = P[(i + 1) % 4];
    const toward = (Q: [number, number]) => {
      const dx = Q[0] - C[0], dy = Q[1] - C[1], l = Math.hypot(dx, dy) || 1;
      return [C[0] + (dx / l) * r, C[1] + (dy / l) * r];
    };
    const s0 = toward(A), s1 = toward(B);
    parts.push(`${i ? 'L' : 'M'}${s0[0].toFixed(2)} ${s0[1].toFixed(2)} Q${C[0].toFixed(2)} ${C[1].toFixed(2)} ${s1[0].toFixed(2)} ${s1[1].toFixed(2)}`);
  }
  return parts.join(' ') + 'Z';
}

function Bracket({ at }: { at: 'tl' | 'tr' | 'bl' | 'br' }) {
  const L = 34, W = 4, o = W / 2;
  const r = squircleExtent(radius.chip, 100, 100);
  const k = r * 0.1765;
  const d = `M ${o} ${L} L ${o} ${o + r} C ${o} ${o + k} ${o + k} ${o} ${o + r} ${o} L ${L} ${o}`;
  const flip = { tl: '', tr: `translate(${L + o} 0) scale(-1 1)`, bl: `translate(0 ${L + o}) scale(1 -1)`, br: `translate(${L + o} ${L + o}) scale(-1 -1)` }[at];
  const pos = { tl: { top: -o, left: -o }, tr: { top: -o, right: -o }, bl: { bottom: -o, left: -o }, br: { bottom: -o, right: -o } }[at];
  return (
    <Svg width={L + o} height={L + o} style={[styles.bracket, pos]}>
      {/* A soft dark edge under the white, so the guide reads on a light seat too. */}
      <Path d={d} transform={flip} stroke="#000" strokeOpacity={0.22} strokeWidth={W + 3} strokeLinecap="round" fill="none" />
      <Path d={d} transform={flip} stroke={WHITE} strokeOpacity={0.95} strokeWidth={W} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0C', overflow: 'hidden' },
  // Dark, behind a photo that's still loading.
  desk: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#2A2A2C' },
  guide: { position: 'absolute' },
  titleRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: L.edge, gap: L.gap },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { ...typo.labelControl, color: color.ink },
  filePill: { height: 44, paddingHorizontal: L.gapL, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileText: { ...typo.labelControl, color: color.ink },
  pressed: { opacity: 0.6 },
  chipRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: L.chip, borderRadius: L.chip / 2, paddingHorizontal: L.gap },
  chipLocked: { backgroundColor: color.signal },
  chipText: { ...typo.labelSmall, color: color.ink },
  chipTextLocked: { color: color.ink },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: L.gapL },
  // White with a soft shadow, like the camera's own labels: it reads over a light seat or a dark one.
  privacy: { ...typo.bodyTiny, color: WHITE, textAlign: 'center', paddingHorizontal: L.edge * 2, textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  controls: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: L.edge },
  side: { flex: 1, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, overflow: 'hidden', backgroundColor: '#F6F4EF' },
  thumbImg: { width: '100%', height: '100%' },
  thumbPdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { zIndex: 2, position: 'absolute', top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: color.signal, alignItems: 'center', justifyContent: 'center' },
  countText: { ...typo.labelPill, color: color.ink },
  shutter: { width: SHUTTER, height: SHUTTER, alignItems: 'center', justifyContent: 'center' },
  shutterDown: { transform: [{ scale: 0.9 }] },
  shutterIn: { width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  flash: { backgroundColor: WHITE },
  scrimSvg: { position: 'absolute', left: 0 },
  doneHit: { height: THUMB, width: DONE_W, alignItems: 'center', justifyContent: 'center' },
  doneText: { ...typo.labelControl, color: color.ink },
  doneOff: { color: color.faint },
  ring: { position: 'absolute', top: 0, left: 0 },
  bracket: { position: 'absolute' },
  still: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  circleSpace: { width: 44, height: 44 },
  progressRow: { position: 'absolute', left: L.edge, right: L.edge, alignItems: 'center' },
  progress: { flex: 1, height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: L.edge + 4, gap: L.gap },
  pct: { ...typo.numberS, color: color.ink, minWidth: 48, fontVariant: ['tabular-nums'] },
  progressText: { ...typo.labelButton, flex: 1, color: color.ink },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.ink },
  sheetWrap: { position: 'absolute', left: L.edge },
});
