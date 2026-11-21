import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
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
const web = (s: object) => (Platform.OS === 'web' ? s : null);

/**
 * The sample, as if the driver were really pointing the phone at it: a folded settlement
 * lying on the passenger seat of the cab in evening light. The page is the drawn one (so its
 * numbers match the sample claims), set into a photo of an empty seat: tilted slightly away,
 * with the window's light falling across it, its fold creases, a contact shadow, and the
 * camera's grain over everything.
 */
export function SamplePhoto({ page, x, y, w, h, found }: { page: ReactNode; x: number; y: number; w: number; h: number; found?: boolean }) {
  const reduce = useReduceMotion();
  const [on] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(on, { toValue: found ? 1 : 0, friction: 7, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [found, on]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={CAB} style={styles.cab} resizeMode="cover" />
      {/* The paper, tilted a little away from the lens. */}
      <View style={[styles.paper, { left: x, top: y, width: w, height: h }]}>
        {page}
        {/* The folds from the envelope, a third and two thirds down. */}
        {[1 / 3, 2 / 3].map((f) => (
          <View key={f} style={[styles.crease, { top: h * f }]}>
            <View style={styles.creaseDark} />
            <View style={styles.creaseLight} />
          </View>
        ))}
        {/* Evening light through the window, crossing the page like it crosses the seat. */}
        <LinearGradient
          colors={['rgba(255,170,90,0)', 'rgba(255,170,90,0.16)', 'rgba(255,170,90,0.16)', 'rgba(255,170,90,0)', 'rgba(255,170,90,0)', 'rgba(255,170,90,0.12)', 'rgba(255,170,90,0)']}
          locations={[0.12, 0.2, 0.34, 0.42, 0.6, 0.68, 0.78]}
          start={{ x: 0.85, y: 0.05 }}
          end={{ x: 0.15, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
        {/* The left edge lifts off the seat a little, so it catches less light. */}
        <LinearGradient colors={['rgba(40,30,20,0.18)', 'rgba(40,30,20,0)']} locations={[0, 0.12]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        {/* The cab is dim: the page falls off into shade at the far edge and the bottom. */}
        <LinearGradient
          colors={['rgba(30,22,14,0.22)', 'rgba(30,22,14,0.06)', 'rgba(30,22,14,0.10)', 'rgba(30,22,14,0.38)']}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {/* Found: a sharp lime outline on the page's own corners. It sits in the paper's own
          tilt, so it lands on the real edges, and settles in from a touch larger. */}
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
      {/* The whole frame: a soft vignette and grain, so the page and the seat read as one photo. */}
      <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFill} />
      {/* Grain is the camera's, not the scene's: the glass's picture of the photo leaves it out. */}
      {Platform.OS === 'web' ? <View style={[StyleSheet.absoluteFill, styles.grain]} {...({ dataSet: { noglass: '1' } } as object)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cab: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  paper: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 1.5,
    transform: [...TILT],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 12 },
    ...web({ boxShadow: '0 1px 2px rgba(0,0,0,0.55), 3px 10px 18px rgba(0,0,0,0.45), 8px 26px 40px rgba(0,0,0,0.35)', }),
  },
  found: { position: 'absolute', borderWidth: 3, borderColor: color.signal, backgroundColor: 'rgba(212,245,76,0.10)' },
  crease: { position: 'absolute', left: 0, right: 0, height: 2 },
  creaseDark: { height: 1, backgroundColor: 'rgba(60,45,30,0.16)' },
  creaseLight: { height: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  grain: { opacity: 0.13, ...web({ backgroundImage: GRAIN, mixBlendMode: 'overlay' }) },
});
