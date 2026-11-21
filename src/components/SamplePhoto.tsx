import { LinearGradient } from 'expo-linear-gradient';
import { isValidElement, useEffect, useState, type ReactNode } from 'react';
import Svg, { Polygon } from 'react-native-svg';
import { quad } from './paperGeometry';
import { SamplePaper, type Statement } from './SamplePaper';
import { Animated, Image, Platform, StyleSheet, View } from 'react-native';
import { color } from '../theme/tokens';
import { useReduceMotion } from './stepMotion';

const CAB = require('../../assets/sample-cab.jpg');

/** Camera grain, as an SVG noise tile (web only; the native camera has its own). */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
/**
 * The paper's turn. Flat (no perspective tilt) so the result sheet's glass, which bends a
 * picture of this photo, sees the page exactly where it is: the picture can't do 3D.
 */
const TILT = [{ rotateZ: '-2.2deg' }] as const;
/**
 * A small tile of paper fibre, made once on a canvas (a PNG, so the glass's picture of the
 * scene can draw it): faint speckle with a few longer, lighter flecks. Web only.
 */
function paperFibre(): string | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  if (!g) return null;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${0.015 + rnd() * 0.025})`;
    g.fillRect(Math.floor(rnd() * 96), Math.floor(rnd() * 96), 1, 1);
  }
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(120,110,95,${0.04 + rnd() * 0.04})`;
    g.lineWidth = 0.5;
    const x = rnd() * 96, y = rnd() * 96, a = rnd() * Math.PI, l = 2 + rnd() * 5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c.toDataURL('image/png');
}

/** What the drawn page shows (its label, claims, what was paid, highlights), for SamplePaper. */
function statementOf(page: ReactNode): Statement | null {
  if (!isValidElement(page)) return null;
  const p = page.props as Partial<Statement>;
  return p.label && p.claims && p.paid ? { label: p.label, claims: p.claims, paid: p.paid, highlight: p.highlight } : null;
}

const web = (s: object) => (Platform.OS === 'web' ? s : null);

/**
 * The sample, as if the driver were really pointing the phone at it: a folded settlement
 * lying on the passenger seat of the cab in daylight. The page is the drawn one (so its
 * numbers match the sample claims), set into a photo of an empty seat: tilted slightly away,
 * lit from the windshield, its fold creases, a contact shadow, and the
 * camera's grain over everything.
 */
export function SamplePhoto({ page, x, y, w, h, found, onReady }: { page: ReactNode; x: number; y: number; w: number; h: number; found?: boolean; onReady?: () => void }) {
  const reduce = useReduceMotion();
  const [fibre] = useState(paperFibre);
  useEffect(() => {
    if (Platform.OS !== 'web') onReady?.();
  }, [onReady]);
  const [on] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(on, { toValue: found ? 1 : 0, friction: 7, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [found, on]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Platform.OS === 'web' ? (
        <>
          {/* The seat, then the page as a photo of paper (SamplePaper). */}
          <Image source={CAB} style={styles.cab} resizeMode="cover" />
          {statementOf(page) ? <SamplePaper statement={statementOf(page)!} x={x} y={y} w={w} h={h} onReady={onReady} /> : null}
        </>
      ) : (
        <Image source={CAB} style={styles.cab} resizeMode="cover" />
      )}
      {/* Native: the paper as views, tilted a little. */}
      {Platform.OS === 'web' ? null : (
      <View style={[styles.paper, { left: x, top: y, width: w, height: h }]}>
        {page}
        {/* Paper fibre: a fine, faint tooth, so the page isn't a flat fill. */}
        {fibre ? <Image source={{ uri: fibre }} style={styles.fibre} resizeMode="repeat" /> : null}
        {/* Folded in three for the envelope and opened again: each panel sits at its own small
            angle to the light (the middle one tips away, so it's a touch darker), and each fold
            is a soft valley, shaded on one side and catching light on the other. */}
        <View style={[styles.panel, { top: h / 3, height: h / 3 }]} />
        {[1 / 3, 2 / 3].map((f, i) => (
          <LinearGradient
            key={f}
            colors={i === 0 ? ['rgba(40,32,24,0)', 'rgba(40,32,24,0.10)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(40,32,24,0.12)', 'rgba(40,32,24,0)']}
            locations={[0, 0.48, 0.56, 1]}
            style={[styles.fold, { top: h * f - 7 }]}
          />
        ))}
        {/* The bottom right corner curls up off the seat: it catches light along its edge and
            shades just inside. */}
        <LinearGradient colors={['rgba(40,32,24,0)', 'rgba(40,32,24,0)', 'rgba(40,32,24,0.09)', 'rgba(255,255,255,0.45)']} locations={[0, 0.78, 0.95, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* Daylight from the windshield: a soft brightening across the top of the page. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The left edge lifts off the seat a little, so it catches less light. */}
        <LinearGradient colors={['rgba(30,30,34,0.10)', 'rgba(40,30,20,0)']} locations={[0, 0.12]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        {/* Away from the windshield the page falls off a little into shade. */}
        <LinearGradient
          colors={['rgba(30,30,34,0.04)', 'rgba(30,30,34,0.02)', 'rgba(30,30,34,0.05)', 'rgba(30,30,34,0.14)']}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      )}
      {/* Found: a sharp lime outline on the page's own corners. It sits in the paper's own
          tilt, so it lands on the real edges, and settles in from a touch larger. */}
      {Platform.OS === 'web' ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: on }]}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Polygon points={quad(x, y, w, h).map((p) => p.join(',')).join(' ')} fill={color.signal} fillOpacity={0.1} stroke={color.signal} strokeWidth={3} strokeLinejoin="miter" />
          </Svg>
        </Animated.View>
      ) : (
      <Animated.View
        style={[
          styles.found,
          {
            left: x - 4,
            top: y - 4,
            width: w + 8,
            height: h + 8,
            opacity: on,
            transform: [...TILT, { scale: reduce ? 1 : on.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1] }) }],
          },
        ]}
      />
      )}
      {/* The whole frame: a soft vignette and grain, so the page and the seat read as one photo. */}
      <LinearGradient colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.16)']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFill} />
      {/* Grain is the camera's, not the scene's: the glass's picture of the photo leaves it out. */}
      {Platform.OS === 'web' ? <View style={[StyleSheet.absoluteFill, styles.grain]} {...({ dataSet: { noglass: '1' } } as object)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bigger than the screen, so the hand's drift never shows an edge.
  cab: { position: 'absolute', top: '-15%', left: '-15%', width: '130%', height: '130%' },
  paper: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 1.5,
    transform: [...TILT],
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 12 },
    // A tight contact shadow where the paper touches the seat, then the soft one under the
    // lifted parts; and a hairline edge, the paper's own thickness catching light.
    ...web({ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.12), 0 1px 1.5px rgba(0,0,0,0.35), 2px 6px 12px rgba(0,0,0,0.16), 6px 18px 32px rgba(0,0,0,0.12)' }),
  },
  found: { position: 'absolute', borderWidth: 3, borderColor: color.signal, backgroundColor: 'rgba(212,245,76,0.10)' },
  fibre: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 1 },
  panel: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(40,32,24,0.035)' },
  fold: { position: 'absolute', left: 0, right: 0, height: 14 },
  grain: { opacity: 0.13, ...web({ backgroundImage: GRAIN, mixBlendMode: 'overlay' }) },
});
