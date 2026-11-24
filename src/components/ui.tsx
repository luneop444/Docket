/**
 * Small building blocks that match the Figma components (Button, Pill) and the
 * v1 prototype's shared pieces (cards, options, segmented buttons, bars,
 * "Faked" tags, prototype controls).
 */
import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { color, fontFamily, glass, glassRing, protoColor, radius, type, type TypeToken } from '../theme/tokens';
import { noWidow } from '../logic/text';
import { CheckIcon, ChevronRight, PlusIcon } from './Icons';
import { tick } from '../logic/haptics';
import { useReduceMotion } from './stepMotion';
import { Tappable } from './Tappable';

// The segmented control's track inset: the picked pill sits this far inside the track.
const SEG_PAD = 4;
const NATIVE_ANIM = Platform.OS !== 'web';

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
      <Tappable accessibilityRole="button" onPress={onPress} give={0.985} style={s} highlight={tone === 'signal' ? 'dim' : 'wash'}>
        {children}
      </Tappable>
    );
  }
  return <View style={s}>{children}</View>;
}

/* ---------- ListCard + ListRow (Figma: List card / List row) ---------- */

const ListPos = createContext<{ first: boolean; last: boolean }>({ first: true, last: true });

/**
 * A card holding a list of tappable rows, like an iOS inset grouped list. The card has no
 * padding of its own: each ListRow spans it edge to edge, so a pressed row lights up out to
 * the card's sides and to the dividers above and below it. The first row takes the card's top
 * corners and the last row its bottom ones, so the lime meets the card's own squircle.
 */
export function ListCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.card, styles.listCard, style]}>
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <View style={styles.listDivider} /> : null}
          <ListPos.Provider value={{ first: i === 0, last: i === items.length - 1 }}>{child}</ListPos.Provider>
        </Fragment>
      ))}
    </View>
  );
}

/** One tappable row of a ListCard. No give: a list row lights up in place, as on iOS. */
export function ListRow({
  accessibilityLabel,
  onPress,
  style,
  children,
}: {
  accessibilityLabel?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { first, last } = useContext(ListPos);
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      give={1}
      style={[styles.listRow, first && styles.listRowFirst, last && styles.listRowLast, style]}
    >
      {children}
    </Tappable>
  );
}

/**
 * Press feedback everywhere: cards, tiles and buttons give a little (0.98) and light up
 * lime (Tappable). A text link or a tappable part of a card gets its own shape to light up,
 * without moving anything: `hit` pads a link into a small squircle (negative margin keeps
 * the words where they were), `section` pads a block out to the card's inset with the
 * option radius. Pair either with `link` for the lime while pressed.
 */
export const press = {
  get give() {
    return styles.pressed;
  },
  get link() {
    return styles.linkPressed;
  },
  get hit() {
    return styles.linkHit;
  },
  get section() {
    return styles.sectionHit;
  },
};

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
  /** An icon, or a function of the label color so it can turn ink with the label on press. */
  icon?: ReactNode | ((c: string) => ReactNode);
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<ButtonVariant, string | undefined> = {
    primary: color.ink,
    signal: color.signal,
    quiet: color.glass,
    text: undefined,
    white: color.bg,
  };
  const fg = variant === 'primary' ? color.bg : variant === 'text' ? color.sub : color.ink;
  return (
    <Tappable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      // A text button dims like an iOS text button; filled buttons give under the finger.
      give={variant === 'text' ? 1 : 0.97}
      // Lime press highlight: the whole button turns lime (an ink button's label and icon turn
      // ink with it); a lime button takes a light veil; text buttons fill their own shape lime.
      highlight={variant === 'signal' ? 'dim' : variant === 'text' ? 'none' : 'wash'}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg[variant] },
        variant === 'quiet' && styles.btnGlass,
        small && styles.btnSmall,
        variant === 'text' && styles.btnText,
        disabled && styles.disabled,
        pressed && variant === 'text' && styles.linkPressed,
        style,
      ]}
    >
      {({ lit }) => {
        const c = lit && variant === 'primary' ? color.ink : fg;
        return (
          <>
            {typeof icon === 'function' ? icon(c) : icon}
            <Text style={[small ? type.labelSmall : type.labelButton, { color: c }]}>{label}</Text>
          </>
        );
      }}
    </Tappable>
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
    // The gap before it stays unfilled, and the padding is no-break spaces: a plain space with the
    // fill was left behind at the end of the line when the tag wrapped (a lime sliver after "loads.").
    <Text>
      {' '}
      <Text style={styles.fake}>{`\u00A0${label.toUpperCase()}\u00A0`}</Text>
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
  icon,
  onPress,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  radio?: boolean;
  /** Figma Onboarding v3 option: a white 40 icon tile on the left, 14 inset. */
  icon?: IconFn;
  onPress: () => void;
}) {
  const text = (
    <View style={styles.flex}>
      <T v="bodyStrong">{label}</T>
      {/* Figma E1 icon options: the line under is 14 grey, 1 below the title. */}
      {sub ? icon ? <T v="bodySmall" c={color.sub} style={{ marginTop: 1 }}>{sub}</T> : <T v="bodyTiny">{sub}</T> : null}
    </View>
  );
  if (radio) {
    // Radio on the left. Selected gets the same white row and ink ring as every
    // other selected option, so the choice reads from across the row, not just the dot.
    return (
      <Tappable
        accessibilityRole="radio"
        accessibilityState={{ checked: !!selected }}
        // The web build drops accessibilityState: aria-checked is what a screen reader reads there.
        aria-checked={!!selected}
        onPress={() => {
          if (!selected) tick();
          onPress();
        }}
        style={[styles.option, styles.optionRadio, selected && styles.optionOn]}
      >
        <View style={[styles.radio, selected && styles.radioOn]} />
        {text}
      </Tappable>
    );
  }
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={onPress}
      style={[styles.option, icon && styles.optionIcon, selected && styles.optionOn]}
    >
      {icon ? <IconTile icon={icon} tone="white" size={40} /> : null}
      {text}
      <ChevronRight c={icon ? color.faint : undefined} />
    </Tappable>
  );
}

