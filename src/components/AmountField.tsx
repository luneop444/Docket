import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { formatAmount, typeAmount } from '../logic/settlement';
import { color, fontFamily, type } from '../theme/tokens';
import { noFocusRing } from './ui';

/**
 * A dollar amount field (Figma: Amount field). It only takes a number: digits and one decimal
 * point, cents to two places. A key it can't take isn't silently dropped: the field rings red
 * and says why ("Enter a number, like 22.65") until the next good key. Leaving the field fills
 * in the cents ("22" → "22.00"), so what's checked is what's shown.
 */
export function AmountField({
  value,
  onChange,
  label,
  onSubmit,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  /** What the amount is, for VoiceOver. */
  label: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={[styles.field, focused ? styles.fieldFocus : null, error ? styles.fieldError : null]}>
        <Text style={styles.dollar}>$</Text>
        <TextInput
          value={value}
          onChangeText={(t) => {
            const r = typeAmount(t);
            onChange(r.value);
            setError(r.error);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onChange(formatAmount(value));
          }}
          placeholder="0.00"
          placeholderTextColor={color.sub}
          inputMode="decimal"
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          style={styles.input}
          accessibilityLabel={label}
          accessibilityHint="A dollar amount, like 22.65"
          onSubmitEditing={() => {
            onChange(formatAmount(value));
            onSubmit?.();
          }}
        />
      </View>
      {error ? (
        <Text style={[type.bodyTiny, styles.error]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: color.bg,
    // A field's edge at 3:1 (WCAG 1.4.11): white alone sat 1.1:1 off the glass card.
    boxShadow: `inset 0 0 0 1px ${color.track}`,
  },
  // The browser ring is off (noFocusRing), so focus draws its own, as the other fields do (WCAG 2.4.7).
  fieldFocus: { boxShadow: `inset 0 0 0 2px ${color.ink}` },
  // The flag red the app uses for "paid less than owed", as a ring so the field keeps its size.
  fieldError: { boxShadow: `inset 0 0 0 1.5px ${color.flag}` },
  dollar: { fontFamily: fontFamily.regular, fontSize: 17, color: color.sub },
  input: { flex: 1, minWidth: 0, fontFamily: fontFamily.regular, fontSize: 17, color: color.ink, ...noFocusRing },
  error: { color: color.flag },
});
