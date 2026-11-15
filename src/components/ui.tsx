/**
 * Small building blocks that match the Figma components (Button, Pill) and the
 * v1 prototype's shared pieces (cards, options, segmented buttons, bars,
 * "Faked" tags, prototype controls).
 */
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { color, fontFamily, protoColor, radius, type, type TypeToken } from '../theme/tokens';
import { noWidow } from '../logic/text';
import { ChevronRight } from './Icons';

/* ---------- text ---------- */

/** Text in one of the Figma text styles. Small and tiny text default to `sub`. */
export function T({
  v = 'body',
  c,
  style,
  children,
  ...rest
}: TextProps & { v?: TypeToken; c?: string; style?: StyleProp<TextStyle>; children?: ReactNode }) {
  const fallback = v === 'bodySmall' || v === 'bodyTiny' ? color.sub : color.ink;
  const heading = v === 'h1' || v === 'h2';
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      {...rest}
      style={[type[v], { color: c ?? fallback }, style]}
    >
      {noWidow(children)}
    </Text>
  );
}



/**
 * Hides the browser's focus outline on text inputs that draw their own focus
 * state. Web only: iOS has no outline and warns about the style.
 */
export const noFocusRing: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

/* ---------- layout ---------- */

export const Gap = ({ h }: { h: number }) => <View style={{ height: h }} />;

export const Row = ({
  children,
  base,
  style,
}: {
  children: ReactNode;
  base?: boolean;
  style?: StyleProp<ViewStyle>;
}) => <View style={[styles.row, base && styles.rowBase, style]}>{children}</View>;

export const Hr = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[styles.hr, style]} />;

/* ---------- surfaces ---------- */

export function Card({
  children,
  flagged,
  tone = 'raise',
  onPress,
  style,
}: {
  children: ReactNode;
  flagged?: boolean;
  /** "signal" is the lime money card (v1 `.owed`). */
  tone?: 'raise' | 'signal';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = [styles.card, tone === 'signal' && styles.cardSignal, flagged && styles.cardFlagged, style];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={s}>
        {children}
      </Pressable>
    );
  }
  return <View style={s}>{children}</View>;
}

/* ---------- Button (Figma: Primary / Signal / Ghost / Text) ---------- */

export type ButtonVariant = 'primary' | 'signal' | 'quiet' | 'text' | 'white';

export function Button({
  label,
  onPress,
  variant = 'primary',
  small,
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<ButtonVariant, string | undefined> = {
    primary: color.ink,
    signal: color.signal,
    quiet: color.raise,
    text: undefined,
    white: color.bg,
  };
  const fg = variant === 'primary' ? color.bg : variant === 'text' ? color.sub : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg[variant] },
        small && styles.btnSmall,
        variant === 'text' && styles.btnText,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[small ? type.labelSmall : type.labelButton, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Pill (Figma: Neutral / Signal / Flag) ---------- */

export function Pill({ label, tone = 'quiet' }: { label: string; tone?: 'quiet' | 'signal' | 'flag' }) {
  const bg = tone === 'signal' ? color.signal : tone === 'flag' ? color.flagBg : color.raise2;
  const fg = tone === 'signal' ? color.signalInk : tone === 'flag' ? color.flag : color.sub;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[type.labelPill, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Yellow tag on anything simulated. */
export function Fake({ label = 'Faked' }: { label?: string }) {
  return (
    <Text style={styles.fake}>
      {` ${label.toUpperCase()} `}
    </Text>
  );
}

/* ---------- choices ---------- */

/** Big tappable row: radio choice or list item with a chevron. */
export function Option({
  label,
  sub,
  selected,
  radio,
  onPress,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  radio?: boolean;
  onPress: () => void;
}) {
  const text = (
    <View style={styles.flex}>
      <T v="bodyStrong">{label}</T>
      {sub ? <T v="bodyTiny">{sub}</T> : null}
    </View>
  );
  if (radio) {
    // Radio on the left. Selected gets the same white row and ink ring as every
    // other selected option, so the choice reads from across the row, not just the dot.
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: !!selected }}
        onPress={onPress}
        style={[styles.option, styles.optionRadio, selected && styles.optionOn]}
      >
        <View style={[styles.radio, selected && styles.radioOn]} />
        {text}
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.option, selected && styles.optionOn]}>
      {text}
      <ChevronRight />
    </Pressable>
  );
}

/** Row of equal buttons, one selected (v1 `.seg` / `.chips`). */
export function Seg<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string; flag?: boolean }[];
  value: K | null | undefined;
  onChange: (k: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segBtn, on && { backgroundColor: o.flag ? color.flag : color.ink }]}
          >
            <Text style={[type.labelSmall, { color: on ? color.bg : color.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- bars ---------- */

/** Free time (grey) then detention (black). Heights 6 (cards) or 8 (hero). */
export function TimeBar({ free, detention, height = 6 }: { free: number; detention: number; height?: number }) {
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, borderCurve: 'continuous' }]}>
      {free > 0 ? <View style={{ flex: free, backgroundColor: color.free }} /> : null}
      {detention > 0 ? <View style={{ flex: detention, backgroundColor: color.detention }} /> : null}
    </View>
  );
}

/* ---------- prototype controls ---------- */

export function ProtoControls({ note, children }: { note: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.proto}>
      <T v="bodyTiny">{note}</T>
      {children}
    </View>
  );
}

/** Numbered / icon circle used in step lists. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <View style={styles.badge}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <T v="bodyTiny">{children}</T>
      ) : (
        children
      )}
    </View>
  );
}

export function StepItem({ badge, children }: { badge: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.step}>
      <Badge>{badge}</Badge>
      <T v="body" style={[styles.flex, { lineHeight: 23 }]}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowBase: { alignItems: 'baseline' },
  hr: { height: 1, backgroundColor: color.line, marginVertical: 14 },
  card: { backgroundColor: color.raise, borderRadius: radius.card, borderCurve: 'continuous', padding: 20 },
  cardSignal: { backgroundColor: color.signal },
  cardFlagged: { boxShadow: `inset 0 0 0 1.5px ${color.flag}` },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 56,
    borderRadius: radius.control, borderCurve: 'continuous',
  },
  btnSmall: { height: 46, borderRadius: radius.chip, borderCurve: 'continuous' },
  btnText: { height: 44 },
  disabled: { opacity: 0.35 },
  pressed: { transform: [{ scale: 0.98 }] },
  pill: { height: 26, paddingHorizontal: 10, borderRadius: 13, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  fake: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.33,
    color: protoColor.fakeInk,
    backgroundColor: protoColor.fakeBg,
    borderRadius: 6, borderCurve: 'continuous',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    // Even 20 on every side, equal to the corner radius; 62px tall with one line.
    padding: 20,
    borderRadius: radius.option, borderCurve: 'continuous',
    backgroundColor: color.raise,
  },
  optionOn: { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.ink}` },
  optionRadio: { justifyContent: 'flex-start', gap: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderCurve: 'continuous', borderWidth: 2, borderColor: color.track },
  radioOn: { borderWidth: 7, borderColor: color.ink },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.chip, borderCurve: 'continuous',
    backgroundColor: color.raise2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { flexDirection: 'row', gap: 2, overflow: 'hidden' },
  proto: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: protoColor.dashed,
    borderRadius: 22, borderCurve: 'continuous',
    padding: 14,
    gap: 10,
    marginTop: 20,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: color.raise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
});