/**
 * Row of equal buttons, one selected (v1 `.seg` / `.chips`). Screen readers get
 * a radio group: "Free time, 2h, selected, 2 of 3". Pass `label` with the
 * question the row answers, since the visible heading sits outside it.
 */
export function Seg<K extends string>({
  options,
  value,
  onChange,
  style,
  label,
}: {
  options: { key: K; label: string; flag?: boolean }[];
  value: K | null | undefined;
  onChange: (k: K) => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const i = options.findIndex((o) => o.key === value);
  const n = options.length;
  const segW = width ? (width - SEG_PAD * 2) / n : 0;
  const at = (k: number) => SEG_PAD + Math.max(0, k) * segW;
  // The picked pill is one shape that slides to the option you tap, instead of the colour
  // jumping between buttons; with nothing picked yet it fades in where you tapped.
  const [x] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(i >= 0 ? 1 : 0));
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!segW) return;
    const prev = last.current;
    last.current = i;
    const fade = (to: number) => Animated.timing(shown, { toValue: to, duration: 140, useNativeDriver: NATIVE_ANIM }).start();
    if (prev === null || reduce) {
      if (i >= 0) x.setValue(at(i));
      shown.setValue(i >= 0 ? 1 : 0);
      return;
    }
    if (i < 0) return fade(0);
    if (prev < 0) {
      x.setValue(at(i));
      return fade(1);
    }
    Animated.spring(x, { toValue: at(i), speed: 20, bounciness: 4, useNativeDriver: NATIVE_ANIM }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, segW, reduce]);
  const thumb = i >= 0 && options[i].flag ? color.flag : color.ink;

  return (
    <View
      style={[styles.seg, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Tappable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            onPress={() => {
              if (!on) tick();
              onChange(o.key);
            }}
            // Until the row has been measured there's no pill, so the picked button fills itself.
            style={[styles.segBtn, on && (segW ? styles.segBtnOn : { backgroundColor: thumb, boxShadow: 'none' })]}
            // The sliding pill is the answer to the tap; a lime ring or wash on top read as a second one.
            highlight="none"
            instant
          >
            <Text style={[type.labelSmall, { color: on && !segW ? color.bg : color.ink }]}>{o.label}</Text>
          </Tappable>
        );
      })}
      {segW ? (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[styles.segThumb, { width: segW, backgroundColor: thumb, opacity: shown, transform: [{ translateX: x }] }]}
        >
          {/* Above the options (it lets taps through), with its own white labels, held still against the track while the pill slides, so
              a label turns white exactly where the pill covers it, not all at once on the tap. */}
          <Animated.View style={[styles.segInk, { width, transform: [{ translateX: Animated.multiply(x, -1) }] }]}>
            {options.map((o) => (
              <View key={o.key} style={styles.segLabel}>
                <Text style={[type.labelSmall, { color: color.bg }]}>{o.label}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}
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

/* ---------- Onboarding v3 visuals (Figma 344:861): icon-led choices ---------- */

/** An icon is passed as a render function so each state can recolor it. */
export type IconFn = (c: string) => ReactNode;

export type IconTileTone = 'raise' | 'white' | 'ink' | 'signal';

/**
 * Figma "Icon tile": a squircle holding one icon. Sizes follow the frames: 40
 * in icon rows, 44 in action cards, 48 in choice tiles. The icon color is
 * picked to stay readable on the tile (lime on ink, ink everywhere else).
 */
export function IconTile({ icon, tone = 'raise', size = 40 }: { icon: IconFn; tone?: IconTileTone; size?: 40 | 44 | 48 }) {
  const bg = { raise: color.raise, white: color.bg, ink: color.ink, signal: color.signal }[tone];
  const fg = tone === 'ink' ? color.signal : color.ink;
  // Sizes live in the stylesheet, not inline: Squircles.web.tsx reads the radius from a class
  // and clears inline radii when it re-measures.
  const sized = size === 40 ? styles.tile40 : size === 44 ? styles.tile44 : styles.tile48;
  return (
    <View
      // Web: keep this tile's own squircle instead of the concentric inner corner (Squircles.web.tsx).
      {...({ dataSet: { squircle: 'own' } } as object)}
      style={[styles.iconTile, sized, tone === 'raise' ? glass : { backgroundColor: bg }]}
    >
      {icon(fg)}
    </View>
  );
}

/**
 * Figma "Option" / "Option · selected" (L-A Loads · icon tiles). One radio
 * choice: icon tile, title and line, radio ring. Selected turns the whole tile
 * lime, the icon tile ink and the ring a check, so the choice reads without color too.
 */
export function ChoiceTile({
  icon,
  label,
  sub,
  plain,
  selected,
  onPress,
}: {
  /** Optional: answers that need no picture (Does this match your paperwork?) go without. */
  icon?: IconFn;
  label: string;
  sub?: string;
  /** Regular-weight label: plain answers to a question, where bold would only add noise. */
  plain?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Tappable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={() => {
        if (!selected) tick();
        onPress();
      }}
      style={[styles.choice, selected && styles.choiceOn]}
      highlight={selected ? 'dim' : 'wash'}
      instant
    >
      {icon ? <IconTile icon={icon} tone={selected ? 'ink' : 'white'} size={48} /> : null}
      <View style={styles.flexGap2}>
        <T v={plain ? 'body' : 'bodyStrong'} c={selected ? color.onSignal : color.ink}>
          {label}
        </T>
        {sub ? (
          <T v="bodySmall" c={selected ? color.onSignal : color.sub}>
            {sub}
          </T>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.choiceCheck}>
          <CheckIcon c={color.bg} size={16} />
        </View>
      ) : (
        // The 24 ring sits in the check's 28 slot, so picking an answer doesn't change its height.
        <View style={styles.choiceSlot}>
          <View style={styles.choiceRing} />
        </View>
      )}
    </Tappable>
  );
}

/** Figma "Promise": an icon tile beside a bold line and a short sub line. Not tappable. */
export function IconRow({ icon, label, sub }: { icon: IconFn; label: string; sub?: string }) {
  return (
    <View style={styles.iconRow}>
      <IconTile icon={icon} />
      <View style={styles.flexGap1}>
        <T v="bodyStrong">{label}</T>
        {sub ? <T v="bodySmall">{sub}</T> : null}
      </View>
    </View>
  );
}

/**
 * Figma "Choice · primary / secondary" (P-A Location · weighted choices). A
 * full-width card that does something when tapped. Primary is ink with a lime
 * tile; secondary is white with a line. Both carry a title, a line saying what
 * it means, and a chevron, so the lighter one is still a whole choice.
 *
 * `create`: an add action (Add today's load) rather than a choice. Its tile is a "+" and it has no
 * chevron: the card says it's tappable and the "+" says what it does, so a chevron was a third cue
 * for the same thing (24 Nov). Choices keep the chevron: there it means pick this and go on.
 */
export function ActionCard({
  icon,
  label,
  sub,
  primary,
  create,
  onPress,
}: {
  icon?: IconFn;
  label: string;
  sub?: string;
  primary?: boolean;
  create?: boolean;
  onPress: () => void;
}) {
  const tile: IconFn = create ? (c) => <PlusIcon c={c} /> : (icon as IconFn);
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={onPress}
      style={[styles.action, primary ? styles.actionPrimary : styles.actionSecondary]}
    >
      {({ lit }) => {
        // Pressed, the ink card turns lime like every other card, so its content turns ink.
        const dark = primary && !lit;
        return (
          <>
            <IconTile icon={tile} tone={primary ? (lit ? 'ink' : 'signal') : 'raise'} size={44} />
            <View style={styles.flexGap2}>
              <T v="labelButton" c={dark ? color.bg : color.ink}>
                {label}
              </T>
              {sub ? (
                <T v="bodySmall" c={dark ? color.bg : color.sub}>
                  {sub}
                </T>
              ) : null}
            </View>
            {create ? null : <ChevronRight c={dark ? color.bg : primary ? color.ink : color.sub} />}
          </>
        );
      }}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  flexGap1: { flex: 1, minWidth: 0, gap: 1 },
  flexGap2: { flex: 1, minWidth: 0, gap: 2 },
  iconTile: { borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  btnGlass: { boxShadow: glass.boxShadow },
  tile40: { width: 40, height: 40, borderRadius: 12 },
  tile44: { width: 44, height: 44, borderRadius: 13 },
  tile48: { width: 48, height: 48, borderRadius: 14 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    ...glass,
  },
  // Figma E1 Pick company: 14 around a 40 tile, 20 corners (14 + 40/2 keeps it concentric with the tile's 11).
  optionIcon: { padding: 14, borderRadius: 20, justifyContent: 'flex-start' },
  choiceOn: { backgroundColor: color.signal, boxShadow: 'none' },
  choiceRing: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.track },
  choiceSlot: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  choiceCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
  },
  actionPrimary: { backgroundColor: color.ink },
  actionSecondary: { ...glass },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowBase: { alignItems: 'baseline' },
  hr: { height: 1, backgroundColor: color.line, marginVertical: 14 },
  card: { ...glass, borderRadius: radius.card, borderCurve: 'continuous', padding: 20 },
  listCard: { padding: 0 },
  // Rows carry the card's 20 inset themselves; 16 top and bottom keeps the old 12 + the card's 4.
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 16, paddingHorizontal: 20 },
  listRowFirst: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, borderCurve: 'continuous' },
  listRowLast: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card, borderCurve: 'continuous' },
  // Inset to the text like the old Hr, so the lime of a pressed row stops at the line.
  listDivider: { height: 1, backgroundColor: color.line, marginHorizontal: 20 },
  cardSignal: { backgroundColor: color.signal, boxShadow: 'none' },
  cardFlagged: glassRing(color.flag),
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 56,
    // Buttons are capsules (iOS 26's control shape): anything you tap is a pill, anything that
    // holds content (cards, sheets, fields, options) keeps its squircle.
    borderRadius: 28,
  },
  btnSmall: { height: 46, borderRadius: 23 },
  btnText: { height: 44 },
  disabled: { opacity: 0.35 },
  pressed: { transform: [{ scale: 0.98 }] },
  /** Pressed text links, text buttons and card sections: their whole shape turns lime. */
  linkPressed: { backgroundColor: color.signal },
  linkHit: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: -10,
    marginVertical: -6,
    // A link is tappable, so its lime press shows as a pill like every other control.
    borderRadius: 999,
  },
  sectionHit: { padding: 16, margin: -16, borderRadius: radius.option, borderCurve: 'continuous' },
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
    ...glass,
  },
  optionOn: { backgroundColor: color.bg, boxShadow: `inset 0 0 0 2px ${color.ink}` },
  optionRadio: { justifyContent: 'flex-start', gap: 14 },
  radio: { width: 22, height: 22, borderRadius: 11, borderCurve: 'continuous', borderWidth: 2, borderColor: color.track },
  radioOn: { borderWidth: 7, borderColor: color.ink },
  // One choice between options, so one surface (iOS's segmented control): a white glass track
  // that lifts off the page, and the picked pill slides inside it. As separate raised buttons
  // (23 Nov) the pill slid across the gap between them, a motion no surface explained. The
  // grey track the v1 had matched the canvas and vanished, hence glass.
  seg: { flexDirection: 'row', padding: SEG_PAD, borderRadius: 22 + SEG_PAD, ...glass },
  segThumb: { position: 'absolute', left: 0, top: SEG_PAD, bottom: SEG_PAD, borderRadius: 22, overflow: 'hidden' },
  segInk: { position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: SEG_PAD },
  segLabel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The picked option lets the sliding pill under it show through.
  segBtnOn: { backgroundColor: 'transparent', boxShadow: 'none' },
  segBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
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
    ...glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
});
