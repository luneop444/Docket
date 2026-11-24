import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { clock, parseClock } from '../logic/format';
import { tick } from '../logic/haptics';
import type { LoadStop } from '../logic/sampleData';
import { shiftStop } from '../logic/stop';
import { color, glass, radius, type } from '../theme/tokens';
import { MinusIcon, PlusIcon } from './Icons';
import { Button, noFocusRing, press, Seg, T } from './ui';
import { useRepeat } from './useRepeat';
import { Tappable } from './Tappable';

/** A blank stop for the driver to fill in. */
export const blankStop = (kind: LoadStop['kind'], at: number): LoadStop => ({ name: '', kind, at });

/** Every stop has a name. */
export const stopsReady = (stops: LoadStop[]) => stops.length > 0 && stops.every((st) => st.name.trim());

/** − or + on an appointment: 15 minutes a tap, and holding keeps stepping, each with a tick. */
function Shift({ label, onStep, children }: { label: string; onStep: () => void; children: ReactNode }) {
  const r = useRepeat(() => {
    tick();
    onStep();
  });
  return (
    <Tappable accessibilityRole="button" accessibilityLabel={label} {...r} instant style={styles.step}>
      {children}
    </Tappable>
  );
}

/**
 * Edit a load by hand: load number, then each stop's name, pickup or drop,
 * and appointment (typed, or −/+ 15 minutes).
 */
export function StopsEditor({
  number,
  onNumber,
  stops,
  onStops,
}: {
  number: string;
  onNumber: (n: string) => void;
  stops: LoadStop[];
  onStops: (s: LoadStop[]) => void;
}) {
  const set = (i: number, patch: Partial<LoadStop>) => onStops(stops.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  const last = stops[stops.length - 1];

  return (
    <View style={{ gap: 12 }}>
      <Field label="Load number (optional)" value={number} onChangeText={onNumber} placeholder="e.g. 48262" />
      {stops.map((st, i) => (
        <View key={i} style={styles.stop}>
          <View style={styles.stopHead}>
            <T v="bodyStrong">Stop {i + 1}</T>
            {stops.length > 1 ? (
              <Tappable accessibilityRole="button" onPress={() => onStops(stops.filter((_, j) => j !== i))} hitSlop={8} give={1} style={press.hit}>
                <T v="bodySmall">Remove</T>
              </Tappable>
            ) : null}
          </View>
          <Field
            label="Facility name"
            value={st.name}
            onChangeText={(name) => set(i, { name })}
            placeholder="e.g. Harbor Foods DC"
            onBg
          />
          <Seg
            label={`Stop ${i + 1}: pickup or drop`}
            options={[
              { key: 'Pickup' as const, label: 'Pickup' },
              { key: 'Drop' as const, label: 'Drop' },
            ]}
            value={st.kind}
            onChange={(kind) => set(i, { kind })}
          />
          <View style={styles.timeRow}>
            <T v="bodySmall" style={{ flex: 1 }}>Appointment</T>
            <Shift label={`Stop ${i + 1} 15 minutes earlier`} onStep={() => onStops(shiftStop(stops, i, -1))}>
              <MinusIcon size={24} />
            </Shift>
            {/* Keyed by the time so −/+ resets what's typed. */}
            <TimeField key={st.at} at={st.at} onChange={(at) => set(i, { at })} label={`Stop ${i + 1} appointment`} />
            <Shift label={`Stop ${i + 1} 15 minutes later`} onStep={() => onStops(shiftStop(stops, i, 1))}>
              <PlusIcon size={24} />
            </Shift>
          </View>
        </View>
      ))}
      <Button
        label="Add a stop"
        variant="quiet"
        small
        icon={<PlusIcon size={20} />}
        onPress={() => onStops([...stops, blankStop('Drop', Math.min(23 * 60, (last?.at ?? 8 * 60) + 120))])}
      />
      <T v="bodyTiny">Docket watches your last drop and starts looking 3h before its appointment.</T>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  onBg,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  /** On a grey card, so the field is white. */
  onBg?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="bodySmall">{label}</T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.sub}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[styles.input, onBg && styles.inputOnBg, focused && styles.inputFocus]}
      />
    </View>
  );
}

/** Appointment typed as "7:30 AM", "730p", "19:30"… Reverts if it can't be read. */
function TimeField({ at, onChange, label }: { at: number; onChange: (m: number) => void; label: string }) {
  const [text, setText] = useState(clock(at));
  const [focused, setFocused] = useState(false);
  const commit = () => {
    setFocused(false);
    const m = parseClock(text);
    if (m == null) setText(clock(at));
    else if (m !== at) onChange(m);
    else setText(clock(at));
  };
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onSubmitEditing={commit}
      selectTextOnFocus
      autoCorrect={false}
      accessibilityLabel={label}
      style={[styles.input, styles.inputOnBg, styles.time, focused && styles.inputFocus]}
    />
  );
}

const styles = StyleSheet.create({
  stop: { ...glass, borderRadius: 14, borderCurve: 'continuous', padding: 14, gap: 10 },
  stopHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  input: {
    ...type.body,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.chip, borderCurve: 'continuous',
    ...glass,
    // A field's edge at 3:1 (WCAG 1.4.11): glass alone sat 1.1:1 off the card.
    boxShadow: `inset 0 0 0 1px ${color.track}`,
    color: color.ink,
    ...noFocusRing,
  },
  inputOnBg: { backgroundColor: color.bg },
  inputFocus: { boxShadow: `inset 0 0 0 2px ${color.ink}` },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { width: 104, textAlign: 'center', paddingHorizontal: 6, fontVariant: ['tabular-nums'] },
  step: {
    width: 44,
    height: 44,
    borderRadius: 12, borderCurve: 'continuous',
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
